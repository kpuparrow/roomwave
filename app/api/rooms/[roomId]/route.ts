import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { roomId } = await params;

  const room = await prisma.musicRoom.findFirst({
    where: {
      id: roomId,
      server: { members: { some: { userId: user.id } } }
    },
    include: {
      server: true,
      members: { include: { user: { select: { id: true, email: true, username: true, name: true, avatarUrl: true, status: true } } } },
      queue: { include: { track: true }, orderBy: { position: "asc" } },
      playerState: true
    }
  });

  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ban = await prisma.serverBan.findFirst({
    where: {
      serverId: room.serverId,
      AND: [
        { OR: [{ userId: user.id }, { email: user.email }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
      ]
    }
  });
  if (ban) return NextResponse.json({ error: "Доступ к серверу ограничен." }, { status: 403 });

  await prisma.roomMember.upsert({
    where: { userId_roomId: { userId: user.id, roomId } },
    update: {},
    create: { userId: user.id, roomId, role: room.hostId === user.id ? "HOST" : "LISTENER" }
  });

  return NextResponse.json({ room });
}
