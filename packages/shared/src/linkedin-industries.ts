/**
 * Curated subset of LinkedIn's official Industry Codes V2 taxonomy
 * (https://learn.microsoft.com/en-us/linkedin/shared/references/reference-tables/industry-codes-v2),
 * limited to industries relevant for B2B prospecting. The `id` values match the
 * `industries[].id` field returned by the harvestapi/linkedin-company-search Apify
 * actor and are the values sent as `industryIds` in scraping requests.
 */
export interface LinkedinIndustry {
  id: string;
  name: string;
}

export const LINKEDIN_INDUSTRIES: LinkedinIndustry[] = [
  { id: "47", name: "Accounting" },
  { id: "80", name: "Advertising Services" },
  { id: "3249", name: "Artificial Intelligence and Machine Learning" },
  { id: "41", name: "Banking" },
  { id: "129", name: "Capital Markets" },
  { id: "1685", name: "Commercial Real Estate" },
  { id: "24", name: "Computers and Electronics Manufacturing" },
  { id: "48", name: "Construction" },
  { id: "91", name: "Consumer Services" },
  { id: "6", name: "Cybersecurity" },
  { id: "1999", name: "Education" },
  { id: "132", name: "E-Learning Providers" },
  { id: "28", name: "Entertainment Providers" },
  { id: "43", name: "Financial Services" },
  { id: "201", name: "Farming, Ranching, Forestry" },
  { id: "75", name: "Government Administration" },
  { id: "14", name: "Hospitals and Health Care" },
  { id: "31", name: "Hospitality" },
  { id: "5", name: "IT Services and IT Consulting" },
  { id: "143", name: "Information Technology Infrastructure" },
  { id: "42", name: "Insurance" },
  { id: "45", name: "Investment Banking" },
  { id: "46", name: "Investment Management" },
  { id: "1809", name: "Law Practice" },
  { id: "1811", name: "Legal Services" },
  { id: "25", name: "Manufacturing" },
  { id: "17", name: "Medical Equipment Manufacturing" },
  { id: "13", name: "Medical Practices" },
  { id: "56", name: "Mining" },
  { id: "11", name: "Media and Internet" },
  { id: "100", name: "Non-profit Organizations" },
  { id: "57", name: "Oil and Gas" },
  { id: "332", name: "Oil, Gas, and Mining" },
  { id: "15", name: "Pharmaceutical Manufacturing" },
  { id: "1810", name: "Professional Services" },
  { id: "105", name: "Professional Training and Coaching" },
  { id: "2558", name: "Publishing" },
  { id: "44", name: "Real Estate" },
  { id: "1687", name: "Real Estate Agents and Brokers" },
  { id: "49", name: "Retail" },
  { id: "2411", name: "Specialty Retail" },
  { id: "4", name: "Software Development" },
  { id: "104", name: "Staffing and Recruiting" },
  { id: "1923", name: "Executive Search Services" },
  { id: "59", name: "Telecommunications" },
  { id: "50", name: "Transportation and Logistics" },
  { id: "2787", name: "Utilities - Electric and Gas" },
  { id: "2791", name: "Utilities - Renewable and Alternative Energy" },
  { id: "106", name: "Venture Capital and Private Equity Principals" },
  { id: "2701", name: "Wholesale - Business to Business" },
].sort((a, b) => a.name.localeCompare(b.name));
