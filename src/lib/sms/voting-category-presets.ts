export const MAX_VOTING_CATEGORIES_PER_EVENT = 3;
export const MAX_CUSTOM_VOTING_CATEGORIES_PER_EVENT = 1;

/** Default names seeded as SMS-eligible (see special_awards migration). */
export const DEFAULT_SMS_VOTING_AWARD_NAMES = [
  "People's Choice",
  "Kid's Choice",
] as const;
