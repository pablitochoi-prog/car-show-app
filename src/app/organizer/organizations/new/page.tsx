import { Suspense } from "react";
import { NewOrganizationForm } from "./new-organization-form";

export default function NewOrganizationPage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell max-w-lg py-12 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <NewOrganizationForm />
    </Suspense>
  );
}
