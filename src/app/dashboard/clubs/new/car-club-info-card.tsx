"use client";

import { useRef, useState } from "react";
import { ChevronDown, Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CAR_CLUB_INPUT_CLASS as inputClass,
  type CarClubFormValues,
} from "./car-club-form-values";

export function CarClubInfoCard({
  v,
  patch,
}: {
  v: CarClubFormValues;
  patch: (p: Partial<CarClubFormValues>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [otherSocialOpen, setOtherSocialOpen] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");

  async function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLogoError("");
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/organizations/logo-upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = (await res.json()) as {
        error?: string;
        url?: string;
        originalName?: string;
      };
      if (!res.ok) {
        setLogoError(data.error ?? "Upload failed.");
        return;
      }
      if (data.url) {
        patch({
          logo: data.url,
          logoFileName: data.originalName ?? file.name,
        });
      }
    } catch {
      setLogoError("Could not upload. Try again.");
    } finally {
      setLogoUploading(false);
    }
  }

  const displayFileName =
    v.logoFileName.trim() ||
    (v.logo.trim() ? v.logo.split("/").pop() ?? "Logo uploaded" : "");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Club info</CardTitle>
        <CardDescription>
          Logo, website, and social links (https:// is added when missing).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Club logo</Label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => void onLogoChange(e)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={logoUploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-4 shrink-0" aria-hidden />
              {logoUploading ? "Uploading…" : "Upload logo"}
            </Button>
            <span
              className="min-w-0 flex-1 truncate text-sm text-muted-foreground"
              title={displayFileName || undefined}
            >
              {displayFileName || "No file uploaded"}
            </span>
            {v.logo ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 text-muted-foreground"
                onClick={() => patch({ logo: "", logoFileName: "" })}
              >
                Remove
              </Button>
            ) : null}
          </div>
          {logoError ? (
            <p className="text-sm text-destructive" role="alert">
              {logoError}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="websiteUrl">Website</Label>
          <Input
            id="websiteUrl"
            className={inputClass}
            value={v.websiteUrl}
            onChange={(e) => patch({ websiteUrl: e.target.value })}
            placeholder="yourclub.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="facebookUrl">Facebook URL</Label>
          <Input
            id="facebookUrl"
            className={inputClass}
            value={v.facebookUrl}
            onChange={(e) => patch({ facebookUrl: e.target.value })}
          />
        </div>

        <div className="border-t border-border pt-3">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg py-1.5 text-left text-sm font-medium text-primary hover:underline"
            onClick={() => setOtherSocialOpen((o) => !o)}
            aria-expanded={otherSocialOpen}
          >
            <span>
              {otherSocialOpen
                ? "Hide other social media sites"
                : "Other social media sites"}
            </span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 transition-transform",
                otherSocialOpen && "rotate-180"
              )}
              aria-hidden
            />
          </button>

          {otherSocialOpen ? (
            <div className="mt-3 space-y-4 border-l-2 border-muted pl-4">
              <div className="space-y-2">
                <Label htmlFor="instagramUrl">Instagram URL</Label>
                <Input
                  id="instagramUrl"
                  className={inputClass}
                  value={v.instagramUrl}
                  onChange={(e) => patch({ instagramUrl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="youtubeUrl">YouTube URL</Label>
                <Input
                  id="youtubeUrl"
                  className={inputClass}
                  value={v.youtubeUrl}
                  onChange={(e) => patch({ youtubeUrl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tikTokUrl">TikTok URL</Label>
                <Input
                  id="tikTokUrl"
                  className={inputClass}
                  value={v.tikTokUrl}
                  onChange={(e) => patch({ tikTokUrl: e.target.value })}
                />
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
