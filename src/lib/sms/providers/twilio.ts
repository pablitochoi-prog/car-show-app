import { createHmac, timingSafeEqual } from "crypto";
import type { InboundSmsMessage } from "@/lib/sms/types";

export type TwilioInboundFields = {
  From: string;
  To: string;
  Body: string;
  MessageSid: string;
};

export function parseTwilioFormData(
  form: FormData,
  rawPayload: unknown,
): InboundSmsMessage | null {
  const from = form.get("From")?.toString().trim() ?? "";
  const to = form.get("To")?.toString().trim() ?? "";
  const body = form.get("Body")?.toString() ?? "";
  const messageSid = form.get("MessageSid")?.toString().trim() ?? "";
  if (!from || !messageSid) return null;

  return {
    provider: "twilio",
    from,
    to,
    body,
    providerMessageId: messageSid,
    rawPayload,
  };
}

export function formDataToParamRecord(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  form.forEach((value, key) => {
    out[key] = value.toString();
  });
  return out;
}

/**
 * Public URL Twilio signed against (Vercel/proxies terminate SSL and set x-forwarded-*).
 * Must match the webhook URL configured in the Twilio console exactly.
 */
export function buildTwilioWebhookUrl(request: Request): string {
  const parsed = new URL(request.url);
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    parsed.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    request.headers.get("host")?.trim() ??
    parsed.host;
  return `${proto}://${host}${parsed.pathname}${parsed.search}`;
}

/** Validate Twilio webhook signature (X-Twilio-Signature). */
export function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }
  const expected = createHmac("sha1", authToken).update(data).digest("base64");
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildTwilioTwimlResponse(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
}
