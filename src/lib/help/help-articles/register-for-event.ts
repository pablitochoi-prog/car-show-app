import { defineArticle } from "./define-article";

export const registerForEventArticle = defineArticle({
  id: "register-for-event",
  slug: "register-for-event",
  title: "How to register for a car show",
  shortDescription:
    "Find an event, choose a registration option, add your vehicle, and complete payment if required.",
  audience: "REGISTRANT",
  category: "event-registration",
  keywords: ["register", "event", "car show", "checkout", "payment", "registration"],
  relatedWebsitePages: ["/events", "/dashboard/events", "/dashboard/registrations"],
  relatedFeatures: ["event-registration", "checkout"],
  relatedArticleIds: ["create-account", "dash-cards"],
  whoThisIsFor:
    "Vehicle owners and attendees who want to register for a car show listed on CarShowScout.",
  whatThisHelpsYouDo:
    "Complete event registration from start to finish — pick your registration tier, enter vehicle details, pay if the event charges a fee, and receive a confirmation.",
  beforeYouStart: [
    "Sign in to your CarShowScout account, or create one during registration.",
    "Know your vehicle year, make, model, and any details the event asks for.",
    "Have a payment card ready if the event has a registration fee.",
  ],
  stepByStepInstructions: [
    {
      title: "Find the event",
      body: "Open Find Events on carshowscout.com and search by name, city, or date. Select the event you want to join.",
    },
    {
      title: "Start registration",
      body: "On the event page, choose Register or Register your vehicle. Pick the registration tier that fits you (for example, show car, spectator, or vendor if offered).",
    },
    {
      title: "Add or select your vehicle",
      body: "Enter your vehicle information or pick a saved vehicle from My Garage. Fill in any optional fields the event requests, such as a nickname or vehicle story.",
    },
    {
      title: "Review and pay",
      body: "Review your registration summary. If there is a fee, complete checkout with your card. Free registrations skip payment and go straight to confirmation.",
    },
    {
      title: "Save your confirmation",
      body: "After checkout, you will see a confirmation screen and receive an email receipt if payment was collected. You can also view the registration anytime under Dashboard → My Events or Registrations.",
    },
  ],
  whatHappensNext:
    "Before the show, you may receive reminders from the organizer. At the event, your dash card and vehicle ID help staff and voters find your entry. You can edit registration details from your dashboard until the organizer’s cutoff date.",
  frequentlyAskedQuestions: [
    {
      question: "Can I register more than one vehicle?",
      answer:
        "That depends on the event. Some events allow multiple vehicles per person; others limit one per registration tier. The event page and registration form will show what is allowed.",
    },
    {
      question: "What if payment fails?",
      answer:
        "Try again with a different card or contact your bank. Your registration is not complete until payment succeeds. See troubleshooting help if the problem continues.",
    },
    {
      question: "Can I change my registration after submitting?",
      answer:
        "Often yes, from your dashboard, until the organizer closes edits. Open your registration and look for Edit, or contact the event organizer for help.",
    },
  ],
  articleBody:
    "Registering for a car show on CarShowScout is straightforward: find the event, choose how you are participating, add your vehicle, and pay if required. Your confirmation and receipt stay in your account for easy reference.",
  chatbotSummary:
    "Register for a car show by finding the event on CarShowScout, choosing a registration tier, adding vehicle details, completing payment if required, and saving the email confirmation. View registrations later in the Dashboard.",
  chatbotKeywords: [
    "register for event",
    "car show registration",
    "checkout",
    "registration fee",
    "sign up for show",
  ],
  sortOrder: 20,
});
