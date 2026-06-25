"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserAvatar } from "@/components/UserAvatar";
import type { UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function ProfileMenu({ user, placement = "floating" }: { user: UserProfile; placement?: "floating" | "dock" }) {
  const [open, setOpen] = useState(false);
  const isDock = placement === "dock";

  return (
    <div className="relative">
      <button onClick={() => setOpen((value) => !value)} className="rounded-full ring-offset-background transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Открыть профиль">
        <UserAvatar user={user} className="h-11 w-11 shadow-lg" />
      </button>
      {open ? (
        <div className={cn("glass absolute w-72 rounded-3xl p-4", isDock ? "bottom-full left-full z-[70] mb-3 ml-3" : "right-0 z-[90] mt-3")}>
          <div className="mb-4 flex items-center gap-3">
            <UserAvatar user={user} className="h-12 w-12" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">@{user.username ?? "login"}</p>
            </div>
          </div>
          <Link href="/app/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm transition hover:bg-foreground/8">
            <Settings className="h-4 w-4" />
            Настройки профиля
          </Link>
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-foreground/[.04] px-3 py-2 text-sm">
            Тема
            <ThemeToggle />
          </div>
        </div>
      ) : null}
    </div>
  );
}
