import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { canUseServer, getServerRole, writeAuditLog } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  expiresInHours: z.number().int().min(1).max(24 * 30).optional(),
  maxUses: z.number().int().min(1).max(1000).optional()
});

export async function GET(_: Request, { params }: { params: Promise<{ serverId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { serverId } = await params;
  if (!(await canUseServer(serverId, user.id, "manageServer"))) return NextResponse.json({ error: "Нет доступа к приглашениям." }, { status: 403 });

  const invites = await prisma.invite.findMany({
    where: { serverId },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return NextResponse.json({ invites });
}

export async function POST(request: Request, { params }: { params: Promise<{ serverId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { serverId } = await params;
  if (!(await getServerRole(serverId, user.id))) return NextResponse.json({ error: "Создавать приглашения могут участники сервера." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Проверьте параметры приглашения." }, { status: 400 });

  const code = await createUniqueInviteCode();
  const invite = await prisma.invite.create({
    data: {
      code,
      serverId,
      createdById: user.id,
      maxUses: parsed.data.maxUses,
      expiresAt: parsed.data.expiresInHours ? new Date(Date.now() + parsed.data.expiresInHours * 60 * 60 * 1000) : null
    }
  });
  await writeAuditLog(serverId, user.id, "INVITE_CREATED", { inviteId: invite.id, code: invite.code });

  return NextResponse.json({ invite }, { status: 201 });
}

async function createUniqueInviteCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = randomBytes(6).toString("base64url");
    const existing = await prisma.invite.findUnique({ where: { code }, select: { id: true } });
    if (!existing) return code;
  }
  return randomBytes(10).toString("base64url");
}
