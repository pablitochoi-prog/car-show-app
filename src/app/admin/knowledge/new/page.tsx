import Link from "next/link";
import { AdminKnowledgeArticleEditor } from "@/components/admin/admin-knowledge-article-editor";
import {
  emptyKnowledgeFaq,
  emptyKnowledgeStep,
} from "@/lib/help/knowledge-article-rich-text";

const EMPTY_FORM = {
  title: "",
  slug: "",
  shortDescription: "",
  audience: "GENERAL",
  category: "getting-started",
  visibility: "public",
  published: false,
  featured: false,
  popular: false,
  sortOrder: 100,
  keywordsText: "",
  relatedWebsitePagesText: "",
  relatedFeaturesText: "",
  relatedArticleIdsText: "",
  whoThisIsFor: "",
  whatThisHelpsYouDo: "",
  beforeYouStartText: "",
  steps: [emptyKnowledgeStep()],
  whatHappensNext: "",
  faqs: [emptyKnowledgeFaq()],
  articleBody: "",
  chatbotSummary: "",
  chatbotKeywordsText: "",
  lastReviewedAt: new Date().toISOString().slice(0, 10),
};

export default function AdminKnowledgeNewPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/admin/knowledge"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Knowledge Repository
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">New article</h1>
      </div>
      <AdminKnowledgeArticleEditor mode="create" initial={EMPTY_FORM} />
    </div>
  );
}
