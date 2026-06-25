import { redirect } from "next/navigation";
import { AppFrame } from "@/components/AppFrame";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const servers = await prisma.server.findMany({
    where: { members: { some: { userId: user.id } } },
    include: { rooms: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" }
  });

  return (
    <AppFrame
      user={user}
      servers={servers.map((server) => ({
        id: server.id,
        name: server.name,
        iconUrl: server.iconUrl,
        rooms: server.rooms.map((room) => ({ id: room.id, name: room.name, hostId: room.hostId }))
      }))}
    >
      {children}
    </AppFrame>
  );
}
