import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ProspectList } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";
import { ApifyStoreCandidate, ApifyStoreService } from "./apify-store.service";

const SELECTION_MODEL = "claude-sonnet-5";
const INPUT_GENERATION_MODEL = "claude-haiku-4-5-20251001";

// Confirmed by real testing: a moderately strict prompt instruction wasn't enough to stop
// Claude picking a people/profile-search actor for the company-search stage (its title
// happened to also mention "Company" as one of its filters). Filtering candidates out
// structurally, before Claude ever sees them, is more reliable than relying on the prompt.
const PEOPLE_SEARCH_SIGNALS = [
  "people search",
  "profile search",
  "profile scraper",
  "candidate",
  "recruiter",
  "individual profile",
];

function looksLikePeopleSearch(candidate: ApifyStoreCandidate): boolean {
  const text = `${candidate.title} ${candidate.description}`.toLowerCase();
  return PEOPLE_SEARCH_SIGNALS.some((signal) => text.includes(signal));
}

function buildBriefSummary(brief: ProspectList): string {
  return [
    `What the company offers: ${brief.offerDescription}`,
    brief.valueProposition && `Value proposition: ${brief.valueProposition}`,
    brief.targetIndustries.length && `Target industries: ${brief.targetIndustries.join(", ")}`,
    (brief.targetCompanySizeMin || brief.targetCompanySizeMax) &&
      `Target company size: ${brief.targetCompanySizeMin ?? "?"} - ${brief.targetCompanySizeMax ?? "?"} employees`,
    brief.targetLocations.length && `Target locations: ${brief.targetLocations.join(", ")}`,
    brief.targetJobTitles.length && `Target decision-maker titles: ${brief.targetJobTitles.join(", ")}`,
    brief.additionalCriteria && `Additional criteria: ${brief.additionalCriteria}`,
    brief.exclusions && `Exclusions: ${brief.exclusions}`,
  ]
    .filter(Boolean)
    .join("\n");
}

@Injectable()
export class AiActorSelectionService {
  constructor(
    private readonly config: ConfigService,
    private readonly apifyStore: ApifyStoreService,
  ) {}

  private get anthropic(): Anthropic {
    const workspaceId = this.config.get<string>("ANTHROPIC_WORKSPACE_ID");
    return new Anthropic({
      apiKey: this.config.get<string>("ANTHROPIC_API_KEY"),
      defaultHeaders: workspaceId ? { "anthropic-workspace-id": workspaceId } : undefined,
    });
  }

  async selectActor(brief: ProspectList): Promise<{ actorId: string; reasoning: string }> {
    // Apify's store search does a literal/substring match, not semantic search — a long,
    // sentence-like query (e.g. the raw offer description) reliably returns zero results.
    // Confirmed against the real endpoint: short, domain-oriented terms work well.
    const keywords = ["company search", ...brief.targetIndustries.slice(0, 3)].join(" ");
    const allCandidates = await this.apifyStore.searchCandidateActors(keywords);
    const candidates = allCandidates.filter((c) => !looksLikePeopleSearch(c));
    // Fall back to the unfiltered list rather than crash on an empty candidate set — better to
    // risk a people-search actor slipping through than to have nothing to select from at all.
    return this.pickActor(brief, candidates.length > 0 ? candidates : allCandidates);
  }

  async buildActorInput(actorId: string, brief: ProspectList): Promise<Record<string, unknown>> {
    const inputSchema = await this.apifyStore.getActorInputSchema(actorId);
    return this.generateActorInput(brief, inputSchema);
  }

  private async pickActor(
    brief: ProspectList,
    candidates: { id: string; title: string; description: string }[],
  ): Promise<{ actorId: string; reasoning: string }> {
    const candidateList = candidates
      .map((c) => `- ${c.id}: ${c.title} — ${c.description}`)
      .join("\n");
    const message = await this.anthropic.messages.create({
      model: SELECTION_MODEL,
      max_tokens: 1024,
      tools: [
        {
          name: "select_actor",
          description:
            "Select the single best Apify actor for finding companies matching this prospecting brief.",
          input_schema: {
            type: "object",
            properties: {
              actorId: { type: "string", enum: candidates.map((c) => c.id) },
              reasoning: { type: "string", description: "One or two sentences explaining the choice." },
            },
            required: ["actorId", "reasoning"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "select_actor" },
      messages: [
        {
          role: "user",
          content: `Prospecting brief:\n${buildBriefSummary(brief)}\n\nCandidate Apify actors:\n${candidateList}`,
        },
      ],
    });
    const toolUse = message.content.find((block) => block.type === "tool_use") as any;
    return toolUse.input as { actorId: string; reasoning: string };
  }

  private async generateActorInput(
    brief: ProspectList,
    inputSchema: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const message = await this.anthropic.messages.create({
      model: INPUT_GENERATION_MODEL,
      max_tokens: 1024,
      tools: [
        {
          name: "generate_actor_input",
          description: "Generate the Apify actor input matching this prospecting brief.",
          input_schema: inputSchema as any,
        },
      ],
      tool_choice: { type: "tool", name: "generate_actor_input" },
      messages: [
        {
          role: "user",
          content: `Prospecting brief:\n${buildBriefSummary(brief)}\n\nImportant:\n- For any field that references a coded/ID-based value (e.g. an industry ID, category ID, or similar internal code) whose schema does NOT give you an explicit "enum" list of valid values, do not guess a value — omit that field entirely. Actors often reject guessed codes at runtime even when they look plausible. Prefer free-text fields (like a search query or keywords) to express that same criterion instead.\n- For any free-text search/query field, use short keyword-style terms (e.g. "AI sales tool SaaS"), never a full sentence copied from the brief — this kind of underlying search (LinkedIn, Google, etc.) matches on keywords, not natural language, and a sentence-like query reliably returns zero results while still being billed.`,
        },
      ],
    });
    const toolUse = message.content.find((block) => block.type === "tool_use") as any;
    return toolUse.input as Record<string, unknown>;
  }
}
