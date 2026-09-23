/**
 * Since the Apify actor is chosen dynamically by the AI (not a single fixed actor with a known
 * schema), its dataset item shape isn't known in advance. This maps common field-name variants
 * seen across LinkedIn/company-data actors into our ScrapedCompany shape, falling back
 * gracefully — the full raw item is always kept regardless, so nothing found here is lost.
 */
export interface MappedCompany {
  name: string;
  domain: string | null;
  linkedinUrl: string | null;
  raw: Record<string, unknown>;
}

function firstString(...values: unknown[]): string | null {
  const found = values.find((value) => typeof value === "string" && value.length > 0);
  return (found as string | undefined) ?? null;
}

export function mapToScrapedCompany(raw: Record<string, unknown>): MappedCompany {
  const website = firstString(raw.website, raw.domain, raw.url);
  return {
    name: firstString(raw.name, raw.companyName, raw.title) ?? "Unknown company",
    domain: website ? website.replace(/^https?:\/\//, "").replace(/\/$/, "") : null,
    linkedinUrl: firstString(raw.linkedinUrl, raw.linkedin_url, raw.profileUrl),
    raw,
  };
}
