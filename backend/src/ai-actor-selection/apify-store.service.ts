import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface ApifyStoreCandidate {
  id: string;
  title: string;
  description: string;
}

@Injectable()
export class ApifyStoreService {
  constructor(private readonly config: ConfigService) {}

  private get token(): string | undefined {
    return this.config.get<string>("APIFY_API_TOKEN") || undefined;
  }

  async searchCandidateActors(keywords: string, limit = 8): Promise<ApifyStoreCandidate[]> {
    const response = await this.request<{ data: { items: ApifyStoreCandidate[] } }>(
      `/store?search=${encodeURIComponent(keywords)}&responseFormat=agent&limit=${limit}`,
    );
    return response.data.items;
  }

  async getActorInputSchema(actorId: string): Promise<Record<string, unknown>> {
    // The actor-detail endpoint (/acts/{id}) does not include the input schema — it only shows
    // up on the actor's default build, nested under actorDefinition.input. Confirmed by
    // inspecting a real response; the actor-detail endpoint was tried first and doesn't have it.
    const response = await this.request<{
      data: { actorDefinition?: { input?: Record<string, unknown> } };
    }>(`/acts/${actorId}/builds/default`);
    return response.data.actorDefinition?.input ?? {};
  }

  // ⚠️ Paid Apify API call — consumes real account credits on every invocation.
  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`https://api.apify.com/v2${path}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!response.ok) {
      throw new Error(`Apify Store request failed (${response.status}): ${await response.text()}`);
    }

    return response.json();
  }
}
