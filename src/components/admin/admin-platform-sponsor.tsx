"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteSponsorLogo } from "@/components/platform/site-sponsor-logo";
import { Loader2, Upload } from "lucide-react";

type Sponsor = {
  name: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
};

export function AdminPlatformSponsor() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/platform-sponsor", {
        credentials: "same-origin",
      });
      if (res.ok) {
        const data = (await res.json()) as { sponsor: Sponsor };
        setName(data.sponsor.name ?? "");
        setEmail(data.sponsor.email ?? "");
        setWebsite(data.sponsor.website ?? "");
        setLogoUrl(data.sponsor.logoUrl);
        setLogoFileName(
          data.sponsor.logoUrl
            ? (data.sponsor.logoUrl.split("/").pop() ?? "Logo uploaded")
            : "",
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/platform-sponsor", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: name.trim() || null,
          email: email.trim() || null,
          website: website.trim() || "",
        }),
      });
      const data = (await res.json()) as { error?: string; sponsor?: Sponsor };
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      if (data.sponsor) {
        setWebsite(data.sponsor.website ?? "");
      }
      setMessage({ type: "success", text: "Platform sponsor settings saved." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setSaving(false);
    }
  }

  async function onLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/platform-sponsor/logo", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        error?: string;
        sponsor?: Sponsor;
        logoUrl?: string;
        originalName?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      const url = data.logoUrl ?? data.sponsor?.logoUrl ?? null;
      setLogoUrl(url);
      setLogoFileName(data.originalName ?? file.name);
      setMessage({ type: "success", text: "Sponsor logo uploaded." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Upload failed",
      });
    } finally {
      setUploading(false);
    }
  }

  async function removeLogo() {
    setUploading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/platform-sponsor", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ logoUrl: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to remove logo");
      setLogoUrl(null);
      setLogoFileName("");
      setMessage({ type: "success", text: "Sponsor logo removed." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading platform sponsor…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        Site-wide sponsor shown publicly. The logo is stored in the public
        photos bucket as a permanent asset URL.
      </p>

      <div className="space-y-2">
        <Label htmlFor="platform-sponsor-name">Site sponsor name</Label>
        <Input
          id="platform-sponsor-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sponsor or partner name"
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="platform-sponsor-email">Email address</Label>
        <Input
          id="platform-sponsor-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="contact@sponsor.com"
          maxLength={320}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="platform-sponsor-website">Website</Label>
        <Input
          id="platform-sponsor-website"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://sponsor.com"
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">
          The sponsor logo links to this website whenever it is shown on the
          site.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Sponsor logo</Label>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, WebP, or GIF. Max 8 MB. Uploads immediately to public
          storage.
        </p>
        <div className="flex flex-wrap items-start gap-3">
          <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-input bg-muted p-1">
            {logoUrl ? (
              <SiteSponsorLogo
                logoUrl={logoUrl}
                websiteUrl={website}
                name={name}
                width={88}
                height={88}
                imageClassName="max-h-[88px] max-w-[88px]"
              />
            ) : (
              <span className="px-2 text-center text-xs text-muted-foreground">
                No logo
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => void onLogoFileChange(e)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Upload className="mr-2 size-4" />
              )}
              {logoUrl ? "Replace logo" : "Upload logo"}
            </Button>
            {logoUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={uploading}
                onClick={() => void removeLogo()}
              >
                Remove logo
              </Button>
            ) : null}
            {logoFileName ? (
              <p className="truncate text-xs text-muted-foreground">
                {logoFileName}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {message ? (
        <p
          className={`text-sm ${message.type === "success" ? "text-emerald-600" : "text-red-600"}`}
        >
          {message.text}
        </p>
      ) : null}

      <Button onClick={() => void handleSave()} disabled={saving} size="sm">
        {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
        Save sponsor details
      </Button>
    </div>
  );
}
