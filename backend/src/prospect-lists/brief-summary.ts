import { ProspectList, ProspectTargetType } from "@prisma/client";

const TARGET_TYPE_DESCRIPTIONS: Record<ProspectTargetType, string> = {
  [ProspectTargetType.B2B_COMPANIES]: "B2B companies — prospects are named decision-makers",
  [ProspectTargetType.AGENCIES_FREELANCERS]:
    "agencies and freelancers — prospects are their founders/owners, or the agency itself when no person is found",
  [ProspectTargetType.LOCAL_BUSINESSES]:
    "local businesses — the prospect is the establishment itself, reached via its phone/email",
};

export function buildBriefSummary(brief: ProspectList): string {
  return [
    `Target type: ${TARGET_TYPE_DESCRIPTIONS[brief.targetType]}`,
    `What the company offers: ${brief.offerDescription}`,
    brief.valueProposition && `Value proposition: ${brief.valueProposition}`,
    brief.targetIndustries.length && `Target industries: ${brief.targetIndustries.join(", ")}`,
    (brief.targetCompanySizeMin || brief.targetCompanySizeMax) &&
      `Target company size: ${brief.targetCompanySizeMin ?? "?"} - ${brief.targetCompanySizeMax ?? "?"} employees`,
    brief.targetLocations.length && `Target locations: ${brief.targetLocations.join(", ")}`,
    brief.targetJobTitles.length && `Target decision-maker titles: ${brief.targetJobTitles.join(", ")}`,
    brief.additionalCriteria && `Additional criteria: ${brief.additionalCriteria}`,
    brief.exclusions && `Exclusions: ${brief.exclusions}`,
  ]
    .filter(Boolean)
    .join("\n");
}
