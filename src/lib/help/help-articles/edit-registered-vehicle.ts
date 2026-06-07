import { defineArticle } from "./define-article";

export const editRegisteredVehicleArticle = defineArticle({
  id: "edit-registered-vehicle",
  slug: "edit-registered-vehicle",
  title: "How to edit your registered vehicle information",
  shortDescription:
    "Update vehicle details, nickname, story, and dash card information for an event registration.",
  audience: "REGISTRANT",
  category: "vehicle-registration",
  keywords: [
    "edit registration",
    "vehicle story",
    "nickname",
    "dash card",
    "update vehicle",
  ],
  relatedWebsitePages: [
    "/dashboard/registrations",
    "/dashboard/events",
    "/dashboard/vehicles/[id]/edit",
  ],
  relatedFeatures: ["vehicle-registration", "dash-cards"],
  relatedArticleIds: ["register-for-event", "dash-cards"],
  whoThisIsFor:
    "Registered vehicle owners who need to fix a typo, update a story, or change details before the show.",
  whatThisHelpsYouDo:
    "Edit your event registration or vehicle profile so your dash card and public page show the right information.",
  beforeYouStart: [
    "Sign in to the account used for the registration.",
    "Check whether the organizer has closed edits — some events lock changes close to show day.",
  ],
  stepByStepInstructions: [
    {
      title: "Find your registration",
      body: "Open Dashboard → My Events or Registrations and select the event.",
    },
    {
      title: "Open edit",
      body: "Choose Edit registration or open your vehicle profile linked to that event.",
    },
    {
      title: "Update fields",
      body: "Change year, make, model, nickname, vehicle story, photos, or for-sale settings as allowed by the event.",
    },
    {
      title: "Save changes",
      body: "Save your updates. Your dash card and public vehicle page reflect the new information when reprinted or refreshed.",
    },
  ],
  whatHappensNext:
    "If the organizer prints dash cards in advance, ask whether you need a reprint after major changes. Your online registration confirmation updates automatically.",
  frequentlyAskedQuestions: [
    {
      question: "Why can’t I edit my registration?",
      answer:
        "The organizer may have closed edits after a deadline. Contact the event organizer for help with urgent corrections.",
    },
    {
      question: "Will editing change my payment?",
      answer:
        "Changing descriptive fields usually does not change your fee. Switching registration tiers may affect price — the form will show any difference.",
    },
    {
      question: "Does my dash card update automatically?",
      answer:
        "Online pages update when you save. Printed cards only change if you or the organizer prints a new copy.",
    },
  ],
  articleBody:
    "Most registration details can be updated from your dashboard until the organizer’s cutoff. Keep your vehicle story and nickname current so voters and judges see accurate information.",
  chatbotSummary:
    "Edit a registered vehicle from Dashboard → Registrations or My Events, open Edit, update fields, and save. Edits may be blocked after organizer deadlines.",
  chatbotKeywords: [
    "edit vehicle",
    "update registration",
    "change vehicle info",
    "vehicle story",
  ],
  sortOrder: 100,
});
