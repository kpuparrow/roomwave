import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { canUseServer, writeAuditLog } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(240).optional().nullable(),
  visibility: z.enum(["PRIVATE", "PUBLIC"]).optional(),
  mood: z.string().max(48).optional().nullable(),
  publicSession: z.boolean().optional(),
  djBattleEnabled: z.boolean().optional()
});

export async function GET(_: Request, { params }: { params: Promise<{ serverId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { serverId } = await params;

  const server = await prisma.server.findFirst({
    where: { id: serverId, members: { some: { userId: user.id } } },
    include: {
      rooms: {
        include: {
          members: {
            include: { user: { select: { id: true, email: true, username: true, name: true, avatarUrl: true, status: true } } }
          }
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });
  if (!server) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ server });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ serverId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { serverId } = await params;

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Проверьте настройки сервера." }, { status: 400 });

  const server = await prisma.server.findUnique({ where: { id: serverId }, select: { ownerId: true } });
  if (!server) return NextResponse.json({ error: "Сервер не найден." }, { status: 404 });
  if (!(await canUseServer(serverId, user.id, "manageServer"))) return NextResponse.json({ error: "Менять сервер могут владелец и админы." }, { status: 403 });

  const updated = await prisma.server.update({
    where: { id: serverId },
    data: {
      name: parsed.data.name?.trim(),
      description: parsed.data.description?.trim() || null,
      visibility: parsed.data.visibility,
      mood: parsed.data.mood?.trim() || null,
      publicSession: parsed.data.publicSession,
      djBattleEnabled: parsed.data.djBattleEnabled
    },
    include: { rooms: { orderBy: { createdAt: "asc" } } }
  });
  await writeAuditLog(serverId, user.id, "SERVER_UPDATED", parsed.data);

  return NextResponse.json({ server: updated });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ serverId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { serverId } = await params;

  const server = await prisma.server.findUnique({ where: { id: serverId }, select: { ownerId: true } });
  if (!server) return NextResponse.json({ error: "Сервер не найден." }, { status: 404 });
  if (server.ownerId !== user.id) return NextResponse.json({ error: "Удалять сервер может только владелец." }, { status: 403 });

  await writeAuditLog(serverId, user.id, "SERVER_DELETED");
  await prisma.server.delete({ where: { id: serverId } });
  return NextResponse.json({ ok: true });
}
