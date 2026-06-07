import type { HelpCategory } from "./help-types";

export type HelpCategoryDefinition = {
  id: HelpCategory;
  label: string;
  description: string;
  sortOrder: number;
};

export const HELP_CATEGORIES: HelpCategoryDefinition[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    description: "New to CarShowScout? Start here.",
    sortOrder: 10,
  },
  {
    id: "account-profile",
    label: "Account & Profile",
    description: "Sign in, profile settings, and account basics.",
    sortOrder: 20,
  },
  {
    id: "event-registration",
    label: "Event Registration",
    description: "Register for a car show and complete checkout.",
    sortOrder: 30,
  },
  {
    id: "vehicle-registration",
    label: "Vehicle Registration",
    description: "Edit vehicle details for an event registration.",
    sortOrder: 40,
  },
  {
    id: "my-garage",
    label: "My Garage",
    description: "Save vehicles and reuse them across events.",
    sortOrder: 50,
  },
  {
    id: "dash-cards",
    label: "Dash Cards",
    description: "Vehicle dash cards, QR codes, and printing.",
    sortOrder: 60,
  },
  {
    id: "event-setup",
    label: "Event Setup",
    description: "Create events, tiers, and publish your event page.",
    sortOrder: 70,
  },
  {
    id: "organizer-dashboard",
    label: "Organizer Dashboard",
    description: "Manage registrations, staff, and day-of operations.",
    sortOrder: 80,
  },
  {
    id: "stripe-setup",
    label: "Stripe Setup",
    description: "Connect Stripe and accept event payments.",
    sortOrder: 90,
  },
  {
    id: "payments-fees",
    label: "Payments & Fees",
    description: "Checkout, refunds, and platform fees.",
    sortOrder: 100,
  },
  {
    id: "staff-roles",
    label: "Staff & Roles",
    description: "Invite staff and assign event roles.",
    sortOrder: 110,
  },
  {
    id: "awards-judging",
    label: "Awards & Judging",
    description: "Awards setup, judges, and winner review.",
    sortOrder: 120,
  },
  {
    id: "score-sheet-judging",
    label: "Score Sheet Judging",
    description: "Structured score sheet judging workflows.",
    sortOrder: 130,
  },
  {
    id: "judge-ballot-voting",
    label: "Judge Ballot Voting",
    description: "Informal judge ballot voting by category.",
    sortOrder: 140,
  },
  {
    id: "public-voting",
    label: "Public Voting",
    description: "People's choice and spectator voting.",
    sortOrder: 150,
  },
  {
    id: "reports",
    label: "Reports",
    description: "Financial, voting, and operations reports.",
    sortOrder: 160,
  },
  {
    id: "buyer-inquiries",
    label: "Buyer Inquiries",
    description: "For-sale listings and buyer messages.",
    sortOrder: 170,
  },
  {
    id: "sms-notifications",
    label: "SMS Notifications",
    description: "Text message opt-in, STOP, and HELP.",
    sortOrder: 180,
  },
  {
    id: "troubleshooting",
    label: "Troubleshooting",
    description: "Fix common problems with email, payments, and access.",
    sortOrder: 190,
  },
  {
    id: "privacy-security",
    label: "Privacy & Security",
    description: "Privacy, security, and account protection.",
    sortOrder: 200,
  },
];

const CATEGORY_BY_ID = new Map(
  HELP_CATEGORIES.map((c) => [c.id, c] as const),
);

export function getHelpCategory(
  id: HelpCategory,
): HelpCategoryDefinition | undefined {
  return CATEGORY_BY_ID.get(id);
}

export function getHelpCategoryLabel(id: HelpCategory): string {
  return CATEGORY_BY_ID.get(id)?.label ?? id;
}
