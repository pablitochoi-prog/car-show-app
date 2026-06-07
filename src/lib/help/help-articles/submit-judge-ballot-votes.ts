import { defineArticle } from "./define-article";

export const submitJudgeBallotVotesArticle = defineArticle({
  id: "submit-judge-ballot-votes",
  slug: "submit-judge-ballot-votes",
  title: "How to submit judge ballot votes",
  shortDescription:
    "Cast your judge ballot picks by category using vehicle IDs or the ballot screen.",
  audience: "JUDGE",
  category: "judge-ballot-voting",
  keywords: ["judge ballot", "stars", "vehicle ID", "submit vote", "ballot"],
  relatedWebsitePages: [
    "/judge/events/[id]/ballot",
    "/judge/events/[id]/ballot/vote",
    "/judge/events/[id]/ballot/[catId]",
  ],
  relatedFeatures: ["judge-ballot"],
  relatedArticleIds: ["judge-access-assigned-events", "setup-judge-ballot-voting"],
  whoThisIsFor:
    "Assigned judges completing informal ballot voting for award categories.",
  whatThisHelpsYouDo:
    "Open your ballot, enter picks or ratings for each category, and submit before the deadline.",
  beforeYouStart: [
    "Sign in and confirm the organizer has opened ballot voting.",
    "Know how many votes or stars you may assign per category.",
  ],
  stepByStepInstructions: [
    {
      title: "Open Judge Ballot",
      body: "From your event on the judge dashboard, choose Judge Ballot.",
    },
    {
      title: "Select a category",
      body: "Open each category you are assigned to vote in.",
    },
    {
      title: "Enter vehicle picks",
      body: "Enter vehicle IDs from dash cards or pick vehicles from the list. Apply stars or vote counts as the screen instructs.",
    },
    {
      title: "Review your ballot",
      body: "Check that you used the correct vehicle codes and did not exceed your vote limit.",
    },
    {
      title: "Submit",
      body: "Submit the category or full ballot when finished. You may be unable to change votes after submit depending on event settings.",
    },
  ],
  whatHappensNext:
    "The organizer sees your votes in ballot results. Awards staff use totals for winner planning.",
  frequentlyAskedQuestions: [
    {
      question: "Where do I find vehicle IDs?",
      answer:
        "Vehicle IDs are printed on dash cards in the windshield. Ask the entrant or staff if a card is missing.",
    },
    {
      question: "Can I save and finish later?",
      answer:
        "Some events let you save a draft. Submit before voting closes to make sure your votes count.",
    },
    {
      question: "I entered the wrong vehicle code.",
      answer:
        "Contact the head judge or organizer immediately. They may be able to help before results are finalized.",
    },
  ],
  articleBody:
    "Judge ballot voting is meant to be quick on show day. Work category by category, double-check vehicle IDs from dash cards, and submit before time runs out.",
  chatbotSummary:
    "Judges open Judge Ballot from the judge dashboard, enter vehicle IDs or picks per category within vote limits, review, and submit before voting closes.",
  chatbotKeywords: [
    "submit judge ballot",
    "judge vote",
    "vehicle ID ballot",
    "ballot stars",
  ],
  sortOrder: 210,
});
