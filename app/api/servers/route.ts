import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/permissions";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const schema = z.object({ name: z.string().min(2).max(80) });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const servers = await prisma.server.findMany({
    where: { members: { some: { userId: user.id } } },
    include: { rooms: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" }
  });
  return NextResponse.json({ servers });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = checkRateLimit(`server-create:${user.id}:${getClientIp(request)}`, { limit: 12, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfterMs);

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Название сервера слишком короткое." }, { status: 400 });

  const server = await prisma.server.create({
    data: {
      name: parsed.data.name,
      ownerId: user.id,
      members: { create: { userId: user.id, role: "OWNER" } },
      rooms: {
        create: {
          name: "Главная комната",
          hostId: user.id,
          members: { create: { userId: user.id, role: "HOST" } },
          playerState: { create: {} }
        }
      }
    },
    include: { rooms: true }
  });

  await writeAuditLog(server.id, user.id, "SERVER_CREATED", { name: server.name });

  return NextResponse.json({ server }, { status: 201 });
}
