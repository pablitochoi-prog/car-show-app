export type PlatformRole = "USER" | "ORGANIZER" | "ADMIN";

export type UserStatus = "ACTIVE" | "SUSPENDED" | "BANNED";

export type EventRole =
  | "ORGANIZER"
  | "TREASURER"
  | "REGISTRAR"
  | "JUDGE"
  | "SPECIAL_JUDGE"
  | "HEAD_JUDGE"
  | "MARKETING"
  | "VOLUNTEER";

export type EventStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "PUBLISHED"
  | "ACTIVE"
  | "VOTING"
  | "CLOSED"
  | "ARCHIVED";
