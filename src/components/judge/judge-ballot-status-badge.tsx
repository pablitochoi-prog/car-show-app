import type { JudgeBallotCategoryStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const LABELS: Record<JudgeBallotCategoryStatus, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  CLOSED: "Closed",
  FINALIZED: "Finalized",
};

function variantFor(
  status: JudgeBallotCategoryStatus,
): "success" | "warning" | "secondary" | "outline" {
  switch (status) {
    case "OPEN":
      return "success";
    case "CLOSED":
      return "warning";
    case "FINALIZED":
      return "secondary";
    default:
      return "outline";
  }
}

export function JudgeBallotStatusBadge({
  status,
}: {
  status: JudgeBallotCategoryStatus;
}) {
  return <Badge variant={variantFor(status)}>{LABELS[status]}</Badge>;
}
