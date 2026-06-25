"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserProfile } from "@/lib/types";

export function UserAvatar({ user, className }: { user: Pick<UserProfile, "name" | "avatarUrl">; className?: string }) {
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Avatar className={className}>
      {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name} /> : null}
      <AvatarFallback>{initials || "RW"}</AvatarFallback>
    </Avatar>
  );
}
