import { defineArticle } from "./define-article";

export const eventReportsArticle = defineArticle({
  id: "event-reports",
  slug: "event-reports",
  title: "How to use event reports",
  shortDescription:
    "View financial summaries, registrations, voting results, judge progress, and awards from your organizer reports hub.",
  audience: "ORGANIZER",
  category: "reports",
  keywords: [
    "reports",
    "financial report",
    "voting report",
    "judge progress",
    "registrations",
    "awards",
  ],
  relatedWebsitePages: ["/organizer/events/[id]/reports"],
  relatedFeatures: ["reports", "financial-summary", "public-voting-results"],
  relatedArticleIds: ["setup-public-voting", "connect-stripe", "create-and-publish-event"],
  whoThisIsFor:
    "Event organizers and staff who need summaries for planning, announcements, and post-event wrap-up.",
  whatThisHelpsYouDo:
    "Open the right report for your task — money collected, who registered, how judging is going, and who won.",
  beforeYouStart: [
    "You need organizer or staff access to the event.",
    "Some reports only appear when that feature is set up (for example, public voting reports after categories exist).",
  ],
  stepByStepInstructions: [
    {
      title: "Open Reports",
      body: "From your event organizer menu, choose Reports. The home view lists all available report types.",
    },
    {
      title: "Financial Summary",
      body: "See registration revenue, payment status, and tier breakdowns. Use this for treasurer updates and reconciliation with Stripe.",
    },
    {
      title: "Registration Detail",
      body: "Search and export registrants and vehicles with contact and payment fields. Helpful for check-in lists and follow-up.",
    },
    {
      title: "Staffing List",
      body: "View event staff, roles, and judging assignments in one place.",
    },
    {
      title: "Judge Progress",
      body: "While judging is underway, see which score sheets and ballots are started, in progress, or complete.",
    },
    {
      title: "Public Voting & Judge Ballot Results",
      body: "After voting, open rankings by category. Export CSV where available for announcements or spreadsheets.",
    },
    {
      title: "Awards / Winners",
      body: "Review trophy placements and projected winners for your awards program and printing name cards.",
    },
  ],
  whatHappensNext:
    "Export or print what you need for show day and awards ceremonies. Reports update as new registrations and votes come in.",
  frequentlyAskedQuestions: [
    {
      question: "Why do I not see a voting report?",
      answer:
        "Voting reports appear when that method is configured on the event. Set up public voting, judge ballot, or score sheets first.",
    },
    {
      question: "Can I export data to Excel?",
      answer:
        "Several reports offer Export CSV. Open the report and use the export action in the toolbar when available.",
    },
    {
      question: "Are report numbers final before awards are finalized?",
      answer:
        "Financial and registration reports reflect live data. Awards may show projected winners until you finalize results.",
    },
  ],
  articleBody:
    "The reports hub brings registrations, money, judging status, and results together. Start from the report home page and pick the summary that matches what you need right now.",
  chatbotSummary:
    "Organizers open Reports from the event menu to view financial summary, registration detail, staffing, judge progress, voting results, and awards/winners; export CSV where supported.",
  chatbotKeywords: [
    "event reports",
    "financial summary",
    "registration export",
    "voting results",
    "judge progress",
    "awards report",
  ],
  sortOrder: 80,
});
