"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  logoUrl: string;
  logoFileName: string;
  clubName: string;
  onChange: (patch: { logo: string; logoFileName: string }) => void;
  className?: string;
};

export function ClubLogoUpload({
  logoUrl,
  logoFileName,
  clubName,
  onChange,
  className,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const trimmedLogo = logoUrl.trim();
  const alt = clubName.trim() ? `${clubName.trim()} logo` : "Club logo";

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");
    setUploading(true);
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
        setError(data.error ?? "Upload failed.");
        return;
      }
      if (data.url) {
        onChange({
          logo: data.url,
          logoFileName: data.originalName ?? file.name,
        });
      }
    } catch {
      setError("Could not upload. Try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label>Club logo</Label>
      <p className="text-xs text-muted-foreground">
        Shown publicly on club listings, event registration, and dash cards.
      </p>
      <div className="flex flex-wrap items-start gap-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-input bg-muted">
          {trimmedLogo ? (
            <Image
              src={trimmedLogo}
              alt={alt}
              fill
              className="object-contain p-1"
              sizes="80px"
              unoptimized
            />
          ) : (
            <div className="flex size-full items-center justify-center px-2 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              No logo
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => void onFileChange(e)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-4 shrink-0" aria-hidden />
              {uploading ? "Uploading…" : trimmedLogo ? "Change logo" : "Upload logo"}
            </Button>
            {trimmedLogo ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                disabled={uploading}
                onClick={() => onChange({ logo: "", logoFileName: "" })}
              >
                Remove
              </Button>
            ) : null}
          </div>
          {logoFileName.trim() ? (
            <p className="truncate text-xs text-muted-foreground" title={logoFileName}>
              {logoFileName}
            </p>
          ) : null}
        </div>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
