"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/profile/user-avatar";

type Props = {
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  hasPhoto: boolean;
  savedHasPhoto: boolean;
  pendingPhotoFile: File | null;
  pendingPhotoRemove: boolean;
  onSelectPhoto: (file: File) => void;
  onRequestRemove: () => void;
};

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 5 * 1024 * 1024;

export function ProfilePhotoSection({
  firstName,
  lastName,
  name,
  email,
  hasPhoto,
  savedHasPhoto,
  pendingPhotoFile,
  pendingPhotoRemove,
  onSelectPhoto,
  onRequestRemove,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  const pendingPreviewUrl = useMemo(() => {
    if (!pendingPhotoFile) return null;
    return URL.createObjectURL(pendingPhotoFile);
  }, [pendingPhotoFile]);

  useEffect(() => {
    if (!pendingPreviewUrl) return;
    return () => URL.revokeObjectURL(pendingPreviewUrl);
  }, [pendingPreviewUrl]);

  const photoSrc = pendingPreviewUrl
    ? pendingPreviewUrl
    : hasPhoto && savedHasPhoto && !pendingPhotoRemove
      ? "/api/me/avatar/view"
      : null;

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");

    if (!ACCEPT.split(",").includes(file.type)) {
      setError("Use a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File is too large (max 5MB).");
      return;
    }

    onSelectPhoto(file);
  }

  const showRemove =
    savedHasPhoto || pendingPhotoFile !== null;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <UserAvatar
        firstName={firstName}
        lastName={lastName}
        name={name}
        email={email}
        hasPhoto={Boolean(photoSrc)}
        photoSrc={photoSrc}
        size="lg"
        className="size-20 text-lg"
      />

      <div className="grid gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={onFileSelected}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {hasPhoto || savedHasPhoto ? "Change photo" : "Upload photo"}
          </Button>
          {showRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={onRequestRemove}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, or WebP · max 5MB · stored privately · use Save changes
          above to apply
        </p>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
