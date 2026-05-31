import { Badge } from "@/components/ui/badge";

export function RegistrationStatusBadge({
  label,
  complete,
}: {
  label: string;
  complete: boolean;
}) {
  return (
    <Badge variant={complete ? "success" : "incomplete"}>{label}</Badge>
  );
}

/** Shorthand for a fully complete registration (dashboard managing cards). */
export function RegisteredEventBadge() {
  return <RegistrationStatusBadge label="Registered" complete />;
}
