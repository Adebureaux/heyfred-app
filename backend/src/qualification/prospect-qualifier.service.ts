import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import { FitVerdict, ProspectList } from "@prisma/client";
import { buildBriefSummary } from "../prospect-lists/brief-summary";
import { summarizeCompanyFacts } from "./company-facts";

const QUALIFIER_MODEL = "claude-sonnet-5";

export interface Fit {
  verdict: FitVerdict;
  reason: string;
}

export interface PersonCandidate {
  name: string;
  headline: string;
  location: string | null;
}

const VERDICTS: Record<string, FitVerdict> = {
  match: FitVerdict.MATCH,
  partial: FitVerdict.PARTIAL,
  mismatch: FitVerdict.MISMATCH,
};

const COMPANY_INSTRUCTIONS = `You qualify candidate companies for a prospecting list, deciding which ones are worth contacting for the seller's offer. Judge strictly from the data shown — never assume facts that aren't there.
- match: clearly the kind of company the brief targets (activity, location, size when known) and not excluded — a plausible buyer of the offer.
- partial: plausible, but one criterion is uncertain or slightly off (size unknown, adjacent activity, headquartered elsewhere with a real office in the target location).
- mismatch: wrong activity, an excluded category, clearly outside the target location, or clearly outside the size range.`;

const PEOPLE_INSTRUCTIONS = `You qualify people found on LinkedIn as decision-makers to contact for the seller's offer. Judge strictly from the data shown.
- match: currently holds a role equivalent to one of the target titles — in any language or common synonym (e.g. DRH = Directeur·rice des ressources humaines = HR Director = Head of People; for a small company Fondateur = Founder = CEO) — at this company, senior enough to decide on or strongly influence the purchase.
- partial: adjacent or more junior role in the same function, or based outside the target location.
- mismatch: unrelated role, an assistant or junior position, a past/former role, or someone who clearly works at another company.`;

// Decides which sourced companies and which people found at them actually fit the brief. Sources
// and LinkedIn search are loose (wrong country, excluded categories, a "DRH" in a department
// name), and only judgment over each candidate's data catches that — confirmed by the eval
// harness (2026-10-12), whose judge flagged exactly these misses.
@Injectable()
export class ProspectQualifierService {
  constructor(private readonly config: ConfigService) {}

  private get anthropic(): Anthropic {
    const workspaceId = this.config.get<string>("ANTHROPIC_WORKSPACE_ID");
    return new Anthropic({
      apiKey: this.config.get<string>("ANTHROPIC_API_KEY"),
      defaultHeaders: workspaceId ? { "anthropic-workspace-id": workspaceId } : undefined,
    });
  }

  qualifyCompanies(list: ProspectList, companies: { name: string; raw: unknown }[]): Promise<Fit[]> {
    const items = companies.map((company) => JSON.stringify(summarizeCompanyFacts(company.name, company.raw)));
    return this.qualify(COMPANY_INSTRUCTIONS, list, "Candidate companies", items);
  }

  qualifyPeople(
    list: ProspectList,
    company: { name: string; raw: unknown },
    people: PersonCandidate[],
  ): Promise<Fit[]> {
    const instructions = `${PEOPLE_INSTRUCTIONS}\n\nThey were found by searching LinkedIn for people currently at this company: ${JSON.stringify(summarizeCompanyFacts(company.name, company.raw))}`;
    return this.qualify(instructions, list, "Candidate people", people.map((person) => JSON.stringify(person)));
  }

  // Returns one fit per item, in the same order.
  private async qualify(instructions: string, list: ProspectList, itemsLabel: string, items: string[]): Promise<Fit[]> {
    if (items.length === 0) return [];
    const refs = items.map((_, i) => String(i + 1));

    const message = await this.anthropic.messages.create({
      model: QUALIFIER_MODEL,
      max_tokens: 4096,
      tools: [
        {
          name: "record_fit",
          description: "Record a fit verdict for every candidate.",
          input_schema: {
            type: "object",
            properties: {
              verdicts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    ref: { type: "string", enum: refs },
                    verdict: { type: "string", enum: Object.keys(VERDICTS) },
                    reason: { type: "string", description: "One short sentence, in French." },
                  },
                  required: ["ref", "verdict", "reason"],
                },
              },
            },
            required: ["verdicts"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "record_fit" },
      messages: [
        {
          role: "user",
          content: `${instructions}\n\nSeller's brief:\n${buildBriefSummary(list)}\n\n${itemsLabel}:\n${items.map((item, i) => `${refs[i]}: ${item}`).join("\n")}`,
        },
      ],
    });

    const toolUse = message.content.find((block) => block.type === "tool_use") as any;
    const verdicts = (toolUse.input as { verdicts: { ref: string; verdict: string; reason: string }[] }).verdicts ?? [];
    const byRef = new Map(verdicts.map((item) => [item.ref, item]));
    return refs.map((ref) => {
      const item = byRef.get(ref);
      // Anything the model skipped counts as not fitting rather than being kept by default.
      return item && VERDICTS[item.verdict]
        ? { verdict: VERDICTS[item.verdict], reason: item.reason }
        : { verdict: FitVerdict.MISMATCH, reason: "Non évalué" };
    });
  }
}
