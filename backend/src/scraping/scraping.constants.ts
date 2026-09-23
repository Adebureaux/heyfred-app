export const COMPANY_SEARCH_QUEUE = "prospect-company-search";
export const PROSPECT_ENRICHMENT_QUEUE = "prospect-enrichment";
export const ENRICHMENT_CONCURRENCY = 5;

// Temporary cost-safety caps for the first real end-to-end test — hard limits enforced
// server-side regardless of what the AI-generated actor input requests, since actors don't
// always honor a requested maxItems exactly. Raise once real pricing/behavior is confirmed.
export const MAX_COMPANIES_PER_RUN = 1;
export const MAX_PROSPECTS_PER_COMPANY = 2;
