import { defineArticle } from "./define-article";

export const createAccountArticle = defineArticle({
  id: "create-account",
  slug: "create-account",
  title: "How to create your CarShowScout account",
  shortDescription:
    "Sign up for a free account so you can register for events, save vehicles, and manage your profile.",
  audience: "REGISTRANT",
  category: "account-profile",
  keywords: ["account", "login", "profile", "email", "password", "sign up"],
  relatedWebsitePages: ["/signup", "/login", "/dashboard/profile"],
  relatedFeatures: ["account", "profile"],
  relatedArticleIds: ["register-for-event"],
  whoThisIsFor:
    "Anyone who wants to register for a car show, save vehicles in My Garage, or manage event registrations on CarShowScout.",
  whatThisHelpsYouDo:
    "Create a free CarShowScout account with your email and password so you can register for events and keep your information in one place.",
  beforeYouStart: [
    "Use an email address you check regularly — confirmations and receipts are sent there.",
    "Choose a password you have not used on other websites.",
  ],
  stepByStepInstructions: [
    {
      title: "Open the sign-up page",
      body: "Go to carshowscout.com and choose Sign Up, or open the sign-up link from an event registration page.",
    },
    {
      title: "Enter your details",
      body: "Fill in your name, email address, and password. If the event asks for a phone number for SMS updates, you can add it during registration or later in your profile.",
    },
    {
      title: "Confirm your email if prompted",
      body: "Some accounts may need email confirmation before you can sign in. Check your inbox and spam folder for a message from CarShowScout.",
    },
    {
      title: "Sign in and visit your dashboard",
      body: "After sign-up, sign in and open your Dashboard to see your events, vehicles, and profile settings.",
    },
  ],
  whatHappensNext:
    "You can browse events, register for a show, add vehicles to My Garage, and update your profile anytime from the Dashboard.",
  frequentlyAskedQuestions: [
    {
      question: "Do I need an account to register for an event?",
      answer:
        "Yes. An account keeps your registration, payment receipt, and vehicle details tied to you so you can view or edit them later.",
    },
    {
      question: "Can I use the same account for multiple events?",
      answer:
        "Yes. One account works across all events on CarShowScout. Vehicles saved in My Garage can be reused when you register again.",
    },
    {
      question: "I forgot my password. What should I do?",
      answer:
        "On the sign-in page, choose Forgot password and follow the email link to set a new password.",
    },
  ],
  articleBody:
    "A CarShowScout account is free and takes just a few minutes to set up. Once you are signed in, you can register for events, track confirmations, and manage your vehicles from one dashboard.",
  chatbotSummary:
    "Create a free CarShowScout account via Sign Up with name, email, and password. Confirm email if required, then sign in to access the Dashboard for events, vehicles, and profile settings.",
  chatbotKeywords: [
    "create account",
    "sign up",
    "register account",
    "new user",
    "password",
    "email confirmation",
  ],
  sortOrder: 10,
});
