import { ProspectList } from "@prisma/client";

export interface SourcedCompany {
  name: string;
  domain: string | null;
  linkedinUrl: string | null;
  linkedinCompanyId: string | null;
  email: string | null;
  phone: string | null;
  raw: Record<string, unknown>;
}

// One vetted Apify actor per kind of target, with a hand-written input builder and a known
// output shape — instead of letting an AI pick any actor from the store and invent its input.
export interface CompanySource {
  actorId: string;
  // How many prospects one company typically yields; sizes the company pool for a budget.
  prospectsPerCompany: number;
  buildInput(list: ProspectList, poolSize: number): Promise<Record<string, unknown>>;
  toCompanies(items: Record<string, unknown>[]): SourcedCompany[];
}

export function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function domainOf(website: string | null): string | null {
  return website ? website.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "") : null;
}
