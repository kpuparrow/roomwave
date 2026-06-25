import { notFound, redirect } from "next/navigation";
import { MusicRoom } from "@/components/MusicRoom";
import { getCurrentUser } from "@/lib/auth/session";
import { toPlayerStateDTO, toTrackDTO } from "@/lib/mappers";
import { prisma } from "@/lib/prisma";

export default async function RoomPage({ params }: { params: Promise<{ serverId: string; roomId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { serverId, roomId } = await params;

  const room = await prisma.musicRoom.findFirst({
    where: { id: roomId, server: { members: { some: { userId: user.id } } } },
    include: {
      members: { include: { user: { select: { id: true, email: true, username: true, name: true, avatarUrl: true, status: true } } } },
      queue: { include: { track: true }, orderBy: { position: "asc" } },
      playerState: true
    }
  });
  if (!room) notFound();

  await prisma.roomMember.upsert({
    where: { userId_roomId: { userId: user.id, roomId } },
    update: {},
    create: { userId: user.id, roomId, role: room.hostId === user.id ? "HOST" : "LISTENER" }
  });

  const freshRoom = await prisma.musicRoom.findUnique({
    where: { id: roomId },
    include: {
      members: { include: { user: { select: { id: true, email: true, username: true, name: true, avatarUrl: true, status: true } } } },
      queue: { include: { track: true }, orderBy: { position: "asc" } },
      playerState: true
    }
  });

  const tracks = await prisma.track.findMany({
    where: { uploadedById: user.id },
    orderBy: { createdAt: "desc" }
  });
  const serverMember = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: user.id, serverId } },
    select: { role: true }
  });
  const canControlPlayback = Boolean(serverMember && ["OWNER", "ADMIN", "DJ"].includes(serverMember.role)) || (freshRoom?.hostId ?? room.hostId) === user.id;

  return (
    <MusicRoom
      roomId={roomId}
      roomName={(freshRoom?.name ?? room.name) === "Main Room" ? "Главная комната" : freshRoom?.name ?? room.name}
      user={user}
      hostId={freshRoom?.hostId ?? room.hostId}
      canControlPlayback={canControlPlayback}
      initialMembers={(freshRoom?.members ?? room.members).map((member) => ({
        id: member.id,
        role: member.role,
        user: member.user
      }))}
      initialState={toPlayerStateDTO(roomId, freshRoom?.hostId ?? room.hostId, freshRoom?.playerState ?? room.playerState, freshRoom?.queue ?? room.queue)}
      library={tracks.map(toTrackDTO)}
    />
  );
}
