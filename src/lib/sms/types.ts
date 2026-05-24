export type SmsProvider = "twilio" | "telnyx";

export type InboundSmsMessage = {
  provider: SmsProvider;
  from: string;
  to: string;
  body: string;
  providerMessageId: string;
  rawPayload: unknown;
};

export type SmsVotingResult = {
  responseText: string;
};

export type ParsedSmsBody =
  | { kind: "vehicle_code"; code: string }
  | { kind: "category_number"; optionNumber: number }
  | { kind: "invalid" };
