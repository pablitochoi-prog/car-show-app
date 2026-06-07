import Link from "next/link";
import { Scale } from "lucide-react";
import { ContextualHelpLink } from "@/components/help/contextual-help-link";
import { JudgeAssignmentsList } from "@/components/judge/judge-assignments-list";

export default function JudgeAssignmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground underline"
        >
          Back to dashboard
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold">
          <Scale className="size-7" aria-hidden />
          My Judging
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Judge ballot voting and assigned scorecard categories — select an event
        </p>
        <ContextualHelpLink slug="judge-access-assigned-events" className="mt-2" />
      </div>
      <JudgeAssignmentsList />
    </div>
  );
}
