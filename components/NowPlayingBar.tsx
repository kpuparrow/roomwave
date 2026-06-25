"use client";

import Image from "next/image";
import { Music, Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import type { Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/socket-events";
import type { PlayerStateDTO, UserProfile } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

type RoomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function NowPlayingBar({
  socket,
  user,
  state,
  isHost,
  volume,
  onVolumeChange,
  positionMs
}: {
  socket: RoomSocket | null;
  user: UserProfile;
  state: PlayerStateDTO;
  isHost: boolean;
  volume: number;
  onVolumeChange: (volume: number) => void;
  positionMs: number;
}) {
  const track = state.currentTrack;
  const canControl = Boolean(socket && isHost && track);
  const duration = Math.max(track?.durationMs ?? 0, 1);
  const progress = Math.min(positionMs, duration);

  function playPause() {
    if (!socket || !isHost) return;
    socket.emit(state.isPlaying ? "player:pause" : "player:play", {
      roomId: state.roomId,
      userId: user.id,
      positionMs
    });
  }

  function seek(value: number[]) {
    if (!socket || !isHost || !track) return;
    socket.emit("player:seek", {
      roomId: state.roomId,
      userId: user.id,
      positionMs: value[0] ?? 0
    });
  }

  return (
    <div className="fixed bottom-4 left-[calc(50%+84px)] z-40 w-[min(calc(100vw-430px),820px)] -translate-x-1/2 rounded-[1.75rem] border border-white/20 bg-background/[.82] p-3 shadow-glass backdrop-blur-2xl dark:border-white/10 max-lg:left-1/2 max-lg:w-[min(94vw,940px)]">
      <div className="grid items-center gap-3 md:grid-cols-[minmax(180px,1fr)_minmax(220px,340px)_auto_150px]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-foreground/10">
            {track?.coverUrl ? <Image src={track.coverUrl} alt="" fill className="object-cover" sizes="48px" /> : <Music className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{track?.title ?? "Ничего не играет"}</p>
            <p className="truncate text-xs text-muted-foreground">{track?.artist ?? (state.isPlaying ? "Живая комната" : "Добавьте трек в очередь")}</p>
          </div>
        </div>
        <div className="grid grid-cols-[34px_1fr_34px] items-center gap-2 text-[11px] text-muted-foreground">
          <span>{formatDuration(progress)}</span>
          <Slider value={[progress]} max={duration} step={500} disabled={!canControl} onValueChange={seek} />
          <span className="text-right">{track?.durationMs ? formatDuration(track.durationMs) : "0:00"}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" disabled={!canControl} onClick={() => socket?.emit("player:previous", { roomId: state.roomId, userId: user.id })} aria-label="Предыдущий трек">
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button size="icon" disabled={!canControl} onClick={playPause} aria-label={state.isPlaying ? "Пауза" : "Играть"}>
            {state.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
          </Button>
          <Button size="icon" variant="ghost" disabled={!canControl} onClick={() => socket?.emit("player:next", { roomId: state.roomId, userId: user.id })} aria-label="Следующий трек">
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
        <div className="hidden w-32 items-center gap-2 pr-1 sm:flex">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <Slider value={[volume]} max={1} step={0.01} onValueChange={(value) => onVolumeChange(value[0] ?? 0.85)} />
        </div>
      </div>
    </div>
  );
}
