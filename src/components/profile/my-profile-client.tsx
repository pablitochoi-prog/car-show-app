"use client";

import Link from "next/link";
import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AccountNav } from "@/components/account/account-nav";
import {
  AccountSectionForm,
  type AccountSectionFormHandle,
} from "@/components/profile/account-section-form";
import { ProfilePhotoSection } from "@/components/profile/profile-photo-section";
import { MyClubsSection } from "@/components/profile/my-clubs-section";

type ProfileInitial = {
  firstName: string;
  lastName: string;
  birthYear: number | null;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  smsNotificationsOptIn: boolean;
};

type Membership = {
  id: string;
  role: string;
  organization: {
    id: string;
    name: string;
    clubState: string | null;
    logo: string | null;
    motto: string | null;
    organizerName: string | null;
  };
};

type Props = {
  email: string;
  pendingEmail: string | null;
  username: string | null;
  name: string;
  initial: ProfileInitial;
  hasPhoto: boolean;
  memberships: Membership[];
  canCreateClub: boolean;
};

export function MyProfileClient({
  email,
  pendingEmail,
  username,
  name,
  initial,
  hasPhoto: initialHasPhoto,
  memberships,
  canCreateClub,
}: Props) {
  const router = useRouter();
  const accountRef = useRef<AccountSectionFormHandle>(null);

  const [accountDirty, setAccountDirty] = useState(false);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [pendingPhotoRemove, setPendingPhotoRemove] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const photoDirty = pendingPhotoFile !== null || pendingPhotoRemove;

  const isDirty = accountDirty || photoDirty;

  const displayHasPhoto = useMemo(() => {
    if (pendingPhotoRemove) return false;
    if (pendingPhotoFile) return true;
    return initialHasPhoto;
  }, [initialHasPhoto, pendingPhotoFile, pendingPhotoRemove]);

  const resetPhotoChanges = useCallback(() => {
    setPendingPhotoFile(null);
    setPendingPhotoRemove(false);
  }, []);

  const handleCancel = useCallback(() => {
    accountRef.current?.cancel();
    resetPhotoChanges();
    setSaveError(null);
  }, [resetPhotoChanges]);

  const savePhotoChanges = useCallback(async () => {
    if (pendingPhotoFile) {
      const formData = new FormData();
      formData.append("file", pendingPhotoFile);
      const res = await fetch("/api/me/avatar/upload", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not upload profile photo.");
      }
      return;
    }

    if (pendingPhotoRemove && initialHasPhoto) {
      const res = await fetch("/api/me/avatar", {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not remove profile photo.");
      }
    }
  }, [initialHasPhoto, pendingPhotoFile, pendingPhotoRemove]);

  const finishSave = useCallback(async () => {
    if (photoDirty) {
      await savePhotoChanges();
    }
    resetPhotoChanges();
    router.refresh();
  }, [photoDirty, resetPhotoChanges, router, savePhotoChanges]);

  const handleAccountSaveSuccess = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await finishSave();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Could not save profile.",
      );
    } finally {
      setSaving(false);
    }
  }, [finishSave]);

  const handleSave = useCallback(async () => {
    setSaveError(null);
    setSaving(true);
    try {
      if (accountDirty) {
        const accountSaved = await accountRef.current?.save();
        if (accountSaved === false) return;
      }

      await finishSave();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Could not save profile.",
      );
    } finally {
      setSaving(false);
    }
  }, [accountDirty, finishSave]);

  return (
    <div className="page-shell max-w-2xl space-y-8">
      <div className="page-head flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">My profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Account details from your CarShowApp profile.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          {isDirty ? (
            <>
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={handleCancel}
              >
                Cancel changes
              </Button>
            </>
          ) : null}
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "justify-center",
            )}
          >
            Back to dashboard
          </Link>
        </div>
      </div>

      <AccountNav />

      {saveError ? (
        <p className="text-sm text-destructive" role="alert">
          {saveError}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile photo</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfilePhotoSection
            firstName={initial.firstName}
            lastName={initial.lastName}
            name={name}
            email={email}
            hasPhoto={displayHasPhoto}
            savedHasPhoto={initialHasPhoto}
            pendingPhotoFile={pendingPhotoFile}
            pendingPhotoRemove={pendingPhotoRemove}
            onSelectPhoto={(file) => {
              setPendingPhotoFile(file);
              setPendingPhotoRemove(false);
              setSaveError(null);
            }}
            onRequestRemove={() => {
              setPendingPhotoFile(null);
              setPendingPhotoRemove(true);
              setSaveError(null);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account information</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
            <AccountSectionForm
              ref={accountRef}
              email={email}
              pendingEmail={pendingEmail}
              username={username}
              initial={initial}
              onDirtyChange={setAccountDirty}
              onSaveSuccess={handleAccountSaveSuccess}
            />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My clubs</CardTitle>
        </CardHeader>
        <CardContent>
          <MyClubsSection memberships={memberships} canCreate={canCreateClub} />
        </CardContent>
      </Card>
    </div>
  );
}
