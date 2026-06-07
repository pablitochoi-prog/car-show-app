import { defineArticle } from "./define-article";

export const judgeAccessAssignedEventsArticle = defineArticle({
  id: "judge-access-assigned-events",
  slug: "judge-access-assigned-events",
  title: "How judges access their assigned events",
  shortDescription:
    "Sign in and open the judge dashboard to see events and assignments waiting for you.",
  audience: "JUDGE",
  category: "awards-judging",
  keywords: ["judge login", "assigned events", "judging dashboard", "judge access"],
  relatedWebsitePages: ["/judge", "/judge/events/[id]/ballot", "/judge/events/[id]/score-sheets"],
  relatedFeatures: ["judge-dashboard"],
  relatedArticleIds: ["submit-judge-ballot-votes", "complete-score-sheet-judging", "assign-judges"],
  whoThisIsFor:
    "People assigned as judges for a car show on CarShowScout.",
  whatThisHelpsYouDo:
    "Sign in, find your assigned event, and open ballot voting or score sheets from the judge dashboard.",
  beforeYouStart: [
    "The organizer must add you as event staff with a judge role.",
    "Use the email address the organizer invited or that is linked to your account.",
  ],
  stepByStepInstructions: [
    {
      title: "Sign in to CarShowScout",
      body: "Go to carshowscout.com and sign in with your account email and password.",
    },
    {
      title: "Open the judge dashboard",
      body: "Choose Judge from the menu or go to the judge home page. You should see events you are assigned to.",
    },
    {
      title: "Select your event",
      body: "Tap or click the event name for today’s show.",
    },
    {
      title: "Open your assignment",
      body: "Choose Judge Ballot or Score Sheets depending on what the organizer assigned you. Only your assignments should appear.",
    },
  ],
  whatHappensNext:
    "Complete ballots or score sheets when the organizer opens judging. Contact the head judge or organizer if you do not see the event.",
  frequentlyAskedQuestions: [
    {
      question: "I signed in but do not see any events.",
      answer:
        "Ask the organizer to confirm you are on the staff list with a judge role and that you are using the correct email account.",
    },
    {
      question: "Can I judge from my phone?",
      answer:
        "Yes, if the organizer allows it. The judge dashboard works on mobile browsers for ballots and score sheets.",
    },
    {
      question: "Do I need a separate judge password?",
      answer:
        "No. Use your normal CarShowScout login. Judge access comes from your staff role on the event.",
    },
  ],
  articleBody:
    "Your judge dashboard lists only events you are assigned to. Sign in before the show starts so you are ready when voting or scoring opens.",
  chatbotSummary:
    "Judges sign in to CarShowScout, open the judge dashboard at /judge, select the event, and open assigned ballot or score sheet work.",
  chatbotKeywords: [
    "judge dashboard",
    "judge login",
    "assigned events",
    "judge home",
  ],
  sortOrder: 200,
});
