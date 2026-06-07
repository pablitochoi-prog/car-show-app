import { defineArticle } from "./define-article";

export const assignJudgesArticle = defineArticle({
  id: "assign-judges",
  slug: "assign-judges",
  title: "How to assign judges",
  shortDescription:
    "Invite judges as event staff and assign them to ballots, score sheets, or categories.",
  audience: "ORGANIZER",
  category: "staff-roles",
  keywords: ["judges", "staff roles", "special judge", "assignments", "head judge"],
  relatedWebsitePages: [
    "/organizer/events/[id]/staff",
    "/organizer/events/[id]/awards-judging/score-sheets/assignments",
    "/organizer/events/[id]/awards-judging/ballot",
  ],
  relatedFeatures: ["staff", "judge-assignments"],
  relatedArticleIds: [
    "setup-judge-ballot-voting",
    "setup-score-sheet-judging",
    "judge-access-assigned-events",
  ],
  whoThisIsFor:
    "Event organizers and head judges setting up who can judge and what they are assigned to score.",
  whatThisHelpsYouDo:
    "Add judges to event staff, give them judge access, and assign ballots or score sheets.",
  beforeYouStart: [
    "Judges need CarShowScout accounts (they can sign up if new).",
    "Know which judging methods you use — ballot, score sheets, or both.",
  ],
  stepByStepInstructions: [
    {
      title: "Add staff with judge role",
      body: "Open Staff for the event and invite or assign people with a judge (or head judge) role.",
    },
    {
      title: "Confirm they can sign in",
      body: "Judges should sign in and confirm they see the event on their judge dashboard.",
    },
    {
      title: "Assign judge ballot categories",
      body: "If using judge ballot, open Judge Ballot setup and assign judges to categories with the right vote limits.",
    },
    {
      title: "Assign score sheets",
      body: "If using score sheets, open Score Sheet Assignments and link each judge to the sheets they will complete.",
    },
    {
      title: "Communicate show-day instructions",
      body: "Tell judges when voting or scoring opens, whether mobile devices are allowed, and who to contact for help.",
    },
  ],
  whatHappensNext:
    "Judges work from the judge dashboard. Monitor progress in Judge Progress reports during the show.",
  frequentlyAskedQuestions: [
    {
      question: "What is a special judge?",
      answer:
        "A special judge may be limited to certain categories or given different vote rules. Set that in ballot or assignment settings.",
    },
    {
      question: "Can someone be both staff and a judge?",
      answer:
        "Yes. One person can hold multiple roles if your event needs it.",
    },
    {
      question: "A judge does not see the event. What should I check?",
      answer:
        "Confirm they are on the staff list with a judge role and are signed into the correct email account.",
    },
  ],
  articleBody:
    "Clear judge assignments prevent confusion on show day. Add judges to staff first, then wire them to the right ballots or score sheets.",
  chatbotSummary:
    "Assign judges by adding judge staff on the Staff page, then assign ballot categories or score sheets in Awards & Judging assignments.",
  chatbotKeywords: [
    "assign judges",
    "judge staff",
    "judge role",
    "head judge",
  ],
  sortOrder: 180,
});
