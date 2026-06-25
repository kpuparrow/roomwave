"use client";

import Image from "next/image";
import {
  Captions,
  Music,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/socket-events";
import type { PlayerStateDTO, UserProfile } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

type RoomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function SyncedPlayer({
  socket,
  user,
  state,
  isHost,
  canHear,
  volume,
  onVolumeChange,
  onOpenLyrics,
  onPosition
}: {
  socket: RoomSocket | null;
  user: UserProfile;
  state: PlayerStateDTO;
  isHost: boolean;
  canHear: boolean;
  volume: number;
  onVolumeChange: (volume: number) => void;
  onOpenLyrics: () => void;
  onPosition?: (positionMs: number) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const crossedRef = useRef(false);
  const historyRef = useRef<string | null>(null);
  const [positionMs, setPositionMs] = useState(state.positionMs);
  const source = state.currentTrack?.audioUrl ?? state.currentTrack?.previewUrl ?? null;
  const duration = state.currentTrack?.durationMs ?? Math.round((audioRef.current?.duration ?? 0) * 1000);

  const correctedPosition = useMemo(() => {
    if (!state.isPlaying) return state.positionMs;
    return state.positionMs + Math.max(0, Date.now() - state.serverTime);
  }, [state.isPlaying, state.positionMs, state.serverTime]);

  const emitPlayPause = useCallback(() => {
    if (!socket || !isHost) return;
    const current = Math.round((audioRef.current?.currentTime ?? 0) * 1000);
    socket.emit(state.isPlaying ? "player:pause" : "player:play", {
      roomId: state.roomId,
      userId: user.id,
      positionMs: current
    });
  }, [isHost, socket, state.isPlaying, state.roomId, user.id]);

  const setOptions = useCallback(
    (patch: { shuffle?: boolean; repeatMode?: "OFF" | "ONE" | "ALL"; crossfadeSeconds?: number }) => {
      if (!socket || !isHost) return;
      socket.emit("player:set-options", { roomId: state.roomId, userId: user.id, ...patch });
    },
    [isHost, socket, state.roomId, user.id]
  );

  const nextRepeatMode = useCallback(() => {
    const next = state.repeatMode === "OFF" ? "ALL" : state.repeatMode === "ALL" ? "ONE" : "OFF";
    setOptions({ repeatMode: next });
  }, [setOptions, state.repeatMode]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const remainingMs = duration - positionMs;
    const fadeMs = state.crossfadeSeconds * 1000;
    const fadeFactor = fadeMs > 0 && state.isPlaying && remainingMs < fadeMs ? Math.max(0.12, remainingMs / fadeMs) : 1;
    audio.volume = volume * fadeFactor;
  }, [duration, positionMs, state.crossfadeSeconds, state.isPlaying, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !source) return;

    const targetSeconds = correctedPosition / 1000;
    if (Number.isFinite(targetSeconds) && Math.abs(audio.currentTime - targetSeconds) > 0.55) {
      audio.currentTime = targetSeconds;
    }

    // Главная точка синхронизации: сервер присылает позицию и время события,
    // а клиент локально корректирует дрейф HTMLAudioElement.
    if (state.isPlaying && canHear) {
      audio.play().catch(() => undefined);
    } else {
      audio.pause();
    }
  }, [source, correctedPosition, state.isPlaying, canHear]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const current = Math.round((audioRef.current?.currentTime ?? positionMs / 1000) * 1000);
      setPositionMs(current);
      onPosition?.(current);

      if (isHost && state.crossfadeSeconds > 0 && state.isPlaying && duration > 0) {
        const remaining = duration - current;
        if (remaining <= state.crossfadeSeconds * 1000 && !crossedRef.current) {
          crossedRef.current = true;
          socket?.emit("player:next", { roomId: state.roomId, userId: user.id });
        }
      }
    }, 400);
    return () => window.clearInterval(interval);
  }, [duration, isHost, onPosition, positionMs, socket, state.crossfadeSeconds, state.isPlaying, state.roomId, user.id]);

  useEffect(() => {
    crossedRef.current = false;
  }, [state.currentTrackId]);

  useEffect(() => {
    if (!state.currentTrackId || !canHear || historyRef.current === state.currentTrackId) return;
    historyRef.current = state.currentTrackId;
    void fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId: state.currentTrackId, roomId: state.roomId, positionMs })
    });
  }, [canHear, positionMs, state.currentTrackId, state.roomId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;

      if (event.code === "Space") {
        event.preventDefault();
        emitPlayPause();
      }
      if (event.code === "ArrowRight" && isHost) socket?.emit("player:next", { roomId: state.roomId, userId: user.id });
      if (event.code === "ArrowLeft" && isHost) socket?.emit("player:previous", { roomId: state.roomId, userId: user.id });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [emitPlayPause, isHost, socket, state.roomId, user.id]);

  function seek(value: number[]) {
    if (!socket || !isHost) return;
    const next = value[0] ?? 0;
    setPositionMs(next);
    socket.emit("player:seek", { roomId: state.roomId, userId: user.id, positionMs: next });
  }

  const controlButtonClass = "h-11 w-11 bg-white/10 text-foreground hover:bg-white/16 dark:bg-white/10 dark:hover:bg-white/15";
  const activeButtonClass = "h-11 w-11";

  return (
    <div className="glass rounded-[2rem] p-5">
      <audio ref={audioRef} src={source ?? undefined} preload="metadata" />
      <div className="grid gap-6 lg:grid-cols-[minmax(220px,360px)_1fr]">
        <div className="relative aspect-square overflow-hidden rounded-[1.75rem] bg-foreground/10 shadow-2xl">
          {state.currentTrack?.coverUrl ? (
            <Image src={state.currentTrack.coverUrl} alt="" fill className="object-cover" priority sizes="360px" />
          ) : (
            <Music className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
          )}
        </div>

        <div className="flex min-w-0 flex-col justify-center">
          <p className="text-sm font-medium text-primary">{isHost ? "Вы диджей" : "Синхронный слушатель"}</p>
          <h1 className="mt-2 truncate text-4xl font-bold tracking-normal md:text-6xl">
            {state.currentTrack?.title ?? "Выберите трек"}
          </h1>
          <p className="mt-3 truncate text-lg text-muted-foreground">{state.currentTrack?.artist ?? "Комната ждет музыку"}</p>

          <div className="mt-8">
            <Slider
              value={[Math.min(positionMs, duration || positionMs)]}
              max={Math.max(duration, 1)}
              step={500}
              disabled={!isHost || !source}
              onValueChange={seek}
            />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{formatDuration(positionMs)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-1 rounded-[1.6rem] border border-white/15 bg-background/58 p-2 shadow-glass backdrop-blur-xl dark:border-white/10 dark:bg-white/8">
              <Button
                size="icon"
                variant="ghost"
                className={controlButtonClass}
                onClick={onOpenLyrics}
                aria-label="Открыть текст"
                title="Текст"
              >
                <Captions className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant={state.shuffle ? "default" : "ghost"}
                className={state.shuffle ? activeButtonClass : controlButtonClass}
                disabled={!isHost}
                onClick={() => setOptions({ shuffle: !state.shuffle })}
                aria-label="Перемешивание"
                title="Перемешать"
              >
                <Shuffle className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className={controlButtonClass}
                disabled={!isHost}
                onClick={() => socket?.emit("player:previous", { roomId: state.roomId, userId: user.id })}
                aria-label="Предыдущий трек"
                title="Предыдущий"
              >
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button
                className="h-14 w-14 shadow-[0_14px_34px_rgba(255,55,95,.35)]"
                size="icon"
                disabled={!isHost || !source}
                onClick={emitPlayPause}
                aria-label={state.isPlaying ? "Пауза" : "Играть"}
                title={state.isPlaying ? "Пауза" : "Играть"}
              >
                {state.isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 fill-current" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className={controlButtonClass}
                disabled={!isHost}
                onClick={() => socket?.emit("player:next", { roomId: state.roomId, userId: user.id })}
                aria-label="Следующий трек"
                title="Следующий"
              >
                <SkipForward className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant={state.repeatMode !== "OFF" ? "default" : "ghost"}
                className={state.repeatMode !== "OFF" ? activeButtonClass : controlButtonClass}
                disabled={!isHost}
                onClick={nextRepeatMode}
                aria-label="Повтор"
                title={state.repeatMode === "ONE" ? "Повторять трек" : state.repeatMode === "ALL" ? "Повторять очередь" : "Повтор"}
              >
                {state.repeatMode === "ONE" ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
              </Button>
            </div>

            <div className="ml-auto flex w-36 items-center gap-2 max-md:ml-0">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <Slider value={[volume]} max={1} step={0.01} onValueChange={(value) => onVolumeChange(value[0] ?? 0.85)} />
            </div>
          </div>

          {!canHear ? <p className="mt-4 text-sm text-muted-foreground">Подключитесь к голосу комнаты, чтобы слышать музыку.</p> : null}
          {!isHost ? <p className="mt-4 text-sm text-muted-foreground">Управление воспроизведением доступно только хосту комнаты.</p> : null}
        </div>
      </div>
    </div>
  );
}
