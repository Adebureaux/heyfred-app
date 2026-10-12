import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { NestFactory } from "@nestjs/core";
import {
  FitVerdict,
  ProspectListStatus,
  ScrapingRun,
  ScrapingRunStage,
  UnipileAccountStatus,
} from "@prisma/client";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { ProspectListsService } from "../prospect-lists/prospect-lists.service";
import { ScrapingService } from "../scraping/scraping.service";
import { REFERENCE_BRIEFS, ReferenceBrief } from "./reference-briefs";
import { judgeList, Verdict } from "./relevance-judge";

// Runs every reference brief through the real pipeline (same queues and processors as the app),
// then has an AI judge rate each company/prospect against the brief. Usage, from the backend
// container:  pnpm run eval [--only id1,id2]
// Requires EVAL_USER_EMAIL: an existing user whose LinkedIn account is connected via Unipile.

const EVAL_LIST_PREFIX = "[eval] ";
const POLL_INTERVAL_MS = 3000;
const RUN_TIMEOUT_MS = 10 * 60 * 1000;
// Apify's clock and ours can drift slightly; widen the matching window for its run timestamps.
const APIFY_CLOCK_TOLERANCE_MS = 10_000;
const REPORTS_DIR = path.resolve(__dirname, "../../eval-reports");

type RunOutcome = ProspectListStatus | "TIMEOUT" | "ERROR";

interface BriefResult {
  id: string;
  outcome: RunOutcome;
  durationSec: number;
  selectedActorId: string | null;
  actorInput: unknown;
  errors: string[];
  apifyCost: ApifyCost | null;
  requested: number;
  // Companies fetched from the source, before qualification kept the ones below.
  companiesSourced: number;
  companies: { name: string; verdict: Verdict; reason: string }[];
  prospects: {
    name: string;
    jobTitle: string;
    company: string;
    location: string | null;
    verdict: Verdict;
    reason: string;
  }[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function selectBriefs(argv: string[]): ReferenceBrief[] {
  const flagIndex = argv.indexOf("--only");
  if (flagIndex === -1) return REFERENCE_BRIEFS;

  const ids = (argv[flagIndex + 1] ?? "").split(",").filter(Boolean);
  const available = REFERENCE_BRIEFS.map((ref) => ref.id).join(", ");
  const unknown = ids.filter((id) => !REFERENCE_BRIEFS.some((ref) => ref.id === id));
  if (ids.length === 0 || unknown.length > 0) {
    throw new Error(`--only expects brief ids among: ${available}${unknown.length ? ` (unknown: ${unknown.join(", ")})` : ""}`);
  }
  return REFERENCE_BRIEFS.filter((ref) => ids.includes(ref.id));
}

// Only the latest run of each brief is kept, so results stay browsable in the UI for manual
// checks without piling up in the user's account across runs.
async function deletePreviousEvalLists(prisma: PrismaService, userId: string, briefs: ReferenceBrief[]) {
  const lists = await prisma.prospectList.findMany({
    where: { userId, name: { in: briefs.map((ref) => `${EVAL_LIST_PREFIX}${ref.brief.name}`) } },
    select: { id: true },
  });
  const ids = lists.map((list) => list.id);
  if (ids.length === 0) return;

  await prisma.$transaction([
    prisma.prospect.deleteMany({ where: { prospectListId: { in: ids } } }),
    prisma.scrapedCompany.deleteMany({ where: { prospectListId: { in: ids } } }),
    prisma.scrapingRun.deleteMany({ where: { prospectListId: { in: ids } } }),
    prisma.prospectList.deleteMany({ where: { id: { in: ids } } }),
  ]);
}

async function waitForCompletion(prisma: PrismaService, prospectListId: string): Promise<RunOutcome> {
  const deadline = Date.now() + RUN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const { status } = await prisma.prospectList.findUniqueOrThrow({
      where: { id: prospectListId },
      select: { status: true },
    });
    if (status === ProspectListStatus.READY || status === ProspectListStatus.FAILED) {
      return status;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  return "TIMEOUT";
}

interface ApifyCost {
  usd: number;
  // False when the actor run was still going when measured — its cost will keep growing.
  final: boolean;
}

// The pipeline calls Apify synchronously and doesn't see what a run cost; Apify's run list
// does (usageTotalUsd), so match the actor run that started during our company-search stage.
async function fetchApifyCost(run: ScrapingRun | undefined): Promise<ApifyCost | null> {
  if (!run?.startedAt || !run.finishedAt) return null;
  // The actor input is persisted right before the paid call: without it, Apify was never called.
  if (!run.selectedActorId || run.actorInput === null) return { usd: 0, final: true };

  const response = await fetch("https://api.apify.com/v2/actor-runs?desc=1&limit=50", {
    headers: { Authorization: `Bearer ${process.env.APIFY_API_TOKEN}` },
  });
  if (!response.ok) return null;

  const { data } = (await response.json()) as {
    data: { items: { actId: string; status: string; startedAt: string; usageTotalUsd?: number }[] };
  };
  const from = run.startedAt.getTime() - APIFY_CLOCK_TOLERANCE_MS;
  const to = run.finishedAt.getTime() + APIFY_CLOCK_TOLERANCE_MS;
  const matching = data.items.filter((item) => {
    const startedAt = new Date(item.startedAt).getTime();
    return item.actId === run.selectedActorId && startedAt >= from && startedAt <= to;
  });
  if (matching.length === 0) return null;
  return {
    usd: matching.reduce((sum, item) => sum + (item.usageTotalUsd ?? 0), 0),
    final: matching.every((item) => !["READY", "RUNNING"].includes(item.status)),
  };
}

async function evaluateBrief(
  ref: ReferenceBrief,
  userId: string,
  services: { prisma: PrismaService; prospectLists: ProspectListsService; scraping: ScrapingService },
  anthropic: Anthropic,
): Promise<BriefResult> {
  const { prisma, prospectLists, scraping } = services;
  const startedAt = Date.now();

  const list = await prospectLists.create(userId, {
    ...ref.brief,
    name: `${EVAL_LIST_PREFIX}${ref.brief.name}`,
  });
  await scraping.triggerForProspectList(list.id);
  const outcome = await waitForCompletion(prisma, list.id);

  const [runs, companies, prospects] = await Promise.all([
    prisma.scrapingRun.findMany({ where: { prospectListId: list.id } }),
    prisma.scrapedCompany.findMany({ where: { prospectListId: list.id } }),
    prisma.prospect.findMany({ where: { prospectListId: list.id } }),
  ]);
  const companySearchRun = runs.find((run) => run.stage === ScrapingRunStage.COMPANY_SEARCH);
  // Judge what the pipeline kept: companies it rejected never reach the user.
  const keptCompanies = companies.filter((company) => company.fitVerdict !== FitVerdict.MISMATCH);
  const [judgement, apifyCost] = await Promise.all([
    judgeList(anthropic, list, keptCompanies, prospects),
    fetchApifyCost(companySearchRun),
  ]);
  const companyNames = new Map(companies.map((company) => [company.id, company.name]));

  return {
    id: ref.id,
    outcome,
    durationSec: Math.round((Date.now() - startedAt) / 1000),
    selectedActorId: companySearchRun?.selectedActorId ?? null,
    actorInput: companySearchRun?.actorInput ?? null,
    errors: runs.filter((run) => run.error).map((run) => `${run.stage}: ${run.error!.slice(0, 300)}`),
    apifyCost,
    requested: list.maxProspects,
    companiesSourced: companies.length,
    companies: keptCompanies.map((company) => ({
      name: company.name,
      ...judgement.companies.get(company.id)!,
    })),
    prospects: prospects.map((prospect) => {
      const raw = (prospect.raw ?? {}) as Record<string, unknown>;
      return {
        name: `${prospect.firstName} ${prospect.lastName}`.trim(),
        jobTitle: prospect.jobTitle,
        company: companyNames.get(prospect.companyId) ?? "?",
        location: typeof raw.location === "string" ? raw.location : null,
        ...judgement.prospects.get(prospect.id)!,
      };
    }),
  };
}

function countVerdicts(items: { verdict: Verdict }[]) {
  return {
    total: items.length,
    match: items.filter((item) => item.verdict === "match").length,
    partial: items.filter((item) => item.verdict === "partial").length,
  };
}

function percent(part: number, whole: number): string {
  return whole === 0 ? "n/a" : `${Math.round((part / whole) * 100)}%`;
}

const VERDICT_ICONS: Record<Verdict, string> = { match: "✓", partial: "~", mismatch: "✗" };

function printBriefResult(result: BriefResult) {
  const companies = countVerdicts(result.companies);
  const prospects = countVerdicts(result.prospects);
  const cost = !result.apifyCost
    ? "?"
    : `$${result.apifyCost.usd.toFixed(4)}${result.apifyCost.final ? "" : " (actor run still going — will cost more)"}`;
  console.log(
    `\n▸ ${result.id} — ${result.outcome} in ${result.durationSec}s · actor ${result.selectedActorId ?? "-"} · Apify ${cost}`,
  );
  console.log(
    `  companies: ${companies.total} kept of ${result.companiesSourced} sourced (${companies.match} match, ${companies.partial} partial) · prospects: ${prospects.total}/${result.requested} (${prospects.match} match, ${prospects.partial} partial)`,
  );
  for (const error of result.errors) console.log(`  ! ${error}`);
  for (const company of result.companies) {
    console.log(`  ${VERDICT_ICONS[company.verdict]} [company] ${company.name} — ${company.reason}`);
  }
  for (const prospect of result.prospects) {
    console.log(
      `  ${VERDICT_ICONS[prospect.verdict]} ${prospect.name} · ${prospect.jobTitle.slice(0, 60)} · ${prospect.location ?? "?"} — ${prospect.reason}`,
    );
  }
}

function summarize(results: BriefResult[]) {
  const prospects = countVerdicts(results.flatMap((result) => result.prospects));
  const companies = countVerdicts(results.flatMap((result) => result.companies));
  const requested = results.reduce((sum, result) => sum + result.requested, 0);
  const costs = results.map((result) => result.apifyCost);
  return {
    briefs: results.length,
    prospectsRequested: requested,
    prospectsFound: prospects.total,
    yield: percent(prospects.total, requested),
    prospectsMatch: prospects.match,
    prospectsPartial: prospects.partial,
    prospectRelevance: percent(prospects.match, prospects.total),
    companiesSourced: results.reduce((sum, result) => sum + result.companiesSourced, 0),
    companiesKept: companies.total,
    companyRelevance: percent(companies.match, companies.total),
    briefsWithNoProspects: results.filter((result) => result.prospects.length === 0).map((result) => result.id),
    apifyCostUsd: costs.reduce<number>((sum, cost) => sum + (cost?.usd ?? 0), 0),
    apifyCostIncomplete: costs.some((cost) => !cost?.final),
  };
}

async function main() {
  const briefs = selectBriefs(process.argv.slice(2));
  const evalUserEmail = process.env.EVAL_USER_EMAIL;
  if (!evalUserEmail) {
    throw new Error("EVAL_USER_EMAIL is not set — it must be a user whose LinkedIn account is connected.");
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ["error", "warn"] });
  try {
    const prisma = app.get(PrismaService);
    const user = await prisma.user.findUnique({
      where: { email: evalUserEmail },
      include: { unipileAccount: true },
    });
    if (!user) throw new Error(`No user with email ${evalUserEmail}.`);
    if (user.unipileAccount?.status !== UnipileAccountStatus.CONNECTED) {
      throw new Error(`${evalUserEmail} has no connected LinkedIn account — connect one from Settings first.`);
    }

    const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultHeaders: workspaceId ? { "anthropic-workspace-id": workspaceId } : undefined,
    });
    const services = {
      prisma,
      prospectLists: app.get(ProspectListsService),
      scraping: app.get(ScrapingService),
    };

    await deletePreviousEvalLists(prisma, user.id, briefs);
    console.log(`Running ${briefs.length} reference brief(s) as ${evalUserEmail}…`);

    const results: BriefResult[] = [];
    for (const ref of briefs) {
      try {
        const result = await evaluateBrief(ref, user.id, services, anthropic);
        results.push(result);
        printBriefResult(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.log(`\n▸ ${ref.id} — ERROR: ${message}`);
        results.push({
          id: ref.id,
          outcome: "ERROR",
          durationSec: 0,
          selectedActorId: null,
          actorInput: null,
          errors: [message],
          apifyCost: null,
          requested: ref.brief.maxProspects ?? 0,
          companiesSourced: 0,
          companies: [],
          prospects: [],
        });
      }
    }

    const summary = summarize(results);
    console.log("\n=== Summary ===");
    console.log(JSON.stringify(summary, null, 2));

    await mkdir(REPORTS_DIR, { recursive: true });
    const reportPath = path.join(REPORTS_DIR, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    await writeFile(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), summary, results }, null, 2));
    console.log(`\nFull report: ${reportPath}`);
  } finally {
    await app.close();
  }
}

// Exit explicitly: the Redis client AppModule hands to BullMQ isn't closed by app.close(), and
// that open handle would otherwise keep the process alive after the report is written.
main().then(
  () => process.exit(0),
  (err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);
