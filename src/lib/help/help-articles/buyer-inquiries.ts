import { defineArticle } from "./define-article";

export const buyerInquiriesArticle = defineArticle({
  id: "buyer-inquiries",
  slug: "buyer-inquiries",
  title: "How buyer inquiries work",
  shortDescription:
    "Receive messages from interested buyers when your vehicle is listed for sale at a show.",
  audience: "REGISTRANT",
  category: "buyer-inquiries",
  keywords: ["for sale", "buyer inquiry", "asking price", "contact owner", "vehicle listing"],
  relatedWebsitePages: [
    "/v/[vehicleEntryCode]/sale",
    "/dashboard/sale-inquiries",
    "/dashboard/sale-inquiries/[id]",
  ],
  relatedFeatures: ["buyer-inquiries", "vehicle-for-sale"],
  relatedArticleIds: ["dash-cards", "edit-registered-vehicle"],
  whoThisIsFor:
    "Vehicle owners who mark a car for sale at an event and want to hear from potential buyers safely.",
  whatThisHelpsYouDo:
    "Turn on for-sale listing, set an asking price if you want, and respond to buyer messages through CarShowScout.",
  beforeYouStart: [
    "Complete event registration for the vehicle.",
    "Decide whether the car is actually for sale and what contact approach you prefer.",
  ],
  stepByStepInstructions: [
    {
      title: "Enable for sale on your registration",
      body: "During registration or from your vehicle edit page, turn on For sale and optionally enter an asking price and short note.",
    },
    {
      title: "Buyers find your vehicle page",
      body: "Attendees scan your dash card QR code or open your public vehicle page. If the car is for sale, they can send an inquiry.",
    },
    {
      title: "Review inquiries in your dashboard",
      body: "Open Dashboard → Sale inquiries to read messages. Your personal email is not shown publicly on the vehicle page.",
    },
    {
      title: "Reply to buyers",
      body: "Respond through CarShowScout messaging so you control when and how you follow up.",
    },
  ],
  whatHappensNext:
    "You can turn off for-sale status anytime from your registration. Inquiries stay in your dashboard history for reference.",
  frequentlyAskedQuestions: [
    {
      question: "Is my phone number shown to buyers?",
      answer:
        "Buyer inquiries go through CarShowScout. You choose how to reply without exposing private contact info on the public page.",
    },
    {
      question: "Do I have to list an asking price?",
      answer:
        "No. You can mark a vehicle for sale with or without a listed price depending on event settings.",
    },
    {
      question: "Can buyers inquire if the car is not for sale?",
      answer:
        "The inquiry button appears when for-sale is enabled. Turn it off if you are not selling at this event.",
    },
  ],
  articleBody:
    "Buyer inquiries let interested attendees reach you without posting your email on a windshield sign. Turn on for-sale when you want inquiries, and manage them from your dashboard.",
  chatbotSummary:
    "Enable for sale on a vehicle registration, buyers send inquiries from the public vehicle page, and owners read and reply from Dashboard → Sale inquiries.",
  chatbotKeywords: [
    "buyer inquiry",
    "for sale",
    "asking price",
    "sell car at show",
  ],
  sortOrder: 110,
});
