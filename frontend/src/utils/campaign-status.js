import { CampaignStatus } from "@heyfred/shared";

export const CAMPAIGN_STATUS_LABELS = {
  [CampaignStatus.DRAFT_TARGETING]: "Ciblage en cours",
  [CampaignStatus.TARGETING_SET]: "Ciblage défini",
  [CampaignStatus.SCRAPING]: "Recherche en cours",
  [CampaignStatus.SCRAPED]: "Contacts trouvés",
  [CampaignStatus.DRAFT_MESSAGING]: "Message en cours",
  [CampaignStatus.READY]: "Prête à lancer",
  [CampaignStatus.RUNNING]: "En cours",
  [CampaignStatus.COMPLETED]: "Terminée",
  [CampaignStatus.FAILED]: "Échec",
};

export const CAMPAIGN_STATUS_COLORS = {
  [CampaignStatus.DRAFT_TARGETING]: "grey",
  [CampaignStatus.TARGETING_SET]: "blue",
  [CampaignStatus.SCRAPING]: "orange",
  [CampaignStatus.SCRAPED]: "teal",
  [CampaignStatus.DRAFT_MESSAGING]: "blue",
  [CampaignStatus.READY]: "purple",
  [CampaignStatus.RUNNING]: "primary",
  [CampaignStatus.COMPLETED]: "positive",
  [CampaignStatus.FAILED]: "negative",
};
