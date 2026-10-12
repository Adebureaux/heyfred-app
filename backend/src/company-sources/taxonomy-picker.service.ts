import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";

const PICKER_MODEL = "claude-haiku-4-5-20251001";
const MAX_PICKS = 5;

// Maps what the user typed (any wording, any language) onto the fixed list of options a source
// accepts. The model only chooses among the option labels themselves — enforced by the tool
// schema's enum — and never sees or produces codes: confirmed by real testing (2026-10-12) that
// asking it to correlate labels with codes across a 400+ entry list picked "Language Schools" for
// "Software Development". Code maps the chosen labels back to whatever the source needs.
@Injectable()
export class TaxonomyPickerService {
  constructor(private readonly config: ConfigService) {}

  private get anthropic(): Anthropic {
    const workspaceId = this.config.get<string>("ANTHROPIC_WORKSPACE_ID");
    return new Anthropic({
      apiKey: this.config.get<string>("ANTHROPIC_API_KEY"),
      defaultHeaders: workspaceId ? { "anthropic-workspace-id": workspaceId } : undefined,
    });
  }

  async pick(userTerms: string[], options: string[], optionsDescription: string): Promise<string[]> {
    const message = await this.anthropic.messages.create({
      model: PICKER_MODEL,
      max_tokens: 512,
      tools: [
        {
          name: "pick_options",
          description: `Record the allowed option(s) that match what the user means. ${optionsDescription}`,
          input_schema: {
            type: "object",
            properties: {
              picks: {
                type: "array",
                items: { type: "string", enum: options },
                minItems: 1,
                maxItems: MAX_PICKS,
              },
            },
            required: ["picks"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "pick_options" },
      messages: [
        {
          role: "user",
          content: `The user described their target as: ${userTerms.map((term) => `"${term}"`).join(", ")}.\nPick the allowed option(s) that genuinely correspond to what they mean — at most ${MAX_PICKS}, and only close matches.`,
        },
      ],
    });

    const toolUse = message.content.find((block) => block.type === "tool_use") as any;
    // The enum constrains the model, but an out-of-list value would make the actor reject the
    // whole run, so keep only exact options.
    const picks = ((toolUse.input as { picks: string[] }).picks ?? []).filter((pick) =>
      options.includes(pick),
    );
    if (picks.length === 0) {
      throw new Error(`Could not match "${userTerms.join(", ")}" to any option of this source.`);
    }
    return picks;
  }
}
