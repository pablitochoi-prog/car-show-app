import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPageContent } from "@/components/legal/policy-page-content";
import { getPrivacyPolicyHtml } from "@/lib/legal-policies";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for CarShowScout car show discovery and event management.",
};

export default async function PrivacyPage() {
  const html = await getPrivacyPolicyHtml();

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
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <div className="mt-6">
        <PolicyPageContent html={html} />
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        SMS messaging terms are described in our{" "}
        <Link
          href="/terms"
          className="text-foreground underline-offset-4 hover:underline"
        >
          SMS Text Policy
        </Link>{" "}
        and{" "}
        <Link
          href="/sms"
          className="text-foreground underline-offset-4 hover:underline"
        >
          SMS Program page
        </Link>
        .
      </p>
    </div>
  );
}
