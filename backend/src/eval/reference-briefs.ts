import { ProspectTargetType } from "@prisma/client";
import { CreateProspectListDto } from "../prospect-lists/dto/create-prospect-list.dto";

export interface ReferenceBrief {
  id: string;
  brief: CreateProspectListDto;
}

// Written the way a real French SMB client would fill the form (loose industry names, French job
// titles) rather than in LinkedIn's exact taxonomy, so the harness measures real-world input.
// maxProspects is kept low: every run spends real Apify/Claude credits and LinkedIn searches.
export const REFERENCE_BRIEFS: ReferenceBrief[] = [
  {
    id: "agences-web-freelances",
    brief: {
      targetType: ProspectTargetType.AGENCIES_FREELANCERS,
      name: "Agences web & freelances",
      offerDescription:
        "Logiciel de facturation, devis et suivi du temps conçu pour les freelances et les petites agences",
      valueProposition: "Fait gagner 4h par mois de gestion administrative",
      targetIndustries: ["Agence web", "Marketing digital", "Design graphique"],
      targetCompanySizeMin: 1,
      targetCompanySizeMax: 20,
      targetLocations: ["France"],
      targetJobTitles: ["Fondateur", "Gérant", "Freelance"],
      additionalCriteria:
        "Freelances indépendants et petites agences qui facturent des prestations web, design ou marketing",
      exclusions: "Grandes agences de plus de 50 personnes",
      maxProspects: 3,
    },
  },
  {
    id: "drh-scaleups-tech",
    brief: {
      targetType: ProspectTargetType.B2B_COMPANIES,
      name: "DRH scale-ups tech",
      offerDescription:
        "Plateforme d'onboarding RH qui automatise l'arrivée des nouveaux salariés (documents, matériel, suivi 30-60-90 jours)",
      valueProposition: "Réduit de 30% le temps de montée en compétence des nouvelles recrues",
      targetIndustries: ["Software Development", "SaaS"],
      targetCompanySizeMin: 50,
      targetCompanySizeMax: 500,
      targetLocations: ["France"],
      targetJobTitles: ["DRH", "Head of People", "Responsable RH"],
      additionalCriteria: "Entreprises en forte croissance qui recrutent beaucoup",
      exclusions: "Cabinets de recrutement, ESN",
      maxProspects: 3,
    },
  },
  {
    id: "directeurs-commerciaux-assurance",
    brief: {
      targetType: ProspectTargetType.B2B_COMPANIES,
      name: "Directeurs commerciaux assurance",
      offerDescription:
        "Outil d'aide à la vente qui centralise argumentaires et devis pour les équipes commerciales terrain",
      targetIndustries: ["Insurance"],
      targetCompanySizeMin: 50,
      targetCompanySizeMax: 1000,
      targetLocations: ["France"],
      targetJobTitles: ["Directeur commercial", "VP Sales", "Head of Sales"],
      additionalCriteria: "Courtiers et compagnies d'assurance avec une force de vente terrain",
      maxProspects: 3,
    },
  },
  {
    id: "restaurants-lyon",
    brief: {
      targetType: ProspectTargetType.LOCAL_BUSINESSES,
      name: "Restaurants indépendants Lyon",
      offerDescription: "Logiciel de réservation en ligne et de gestion des tables pour restaurants",
      targetIndustries: ["Restaurants"],
      targetCompanySizeMin: 5,
      targetCompanySizeMax: 50,
      targetLocations: ["Lyon"],
      additionalCriteria: "Restaurants indépendants, pas les chaînes",
      exclusions: "Chaînes et franchises de restauration rapide",
      maxProspects: 3,
    },
  },
  {
    id: "ecommerce-d2c",
    brief: {
      targetType: ProspectTargetType.B2B_COMPANIES,
      name: "Marques e-commerce D2C",
      offerDescription:
        "Logistique e-commerce externalisée : stockage, préparation et expédition des commandes",
      targetIndustries: ["E-commerce", "Retail"],
      targetCompanySizeMin: 10,
      targetCompanySizeMax: 200,
      targetLocations: ["France"],
      targetJobTitles: ["Head of E-commerce", "Directeur des opérations", "COO"],
      additionalCriteria: "Marques qui vendent en direct sur leur propre site (Shopify, etc.)",
      exclusions: "Marketplaces, grande distribution",
      maxProspects: 3,
    },
  },
  {
    id: "industrie-pme",
    brief: {
      targetType: ProspectTargetType.B2B_COMPANIES,
      name: "PME industrielles",
      offerDescription:
        "Capteurs IoT et logiciel de maintenance prédictive pour les machines de production",
      targetIndustries: ["Manufacturing", "Industrial Machinery"],
      targetCompanySizeMin: 50,
      targetCompanySizeMax: 250,
      targetLocations: ["France"],
      targetJobTitles: ["Directeur d'usine", "Directeur industriel", "Responsable maintenance"],
      additionalCriteria: "Sites de production avec un parc machines important",
      maxProspects: 3,
    },
  },
];
