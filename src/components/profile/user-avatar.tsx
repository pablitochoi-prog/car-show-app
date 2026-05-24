"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getUserInitials } from "@/lib/profile-photo-access";

type Props = {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
  hasPhoto?: boolean;
  photoSrc?: string | null;
  size?: "sm" | "default" | "lg";
  className?: string;
};

export function UserAvatar({
  firstName,
  lastName,
  name,
  email,
  hasPhoto = false,
  photoSrc = "/api/me/avatar/view",
  size = "default",
  className,
}: Props) {
  const initials = getUserInitials({ firstName, lastName, name, email });
  const src = hasPhoto && photoSrc ? photoSrc : undefined;

  return (
    <Avatar size={size} className={cn("bg-muted/60", className)}>
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback className="bg-muted/80 font-medium text-muted-foreground">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
