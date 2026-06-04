import type { Metadata } from "next";
import Link from "next/link";
import {
  POLICY_UNPUBLISHED_MESSAGE,
  PolicyPageContent,
} from "@/components/legal/policy-page-content";
import { getSmsTextPolicyHtml } from "@/lib/legal-policies";

export const metadata: Metadata = {
  title: "SMS Text Policy",
  description:
    "SMS messaging terms for CarShowScout event voting, registration, and participation.",
};

export default async function TermsPage() {
  const html = await getSmsTextPolicyHtml();

  return (
    <div className="page-shell max-w-2xl py-10 md:py-14">
      <p className="text-sm text-muted-foreground">
        <Link
          href="/events"
          className="hover:text-foreground underline-offset-4 hover:underline"
        >
          ← Find events
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">SMS Text Policy</h1>
      <div className="mt-6">
        {html ? (
          <PolicyPageContent html={html} />
        ) : (
          <p className="text-base leading-relaxed text-muted-foreground">
            {POLICY_UNPUBLISHED_MESSAGE}
          </p>
        )}
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Questions? Contact your event organizer or visit{" "}
        <Link href="/" className="text-foreground underline-offset-4 hover:underline">
          CarShowScout.com
        </Link>
        . See also our{" "}
        <Link
          href="/privacy"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
