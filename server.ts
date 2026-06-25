import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { env } from "./lib/env";
import type { ClientToServerEvents, ServerToClientEvents } from "./lib/socket-events";
import type { ChatMessageDTO, UserProfile, VoiceStateDTO } from "./lib/types";
import { addTrackToQueue, getRoomPlaybackState, playTrackNow, removeQueueItem, reorderQueue, setPlayback, setPlayerOptions, shuffleQueue, skipTrack, voteForTrack } from "./lib/realtime/room-store";
import { toQueueItemDTO } from "./lib/mappers";
import { canUseRoom } from "./lib/permissions";
import { prisma } from "./lib/prisma";

const dev = process.env.NODE_ENV !== "production";
const hostname = env.HOSTNAME;
const port = env.PORT;
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

const roomMembers = new Map<string, Map<string, UserProfile>>();
const roomVoiceStates = new Map<string, Map<string, VoiceStateDTO>>();
const roomMessages = new Map<string, ChatMessageDTO[]>();
const roomSocketIds = new Map<string, Map<string, string>>();
const socketPresence = new Map<string, Map<string, string>>();

await app.prepare();

const httpServer = createServer(handler);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: env.NEXT_PUBLIC_APP_URL,
    credentials: true
  }
});

io.on("connection", (socket) => {
  socket.on("room:join", async ({ roomId, user }) => {
    try {
      socket.join(roomId);
      rememberSocketPresence(socket.id, roomId, user.id);
      const members = roomMembers.get(roomId) ?? new Map<string, UserProfile>();
      members.set(user.id, user);
      roomMembers.set(roomId, members);
      const voiceStates = roomVoiceStates.get(roomId) ?? new Map<string, VoiceStateDTO>();
      if (!voiceStates.has(user.id)) {
        voiceStates.set(user.id, {
          userId: user.id,
          connected: false,
          micOn: false,
          headphonesOn: true,
          speaking: false
        });
      }
      roomVoiceStates.set(roomId, voiceStates);

      const state = await getRoomPlaybackState(roomId);
      socket.emit("room:state", {
        ...state,
        members: Array.from(members.values()),
        voiceStates: Array.from(voiceStates.values()),
        messages: roomMessages.get(roomId) ?? []
      });
      io.to(roomId).emit("room:members", { roomId, members: Array.from(members.values()) });
      io.to(roomId).emit("voice:updated", { roomId, voiceStates: Array.from(voiceStates.values()), changedUserId: user.id });
      await ensureRoomDj(roomId);
      io.to(roomId).emit("player:state", await getRoomPlaybackState(roomId));
    } catch {
      socket.emit("error:message", { message: "Не удалось синхронизировать комнату." });
    }
  });

  socket.on("room:leave", ({ roomId, userId }) => {
    socket.leave(roomId);
    forgetSocketPresence(socket.id, roomId, userId);
    const members = roomMembers.get(roomId);
    members?.delete(userId);
    const voiceStates = roomVoiceStates.get(roomId);
    const current = voiceStates?.get(userId);
    if (current) voiceStates?.set(userId, { ...current, connected: false, micOn: false, speaking: false });
    io.to(roomId).emit("room:members", { roomId, members: Array.from(members?.values() ?? []) });
    io.to(roomId).emit("voice:updated", { roomId, voiceStates: Array.from(voiceStates?.values() ?? []), changedUserId: userId });
  });

  socket.on("player:play", async ({ roomId, userId, positionMs }) => {
    if (!(await canControlRoom(roomId, userId))) return socket.emit("error:message", { message: "Управлять воспроизведением может только диджей." });
    const state = await setPlayback(roomId, userId, { isPlaying: true, positionMs });
    // Clients use serverTime to compensate for transit delay when entering an already playing room.
    io.to(roomId).emit("player:state", state);
  });

  socket.on("player:pause", async ({ roomId, userId, positionMs }) => {
    if (!(await canControlRoom(roomId, userId))) return socket.emit("error:message", { message: "Управлять воспроизведением может только диджей." });
    const state = await setPlayback(roomId, userId, { isPlaying: false, positionMs });
    io.to(roomId).emit("player:state", state);
  });

  socket.on("player:seek", async ({ roomId, userId, positionMs }) => {
    if (!(await canControlRoom(roomId, userId))) return socket.emit("error:message", { message: "Управлять воспроизведением может только диджей." });
    const state = await setPlayback(roomId, userId, { positionMs });
    io.to(roomId).emit("player:state", state);
  });

  socket.on("player:set-track", async ({ roomId, userId, trackId }) => {
    if (!(await canControlRoom(roomId, userId))) return socket.emit("error:message", { message: "Управлять воспроизведением может только диджей." });
    const state = await playTrackNow(roomId, userId, trackId);
    io.to(roomId).emit("player:state", state);
    io.to(roomId).emit("queue:updated", { roomId, queue: state.queue });
    io.to(roomId).emit("track:changed", { roomId, track: state.currentTrack });
  });

  socket.on("player:next", async ({ roomId, userId }) => {
    if (!(await canControlRoom(roomId, userId))) return socket.emit("error:message", { message: "Управлять воспроизведением может только диджей." });
    const state = await skipTrack(roomId, userId, "next");
    io.to(roomId).emit("player:state", state);
    io.to(roomId).emit("track:changed", { roomId, track: state.currentTrack });
  });

  socket.on("player:previous", async ({ roomId, userId }) => {
    if (!(await canControlRoom(roomId, userId))) return socket.emit("error:message", { message: "Управлять воспроизведением может только диджей." });
    const state = await skipTrack(roomId, userId, "previous");
    io.to(roomId).emit("player:state", state);
    io.to(roomId).emit("track:changed", { roomId, track: state.currentTrack });
  });

  socket.on("queue:add", async ({ roomId, userId, trackId }) => {
    if (!(await canUseRoom(roomId, userId, "addTracks"))) return socket.emit("error:message", { message: "Добавлять треки могут участники сервера." });
    await addTrackToQueue(roomId, userId, trackId);
    const state = await getRoomPlaybackState(roomId);
    io.to(roomId).emit("queue:updated", { roomId, queue: state.queue });
    io.to(roomId).emit("player:state", state);
  });

  socket.on("queue:remove", async ({ roomId, userId, queueItemId }) => {
    if (!(await canRemoveQueueItem(roomId, userId, queueItemId))) return socket.emit("error:message", { message: "Удалять из очереди может диджей, админ или автор добавления." });
    const queue = await removeQueueItem(roomId, queueItemId);
    const state = await getRoomPlaybackState(roomId);
    io.to(roomId).emit("queue:updated", { roomId, queue: queue.map(toQueueItemDTO) });
    io.to(roomId).emit("player:state", state);
  });

  socket.on("queue:shuffle", async ({ roomId, userId }) => {
    if (!(await canUseRoom(roomId, userId, "removeQueue"))) return socket.emit("error:message", { message: "Перемешивать очередь может диджей или админ." });
    const queue = await shuffleQueue(roomId);
    const state = await getRoomPlaybackState(roomId);
    io.to(roomId).emit("queue:updated", { roomId, queue: queue.map(toQueueItemDTO) });
    io.to(roomId).emit("player:state", state);
  });

  socket.on("queue:reorder", async ({ roomId, userId, queueItemIds }) => {
    if (!(await canUseRoom(roomId, userId, "removeQueue"))) return socket.emit("error:message", { message: "Сортировать очередь может диджей или админ." });
    const queue = await reorderQueue(roomId, queueItemIds);
    io.to(roomId).emit("queue:updated", { roomId, queue: queue.map(toQueueItemDTO) });
  });

  socket.on("queue:vote", async ({ roomId, userId, trackId, queueItemId }) => {
    if (!(await canUseRoom(roomId, userId, "addTracks"))) return socket.emit("error:message", { message: "Голосовать могут участники сервера." });
    const votes = await voteForTrack(roomId, userId, trackId, queueItemId);
    io.to(roomId).emit("queue:votes", { roomId, votes });
  });

  socket.on("player:set-options", async ({ roomId, userId, shuffle, repeatMode, crossfadeSeconds }) => {
    if (!(await canUseRoom(roomId, userId, "controlPlayback"))) return socket.emit("error:message", { message: "Настройки плеера меняет диджей." });
    const state = await setPlayerOptions(roomId, {
      shuffle,
      repeatMode,
      crossfadeSeconds: typeof crossfadeSeconds === "number" ? Math.max(0, Math.min(12, crossfadeSeconds)) : undefined
    });
    io.to(roomId).emit("player:state", state);
  });

  socket.on("voice:update", ({ roomId, userId, patch }) => {
    const voiceStates = roomVoiceStates.get(roomId) ?? new Map<string, VoiceStateDTO>();
    const previous = voiceStates.get(userId) ?? {
      userId,
      connected: false,
      micOn: false,
      headphonesOn: true,
      speaking: false
    };
    const next = { ...previous, ...patch };
    if (!next.connected || !next.headphonesOn) {
      next.micOn = false;
      next.speaking = false;
    }
    voiceStates.set(userId, next);
    roomVoiceStates.set(roomId, voiceStates);
    void ensureRoomDj(roomId).then(async () => {
      io.to(roomId).emit("voice:updated", { roomId, voiceStates: Array.from(voiceStates.values()), changedUserId: userId });
      io.to(roomId).emit("player:state", await getRoomPlaybackState(roomId));
    });
  });

  socket.on("voice:signal", ({ roomId, fromUserId, toUserId, signal }) => {
    const roomSockets = roomSocketIds.get(roomId);
    if (roomSockets?.get(fromUserId) !== socket.id) return;
    const targetSocketId = roomSockets.get(toUserId);
    if (!targetSocketId || targetSocketId === socket.id) return;

    // Signaling only relays WebRTC offer/answer/ICE payloads. Media still goes peer-to-peer.
    io.to(targetSocketId).emit("voice:signal", { roomId, fromUserId, signal });
  });

  socket.on("dj:transfer", async ({ roomId, fromUserId, toUserId }) => {
    if (!(await canControlRoom(roomId, fromUserId))) return socket.emit("error:message", { message: "Передать роль может только текущий диджей." });
    await prisma.musicRoom.update({ where: { id: roomId }, data: { hostId: toUserId } });
    io.to(roomId).emit("player:state", await getRoomPlaybackState(roomId));
  });

  socket.on("chat:send", async ({ roomId, user, text }) => {
    if (!(await canUseRoom(roomId, user.id, "sendChat"))) return socket.emit("error:message", { message: "Вы не можете писать в чат этого сервера." });
    const clean = text.trim().slice(0, 800);
    if (!clean) return;
    const message: ChatMessageDTO = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      roomId,
      user,
      text: clean,
      createdAt: Date.now()
    };
    const messages = [...(roomMessages.get(roomId) ?? []), message].slice(-100);
    roomMessages.set(roomId, messages);
    io.to(roomId).emit("chat:message", message);
  });

  socket.on("chat:delete", async ({ roomId, userId, messageId }) => {
    if (!(await canUseRoom(roomId, userId, "moderateChat"))) return socket.emit("error:message", { message: "Удалять сообщения могут админы." });
    const messages = (roomMessages.get(roomId) ?? []).filter((message) => message.id !== messageId);
    roomMessages.set(roomId, messages);
    io.to(roomId).emit("chat:deleted", { roomId, messageId });
  });

  socket.on("room:reaction", async ({ roomId, userId, trackId, emoji }) => {
    if (!(await canUseRoom(roomId, userId, "sendChat"))) return;
    const cleanEmoji = emoji.slice(0, 8);
    const reaction = await prisma.roomReaction.create({ data: { roomId, userId, trackId: trackId ?? null, emoji: cleanEmoji } });
    io.to(roomId).emit("room:reaction", {
      id: reaction.id,
      roomId,
      userId,
      trackId: reaction.trackId,
      emoji: reaction.emoji,
      createdAt: reaction.createdAt.getTime()
    });
  });

  socket.on("disconnect", () => {
    const joinedRooms = Array.from(socketPresence.get(socket.id)?.entries() ?? []);
    socketPresence.delete(socket.id);

    for (const [roomId, userId] of joinedRooms) {
      forgetSocketPresence(socket.id, roomId, userId);
      const members = roomMembers.get(roomId);
      members?.delete(userId);

      const voiceStates = roomVoiceStates.get(roomId);
      const current = voiceStates?.get(userId);
      if (current) voiceStates?.set(userId, { ...current, connected: false, micOn: false, speaking: false });

      io.to(roomId).emit("room:members", { roomId, members: Array.from(members?.values() ?? []) });
      io.to(roomId).emit("voice:updated", { roomId, voiceStates: Array.from(voiceStates?.values() ?? []), changedUserId: userId });
      void ensureRoomDj(roomId).then(async () => {
        io.to(roomId).emit("player:state", await getRoomPlaybackState(roomId));
      });
    }
  });
});

httpServer.listen(port, hostname, () => {
  console.log(`RoomWave ready on http://${hostname}:${port}`);
});

async function canControlRoom(roomId: string, userId: string) {
  return canUseRoom(roomId, userId, "controlPlayback");
}

async function canRemoveQueueItem(roomId: string, userId: string, queueItemId: string) {
  if (await canUseRoom(roomId, userId, "removeQueue")) return true;
  const item = await prisma.queueItem.findUnique({ where: { id: queueItemId }, select: { roomId: true, addedById: true } });
  return item?.roomId === roomId && item.addedById === userId;
}

async function ensureRoomDj(roomId: string) {
  const room = await prisma.musicRoom.findUnique({ where: { id: roomId }, select: { hostId: true } });
  if (!room) return null;
  const voiceStates = roomVoiceStates.get(roomId);
  const currentDjConnected = room.hostId ? voiceStates?.get(room.hostId)?.connected : false;
  if (currentDjConnected) return room.hostId;

  const fallback = Array.from(voiceStates?.values() ?? []).find((state) => state.connected)?.userId ?? null;
  if (fallback && fallback !== room.hostId) {
    await prisma.musicRoom.update({ where: { id: roomId }, data: { hostId: fallback } });
    return fallback;
  }
  return room.hostId;
}

function rememberSocketPresence(socketId: string, roomId: string, userId: string) {
  const roomSockets = roomSocketIds.get(roomId) ?? new Map<string, string>();
  roomSockets.set(userId, socketId);
  roomSocketIds.set(roomId, roomSockets);

  const joined = socketPresence.get(socketId) ?? new Map<string, string>();
  joined.set(roomId, userId);
  socketPresence.set(socketId, joined);
}

function forgetSocketPresence(socketId: string, roomId: string, userId: string) {
  const roomSockets = roomSocketIds.get(roomId);
  if (roomSockets?.get(userId) === socketId) {
    roomSockets.delete(userId);
    if (!roomSockets.size) roomSocketIds.delete(roomId);
  }

  const joined = socketPresence.get(socketId);
  joined?.delete(roomId);
  if (joined && !joined.size) socketPresence.delete(socketId);
}
