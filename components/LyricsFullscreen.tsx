"use client";

import Image from "next/image";
import { Music, Pause, Play, SkipBack, SkipForward, Volume2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { TTMLLyricsRenderer } from "@/components/TTMLLyricsRenderer";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/socket-events";
import type { LyricsLine, TrackDTO } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

type RoomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function LyricsFullscreen({
  open,
  track,
  positionMs,
  socket,
  roomId,
  userId,
  isHost,
  isPlaying,
  volume,
  onVolumeChange,
  onClose
}: {
  open: boolean;
  track: TrackDTO | null;
  positionMs: number;
  socket: RoomSocket | null;
  roomId: string;
  userId: string;
  isHost: boolean;
  isPlaying: boolean;
  volume: number;
  onVolumeChange: (volume: number) => void;
  onClose: () => void;
}) {
  const [lines, setLines] = useState<LyricsLine[]>([]);
  const canControl = Boolean(socket && isHost && track);
  const duration = Math.max(track?.durationMs ?? 0, 1);
  const progress = Math.min(positionMs, duration);

  useEffect(() => {
    if (!open || !track) return setLines([]);
    fetch(`/api/tracks/${track.id}/lyrics`)
      .then((response) => response.json())
      .then((payload) => setLines(payload.lyrics ?? []))
      .catch(() => setLines([]));
  }, [open, track]);

  if (!open) return null;

  function playPause() {
    if (!socket || !isHost) return;
    socket.emit(isPlaying ? "player:pause" : "player:play", {
      roomId,
      userId,
      positionMs
    });
  }

  function seek(value: number[]) {
    if (!socket || !isHost || !track) return;
    socket.emit("player:seek", {
      roomId,
      userId,
      positionMs: value[0] ?? 0
    });
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-hidden bg-[#07070b] text-white">
      {track?.coverUrl ? (
        <>
          <Image src={track.coverUrl} alt="" fill className="scale-125 object-cover opacity-[.68] blur-3xl saturate-150" sizes="100vw" priority />
          <Image src={track.coverUrl} alt="" fill className="scale-105 object-cover opacity-[.18] blur-md saturate-125" sizes="100vw" priority />
        </>
      ) : null}

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 22% 44%, rgba(244,63,94,.20), transparent 34%), linear-gradient(90deg, rgba(7,7,11,.66), rgba(7,7,11,.34) 46%, rgba(7,7,11,.72))"
        }}
      />
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#07070b]/90 via-[#07070b]/48 to-transparent" />

      <Button
        size="icon"
        variant="glass"
        className="absolute right-5 top-5 z-20 border-white/10 bg-white/10 text-white hover:bg-white/16"
        onClick={onClose}
        aria-label="Закрыть текст"
      >
        <X className="h-5 w-5" />
      </Button>

      <div className="relative flex h-full flex-col px-5 py-5 sm:px-8 sm:py-7 lg:px-10 lg:py-8">
        <div className="mx-auto grid min-h-0 w-full max-w-[1240px] flex-1 items-center gap-5 pb-6 pt-10 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-7 lg:pb-8 xl:grid-cols-[310px_minmax(0,1fr)]">
          <aside className="hidden min-h-0 flex-col justify-center lg:flex">
            <div className="relative aspect-square w-full max-w-[270px] overflow-hidden rounded-[1.6rem] bg-white/10 shadow-2xl shadow-black/45 ring-1 ring-white/10 xl:max-w-[290px]">
              {track?.coverUrl ? (
                <Image src={track.coverUrl} alt="" fill className="object-cover" sizes="290px" />
              ) : (
                <Music className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-white/45" />
              )}
            </div>
            <div className="mt-5 max-w-[290px]">
              <h2 className="text-2xl font-bold leading-tight tracking-normal text-white xl:text-3xl">{track?.title ?? "Трек не выбран"}</h2>
              <p className="mt-2 text-base text-white/55">{track?.artist ?? "Неизвестный артист"}</p>
            </div>
          </aside>

          <section className="min-h-0 overflow-hidden">
            <TTMLLyricsRenderer lines={lines} positionMs={positionMs} fullscreen />
          </section>
        </div>

        <div className="fixed bottom-4 left-1/2 z-20 w-[min(94vw,940px)] -translate-x-1/2 rounded-[1.75rem] border border-white/20 bg-background/[.82] p-3 text-foreground shadow-glass backdrop-blur-2xl dark:border-white/10">
          <div className="grid items-center gap-3 md:grid-cols-[minmax(180px,1fr)_minmax(220px,340px)_auto_150px]">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-foreground/10">
                {track?.coverUrl ? (
                  <Image src={track.coverUrl} alt="" fill className="object-cover" sizes="48px" />
                ) : (
                  <Music className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{track?.title ?? "Ничего не играет"}</p>
                <p className="truncate text-xs text-muted-foreground">{track?.artist ?? "Комната ждет музыку"}</p>
              </div>
            </div>

            <div className="grid grid-cols-[34px_1fr_34px] items-center gap-2 text-[11px] text-muted-foreground">
              <span>{formatDuration(progress)}</span>
              <Slider value={[progress]} max={duration} step={500} disabled={!canControl} onValueChange={seek} />
              <span className="text-right">{track?.durationMs ? formatDuration(track.durationMs) : "0:00"}</span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                disabled={!canControl}
                onClick={() => socket?.emit("player:previous", { roomId, userId })}
                aria-label="Предыдущий трек"
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                disabled={!canControl}
                onClick={playPause}
                aria-label={isPlaying ? "Пауза" : "Играть"}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                disabled={!canControl}
                onClick={() => socket?.emit("player:next", { roomId, userId })}
                aria-label="Следующий трек"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
            <div className="hidden w-32 items-center gap-2 pr-1 sm:flex">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <Slider value={[volume]} max={1} step={0.01} onValueChange={(value) => onVolumeChange(value[0] ?? 0.85)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
