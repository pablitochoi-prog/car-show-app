"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Loader2 } from "lucide-react";
import { DEFAULT_SMS_TEXT_POLICY_HTML } from "@/lib/legal-policy-defaults";

export type LegalPolicyField = "smsTextPolicyHtml" | "privacyPolicyHtml";

type PoliciesResponse = {
  policies?: {
    smsTextPolicyHtml: string | null;
    privacyPolicyHtml: string | null;
  };
  error?: string;
};

type AdminLegalPolicyEditorProps = {
  field: LegalPolicyField;
  title: string;
  description: string;
  publicPath: string;
};

export function AdminLegalPolicyEditor({
  field,
  title,
  description,
  publicPath,
}: AdminLegalPolicyEditorProps) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/legal-policies", {
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const data = (await res.json()) as PoliciesResponse;
      const stored = data.policies?.[field] ?? null;
      if (field === "smsTextPolicyHtml" && !stored) {
        setHtml(DEFAULT_SMS_TEXT_POLICY_HTML);
      } else {
        setHtml(stored ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, [field]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/legal-policies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ [field]: html }),
      });
      const data = (await res.json()) as PoliciesResponse;
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      const saved = data.policies?.[field] ?? null;
      setHtml(saved ?? "");
      setMessage({ type: "success", text: `${title} saved.` });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading {title.toLowerCase()}…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Content saved here is what visitors see on the public page. Use the
          toolbar to align text or images, upload images (or paste a URL), then
          select an image and choose Image 25%–100% to change its display size.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Public page:{" "}
          <a
            href={publicPath}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {publicPath}
          </a>
        </p>
      </div>

      <RichTextEditor
        value={html}
        onChange={setHtml}
        disabled={saving}
        aria-label={`${title} editor`}
        enableImages
        enableTextAlign
      />

      {message ? (
        <p
          className={
            message.type === "success"
              ? "text-sm text-green-700 dark:text-green-400"
              : "text-sm text-destructive"
          }
          role="status"
        >
          {message.text}
        </p>
      ) : null}

      <Button type="button" onClick={() => void handleSave()} disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving…
          </>
        ) : (
          `Save ${title}`
        )}
      </Button>
    </div>
  );
}
