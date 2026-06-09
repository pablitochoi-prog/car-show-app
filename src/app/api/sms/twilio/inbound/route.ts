import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ensureSharedSmsNumber } from "@/lib/sms/shared-sms-number";
import {
  buildTwilioTwimlResponse,
  buildTwilioWebhookUrl,
  formDataToParamRecord,
  getTwilioAuthToken,
  parseTwilioFormData,
  validateTwilioSignature,
} from "@/lib/sms/providers/twilio";
import { processInboundSmsVote } from "@/lib/sms/voting-service";
import {
  checkTwilioInboundRateLimit,
  logRateLimitBlock,
} from "@/lib/rate-limit";
import { captureObservabilityException } from "@/lib/sentry-observability";
import { logObservabilityError } from "@/lib/structured-logging";

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

  let authToken: string | null;
  try {
    authToken = getTwilioAuthToken();
  } catch {
    // getTwilioAuthToken throws in production when the token is absent.
    return new NextResponse(buildTwilioTwimlResponse("Service unavailable."), {
      status: 503,
      headers: { "Content-Type": "text/xml" },
    });
  }

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

  const twilioRateLimit = checkTwilioInboundRateLimit({ inbound, request });
  if (!twilioRateLimit.ok) {
    logRateLimitBlock({
      route: "api.sms.twilio.inbound",
      scope: "twilio-inbound",
      retryAfterSeconds: twilioRateLimit.retryAfterSeconds,
    });
    // Return 200 TwiML so Twilio does not retry the webhook aggressively.
    return new NextResponse(
      buildTwilioTwimlResponse(
        "Please wait a moment before sending another message.",
      ),
      { status: 200, headers: { "Content-Type": "text/xml" } },
    );
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
    logObservabilityError({
      source: "twilio_inbound_voting",
      error: err,
    });
    captureObservabilityException(err, {
      source: "twilio_inbound_voting",
    });
    return new NextResponse(
      buildTwilioTwimlResponse(
        "Sorry, we could not process your vote right now. Please try again.",
      ),
      { status: 200, headers: { "Content-Type": "text/xml" } },
    );
  }
}
