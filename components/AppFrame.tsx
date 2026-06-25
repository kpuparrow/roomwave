"use client";

import { usePathname } from "next/navigation";
import { SidebarServers } from "@/components/SidebarServers";
import type { ServerDTO, UserProfile } from "@/lib/types";

export function AppFrame({ user, servers, children }: { user: UserProfile; servers: ServerDTO[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const activeServerId = pathname.match(/\/app\/servers\/([^/]+)/)?.[1];

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <SidebarServers servers={servers} activeServerId={activeServerId} user={user} />
      <div className="flex min-w-0 flex-1">{children}</div>
    </div>
  );
}
