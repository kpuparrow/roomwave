import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { canUseServer, getServerRole, roleCan, writeAuditLog } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const roleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "DJ", "MEMBER", "GUEST"])
});

const banSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().max(240).optional(),
  expiresInHours: z.number().int().min(1).max(24 * 365).optional()
});

export async function GET(_: Request, { params }: { params: Promise<{ serverId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { serverId } = await params;
  const member = await getServerRole(serverId, user.id);
  if (!member) return NextResponse.json({ error: "Нет доступа к серверу." }, { status: 403 });

  const members = await prisma.serverMember.findMany({
    where: { serverId },
    include: { user: { select: { id: true, email: true, username: true, name: true, avatarUrl: true, status: true } } },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }]
  });
  return NextResponse.json({ members });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ serverId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { serverId } = await params;
  if (!(await canUseServer(serverId, user.id, "manageMembers"))) return NextResponse.json({ error: "Менять роли могут владелец и админы." }, { status: 403 });

  const parsed = roleSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Проверьте роль участника." }, { status: 400 });

  const target = await prisma.serverMember.findUnique({ where: { userId_serverId: { userId: parsed.data.userId, serverId } } });
  if (!target) return NextResponse.json({ error: "Участник не найден." }, { status: 404 });
  if (target.role === "OWNER") return NextResponse.json({ error: "Роль владельца менять нельзя." }, { status: 403 });
  if (!roleCan(target.role, "manageMembers") || (await getServerRole(serverId, user.id))?.role === "OWNER") {
    const member = await prisma.serverMember.update({
      where: { userId_serverId: { userId: parsed.data.userId, serverId } },
      data: { role: parsed.data.role }
    });
    await writeAuditLog(serverId, user.id, "ROLE_UPDATED", { userId: parsed.data.userId, role: parsed.data.role });
    return NextResponse.json({ member });
  }

  return NextResponse.json({ error: "Нельзя менять роль участника с равными или более высокими правами." }, { status: 403 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ serverId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { serverId } = await params;
  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get("userId") ?? user.id;

  if (targetUserId !== user.id && !(await canUseServer(serverId, user.id, "manageMembers"))) {
    return NextResponse.json({ error: "Исключать участников могут владелец и админы." }, { status: 403 });
  }

  const target = await prisma.serverMember.findUnique({ where: { userId_serverId: { userId: targetUserId, serverId } } });
  if (!target) return NextResponse.json({ error: "Участник не найден." }, { status: 404 });
  if (target.role === "OWNER") return NextResponse.json({ error: "Владелец не может выйти, пока не удалит сервер." }, { status: 403 });

  await prisma.serverMember.delete({ where: { userId_serverId: { userId: targetUserId, serverId } } });
  await writeAuditLog(serverId, user.id, targetUserId === user.id ? "MEMBER_LEFT" : "MEMBER_KICKED", { userId: targetUserId });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request, { params }: { params: Promise<{ serverId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { serverId } = await params;
  if (!(await canUseServer(serverId, user.id, "manageMembers"))) return NextResponse.json({ error: "Банить участников могут владелец и админы." }, { status: 403 });

  const parsed = banSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Проверьте параметры бана." }, { status: 400 });
  const target = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: parsed.data.userId, serverId } },
    include: { user: { select: { email: true } } }
  });
  if (!target) return NextResponse.json({ error: "Участник не найден." }, { status: 404 });
  if (target.role === "OWNER") return NextResponse.json({ error: "Владельца нельзя забанить." }, { status: 403 });

  await prisma.$transaction([
    prisma.serverBan.create({
      data: {
        serverId,
        userId: parsed.data.userId,
        email: target.user.email,
        reason: parsed.data.reason,
        bannedById: user.id,
        expiresAt: parsed.data.expiresInHours ? new Date(Date.now() + parsed.data.expiresInHours * 60 * 60 * 1000) : null
      }
    }),
    prisma.serverMember.delete({ where: { userId_serverId: { userId: parsed.data.userId, serverId } } }),
    prisma.serverAuditLog.create({ data: { serverId, actorId: user.id, action: "MEMBER_BANNED", metadata: { userId: parsed.data.userId, reason: parsed.data.reason } } })
  ]);

  return NextResponse.json({ ok: true });
}
