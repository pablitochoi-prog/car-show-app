import Image from "next/image";

const ILLUSTRATIONS = [
  {
    src: "/legal/sms-opt-in-dash-card-vote-judge.png",
    alt: "Vehicle dash card showing optional Text AZV-001 to vote or scan QR code to vote",
    caption:
      "Public voting / judge access: attendees may text a vehicle entry code to the event SMS number or scan a QR code from a printed dash card. Participation is initiated by the user; standard message rates apply.",
    title: "Event dash card (SMS vote / judge)",
  },
  {
    src: "/legal/sms-opt-in-signup-account.png",
    alt: "CarShowScout signup form with optional unchecked SMS consent checkbox below optional phone field",
    caption:
      "Account signup: optional “Text me helpful updates…” checkbox (unchecked by default). SMS is not required to create an account; a phone number is only needed if the user opts in.",
    title: "Account signup (optional SMS consent)",
  },
] as const;

/** Twilio / compliance reference: voluntary opt-in flows on CarShowScout. */
export function SmsOptInProcessIllustrations() {
  return (
    <section
      className="mt-8 rounded-lg border border-border/80 bg-muted/20 p-5 md:p-6"
      aria-labelledby="sms-opt-in-illustrations-heading"
    >
      <h2
        id="sms-opt-in-illustrations-heading"
        className="text-lg font-semibold tracking-tight text-foreground"
      >
        Voluntary SMS opt-in processes (illustrations)
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        The screenshots below illustrate voluntary SMS opt-in processes used on
        CarShowScout.com. Users are not required to receive SMS messages to use
        the site, register for events, or vote unless they choose an SMS-based
        action or explicitly opt in during signup.
      </p>
      <ul className="mt-6 space-y-8">
        {ILLUSTRATIONS.map((item) => (
          <li key={item.src} className="space-y-2">
            <p className="text-sm font-medium text-foreground">{item.title}</p>
            <div className="mx-auto w-1/2 max-w-full overflow-hidden rounded-md border bg-background shadow-sm">
              <Image
                src={item.src}
                alt={item.alt}
                width={1200}
                height={800}
                className="h-auto w-full"
                sizes="(max-width: 768px) 50vw, 336px"
              />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {item.caption}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
