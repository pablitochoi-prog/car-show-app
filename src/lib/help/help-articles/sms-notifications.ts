import { defineArticle } from "./define-article";

export const smsNotificationsArticle = defineArticle({
  id: "sms-notifications",
  slug: "sms-notifications",
  title: "How SMS notifications work",
  shortDescription:
    "Optional text messages for registration updates, voting, judging, and buyer inquiries.",
  audience: "REGISTRANT",
  category: "sms-notifications",
  keywords: ["text messages", "SMS opt-in", "STOP", "HELP", "notifications"],
  relatedWebsitePages: ["/sms", "/terms", "/privacy", "/dashboard/profile"],
  relatedFeatures: ["sms-notifications"],
  relatedArticleIds: ["register-for-event", "buyer-inquiries"],
  whoThisIsFor:
    "Registrants, organizers, judges, and attendees who opt in to CarShowScout text message updates.",
  whatThisHelpsYouDo:
    "Understand what texts you may receive, how to opt in, and how to stop messages.",
  beforeYouStart: [
    "Use a mobile number you control.",
    "Message and data rates from your carrier may apply.",
  ],
  stepByStepInstructions: [
    {
      title: "Opt in when asked",
      body: "During registration or in your profile, you may see an option to receive SMS updates. Check the box and provide your mobile number only if you want texts.",
    },
    {
      title: "Know what you might receive",
      body: "Examples include registration confirmations, voting reminders, judge ballot notices, buyer inquiry alerts, and organizer announcements for events you joined.",
    },
    {
      title: "Reply STOP to unsubscribe",
      body: "Text STOP to stop messages from CarShowScout. You can also update preferences in your profile where available.",
    },
    {
      title: "Reply HELP for assistance",
      body: "Text HELP for program information. See the SMS Program and SMS Text Policy pages on carshowscout.com for full details.",
    },
  ],
  whatHappensNext:
    "After opting out, you will still have access to your account and email notifications where the event uses email.",
  frequentlyAskedQuestions: [
    {
      question: "Are texts required to register?",
      answer:
        "No. SMS is optional unless an organizer specifically requires it for a feature you choose (such as SMS voting).",
    },
    {
      question: "How often will I be texted?",
      answer:
        "Frequency depends on your role and event activity. Most people receive only a handful of messages per event.",
    },
    {
      question: "Where can I read the full SMS policy?",
      answer:
        "Open the SMS Text Policy and SMS Program pages linked in the site footer or at carshowscout.com/sms.",
    },
  ],
  articleBody:
    "CarShowScout SMS is optional and event-driven. Opt in only if you want timely updates on your phone, and use STOP anytime to unsubscribe.",
  chatbotSummary:
    "SMS on CarShowScout is optional; opt in during registration or profile, receive event-related texts, reply STOP to unsubscribe and HELP for info. See /sms and /terms.",
  chatbotKeywords: [
    "SMS notifications",
    "text messages",
    "opt in",
    "STOP",
    "HELP",
  ],
  sortOrder: 120,
});
