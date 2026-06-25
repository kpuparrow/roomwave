import type { ServerRole } from "@prisma/client";
import { prisma } from "./prisma";

const roleRank: Record<ServerRole, number> = {
  OWNER: 5,
  ADMIN: 4,
  DJ: 3,
  MEMBER: 2,
  GUEST: 1
};

export type ServerPermission =
  | "manageServer"
  | "manageMembers"
  | "createRoom"
  | "addTracks"
  | "removeQueue"
  | "controlPlayback"
  | "transferDj"
  | "sendChat"
  | "moderateChat";

export function roleCan(role: ServerRole | null | undefined, permission: ServerPermission) {
  if (!role) return false;
  const rank = roleRank[role];

  switch (permission) {
    case "manageServer":
    case "manageMembers":
    case "createRoom":
    case "moderateChat":
      return rank >= roleRank.ADMIN;
    case "controlPlayback":
    case "transferDj":
    case "removeQueue":
      return rank >= roleRank.DJ;
    case "addTracks":
    case "sendChat":
      return rank >= roleRank.MEMBER;
  }
}

export async function getServerRole(serverId: string, userId: string) {
  const member = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId, serverId } },
    select: { role: true, mutedUntil: true }
  });
  return member ?? null;
}

export async function canUseServer(serverId: string, userId: string, permission: ServerPermission) {
  const member = await getServerRole(serverId, userId);
  if (!member) return false;
  if (member.mutedUntil && member.mutedUntil.getTime() > Date.now() && permission === "sendChat") return false;
  return roleCan(member.role, permission);
}

export async function canUseRoom(roomId: string, userId: string, permission: ServerPermission) {
  const room = await prisma.musicRoom.findUnique({ where: { id: roomId }, select: { serverId: true, hostId: true } });
  if (!room) return false;
  if ((permission === "controlPlayback" || permission === "transferDj") && room.hostId === userId) return true;
  return canUseServer(room.serverId, userId, permission);
}

export async function writeAuditLog(serverId: string, actorId: string | null, action: string, metadata?: unknown) {
  await prisma.serverAuditLog.create({
    data: {
      serverId,
      actorId,
      action,
      metadata: metadata === undefined ? undefined : JSON.parse(JSON.stringify(metadata))
    }
  });
}
