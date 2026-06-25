import { HomePlayerDashboard } from "@/components/HomePlayerDashboard";
import { getCurrentUser } from "@/lib/auth/session";
import { toTrackDTO } from "@/lib/mappers";
import { prisma } from "@/lib/prisma";

export default async function ServersPage() {
  const user = await getCurrentUser();
  const servers = user
    ? await prisma.server.findMany({
        where: { members: { some: { userId: user.id } } },
        include: { rooms: { orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "asc" }
      })
    : [];
  const tracks = user
    ? await prisma.track.findMany({
        where: { uploadedById: user.id },
        orderBy: { createdAt: "desc" },
        take: 8
      })
    : [];

  return (
    <HomePlayerDashboard
      user={user!}
      servers={servers.map((server) => ({
        id: server.id,
        name: server.name,
        iconUrl: server.iconUrl,
        rooms: server.rooms.map((room) => ({ id: room.id, name: room.name, hostId: room.hostId }))
      }))}
      tracks={tracks.map(toTrackDTO)}
    />
  );
}
