import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface HostedAuthParams {
  internalUserId: string;
  notifyUrl: string;
  successRedirectUrl: string;
  failureRedirectUrl: string;
}

interface DecisionMakerSearchParams {
  accountId: string;
  companyId: string;
  jobTitles: string[];
  limit: number;
}

export interface UnipileProfileResult {
  public_identifier?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  headline?: string;
  profile_url?: string;
  [key: string]: unknown;
}

export interface UnipileAccountSummary {
  id: string;
  type: string;
  name: string;
}

@Injectable()
export class UnipileService {
  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    return this.config.getOrThrow<string>("UNIPILE_BASE_URL");
  }

  private get apiKey(): string | undefined {
    return this.config.get<string>("UNIPILE_API_KEY") || undefined;
  }

  async startHostedAuth(params: HostedAuthParams): Promise<{ url: string }> {
    return this.request<{ url: string }>("POST", "/hosted/accounts/link", {
      type: "create",
      providers: ["LINKEDIN"],
      api_url: this.baseUrl,
      expiresOn: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      name: params.internalUserId,
      notify_url: params.notifyUrl,
      success_redirect_url: params.successRedirectUrl,
      failure_redirect_url: params.failureRedirectUrl,
    });
  }

  // Accounts connected outside our hosted-auth flow (e.g. Unipile's cookie-based connection
  // method, used directly against their API/dashboard) never trigger our webhook — this lets us
  // pull the real connected accounts directly instead, as a manual "sync" action.
  async listAccounts(): Promise<UnipileAccountSummary[]> {
    const response = await this.request<{ items: { id: string; type: string; name: string }[] }>(
      "GET",
      "/accounts",
    );
    return response.items;
  }

  async resolveCompanyId(accountId: string, companyName: string): Promise<string | null> {
    const response = await this.request<{ items: { id: string; title: string }[] }>(
      "GET",
      `/linkedin/search/parameters?account_id=${accountId}&type=COMPANY&keywords=${encodeURIComponent(companyName)}&limit=1`,
    );
    return response.items[0]?.id ?? null;
  }

  async searchDecisionMakers(params: DecisionMakerSearchParams): Promise<UnipileProfileResult[]> {
    const response = await this.request<{ items: UnipileProfileResult[] }>(
      "POST",
      `/linkedin/search?account_id=${params.accountId}&limit=${params.limit}`,
      {
        api: "classic",
        category: "people",
        company: [params.companyId],
        advanced_keywords: { title: params.jobTitles.join(" OR ") },
      },
    );
    return response.items;
  }

  // ⚠️ Paid Unipile API call — consumes real account credits on every invocation.
  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": this.apiKey ?? "",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Unipile request failed (${response.status}): ${await response.text()}`);
    }

    return response.json();
  }
}
