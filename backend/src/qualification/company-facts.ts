// Company sources return heterogeneous shapes (and a full LinkedIn company page is huge). These
// are the fields that actually help judge whether a company fits a brief; the rest is noise.
const COMPANY_FACT_KEYS = [
  "industry",
  "industries",
  "categoryName",
  "categoryLabel",
  "services",
  "employeeCount",
  "employeeCountRange",
  "employeesLabel",
  "location",
  "address",
  "country",
  "city",
  "headquarters",
  "tagline",
  "description",
  "summary",
  "website",
];

function truncate(value: unknown, max: number): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function summarizeCompanyFacts(name: string, raw: unknown): Record<string, string> {
  const data = (raw ?? {}) as Record<string, unknown>;
  const facts: Record<string, string> = { name };
  for (const key of COMPANY_FACT_KEYS) {
    const value = data[key];
    if (value !== undefined && value !== null && value !== "") {
      facts[key] = truncate(value, 300);
    }
  }
  // Where a company has offices matters as much as its headquarters (e.g. a US-headquartered
  // company with a real Paris office can still fit a France brief).
  if (Array.isArray(data.offices) && data.offices.length > 0) {
    facts.offices = data.offices
      .map((office) => (office as { parsed?: { text?: string } })?.parsed?.text)
      .filter(Boolean)
      .slice(0, 8)
      .join("; ");
  }
  if (Object.keys(facts).length === 1) {
    facts.raw = truncate(data, 1500);
  }
  return facts;
}
