-- CreateEnum
CREATE TYPE "ServerRole" AS ENUM ('OWNER', 'ADMIN', 'DJ', 'MEMBER', 'GUEST');

-- CreateEnum
CREATE TYPE "ServerVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "RepeatMode" AS ENUM ('OFF', 'ONE', 'ALL');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Server" ADD COLUMN "description" TEXT;
ALTER TABLE "Server" ADD COLUMN "visibility" "ServerVisibility" NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE "Server" ADD COLUMN "inviteCode" TEXT;
ALTER TABLE "Server" ADD COLUMN "mood" TEXT;
ALTER TABLE "Server" ADD COLUMN "liveArtworkUrl" TEXT;
ALTER TABLE "Server" ADD COLUMN "publicSession" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Server" ADD COLUMN "djBattleEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ServerMember" ADD COLUMN "role" "ServerRole" NOT NULL DEFAULT 'MEMBER';
ALTER TABLE "ServerMember" ADD COLUMN "mutedUntil" TIMESTAMP(3);
ALTER TABLE "ServerMember" ADD COLUMN "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "ServerMember" AS sm
SET "role" = 'OWNER'
FROM "Server" AS s
WHERE sm."serverId" = s."id" AND sm."userId" = s."ownerId";

-- AlterTable
ALTER TABLE "MusicRoom" ADD COLUMN "description" TEXT;
ALTER TABLE "MusicRoom" ADD COLUMN "mood" TEXT;
ALTER TABLE "MusicRoom" ADD COLUMN "roomArtworkUrl" TEXT;
ALTER TABLE "MusicRoom" ADD COLUMN "isPublicSession" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MusicRoom" ADD COLUMN "djBattleEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PlayerState" ADD COLUMN "shuffle" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PlayerState" ADD COLUMN "repeatMode" "RepeatMode" NOT NULL DEFAULT 'OFF';
ALTER TABLE "PlayerState" ADD COLUMN "crossfadeSeconds" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerBan" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "reason" TEXT,
    "bannedById" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServerBan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerAuditLog" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServerAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "messageId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Playlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaylistTrack" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaylistTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListeningHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "roomId" TEXT,
    "positionMs" INTEGER,
    "listenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListeningHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomReaction" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "trackId" TEXT,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackVote" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "queueItemId" TEXT,
    "trackId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Server_inviteCode_key" ON "Server"("inviteCode");
CREATE INDEX "ServerMember_serverId_role_idx" ON "ServerMember"("serverId", "role");
CREATE UNIQUE INDEX "Invite_code_key" ON "Invite"("code");
CREATE INDEX "Invite_serverId_idx" ON "Invite"("serverId");
CREATE INDEX "Invite_code_idx" ON "Invite"("code");
CREATE INDEX "ServerBan_serverId_idx" ON "ServerBan"("serverId");
CREATE INDEX "ServerBan_userId_idx" ON "ServerBan"("userId");
CREATE INDEX "ServerAuditLog_serverId_idx" ON "ServerAuditLog"("serverId");
CREATE INDEX "ServerAuditLog_actorId_idx" ON "ServerAuditLog"("actorId");
CREATE INDEX "Report_serverId_idx" ON "Report"("serverId");
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");
CREATE INDEX "Playlist_userId_idx" ON "Playlist"("userId");
CREATE UNIQUE INDEX "PlaylistTrack_playlistId_position_key" ON "PlaylistTrack"("playlistId", "position");
CREATE UNIQUE INDEX "PlaylistTrack_playlistId_trackId_key" ON "PlaylistTrack"("playlistId", "trackId");
CREATE INDEX "PlaylistTrack_trackId_idx" ON "PlaylistTrack"("trackId");
CREATE INDEX "ListeningHistory_userId_listenedAt_idx" ON "ListeningHistory"("userId", "listenedAt");
CREATE INDEX "ListeningHistory_trackId_idx" ON "ListeningHistory"("trackId");
CREATE INDEX "RoomReaction_roomId_createdAt_idx" ON "RoomReaction"("roomId", "createdAt");
CREATE UNIQUE INDEX "TrackVote_roomId_userId_trackId_key" ON "TrackVote"("roomId", "userId", "trackId");
CREATE INDEX "TrackVote_roomId_idx" ON "TrackVote"("roomId");
CREATE INDEX "TrackVote_queueItemId_idx" ON "TrackVote"("queueItemId");
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServerBan" ADD CONSTRAINT "ServerBan_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServerAuditLog" ADD CONSTRAINT "ServerAuditLog_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Playlist" ADD CONSTRAINT "Playlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaylistTrack" ADD CONSTRAINT "PlaylistTrack_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaylistTrack" ADD CONSTRAINT "PlaylistTrack_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListeningHistory" ADD CONSTRAINT "ListeningHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListeningHistory" ADD CONSTRAINT "ListeningHistory_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomReaction" ADD CONSTRAINT "RoomReaction_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "MusicRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomReaction" ADD CONSTRAINT "RoomReaction_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TrackVote" ADD CONSTRAINT "TrackVote_queueItemId_fkey" FOREIGN KEY ("queueItemId") REFERENCES "QueueItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrackVote" ADD CONSTRAINT "TrackVote_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
