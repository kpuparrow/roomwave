import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { canUseServer, writeAuditLog } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const schema = z.object({ name: z.string().min(2).max(80) });

export async function POST(request: Request, { params }: { params: Promise<{ serverId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = checkRateLimit(`room-create:${user.id}:${getClientIp(request)}`, { limit: 20, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfterMs);

  const { serverId } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Название комнаты слишком короткое." }, { status: 400 });

  const server = await prisma.server.findFirst({ where: { id: serverId, members: { some: { userId: user.id } } } });
  if (!server) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canUseServer(serverId, user.id, "createRoom"))) {
    return NextResponse.json({ error: "Создавать комнаты могут владелец и админы сервера." }, { status: 403 });
  }

  const room = await prisma.musicRoom.create({
    data: {
      serverId,
      name: parsed.data.name,
      hostId: user.id,
      members: { create: { userId: user.id, role: "HOST" } },
      playerState: { create: {} }
    }
  });
  await writeAuditLog(serverId, user.id, "ROOM_CREATED", { roomId: room.id, name: room.name });
  return NextResponse.json({ room }, { status: 201 });
}
