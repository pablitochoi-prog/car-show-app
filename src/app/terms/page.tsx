import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SMS Privacy Notice | CarShowScout",
  description:
    "SMS messaging terms for CarShowScout event voting, registration, and participation.",
};

const SMS_PRIVACY_NOTICE =
  "By texting an event code to CarShowScout or providing your phone number during event registration, you agree to receive SMS messages related to car show event voting, registration, and event participation. Message and data rates may apply. Message frequency varies by event. Reply STOP to opt out. Reply HELP for help.";

export default function TermsPage() {
  return (
    <div className="page-shell max-w-2xl py-10 md:py-14">
      <p className="text-sm text-muted-foreground">
        <Link href="/events" className="hover:text-foreground underline-offset-4 hover:underline">
          ← Find events
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">SMS Privacy Notice</h1>
      <p className="mt-6 text-base leading-relaxed text-foreground">{SMS_PRIVACY_NOTICE}</p>
      <p className="mt-8 text-sm text-muted-foreground">
        Questions? Contact your event organizer or visit{" "}
        <Link href="/" className="text-foreground underline-offset-4 hover:underline">
          CarShowScout.com
        </Link>
        .
      </p>
    </div>
  );
}
