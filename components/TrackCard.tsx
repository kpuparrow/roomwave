"use client";

import Image from "next/image";
import { Music, Play, Plus, Star, Trash2 } from "lucide-react";
import { EditTrackModal } from "@/components/EditTrackModal";
import { Button } from "@/components/ui/button";
import type { TrackDTO } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

export function TrackCard({
  track,
  onAdd,
  onPlay,
  onUpdated,
  favorite = false,
  onFavoriteToggle,
  onDelete,
  compact = false
}: {
  track: TrackDTO;
  onAdd?: (track: TrackDTO) => void;
  onPlay?: (track: TrackDTO) => void;
  onUpdated?: (track: TrackDTO) => void;
  favorite?: boolean;
  onFavoriteToggle?: (track: TrackDTO) => void;
  onDelete?: (track: TrackDTO) => void;
  compact?: boolean;
}) {
  const artwork = (
    <>
      {track.coverUrl ? (
        <Image src={track.coverUrl} alt="" fill className="object-cover" sizes="80px" />
      ) : (
        <Music className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
      )}
      {onPlay ? (
        <span className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-black shadow">
            <Play className="h-4 w-4 fill-current" />
          </span>
        </span>
      ) : null}
    </>
  );

  return (
    <div className="group flex items-center gap-3 rounded-2xl p-2 transition hover:bg-foreground/6">
      {onPlay ? (
        <button
          className={compact ? "relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-foreground/10" : "relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-foreground/10"}
          onClick={() => onPlay(track)}
          aria-label={`Включить ${track.title}`}
        >
          {artwork}
        </button>
      ) : (
        <div className={compact ? "relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-foreground/10" : "relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-foreground/10"}>
          {artwork}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{track.title}</p>
        <p className="truncate text-xs text-muted-foreground">{track.artist ?? "Неизвестный артист"}</p>
        {!compact ? <p className="mt-1 text-xs text-muted-foreground">{formatDuration(track.durationMs)}</p> : null}
      </div>
      {onAdd ? (
        <Button size="icon" variant="ghost" onClick={() => onAdd(track)} aria-label="Добавить в очередь">
          <Plus className="h-4 w-4" />
        </Button>
      ) : null}
      {onFavoriteToggle ? (
        <Button size="icon" variant="ghost" onClick={() => onFavoriteToggle(track)} aria-label={favorite ? "Убрать из избранного" : "Добавить в избранное"}>
          <Star className={favorite ? "h-4 w-4 fill-primary text-primary" : "h-4 w-4"} />
        </Button>
      ) : null}
      {onUpdated ? <EditTrackModal track={track} onUpdated={onUpdated} /> : null}
      {onDelete ? (
        <Button size="icon" variant="ghost" onClick={() => onDelete(track)} aria-label="Удалить трек">
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
