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
  jobTitle: string;
  locationId?: string | null;
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

// Spacing between LinkedIn-facing calls made through the user's account.
const LINKEDIN_CALL_INTERVAL_MS = 3000;
const LINKEDIN_CALL_JITTER_MS = 1500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class UnipileService {
  // Confirmed by real testing (2026-10-12): bursts of searches (~3/s, from companies searched in
  // parallel) made LinkedIn silently answer with zero results for several minutes — no error,
  // just empty answers, which sank whole runs. Bursts like that also look automated and put the
  // user's account at risk of restriction. So every LinkedIn-facing call goes through this one
  // queue: one at a time, with a human-like gap between them.
  private linkedInQueue: Promise<unknown> = Promise.resolve();

  constructor(private readonly config: ConfigService) {}

  private throughLinkedInQueue<T>(call: () => Promise<T>): Promise<T> {
    const result = this.linkedInQueue.then(call);
    this.linkedInQueue = result
      .catch(() => undefined)
      .then(() => sleep(LINKEDIN_CALL_INTERVAL_MS + Math.random() * LINKEDIN_CALL_JITTER_MS));
    return result;
  }

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
    const response = await this.throughLinkedInQueue(() =>
      this.request<{ items: { id: string; title: string }[] }>(
        "GET",
        `/linkedin/search/parameters?account_id=${accountId}&type=COMPANY&keywords=${encodeURIComponent(companyName)}&limit=1`,
      ),
    );
    return response.items[0]?.id ?? null;
  }

  // Confirmed by real testing (2026-09-24): the decision-maker search had no location filter at
  // all — searching for people at "ViiV Healthcare" (matched for a France-targeted brief)
  // returned its US division head with nothing to stop it. Resolve the target location to a
  // LinkedIn geo ID the same way company names are resolved, so people search can filter by it.
  async resolveLocationId(accountId: string, locationName: string): Promise<string | null> {
    const response = await this.throughLinkedInQueue(() =>
      this.request<{ items: { id: string; title: string }[] }>(
        "GET",
        `/linkedin/search/parameters?account_id=${accountId}&type=LOCATION&keywords=${encodeURIComponent(locationName)}&limit=1`,
      ),
    );
    return response.items[0]?.id ?? null;
  }

  // Confirmed by real testing (2026-09-24): `advanced_keywords.title` does NOT support boolean
  // "OR" syntax in any form tried (plain "A OR B", quoted "\"A\" OR \"B\"") — every one of those
  // silently returned zero results even for a company with a clear real match, while the exact
  // same single term alone matched correctly. Joining multiple target titles into one query was
  // therefore breaking every multi-title search. This takes ONE title per call; the caller loops
  // over titles individually and merges results.
  async searchDecisionMakers(params: DecisionMakerSearchParams): Promise<UnipileProfileResult[]> {
    const response = await this.throughLinkedInQueue(() =>
      this.request<{ items: UnipileProfileResult[] }>(
        "POST",
        `/linkedin/search?account_id=${params.accountId}&limit=${params.limit}`,
        {
          api: "classic",
          category: "people",
          company: [params.companyId],
          ...(params.locationId ? { location: [params.locationId] } : {}),
          advanced_keywords: { title: params.jobTitle },
        },
      ),
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
