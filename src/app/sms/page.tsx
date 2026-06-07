import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SMS Program",
  description:
    "Car Show Scout SMS notifications program — message types, frequency, opt-out, and privacy.",
};

const EXAMPLE_MESSAGES = [
  "Your registration for Cruisin Classics Car Show is confirmed. View details: carshowscout.com",
  "Reminder: People's Choice voting is open. Text your vehicle code to vote.",
  "A buyer sent an inquiry about your vehicle listing at today's show.",
  "Your judge ballot for Best Paint is open. Sign in to cast votes.",
  "Car Show Scout: Reply STOP to unsubscribe. Reply HELP for help.",
];

export default function SmsProgramPage() {
  return (
    <div className="page-shell max-w-2xl py-10 md:py-14">
      <p className="text-sm text-muted-foreground">
        <Link
          href="/"
          className="hover:text-foreground underline-offset-4 hover:underline"
        >
          ← Home
        </Link>
      </p>

      <h1 className="mt-4 text-3xl font-bold tracking-tight">
        Car Show Scout SMS Program
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Car Show Scout, LLC
      </p>

      <div className="mt-8 space-y-8 text-base leading-relaxed text-foreground">
        <section aria-labelledby="sms-program-heading">
          <h2 id="sms-program-heading" className="text-xl font-semibold">
            Program description
          </h2>
          <p className="mt-3 text-muted-foreground">
            Car Show Scout SMS Notifications is an optional messaging program for
            car show organizers, registrants, judges, event staff, and
            attendees. When you opt in, we may send text messages related to
            event registration, vehicle submissions, check-in, public voting,
            judge ballot voting, score sheet judging workflows, buyer inquiries,
            organizer communications, and account or support responses.
          </p>
        </section>

        <section aria-labelledby="sms-examples-heading">
          <h2 id="sms-examples-heading" className="text-xl font-semibold">
            Example messages
          </h2>
          <p className="mt-3 text-muted-foreground">
            Depending on your role and event settings, you may receive messages
            such as:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
            {EXAMPLE_MESSAGES.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="sms-frequency-heading">
          <h2 id="sms-frequency-heading" className="text-xl font-semibold">
            Message frequency
          </h2>
          <p className="mt-3 text-muted-foreground">
            Message frequency varies based on your event activity, notification
            preferences, and whether organizers enable SMS voting or related
            features for an event.
          </p>
        </section>

        <section aria-labelledby="sms-rates-heading">
          <h2 id="sms-rates-heading" className="text-xl font-semibold">
            Message and data rates
          </h2>
          <p className="mt-3 text-muted-foreground">
            Message and data rates may apply. Contact your wireless carrier for
            details about your text messaging plan.
          </p>
        </section>

        <section aria-labelledby="sms-optout-heading">
          <h2 id="sms-optout-heading" className="text-xl font-semibold">
            Opt out and help
          </h2>
          <p className="mt-3 text-muted-foreground">
            Reply <strong>STOP</strong> to unsubscribe from Car Show Scout SMS
            notifications. Reply <strong>HELP</strong> for help.
          </p>
        </section>

        <section aria-labelledby="sms-consent-heading">
          <h2 id="sms-consent-heading" className="text-xl font-semibold">
            Consent is optional
          </h2>
          <p className="mt-3 text-muted-foreground">
            SMS consent is not required to register, submit a vehicle, vote,
            judge, participate in an event, or make a purchase. You may use Car
            Show Scout without opting in to SMS notifications.
          </p>
        </section>

        <section aria-labelledby="sms-privacy-heading">
          <h2 id="sms-privacy-heading" className="text-xl font-semibold">
            How we use mobile numbers
          </h2>
          <p className="mt-3 text-muted-foreground">
            Car Show Scout does not sell or share mobile phone numbers or SMS
            consent information with third parties or affiliates for marketing
            or promotional purposes.
          </p>
        </section>

        <section aria-labelledby="sms-contact-heading">
          <h2 id="sms-contact-heading" className="text-xl font-semibold">
            Contact
          </h2>
          <p className="mt-3 text-muted-foreground">
            Questions about this SMS program:{" "}
            <a
              href="mailto:support@carshowscout.com"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              support@carshowscout.com
            </a>
          </p>
        </section>
      </div>

      <nav
        className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground"
        aria-label="Related policies"
      >
        <Link
          href="/privacy"
          className="font-medium underline-offset-4 hover:text-foreground hover:underline"
        >
          Privacy Policy
        </Link>
        <Link
          href="/terms"
          className="font-medium underline-offset-4 hover:text-foreground hover:underline"
        >
          SMS Text Policy
        </Link>
      </nav>
    </div>
  );
}
