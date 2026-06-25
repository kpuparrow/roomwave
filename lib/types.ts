export type UserProfile = {
  id: string;
  email: string;
  username: string | null;
  name: string;
  avatarUrl: string | null;
  status: string;
};

export type TrackDTO = {
  id: string;
  source: "LOCAL" | "APPLE_MUSIC";
  title: string;
  artist: string | null;
  album: string | null;
  durationMs: number | null;
  audioUrl: string | null;
  previewUrl: string | null;
  coverUrl: string | null;
};

export type QueueItemDTO = {
  id: string;
  position: number;
  track: TrackDTO;
};

export type PlayerStateDTO = {
  roomId: string;
  currentTrack: TrackDTO | null;
  currentTrackId: string | null;
  hostId: string | null;
  isPlaying: boolean;
  positionMs: number;
  shuffle: boolean;
  repeatMode: "OFF" | "ONE" | "ALL";
  crossfadeSeconds: number;
  serverTime: number;
  queue: QueueItemDTO[];
};

export type ServerDTO = {
  id: string;
  name: string;
  iconUrl: string | null;
  rooms: RoomDTO[];
};

export type RoomDTO = {
  id: string;
  name: string;
  hostId: string | null;
  members?: RoomMemberDTO[];
};

export type RoomMemberDTO = {
  id: string;
  role: "HOST" | "LISTENER";
  user: UserProfile;
};

export type ServerRoleDTO = "OWNER" | "ADMIN" | "DJ" | "MEMBER" | "GUEST";

export type PlaylistDTO = {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  isPublic: boolean;
  trackCount: number;
};

export type RoomReactionDTO = {
  id: string;
  roomId: string;
  trackId: string | null;
  userId: string;
  emoji: string;
  createdAt: number;
};

export type QueueVoteDTO = {
  trackId: string;
  score: number;
  voters: number;
};

export type LyricsLine = {
  startMs: number | null;
  endMs: number | null;
  text: string;
};

export type AppleMusicTrack = {
  appleMusicId: string;
  title: string;
  artist: string;
  album?: string;
  durationMs?: number;
  coverUrl?: string;
  previewUrl?: string;
};

export type VoiceStateDTO = {
  userId: string;
  connected: boolean;
  micOn: boolean;
  headphonesOn: boolean;
  speaking: boolean;
};

export type ChatMessageDTO = {
  id: string;
  roomId: string;
  user: UserProfile;
  text: string;
  createdAt: number;
};
