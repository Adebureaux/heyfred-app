export const TEMPLATE_TAGS = [
  "prenom",
  "nom",
  "entreprise",
  "secteur",
  "poste",
] as const;

export type TemplateTag = (typeof TEMPLATE_TAGS)[number];
