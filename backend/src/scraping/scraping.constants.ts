export const COMPANY_SEARCH_QUEUE = "prospect-company-search";
export const PROSPECT_ENRICHMENT_QUEUE = "prospect-enrichment";

// Bounds for the user-facing "how many prospects do you want to find?" field.
export const MIN_PROSPECTS_PER_RUN = 1;
export const MAX_PROSPECTS_PER_RUN = 50;

// Fetch ~3x the companies strictly needed: qualification discards the ones that don't fit the
// brief (confirmed by the eval harness, 2026-10-12: a third of LinkedIn's results were
// headquartered abroad or in excluded categories), and company results cost at most ~$0.01 each
// — far less than the LinkedIn searches that qualifying first saves.
const COMPANY_OVERSAMPLING = 3;
const MIN_COMPANY_POOL = 10;

// Absolute safety ceilings enforced server-side regardless of the user-requested count. An
// actor or Unipile search doesn't always honor a requested limit exactly, so these bound the
// worst case even if maxProspects is set high.
const ABSOLUTE_MAX_COMPANIES_PER_RUN = 25;
export const ABSOLUTE_MAX_PROSPECTS_PER_COMPANY = 10;

// prospectsPerCompany comes from the company source (a LinkedIn company yields a couple of
// decision-makers; an agency listing or a local establishment is itself one prospect).
export function companyPoolSize(maxProspects: number, prospectsPerCompany: number): number {
  const needed = Math.ceil(maxProspects / prospectsPerCompany);
  return Math.min(Math.max(needed * COMPANY_OVERSAMPLING, MIN_COMPANY_POOL), ABSOLUTE_MAX_COMPANIES_PER_RUN);
}
