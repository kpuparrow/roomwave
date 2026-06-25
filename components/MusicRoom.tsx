"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Crown, Headphones, Mic, PhoneOff, SmilePlus, Users, VolumeX } from "lucide-react";
import { AppleMusicSearch } from "@/components/AppleMusicSearch";
import { ChatPanel } from "@/components/ChatPanel";
import { LyricsFullscreen } from "@/components/LyricsFullscreen";
import { MicMutedIcon } from "@/components/MicMutedIcon";
import { NowPlayingBar } from "@/components/NowPlayingBar";
import { QueuePanel } from "@/components/QueuePanel";
import { SyncedPlayer } from "@/components/SyncedPlayer";
import { TrackCard } from "@/components/TrackCard";
import { UploadTrackModal } from "@/components/UploadTrackModal";
import { UserAvatar } from "@/components/UserAvatar";
import { VoiceControls } from "@/components/VoiceControls";
import { playRoomSound } from "@/lib/sfx";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/socket-events";
import type { ChatMessageDTO, PlayerStateDTO, QueueItemDTO, QueueVoteDTO, RoomMemberDTO, RoomReactionDTO, TrackDTO, UserProfile, VoiceStateDTO } from "@/lib/types";

type RoomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function MusicRoom({
  roomId,
  roomName,
  user,
  canControlPlayback = false,
  initialMembers,
  initialState,
  library
}: {
  roomId: string;
  roomName: string;
  user: UserProfile;
  hostId: string | null;
  canControlPlayback?: boolean;
  initialMembers: RoomMemberDTO[];
  initialState: PlayerStateDTO;
  library: TrackDTO[];
}) {
  const [socket, setSocket] = useState<RoomSocket | null>(null);
  const [state, setState] = useState<PlayerStateDTO>(initialState);
  const [members, setMembers] = useState<UserProfile[]>(initialMembers.map((member) => member.user));
  const [tracks, setTracks] = useState(library);
  const [positionMs, setPositionMs] = useState(initialState.positionMs);
  const [volume, setVolume] = useState(0.85);
  const [voiceStates, setVoiceStates] = useState<VoiceStateDTO[]>([]);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [votes, setVotes] = useState<QueueVoteDTO[]>([]);
  const [reactions, setReactions] = useState<RoomReactionDTO[]>([]);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const voiceStatesRef = useRef<VoiceStateDTO[]>([]);
  const isHost = state.hostId === user.id || canControlPlayback;

  useEffect(() => {
    const nextSocket: RoomSocket = io({ path: "/socket.io" });
    nextSocket.emit("room:join", { roomId, user });
    nextSocket.on("room:state", (payload) => {
      setState(payload);
      setMembers(payload.members);
      setVoiceStates(payload.voiceStates);
      voiceStatesRef.current = payload.voiceStates;
      setMessages(payload.messages);
    });
    nextSocket.on("player:state", setState);
    nextSocket.on("queue:updated", (payload) => setState((current) => ({ ...current, queue: payload.queue })));
    nextSocket.on("room:members", (payload) => setMembers(payload.members));
    nextSocket.on("voice:updated", (payload) => {
      const previous = voiceStatesRef.current.find((item) => item.userId === payload.changedUserId);
      const next = payload.voiceStates.find((item) => item.userId === payload.changedUserId);
      if (payload.changedUserId !== user.id && previous && next) {
        if (previous.connected !== next.connected) playRoomSound(next.connected ? "join" : "leave");
        else if (previous.micOn !== next.micOn) playRoomSound("mic");
        else if (previous.headphonesOn !== next.headphonesOn) playRoomSound("headphones");
      }
      voiceStatesRef.current = payload.voiceStates;
      setVoiceStates(payload.voiceStates);
    });
    nextSocket.on("chat:message", (message) => {
      setMessages((current) => [...current, message].slice(-100));
      if (message.user.id !== user.id) playRoomSound("message");
    });
    nextSocket.on("chat:deleted", (payload) => {
      setMessages((current) => current.filter((message) => message.id !== payload.messageId));
    });
    nextSocket.on("queue:votes", (payload) => setVotes(payload.votes));
    nextSocket.on("room:reaction", (reaction) => {
      setReactions((current) => [...current.slice(-8), reaction]);
      window.setTimeout(() => {
        setReactions((current) => current.filter((item) => item.id !== reaction.id));
      }, 2400);
    });
    setSocket(nextSocket);

    return () => {
      nextSocket.emit("room:leave", { roomId, userId: user.id });
      nextSocket.disconnect();
    };
  }, [roomId, user]);

  const queuedIds = useMemo(() => new Set(state.queue.map((item) => item.track.id)), [state.queue]);
  const myVoiceState =
    voiceStates.find((item) => item.userId === user.id) ?? {
      userId: user.id,
      connected: false,
      micOn: false,
      headphonesOn: true,
      speaking: false
    };
  const voiceByUserId = useMemo(() => new Map(voiceStates.map((item) => [item.userId, item])), [voiceStates]);
  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) => {
        const aConnected = voiceByUserId.get(a.id)?.connected ? 0 : 1;
        const bConnected = voiceByUserId.get(b.id)?.connected ? 0 : 1;
        return aConnected - bConnected || a.name.localeCompare(b.name);
      }),
    [members, voiceByUserId]
  );

  function addToQueue(track: TrackDTO) {
    socket?.emit("queue:add", { roomId, userId: user.id, trackId: track.id });
  }

  function playTrack(track: TrackDTO) {
    socket?.emit("player:set-track", { roomId, userId: user.id, trackId: track.id });
  }

  function playQueuedTrack(trackId: string) {
    socket?.emit("player:set-track", { roomId, userId: user.id, trackId });
  }

  function removeQueueItem(queueItemId: string) {
    socket?.emit("queue:remove", { roomId, userId: user.id, queueItemId });
  }

  function shuffleQueue() {
    socket?.emit("queue:shuffle", { roomId, userId: user.id });
  }

  function reorderQueue(queueItemIds: string[]) {
    socket?.emit("queue:reorder", { roomId, userId: user.id, queueItemIds });
  }

  function voteQueueItem(item: QueueItemDTO) {
    socket?.emit("queue:vote", { roomId, userId: user.id, trackId: item.track.id, queueItemId: item.id });
  }

  function sendReaction(emoji: string) {
    socket?.emit("room:reaction", { roomId, userId: user.id, trackId: state.currentTrackId, emoji });
  }

  function transferDj(toUserId: string) {
    socket?.emit("dj:transfer", { roomId, fromUserId: user.id, toUserId });
  }

  async function deleteTrack(track: TrackDTO) {
    if (!window.confirm(`Удалить трек «${track.title}» из медиатеки?`)) return;
    const response = await fetch(`/api/tracks/${track.id}`, { method: "DELETE" });
    if (!response.ok) return;
    setTracks((current) => current.filter((item) => item.id !== track.id));
    setState((current) => ({
      ...current,
      currentTrack: current.currentTrackId === track.id ? null : current.currentTrack,
      currentTrackId: current.currentTrackId === track.id ? null : current.currentTrackId,
      isPlaying: current.currentTrackId === track.id ? false : current.isPlaying,
      queue: current.queue.filter((item) => item.track.id !== track.id)
    }));
  }

  function updateTrack(updated: TrackDTO) {
    setTracks((current) => current.map((track) => (track.id === updated.id ? updated : track)));
    setState((current) => ({
      ...current,
      currentTrack: current.currentTrack?.id === updated.id ? updated : current.currentTrack,
      queue: current.queue.map((item) => (item.track.id === updated.id ? { ...item, track: updated } : item))
    }));
  }

  return (
    <main className="min-h-screen flex-1 overflow-y-auto px-4 py-5 pb-28 md:px-7">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Живая музыкальная комната</p>
          <h1 className="text-3xl font-bold tracking-normal">{roomName}</h1>
        </div>
        <UploadTrackModal onUploaded={(track) => setTracks((current) => [track, ...current])} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <section className="space-y-5">
          <div className="relative">
            <SyncedPlayer socket={socket} user={user} state={state} isHost={isHost} canHear={myVoiceState.connected && myVoiceState.headphonesOn} volume={volume} onVolumeChange={setVolume} onOpenLyrics={() => setLyricsOpen(true)} onPosition={setPositionMs} />
            <div className="pointer-events-none absolute right-5 top-5 flex gap-2">
              {reactions.map((reaction) => (
                <span key={reaction.id} className="animate-in fade-in slide-in-from-bottom-2 rounded-full bg-background/70 px-3 py-1 text-xl shadow-lg backdrop-blur">
                  {reaction.emoji}
                </span>
              ))}
            </div>
            <div className="absolute bottom-5 right-5 flex gap-2">
              {["💗", "🔥", "✨"].map((emoji) => (
                <button key={emoji} className="grid h-10 w-10 place-items-center rounded-full bg-background/70 text-lg shadow-lg backdrop-blur transition hover:scale-105" onClick={() => sendReaction(emoji)} aria-label={`Реакция ${emoji}`}>
                  {emoji}
                </button>
              ))}
              <button className="grid h-10 w-10 place-items-center rounded-full bg-background/70 text-primary shadow-lg backdrop-blur transition hover:scale-105" onClick={() => sendReaction("🎧")} aria-label="Реакция">
                <SmilePlus className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="glass rounded-3xl p-5">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Участники</h3>
              </div>
              <div className="space-y-2">
                {sortedMembers.map((member) => {
                  const voice = voiceByUserId.get(member.id);
                  const connected = Boolean(voice?.connected);
                  const micOn = Boolean(voice?.micOn);
                  const headphonesOn = voice?.headphonesOn ?? true;
                  const isDj = state.hostId === member.id;

                  return (
                    <div key={member.id} className={`flex w-full items-center gap-3 rounded-2xl bg-foreground/7 px-3 py-2 transition ${connected ? "opacity-100" : "opacity-45"}`}>
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className={`rounded-full p-0.5 transition ${voice?.speaking ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}>
                          <UserAvatar user={member} className="h-9 w-9" />
                        </div>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1 truncate text-sm">
                            {member.name}
                            {isDj ? <Crown className="h-3.5 w-3.5 text-primary" /> : null}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">{connected ? member.status : "Не в звонке"}</span>
                        </span>
                      </div>
                      <div className="ml-auto flex shrink-0 items-center gap-2 text-muted-foreground">
                        {isHost && !isDj && connected ? (
                          <button className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/20" onClick={() => transferDj(member.id)}>
                            DJ
                          </button>
                        ) : null}
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-foreground/8" title={connected ? (headphonesOn ? "Наушники включены" : "Наушники выключены") : "Не в звонке"}>
                          {connected ? headphonesOn ? <Headphones className="h-4 w-4" /> : <VolumeX className="h-4 w-4" /> : <PhoneOff className="h-4 w-4" />}
                        </span>
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-foreground/8" title={micOn ? "Микрофон включен" : "Микрофон выключен"}>
                          {micOn ? <Mic className="h-4 w-4 text-primary" /> : <MicMutedIcon className="h-4 w-4" />}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <ChatPanel socket={socket} roomId={roomId} user={user} messages={messages} canModerate={isHost} />
          </div>
        </section>
        <aside className="space-y-5">
          <QueuePanel queue={state.queue} votes={votes} canControl={isHost} onPlay={playQueuedTrack} onRemove={removeQueueItem} onShuffle={shuffleQueue} onReorder={reorderQueue} onVote={voteQueueItem} />
          <div className="glass rounded-3xl p-5">
            <h3 className="mb-4 font-semibold">Медиатека</h3>
            <div className="max-h-[360px] space-y-1 overflow-y-auto">
              {tracks.length ? (
                tracks.map((track) => <TrackCard key={track.id} track={track} onPlay={isHost ? playTrack : undefined} onAdd={queuedIds.has(track.id) ? undefined : addToQueue} onUpdated={updateTrack} onDelete={deleteTrack} compact />)
              ) : (
                <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Загрузите первый трек или импортируйте метаданные Apple Music.</p>
              )}
            </div>
          </div>
          <AppleMusicSearch
            onImported={(track) => {
              setTracks((current) => [track, ...current.filter((item) => item.id !== track.id)]);
              addToQueue(track);
            }}
          />
        </aside>
      </div>
      <VoiceControls socket={socket} roomId={roomId} user={user} members={members} voiceStates={voiceStates} state={myVoiceState} />
      <NowPlayingBar socket={socket} user={user} state={state} isHost={isHost} volume={volume} onVolumeChange={setVolume} positionMs={positionMs} />
      <LyricsFullscreen
        open={lyricsOpen}
        track={state.currentTrack}
        positionMs={positionMs}
        socket={socket}
        roomId={roomId}
        userId={user.id}
        isHost={isHost}
        isPlaying={state.isPlaying}
        volume={volume}
        onVolumeChange={setVolume}
        onClose={() => setLyricsOpen(false)}
      />
    </main>
  );
}
