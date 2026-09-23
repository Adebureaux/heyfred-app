import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ApifyRunnerService {
  constructor(private readonly config: ConfigService) {}

  private get token(): string | undefined {
    return this.config.get<string>("APIFY_API_TOKEN") || undefined;
  }

  // ⚠️ Paid Apify API call — consumes real account credits on every invocation.
  async runActor(actorId: string, input: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    const response = await fetch(
      `https://api.apify.com/v2/actors/${actorId}/run-sync-get-dataset-items`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(input),
      },
    );
    if (!response.ok) {
      throw new Error(`Apify actor ${actorId} failed (${response.status}): ${await response.text()}`);
    }
    return response.json();
  }
}
