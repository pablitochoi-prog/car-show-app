export type HelpAudience =
  | "REGISTRANT"
  | "ORGANIZER"
  | "JUDGE"
  | "SPECTATOR"
  | "ADMIN"
  | "GENERAL";

export type HelpCategory =
  | "getting-started"
  | "account-profile"
  | "event-registration"
  | "vehicle-registration"
  | "my-garage"
  | "dash-cards"
  | "event-setup"
  | "organizer-dashboard"
  | "stripe-setup"
  | "payments-fees"
  | "staff-roles"
  | "awards-judging"
  | "score-sheet-judging"
  | "judge-ballot-voting"
  | "public-voting"
  | "reports"
  | "buyer-inquiries"
  | "sms-notifications"
  | "troubleshooting"
  | "privacy-security";

export const HELP_CATEGORY_IDS: HelpCategory[] = [
  "getting-started",
  "account-profile",
  "event-registration",
  "vehicle-registration",
  "my-garage",
  "dash-cards",
  "event-setup",
  "organizer-dashboard",
  "stripe-setup",
  "payments-fees",
  "staff-roles",
  "awards-judging",
  "score-sheet-judging",
  "judge-ballot-voting",
  "public-voting",
  "reports",
  "buyer-inquiries",
  "sms-notifications",
  "troubleshooting",
  "privacy-security",
];

export type HelpVisibility =
  | "public"
  | "authenticated"
  | "organizerOnly"
  | "adminOnly";

export type HelpArticleStep = {
  title: string;
  body: string;
};

export type HelpArticleFaq = {
  question: string;
  answer: string;
};

export type HelpArticle = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  audience: HelpAudience;
  category: HelpCategory;
  keywords: string[];
  relatedWebsitePages: string[];
  relatedFeatures: string[];
  relatedArticleIds: string[];
  whoThisIsFor: string;
  whatThisHelpsYouDo: string;
  beforeYouStart: string[];
  stepByStepInstructions: HelpArticleStep[];
  whatHappensNext: string;
  frequentlyAskedQuestions: HelpArticleFaq[];
  articleBody: string;
  chatbotSummary: string;
  chatbotKeywords: string[];
  lastReviewedAt: string;
  published: boolean;
  sortOrder: number;
  visibility: HelpVisibility;
};

export const HELP_AUDIENCE_LABELS: Record<HelpAudience, string> = {
  REGISTRANT: "Registrants & vehicle owners",
  ORGANIZER: "Event organizers",
  JUDGE: "Judges",
  SPECTATOR: "Spectators & voters",
  ADMIN: "Site administrators",
  GENERAL: "Everyone",
};

export const HELP_AUDIENCES: HelpAudience[] = [
  "GENERAL",
  "REGISTRANT",
  "ORGANIZER",
  "JUDGE",
  "SPECTATOR",
  "ADMIN",
];

export function isHelpAudience(value: string): value is HelpAudience {
  return value in HELP_AUDIENCE_LABELS;
}

export function isHelpCategory(value: string): value is HelpCategory {
  return (HELP_CATEGORY_IDS as readonly string[]).includes(value);
}
