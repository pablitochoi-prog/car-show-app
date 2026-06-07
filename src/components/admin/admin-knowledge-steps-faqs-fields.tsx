"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import type { HelpArticleFaq, HelpArticleStep } from "@/lib/help/help-types";
import {
  emptyKnowledgeFaq,
  emptyKnowledgeStep,
} from "@/lib/help/knowledge-article-rich-text";

const KNOWLEDGE_IMAGE_UPLOAD = "/api/admin/knowledge-articles/image";

function updateStep(
  steps: HelpArticleStep[],
  index: number,
  patch: Partial<HelpArticleStep>,
): HelpArticleStep[] {
  return steps.map((step, i) => (i === index ? { ...step, ...patch } : step));
}

function updateFaq(
  faqs: HelpArticleFaq[],
  index: number,
  patch: Partial<HelpArticleFaq>,
): HelpArticleFaq[] {
  return faqs.map((faq, i) => (i === index ? { ...faq, ...patch } : faq));
}

export function AdminKnowledgeStepsFields({
  steps,
  disabled = false,
  onStepsChange,
}: {
  steps: HelpArticleStep[];
  disabled?: boolean;
  onStepsChange: (steps: HelpArticleStep[]) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Step-by-step instructions</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() =>
            onStepsChange([...steps, emptyKnowledgeStep()])
          }
        >
          <Plus className="mr-1 size-3.5" />
          Add step
        </Button>
      </div>
      {steps.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No steps yet. Add a step to build numbered instructions with rich
          formatting.
        </p>
      ) : (
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={`step-${index}`}
              className="space-y-3 rounded-lg border bg-muted/10 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Step {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  aria-label={`Remove step ${index + 1}`}
                  onClick={() =>
                    onStepsChange(steps.filter((_, i) => i !== index))
                  }
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`ka-step-title-${index}`}>Step title</Label>
                <Input
                  id={`ka-step-title-${index}`}
                  value={step.title}
                  disabled={disabled}
                  placeholder="e.g. Open the sign-up page"
                  onChange={(e) =>
                    onStepsChange(
                      updateStep(steps, index, { title: e.target.value }),
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`ka-step-body-${index}`}>Step instructions</Label>
                <RichTextEditor
                  idPrefix={`ka-step-body-${index}`}
                  aria-label={`Step ${index + 1} instructions`}
                  placeholder="Write step instructions…"
                  value={step.body}
                  disabled={disabled}
                  enableImages
                  enableTextAlign
                  imageUploadUrl={KNOWLEDGE_IMAGE_UPLOAD}
                  onChange={(html) =>
                    onStepsChange(updateStep(steps, index, { body: html }))
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminKnowledgeFaqsFields({
  faqs,
  disabled = false,
  onFaqsChange,
}: {
  faqs: HelpArticleFaq[];
  disabled?: boolean;
  onFaqsChange: (faqs: HelpArticleFaq[]) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>FAQ</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() =>
            onFaqsChange([...faqs, emptyKnowledgeFaq()])
          }
        >
          <Plus className="mr-1 size-3.5" />
          Add FAQ
        </Button>
      </div>
      {faqs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No FAQs yet. Add common questions and rich-text answers.
        </p>
      ) : (
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={`faq-${index}`}
              className="space-y-3 rounded-lg border bg-muted/10 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">FAQ {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  aria-label={`Remove FAQ ${index + 1}`}
                  onClick={() =>
                    onFaqsChange(faqs.filter((_, i) => i !== index))
                  }
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`ka-faq-q-${index}`}>Question</Label>
                <Input
                  id={`ka-faq-q-${index}`}
                  value={faq.question}
                  disabled={disabled}
                  placeholder="e.g. Do I need an account?"
                  onChange={(e) =>
                    onFaqsChange(
                      updateFaq(faqs, index, { question: e.target.value }),
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`ka-faq-a-${index}`}>Answer</Label>
                <RichTextEditor
                  idPrefix={`ka-faq-a-${index}`}
                  aria-label={`FAQ ${index + 1} answer`}
                  placeholder="Write the answer…"
                  value={faq.answer}
                  disabled={disabled}
                  enableImages
                  enableTextAlign
                  imageUploadUrl={KNOWLEDGE_IMAGE_UPLOAD}
                  onChange={(html) =>
                    onFaqsChange(updateFaq(faqs, index, { answer: html }))
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
