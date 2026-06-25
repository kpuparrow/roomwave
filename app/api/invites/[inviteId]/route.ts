import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canUseServer, writeAuditLog } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function DELETE(_: Request, { params }: { params: Promise<{ inviteId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { inviteId } = await params;

  const invite = await prisma.invite.findUnique({ where: { id: inviteId }, select: { id: true, serverId: true } });
  if (!invite) return NextResponse.json({ error: "Приглашение не найдено." }, { status: 404 });
  if (!(await canUseServer(invite.serverId, user.id, "manageServer"))) return NextResponse.json({ error: "Отозвать приглашение могут владелец и админы." }, { status: 403 });

  await prisma.invite.update({ where: { id: inviteId }, data: { revokedAt: new Date() } });
  await writeAuditLog(invite.serverId, user.id, "INVITE_REVOKED", { inviteId });
  return NextResponse.json({ ok: true });
}
