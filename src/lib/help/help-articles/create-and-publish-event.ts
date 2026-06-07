import { defineArticle } from "./define-article";

export const createAndPublishEventArticle = defineArticle({
  id: "create-and-publish-event",
  slug: "create-and-publish-event",
  title: "How to create and publish an event",
  shortDescription:
    "Set up your car show on CarShowScout, add key details, and publish so people can start registering.",
  audience: "ORGANIZER",
  category: "event-setup",
  keywords: ["create event", "publish event", "event setup", "new event"],
  relatedWebsitePages: [
    "/organizer/events/new",
    "/organizer/events/[id]/edit",
    "/dashboard/events",
  ],
  relatedFeatures: ["event-setup", "event-publish"],
  relatedArticleIds: ["connect-stripe", "register-for-event"],
  whoThisIsFor:
    "Club leaders, show chairs, and organizers who are setting up a new car show or cruise-in on CarShowScout.",
  whatThisHelpsYouDo:
    "Create your event, add the basics people need to see, and publish your event page so registrations can open.",
  beforeYouStart: [
    "Sign in with an organizer account tied to your club or organization.",
    "Gather your event name, date, location, and a short description.",
    "Decide whether registrations will be free or paid (paid events need Stripe — see the Stripe setup article).",
  ],
  stepByStepInstructions: [
    {
      title: "Start a new event",
      body: "From your Dashboard, open Events you manage and choose Create event (or New event). Enter the event name, date, and venue.",
    },
    {
      title: "Add event details",
      body: "On the event edit page, fill in description, logo, categories, and any rules registrants should know. Save as you go.",
    },
    {
      title: "Set up registration tiers",
      body: "Add at least one registration tier so people know how to sign up (for example, show car or spectator). Set prices if you plan to charge fees.",
    },
    {
      title: "Connect payments if needed",
      body: "If you charge registration fees, connect Stripe before you publish. Free-only events can publish without Stripe.",
    },
    {
      title: "Publish the event",
      body: "When you are ready for the public to see the event, change the status to Published. The event will appear on Find Events and accept registrations according to your settings.",
    },
  ],
  whatHappensNext:
    "Share your event link with your club and on social media. Monitor registrations from the organizer dashboard, print dash cards before show day, and set up voting or judging when you are ready.",
  frequentlyAskedQuestions: [
    {
      question: "Can I keep the event private while I set up?",
      answer:
        "Yes. Leave the event unpublished or in draft until you are ready. Only published events show on the public event list.",
    },
    {
      question: "Can I edit the event after publishing?",
      answer:
        "Yes. Most details can be updated from the event edit page. Major changes (like date) should be communicated to registrants.",
    },
    {
      question: "Who can help me manage the event?",
      answer:
        "Invite staff from the event Staff page and assign roles such as registrar or judge. Staff with organizer access can help with setup and day-of tasks.",
    },
  ],
  articleBody:
    "Use this guide to create your event, add registration options, and publish your event page so people can begin registering their vehicles.",
  chatbotSummary:
    "Organizers create an event from Dashboard → New event, fill in details and registration tiers, connect Stripe if charging fees, then publish so the event appears on Find Events and accepts registrations.",
  chatbotKeywords: [
    "create event",
    "publish event",
    "new car show",
    "event setup",
    "organizer",
  ],
  sortOrder: 30,
});
