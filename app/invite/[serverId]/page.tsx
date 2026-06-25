import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function InvitePage({ params }: { params: Promise<{ serverId: string }> }) {
  const user = await getCurrentUser();
  const { serverId: codeOrServerId } = await params;

  if (!user) redirect(`/login?next=/invite/${codeOrServerId}`);

  const invite = await prisma.invite.findUnique({
    where: { code: codeOrServerId },
    include: { server: { include: { rooms: { orderBy: { createdAt: "asc" }, take: 1 } } } }
  });

  const now = new Date();
  if (invite) {
    if (invite.revokedAt || (invite.expiresAt && invite.expiresAt <= now) || (invite.maxUses && invite.uses >= invite.maxUses)) notFound();
    const banned = await prisma.serverBan.findFirst({
      where: {
        serverId: invite.serverId,
        AND: [
          { OR: [{ userId: user.id }, { email: user.email }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
        ]
      }
    });
    if (banned) notFound();

    await prisma.$transaction([
      prisma.serverMember.upsert({
        where: { userId_serverId: { userId: user.id, serverId: invite.serverId } },
        update: {},
        create: { userId: user.id, serverId: invite.serverId, role: "MEMBER" }
      }),
      prisma.invite.update({ where: { id: invite.id }, data: { uses: { increment: 1 } } }),
      prisma.serverAuditLog.create({
        data: { serverId: invite.serverId, actorId: user.id, action: "MEMBER_JOINED", metadata: { viaInvite: invite.code } }
      })
    ]);

    const firstRoom = invite.server.rooms[0];
    redirect(firstRoom ? `/app/servers/${invite.server.id}/rooms/${firstRoom.id}` : `/app/servers/${invite.server.id}`);
  }

  const server = await prisma.server.findFirst({
    where: {
      id: codeOrServerId,
      visibility: "PUBLIC"
    },
    include: { rooms: { orderBy: { createdAt: "asc" }, take: 1 } }
  });
  if (!server) notFound();

  await prisma.serverMember.upsert({
    where: { userId_serverId: { userId: user.id, serverId: server.id } },
    update: {},
    create: { userId: user.id, serverId: server.id, role: "MEMBER" }
  });

  const firstRoom = server.rooms[0];
  redirect(firstRoom ? `/app/servers/${server.id}/rooms/${firstRoom.id}` : `/app/servers/${server.id}`);
}
