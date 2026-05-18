import { Suspense } from "react";
import { GuestRegisterCreateAccountClient } from "@/components/registration/guest-register-create-account-client";

export default async function GuestRegisterCreateAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;

  return (
    <Suspense
      fallback={
        <p className="page-shell text-center text-sm text-muted-foreground">
          Loading…
        </p>
      }
    >
      <GuestRegisterCreateAccountClient eventId={eventId} />
    </Suspense>
  );
}
