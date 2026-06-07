import { defineArticle } from "./define-article";

export const addVehicleFromGarageArticle = defineArticle({
  id: "add-vehicle-from-garage",
  slug: "add-vehicle-from-garage",
  title: "How to add a vehicle from My Garage",
  shortDescription:
    "Save your car in My Garage so you can register faster for future shows.",
  audience: "REGISTRANT",
  category: "my-garage",
  keywords: ["vehicle", "garage", "add car", "register vehicle", "my vehicles"],
  relatedWebsitePages: ["/dashboard/vehicles", "/dashboard/vehicles/new"],
  relatedFeatures: ["my-garage", "vehicles"],
  relatedArticleIds: ["register-for-event", "edit-registered-vehicle"],
  whoThisIsFor:
    "Vehicle owners who want to save car details once and reuse them when registering for events.",
  whatThisHelpsYouDo:
    "Add a vehicle to My Garage with year, make, model, and other details so registration forms are quicker next time.",
  beforeYouStart: [
    "Sign in to your CarShowScout account.",
    "Have basic vehicle details ready (year, make, model).",
  ],
  stepByStepInstructions: [
    {
      title: "Open My Garage",
      body: "From your Dashboard, choose Vehicles or My Garage.",
    },
    {
      title: "Add a new vehicle",
      body: "Select Add vehicle and enter your car’s year, make, model, color, and any optional details such as a nickname or short description.",
    },
    {
      title: "Save the vehicle",
      body: "Save your entry. The vehicle now appears in My Garage for future registrations.",
    },
    {
      title: "Use it when registering",
      body: "When you register for an event, pick this saved vehicle instead of typing everything again. You can still edit event-specific details during registration.",
    },
  ],
  whatHappensNext:
    "Your saved vehicles stay in My Garage until you remove them. You can update vehicle details anytime from the vehicle profile page.",
  frequentlyAskedQuestions: [
    {
      question: "Can I add more than one vehicle?",
      answer:
        "Yes. My Garage can hold multiple vehicles. Choose the right one when you register for each event.",
    },
    {
      question: "Does adding to My Garage register me for a show?",
      answer:
        "No. My Garage only saves vehicle information. You still need to complete event registration separately.",
    },
    {
      question: "Can I edit a saved vehicle later?",
      answer:
        "Yes. Open the vehicle from My Garage and update its details. Changes apply to future registrations.",
    },
  ],
  articleBody:
    "My Garage is like a address book for your cars. Save them once, then pick the right entry when a new show opens registration.",
  chatbotSummary:
    "Add a vehicle in Dashboard → Vehicles → Add vehicle, enter year/make/model and save. Reuse saved vehicles when registering for events.",
  chatbotKeywords: ["my garage", "add vehicle", "save car", "vehicle list"],
  sortOrder: 90,
});
