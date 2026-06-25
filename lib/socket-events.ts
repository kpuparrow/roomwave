import type { ChatMessageDTO, PlayerStateDTO, QueueItemDTO, QueueVoteDTO, RoomReactionDTO, TrackDTO, UserProfile, VoiceStateDTO } from "@/lib/types";

export type ClientToServerEvents = {
  "room:join": (payload: { roomId: string; user: UserProfile }) => void;
  "room:leave": (payload: { roomId: string; userId: string }) => void;
  "player:play": (payload: { roomId: string; userId: string; positionMs: number }) => void;
  "player:pause": (payload: { roomId: string; userId: string; positionMs: number }) => void;
  "player:seek": (payload: { roomId: string; userId: string; positionMs: number }) => void;
  "player:set-track": (payload: { roomId: string; userId: string; trackId: string }) => void;
  "player:next": (payload: { roomId: string; userId: string }) => void;
  "player:previous": (payload: { roomId: string; userId: string }) => void;
  "queue:add": (payload: { roomId: string; userId: string; trackId: string }) => void;
  "queue:remove": (payload: { roomId: string; userId: string; queueItemId: string }) => void;
  "queue:shuffle": (payload: { roomId: string; userId: string }) => void;
  "queue:reorder": (payload: { roomId: string; userId: string; queueItemIds: string[] }) => void;
  "queue:vote": (payload: { roomId: string; userId: string; trackId: string; queueItemId?: string }) => void;
  "player:set-options": (payload: { roomId: string; userId: string; shuffle?: boolean; repeatMode?: "OFF" | "ONE" | "ALL"; crossfadeSeconds?: number }) => void;
  "voice:update": (payload: { roomId: string; userId: string; patch: Partial<Omit<VoiceStateDTO, "userId">> }) => void;
  "voice:signal": (payload: { roomId: string; fromUserId: string; toUserId: string; signal: unknown }) => void;
  "dj:transfer": (payload: { roomId: string; fromUserId: string; toUserId: string }) => void;
  "chat:send": (payload: { roomId: string; user: UserProfile; text: string }) => void;
  "chat:delete": (payload: { roomId: string; userId: string; messageId: string }) => void;
  "room:reaction": (payload: { roomId: string; userId: string; trackId?: string | null; emoji: string }) => void;
};

export type ServerToClientEvents = {
  "room:state": (payload: PlayerStateDTO & { members: UserProfile[]; voiceStates: VoiceStateDTO[]; messages: ChatMessageDTO[] }) => void;
  "room:members": (payload: { roomId: string; members: UserProfile[] }) => void;
  "player:state": (payload: PlayerStateDTO) => void;
  "queue:updated": (payload: { roomId: string; queue: QueueItemDTO[] }) => void;
  "queue:votes": (payload: { roomId: string; votes: QueueVoteDTO[] }) => void;
  "track:changed": (payload: { roomId: string; track: TrackDTO | null }) => void;
  "voice:updated": (payload: { roomId: string; voiceStates: VoiceStateDTO[]; changedUserId: string }) => void;
  "voice:signal": (payload: { roomId: string; fromUserId: string; signal: unknown }) => void;
  "chat:message": (payload: ChatMessageDTO) => void;
  "chat:deleted": (payload: { roomId: string; messageId: string }) => void;
  "room:reaction": (payload: RoomReactionDTO) => void;
  "error:message": (payload: { message: string }) => void;
};
