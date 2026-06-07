"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HELP_CATEGORIES } from "@/lib/help/help-categories";
import {
  formRawToKnowledgeArticleInput,
  knowledgeArticleCreateSchema,
} from "@/lib/help/knowledge-article-schemas";
import type { HelpArticleFaq, HelpArticleStep } from "@/lib/help/help-types";
import {
  HELP_AUDIENCE_LABELS,
  HELP_AUDIENCES,
  HELP_VISIBILITY_VALUES,
} from "@/lib/help/help-types";
import {
  emptyKnowledgeFaq,
  emptyKnowledgeStep,
} from "@/lib/help/knowledge-article-rich-text";
import {
  AdminKnowledgeFaqsFields,
  AdminKnowledgeStepsFields,
} from "./admin-knowledge-steps-faqs-fields";

export type KnowledgeArticleFormDefaults = {
  title: string;
  slug: string;
  shortDescription: string;
  audience: string;
  category: string;
  visibility: string;
  published: boolean;
  featured: boolean;
  popular: boolean;
  sortOrder: number;
  keywordsText: string;
  relatedWebsitePagesText: string;
  relatedFeaturesText: string;
  relatedArticleIdsText: string;
  whoThisIsFor: string;
  whatThisHelpsYouDo: string;
  beforeYouStartText: string;
  steps: HelpArticleStep[];
  whatHappensNext: string;
  faqs: HelpArticleFaq[];
  articleBody: string;
  chatbotSummary: string;
  chatbotKeywordsText: string;
  lastReviewedAt: string;
};

function withCreateModeRichTextDefaults(
  mode: "create" | "edit",
  initial: KnowledgeArticleFormDefaults,
): KnowledgeArticleFormDefaults {
  if (mode !== "create") return initial;
  return {
    ...initial,
    steps: initial.steps.length > 0 ? initial.steps : [emptyKnowledgeStep()],
    faqs: initial.faqs.length > 0 ? initial.faqs : [emptyKnowledgeFaq()],
  };
}

type Props = {
  mode: "create" | "edit";
  articleId?: string;
  initial: KnowledgeArticleFormDefaults;
};

export function AdminKnowledgeArticleEditor({
  mode,
  articleId,
  initial,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState(() =>
    withCreateModeRichTextDefaults(mode, initial),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function update<K extends keyof KnowledgeArticleFormDefaults>(
    key: K,
    value: KnowledgeArticleFormDefaults[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const input = formRawToKnowledgeArticleInput(form);
      const parsed = knowledgeArticleCreateSchema.safeParse(input);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Invalid article data.");
        return;
      }

      const url =
        mode === "create"
          ? "/api/admin/knowledge-articles"
          : `/api/admin/knowledge-articles/${articleId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = (await res.json()) as {
        error?: string;
        article?: { id: string };
      };

      if (!res.ok) {
        setError(data.error ?? "Could not save article.");
        return;
      }

      setMessage("Article saved.");
      if (mode === "create" && data.article?.id) {
        router.push(`/admin/knowledge/${data.article.id}/edit`);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save article.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8">
      <section className="space-y-4 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Basics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ka-title">Title</Label>
            <Input
              id="ka-title"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ka-slug">Slug</Label>
            <Input
              id="ka-slug"
              value={form.slug}
              onChange={(e) => update("slug", e.target.value)}
              className="font-mono"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ka-sort">Sort order</Label>
            <Input
              id="ka-sort"
              type="number"
              value={form.sortOrder}
              onChange={(e) => update("sortOrder", Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ka-short">Short description</Label>
            <textarea
              id="ka-short"
              value={form.shortDescription}
              onChange={(e) => update("shortDescription", e.target.value)}
              rows={2}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ka-audience">Audience</Label>
            <select
              id="ka-audience"
              value={form.audience}
              onChange={(e) => update("audience", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {HELP_AUDIENCES.map((value) => (
                <option key={value} value={value}>
                  {HELP_AUDIENCE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ka-category">Category</Label>
            <select
              id="ka-category"
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {HELP_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ka-visibility">Visibility</Label>
            <select
              id="ka-visibility"
              value={form.visibility}
              onChange={(e) => update("visibility", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {HELP_VISIBILITY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ka-reviewed">Last reviewed</Label>
            <Input
              id="ka-reviewed"
              type="date"
              value={form.lastReviewedAt}
              onChange={(e) => update("lastReviewedAt", e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => update("published", e.target.checked)}
              />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => update("featured", e.target.checked)}
              />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.popular}
                onChange={(e) => update("popular", e.target.checked)}
              />
              Popular
            </label>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Discovery</h2>
        <div className="space-y-2">
          <Label htmlFor="ka-keywords">Keywords (comma-separated)</Label>
          <Input
            id="ka-keywords"
            value={form.keywordsText}
            onChange={(e) => update("keywordsText", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ka-pages">Related website pages (one per line)</Label>
          <textarea
            id="ka-pages"
            value={form.relatedWebsitePagesText}
            onChange={(e) => update("relatedWebsitePagesText", e.target.value)}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ka-features">Related features (one per line)</Label>
          <textarea
            id="ka-features"
            value={form.relatedFeaturesText}
            onChange={(e) => update("relatedFeaturesText", e.target.value)}
            rows={2}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ka-related">Related article slugs (comma-separated)</Label>
          <Input
            id="ka-related"
            value={form.relatedArticleIdsText}
            onChange={(e) => update("relatedArticleIdsText", e.target.value)}
            className="font-mono"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Content</h2>
        <div className="space-y-2">
          <Label htmlFor="ka-who">Who this is for</Label>
          <textarea
            id="ka-who"
            value={form.whoThisIsFor}
            onChange={(e) => update("whoThisIsFor", e.target.value)}
            rows={2}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ka-what">What this helps you do</Label>
          <textarea
            id="ka-what"
            value={form.whatThisHelpsYouDo}
            onChange={(e) => update("whatThisHelpsYouDo", e.target.value)}
            rows={2}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ka-before">Before you start (one item per line)</Label>
          <textarea
            id="ka-before"
            value={form.beforeYouStartText}
            onChange={(e) => update("beforeYouStartText", e.target.value)}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ka-body">Article body</Label>
          <textarea
            id="ka-body"
            value={form.articleBody}
            onChange={(e) => update("articleBody", e.target.value)}
            rows={4}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <AdminKnowledgeStepsFields
          steps={form.steps}
          disabled={saving}
          onStepsChange={(steps) => update("steps", steps)}
        />
        <div className="space-y-2">
          <Label htmlFor="ka-next">What happens next</Label>
          <textarea
            id="ka-next"
            value={form.whatHappensNext}
            onChange={(e) => update("whatHappensNext", e.target.value)}
            rows={2}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <AdminKnowledgeFaqsFields
          faqs={form.faqs}
          disabled={saving}
          onFaqsChange={(faqs) => update("faqs", faqs)}
        />
      </section>

      <section className="space-y-4 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Chatbot</h2>
        <div className="space-y-2">
          <Label htmlFor="ka-chat-summary">Chatbot summary</Label>
          <textarea
            id="ka-chat-summary"
            value={form.chatbotSummary}
            onChange={(e) => update("chatbotSummary", e.target.value)}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ka-chat-kw">Chatbot keywords (comma-separated)</Label>
          <Input
            id="ka-chat-kw"
            value={form.chatbotKeywordsText}
            onChange={(e) => update("chatbotKeywordsText", e.target.value)}
          />
        </div>
      </section>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : mode === "create" ? "Create article" : "Save changes"}
        </Button>
        <Link href="/admin/knowledge">
          <Button type="button" variant="outline">
            Back to list
          </Button>
        </Link>
        {form.slug ? (
          <a
            href={`/help/${form.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
          >
            Preview
          </a>
        ) : null}
      </div>
    </form>
  );
}
