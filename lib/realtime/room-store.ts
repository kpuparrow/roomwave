import { prisma } from "../prisma";
import { toPlayerStateDTO, toQueueItemDTO } from "../mappers";

export async function getRoomPlaybackState(roomId: string) {
  const [state, queue] = await Promise.all([
    prisma.playerState.upsert({
      where: { roomId },
      update: {},
      create: { roomId }
    }),
    prisma.queueItem.findMany({
      where: { roomId },
      include: { track: true },
      orderBy: { position: "asc" }
    })
  ]);

  const room = await prisma.musicRoom.findUnique({ where: { id: roomId }, select: { hostId: true } });
  return toPlayerStateDTO(roomId, room?.hostId ?? null, state, queue);
}

export async function setPlayback(roomId: string, userId: string, patch: { isPlaying?: boolean; positionMs?: number; currentTrackId?: string | null }) {
  const state = await prisma.playerState.upsert({
    where: { roomId },
    update: {
      ...patch,
      updatedById: userId
    },
    create: {
      roomId,
      isPlaying: patch.isPlaying ?? false,
      positionMs: patch.positionMs ?? 0,
      currentTrackId: patch.currentTrackId,
      updatedById: userId
    }
  });
  const queue = await prisma.queueItem.findMany({
    where: { roomId },
    include: { track: true },
    orderBy: { position: "asc" }
  });
  const room = await prisma.musicRoom.findUnique({ where: { id: roomId }, select: { hostId: true } });
  return toPlayerStateDTO(roomId, room?.hostId ?? null, state, queue);
}

export async function addTrackToQueue(roomId: string, userId: string, trackId: string) {
  const last = await prisma.queueItem.findFirst({
    where: { roomId },
    orderBy: { position: "desc" }
  });
  const item = await prisma.queueItem.create({
    data: {
      roomId,
      trackId,
      addedById: userId,
      position: (last?.position ?? -1) + 1
    },
    include: { track: true }
  });

  const state = await prisma.playerState.upsert({
    where: { roomId },
    update: {},
    create: { roomId, currentTrackId: trackId }
  });

  if (!state.currentTrackId) {
    await prisma.playerState.update({
      where: { roomId },
      data: { currentTrackId: trackId, positionMs: 0, isPlaying: false, updatedById: userId }
    });
  }

  return toQueueItemDTO(item);
}

export async function playTrackNow(roomId: string, userId: string, trackId: string) {
  const existing = await prisma.queueItem.findFirst({ where: { roomId, trackId } });
  if (!existing) {
    await addTrackToQueue(roomId, userId, trackId);
  }

  return setPlayback(roomId, userId, {
    currentTrackId: trackId,
    positionMs: 0,
    isPlaying: true
  });
}

export async function removeQueueItem(roomId: string, queueItemId: string) {
  const deleted = await prisma.queueItem.delete({ where: { id: queueItemId } });
  const queue = await prisma.queueItem.findMany({
    where: { roomId },
    include: { track: true },
    orderBy: { position: "asc" }
  });

  const state = await prisma.playerState.findUnique({ where: { roomId } });
  if (state?.currentTrackId === deleted.trackId) {
    await prisma.playerState.update({
      where: { roomId },
      data: {
        currentTrackId: queue[0]?.trackId ?? null,
        positionMs: 0,
        isPlaying: Boolean(queue[0]) && state.isPlaying
      }
    });
  }

  await Promise.all(
    queue.map((item, index) =>
      item.position === index ? item : prisma.queueItem.update({ where: { id: item.id }, data: { position: index } })
    )
  );

  return prisma.queueItem.findMany({
    where: { roomId },
    include: { track: true },
    orderBy: { position: "asc" }
  });
}

export async function skipTrack(roomId: string, userId: string, direction: "next" | "previous") {
  const state = await prisma.playerState.upsert({
    where: { roomId },
    update: {},
    create: { roomId }
  });
  const queue = await prisma.queueItem.findMany({
    where: { roomId },
    include: { track: true },
    orderBy: { position: "asc" }
  });
  const room = await prisma.musicRoom.findUnique({ where: { id: roomId }, select: { hostId: true } });
  if (!queue.length) return toPlayerStateDTO(roomId, room?.hostId ?? null, state, queue);

  const currentIndex = Math.max(
    0,
    queue.findIndex((item) => item.trackId === state.currentTrackId)
  );
  let nextIndex = direction === "next" ? Math.min(queue.length - 1, currentIndex + 1) : Math.max(0, currentIndex - 1);
  if (state.repeatMode === "ONE") nextIndex = currentIndex;
  else if (state.shuffle && direction === "next") nextIndex = Math.floor(Math.random() * queue.length);
  else if (state.repeatMode === "ALL") {
    nextIndex = direction === "next" ? (currentIndex + 1) % queue.length : (currentIndex - 1 + queue.length) % queue.length;
  }

  const updated = await prisma.playerState.update({
    where: { roomId },
    data: {
      currentTrackId: queue[nextIndex].trackId,
      positionMs: 0,
      isPlaying: state.isPlaying,
      updatedById: userId
    }
  });

  return toPlayerStateDTO(roomId, room?.hostId ?? null, updated, queue);
}

export async function setPlayerOptions(roomId: string, patch: { shuffle?: boolean; repeatMode?: "OFF" | "ONE" | "ALL"; crossfadeSeconds?: number }) {
  const state = await prisma.playerState.upsert({
    where: { roomId },
    update: patch,
    create: { roomId, ...patch }
  });
  const queue = await prisma.queueItem.findMany({
    where: { roomId },
    include: { track: true },
    orderBy: { position: "asc" }
  });
  const room = await prisma.musicRoom.findUnique({ where: { id: roomId }, select: { hostId: true } });
  return toPlayerStateDTO(roomId, room?.hostId ?? null, state, queue);
}

export async function shuffleQueue(roomId: string) {
  const queue = await prisma.queueItem.findMany({ where: { roomId }, orderBy: { position: "asc" } });
  const shuffled = [...queue];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  await Promise.all(shuffled.map((item, index) => prisma.queueItem.update({ where: { id: item.id }, data: { position: index } })));
  return prisma.queueItem.findMany({
    where: { roomId },
    include: { track: true },
    orderBy: { position: "asc" }
  });
}

export async function reorderQueue(roomId: string, queueItemIds: string[]) {
  const queue = await prisma.queueItem.findMany({ where: { roomId }, select: { id: true } });
  const validIds = new Set(queue.map((item) => item.id));
  const orderedIds = queueItemIds.filter((id) => validIds.has(id));
  const missingIds = queue.map((item) => item.id).filter((id) => !orderedIds.includes(id));
  const finalIds = [...orderedIds, ...missingIds];
  await Promise.all(finalIds.map((id, index) => prisma.queueItem.update({ where: { id }, data: { position: index } })));
  return prisma.queueItem.findMany({
    where: { roomId },
    include: { track: true },
    orderBy: { position: "asc" }
  });
}

export async function voteForTrack(roomId: string, userId: string, trackId: string, queueItemId?: string) {
  await prisma.trackVote.upsert({
    where: { roomId_userId_trackId: { roomId, userId, trackId } },
    update: { score: 1, queueItemId },
    create: { roomId, userId, trackId, queueItemId, score: 1 }
  });

  const votes = await prisma.trackVote.groupBy({
    by: ["trackId"],
    where: { roomId },
    _sum: { score: true },
    _count: { userId: true }
  });

  return votes.map((vote) => ({
    trackId: vote.trackId,
    score: vote._sum.score ?? 0,
    voters: vote._count.userId
  }));
}
