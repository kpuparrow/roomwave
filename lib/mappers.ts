import type { PlayerState, QueueItem, Track, User } from "@prisma/client";
import type { PlayerStateDTO, QueueItemDTO, TrackDTO, UserProfile } from "@/lib/types";

export function toUserProfile(user: Pick<User, "id" | "email" | "username" | "name" | "avatarUrl" | "status">): UserProfile {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    avatarUrl: user.avatarUrl,
    status: user.status
  };
}

export function toTrackDTO(track: Track): TrackDTO {
  return {
    id: track.id,
    source: track.source,
    title: track.title,
    artist: track.artist,
    album: track.album,
    durationMs: track.durationMs,
    audioUrl: track.audioUrl,
    previewUrl: track.previewUrl,
    coverUrl: track.coverUrl
  };
}

export function toQueueItemDTO(item: QueueItem & { track: Track }): QueueItemDTO {
  return {
    id: item.id,
    position: item.position,
    track: toTrackDTO(item.track)
  };
}

export function toPlayerStateDTO(
  roomId: string,
  hostId: string | null,
  playerState: PlayerState | null,
  queue: Array<QueueItem & { track: Track }>
): PlayerStateDTO {
  const now = Date.now();
  const basePosition = playerState?.positionMs ?? 0;
  const effectivePosition =
    playerState?.isPlaying && playerState.updatedAt
      ? basePosition + Math.max(0, now - playerState.updatedAt.getTime())
      : basePosition;
  const currentTrack = queue.find((item) => item.trackId === playerState?.currentTrackId)?.track ?? null;

  return {
    roomId,
    currentTrack: currentTrack ? toTrackDTO(currentTrack) : null,
    currentTrackId: playerState?.currentTrackId ?? null,
    hostId,
    isPlaying: playerState?.isPlaying ?? false,
    positionMs: effectivePosition,
    shuffle: playerState?.shuffle ?? false,
    repeatMode: playerState?.repeatMode ?? "OFF",
    crossfadeSeconds: playerState?.crossfadeSeconds ?? 0,
    serverTime: now,
    queue: queue.map(toQueueItemDTO)
  };
}
