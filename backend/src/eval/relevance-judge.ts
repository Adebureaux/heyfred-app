import Anthropic from "@anthropic-ai/sdk";
import { Prospect, ProspectList, ScrapedCompany } from "@prisma/client";
import { buildBriefSummary } from "../prospect-lists/brief-summary";
import { summarizeCompanyFacts } from "../qualification/company-facts";

// A stronger model than the pipeline's qualifier (Sonnet), so the measurement isn't just the
// qualifier grading its own decisions.
const JUDGE_MODEL = "claude-opus-5";

const VERDICTS = ["match", "partial", "mismatch"] as const;
export type Verdict = (typeof VERDICTS)[number];

export interface JudgedItem {
  verdict: Verdict;
  reason: string;
}

// Keyed by ScrapedCompany.id / Prospect.id.
export interface Judgement {
  companies: Map<string, JudgedItem>;
  prospects: Map<string, JudgedItem>;
}

const NOT_JUDGED: JudgedItem = { verdict: "mismatch", reason: "Non évalué par le juge" };

const verdictListSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      ref: { type: "string" },
      verdict: { type: "string", enum: VERDICTS },
      reason: { type: "string", description: "One sentence, in French." },
    },
    required: ["ref", "verdict", "reason"],
  },
};

const JUDGE_INSTRUCTIONS = `You are auditing the output of a B2B prospecting engine against the seller's brief. Judge strictly from the data shown — never assume facts that aren't there.

Company verdicts:
- match: clearly the kind of company the brief targets (activity, size if known, location), not excluded — a plausible buyer of the offer.
- partial: plausible but one criterion is uncertain or slightly off (size unknown, a multinational with only a local office in the target location, adjacent activity).
- mismatch: wrong activity, an excluded category, or clearly outside the target location.

Prospect verdicts:
- match: currently holds a role equivalent to one of the target titles (any language or common synonym, e.g. DRH = HR Director = Head of People), is a plausible decision-maker for this offer, and works at a company that is a match or partial.
- partial: adjacent role (e.g. HR Business Partner for an HR Director target), or based outside the target location at an otherwise good company.
- mismatch: unrelated role, a past/former role, or the company is a mismatch.

A prospect with no person headline is a company record itself (an establishment, an agency, or a freelancer listed under their own name). For a local-business brief that is expected — judge it like a company. For an agency brief, an agency record with a direct contact is at best partial; a freelancer listed under their own name can be a match.

Return a verdict for every company and every prospect listed.`;

export async function judgeList(
  anthropic: Anthropic,
  list: ProspectList,
  companies: ScrapedCompany[],
  prospects: Prospect[],
): Promise<Judgement> {
  const judgement: Judgement = { companies: new Map(), prospects: new Map() };
  if (companies.length === 0 && prospects.length === 0) {
    return judgement;
  }

  // Short refs instead of UUIDs: cheaper, and no risk of the model mis-copying an id.
  const companyRefs = new Map(companies.map((company, i) => [`c${i + 1}`, company]));
  const refByCompanyId = new Map(Array.from(companyRefs, ([ref, company]) => [company.id, ref]));
  const prospectRefs = new Map(prospects.map((prospect, i) => [`p${i + 1}`, prospect]));

  const companiesText = Array.from(companyRefs, ([ref, company]) =>
    `${ref}: ${JSON.stringify(summarizeCompanyFacts(company.name, company.raw))}`,
  ).join("\n");
  const prospectsText = Array.from(prospectRefs, ([ref, prospect]) => {
    const raw = (prospect.raw ?? {}) as Record<string, unknown>;
    return `${ref}: ${JSON.stringify({
      name: `${prospect.firstName} ${prospect.lastName}`.trim(),
      headline: prospect.jobTitle,
      location: typeof raw.location === "string" ? raw.location : null,
      company: refByCompanyId.get(prospect.companyId),
    })}`;
  }).join("\n");

  const message = await anthropic.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 4096,
    tools: [
      {
        name: "record_judgement",
        description: "Record a relevance verdict for every company and every prospect.",
        input_schema: {
          type: "object",
          properties: { companies: verdictListSchema, prospects: verdictListSchema },
          required: ["companies", "prospects"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "record_judgement" },
    messages: [
      {
        role: "user",
        content: `${JUDGE_INSTRUCTIONS}\n\nSeller's brief:\n${buildBriefSummary(list)}\n\nCompanies:\n${companiesText || "(none)"}\n\nProspects:\n${prospectsText || "(none)"}`,
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use") as any;
  const output = toolUse.input as {
    companies: { ref: string; verdict: Verdict; reason: string }[];
    prospects: { ref: string; verdict: Verdict; reason: string }[];
  };

  for (const item of output.companies) {
    const company = companyRefs.get(item.ref);
    if (company) judgement.companies.set(company.id, { verdict: item.verdict, reason: item.reason });
  }
  for (const item of output.prospects) {
    const prospect = prospectRefs.get(item.ref);
    if (prospect) judgement.prospects.set(prospect.id, { verdict: item.verdict, reason: item.reason });
  }
  // Anything the judge skipped counts against relevance rather than silently inflating it.
  for (const company of companies) {
    if (!judgement.companies.has(company.id)) judgement.companies.set(company.id, NOT_JUDGED);
  }
  for (const prospect of prospects) {
    if (!judgement.prospects.has(prospect.id)) judgement.prospects.set(prospect.id, NOT_JUDGED);
  }

  return judgement;
}
