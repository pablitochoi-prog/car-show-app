import type { HelpArticle } from "../help-types";
import { addVehicleFromGarageArticle } from "./add-vehicle-from-garage";
import { assignJudgesArticle } from "./assign-judges";
import { buyerInquiriesArticle } from "./buyer-inquiries";
import { cannotAccessEventDashboardArticle } from "./cannot-access-event-dashboard";
import { cannotSubmitVoteArticle } from "./cannot-submit-vote";
import { completeScoreSheetJudgingArticle } from "./complete-score-sheet-judging";
import { confirmationEmailNotReceivedArticle } from "./confirmation-email-not-received";
import { connectStripeArticle } from "./connect-stripe";
import { createAccountArticle } from "./create-account";
import { createAndPublishEventArticle } from "./create-and-publish-event";
import { dashCardsArticle } from "./dash-cards";
import { editRegisteredVehicleArticle } from "./edit-registered-vehicle";
import { eventReportsArticle } from "./event-reports";
import { judgeAccessAssignedEventsArticle } from "./judge-access-assigned-events";
import { manageEventRegistrationsArticle } from "./manage-event-registrations";
import { paymentDidNotGoThroughArticle } from "./payment-did-not-go-through";
import { printDashCardsArticle } from "./print-dash-cards";
import { publicVotingArticle } from "./public-voting";
import { registerForEventArticle } from "./register-for-event";
import { reviewAwardsWinnersArticle } from "./review-awards-winners";
import { scanDashCardQrCodeArticle } from "./scan-dash-card-qr-code";
import { setupJudgeBallotVotingArticle } from "./setup-judge-ballot-voting";
import { setupPublicVotingArticle } from "./setup-public-voting";
import { setupRegistrationTiersArticle } from "./setup-registration-tiers";
import { setupScoreSheetJudgingArticle } from "./setup-score-sheet-judging";
import { smsNotificationsArticle } from "./sms-notifications";
import { submitJudgeBallotVotesArticle } from "./submit-judge-ballot-votes";

export const HELP_ARTICLES: HelpArticle[] = [
  createAccountArticle,
  registerForEventArticle,
  createAndPublishEventArticle,
  connectStripeArticle,
  setupPublicVotingArticle,
  publicVotingArticle,
  dashCardsArticle,
  eventReportsArticle,
  addVehicleFromGarageArticle,
  editRegisteredVehicleArticle,
  buyerInquiriesArticle,
  smsNotificationsArticle,
  setupRegistrationTiersArticle,
  manageEventRegistrationsArticle,
  printDashCardsArticle,
  setupJudgeBallotVotingArticle,
  setupScoreSheetJudgingArticle,
  assignJudgesArticle,
  reviewAwardsWinnersArticle,
  judgeAccessAssignedEventsArticle,
  submitJudgeBallotVotesArticle,
  completeScoreSheetJudgingArticle,
  scanDashCardQrCodeArticle,
  confirmationEmailNotReceivedArticle,
  paymentDidNotGoThroughArticle,
  cannotAccessEventDashboardArticle,
  cannotSubmitVoteArticle,
];
