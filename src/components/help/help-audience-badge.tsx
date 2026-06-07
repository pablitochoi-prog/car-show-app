import { Badge } from "@/components/ui/badge";
import { HELP_AUDIENCE_LABELS, type HelpAudience } from "@/lib/help/help-types";

type Props = {
  audience: HelpAudience;
  className?: string;
};

export function HelpAudienceBadge({ audience, className }: Props) {
  return (
    <Badge variant="muted" className={className}>
      {HELP_AUDIENCE_LABELS[audience]}
    </Badge>
  );
}
