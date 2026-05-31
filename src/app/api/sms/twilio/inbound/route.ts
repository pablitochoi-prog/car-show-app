import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ensureSharedSmsNumber } from "@/lib/sms/shared-sms-number";
import {
  buildTwilioTwimlResponse,
  buildTwilioWebhookUrl,
  formDataToParamRecord,
  parseTwilioFormData,
  validateTwilioSignature,
} from "@/lib/sms/providers/twilio";
import { processInboundSmsVote } from "@/lib/sms/voting-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Quick check that this deployment exposes the Twilio inbound handler. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    handler: "twilio-inbound-sms-voting",
    hashSecretConfigured: Boolean(process.env.SMS_PHONE_HASH_SECRET?.trim()),
    twilioAuthConfigured: Boolean(process.env.TWILIO_AUTH_TOKEN?.trim()),
  });
}

export async function POST(request: Request) {
  await ensureSharedSmsNumber();

  const form = await request.formData();
  const params = formDataToParamRecord(form);
  const inbound = parseTwilioFormData(form, params);
  if (!inbound) {
    return new NextResponse(buildTwilioTwimlResponse("Invalid request."), {
      status: 400,
      headers: { "Content-Type": "text/xml" },
    });
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (authToken) {
    const headerList = await headers();
    const signature = headerList.get("x-twilio-signature");
    if (!signature) {
      return new NextResponse(buildTwilioTwimlResponse("Unauthorized."), {
        status: 403,
        headers: { "Content-Type": "text/xml" },
      });
    }
    const url = buildTwilioWebhookUrl(request);
    if (!validateTwilioSignature(authToken, signature, url, params)) {
      console.error("[twilio-sms] Signature verification failed for URL:", url);
      return new NextResponse(buildTwilioTwimlResponse("Unauthorized."), {
        status: 403,
        headers: { "Content-Type": "text/xml" },
      });
    }
  }

  try {
    const result = await processInboundSmsVote(inbound);
    // TODO: When inbound STOP/HELP is handled outside voting flows, synchronize
    // User.smsNotificationsOptIn / smsNotificationsOptOutAt here without
    // overriding Twilio carrier-level STOP handling.
    return new NextResponse(buildTwilioTwimlResponse(result.responseText), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    console.error("[twilio-sms] Voting handler error:", err);
    return new NextResponse(
      buildTwilioTwimlResponse(
        "Sorry, we could not process your vote right now. Please try again.",
      ),
      { status: 200, headers: { "Content-Type": "text/xml" } },
    );
  }
}
