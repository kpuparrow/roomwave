"use client";

import Image from "next/image";
import { Disc3, Music, Pause, Play, Search, SkipBack, SkipForward, Trash2, Upload, Volume2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppleMusicSearch } from "@/components/AppleMusicSearch";
import { PlaylistPanel } from "@/components/PlaylistPanel";
import { TrackCard } from "@/components/TrackCard";
import { useToast } from "@/components/ToastProvider";
import { UploadTrackModal } from "@/components/UploadTrackModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import type { PlaylistDTO, TrackDTO } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

export function LibraryClient({
  tracks: initialTracks,
  favoriteTrackIds = [],
  playlists = []
}: {
  tracks: TrackDTO[];
  favoriteTrackIds?: string[];
  playlists?: PlaylistDTO[];
}) {
  const { showToast } = useToast();
  const [tracks, setTracks] = useState(initialTracks);
  const [favorites, setFavorites] = useState(() => new Set(favoriteTrackIds));
  const [query, setQuery] = useState("");
  const [activeTrack, setActiveTrack] = useState<TrackDTO | null>(initialTracks[0] ?? null);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(initialTracks[0]?.durationMs ?? 0);
  const [volume, setVolume] = useState(0.8);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const source = activeTrack?.audioUrl ?? activeTrack?.previewUrl ?? null;

  const filteredTracks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tracks;
    return tracks.filter((track) => [track.title, track.artist, track.album].filter(Boolean).join(" ").toLowerCase().includes(normalized));
  }, [query, tracks]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!activeTrack && tracks[0]) setActiveTrack(tracks[0]);
  }, [activeTrack, tracks]);

  useEffect(() => {
    setDurationMs(activeTrack?.durationMs ?? 0);
    setPositionMs(0);
  }, [activeTrack?.id, activeTrack?.durationMs]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !source) return;
    if (playing) audio.play().catch(() => setPlaying(false));
  }, [playing, source]);

  function playTrack(track: TrackDTO) {
    setError(null);
    setActiveTrack(track);
    setPositionMs(0);
    setDurationMs(track.durationMs ?? 0);
    setPlaying(Boolean(track.audioUrl ?? track.previewUrl));
    void fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId: track.id })
    });
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !source) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setError("Браузер не смог запустить этот аудиофайл."));
    }
  }

  function stepTrack(direction: 1 | -1) {
    const list = filteredTracks.length ? filteredTracks : tracks;
    if (!list.length) return;
    const currentIndex = Math.max(0, list.findIndex((track) => track.id === activeTrack?.id));
    const nextIndex = (currentIndex + direction + list.length) % list.length;
    playTrack(list[nextIndex]);
  }

  function seek(value: number[]) {
    const next = value[0] ?? 0;
    setPositionMs(next);
    if (audioRef.current) audioRef.current.currentTime = next / 1000;
  }

  async function deleteTrack(track: TrackDTO) {
    if (!window.confirm(`Удалить трек «${track.title}» из медиатеки?`)) return;
    setDeletingId(track.id);
    setError(null);

    try {
      const response = await fetch(`/api/tracks/${track.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? "Не удалось удалить трек.");
        return;
      }

      setTracks((current) => current.filter((item) => item.id !== track.id));
      setFavorites((current) => {
        const next = new Set(current);
        next.delete(track.id);
        return next;
      });
      if (activeTrack?.id === track.id) {
        setActiveTrack(null);
        setPlaying(false);
        setPositionMs(0);
      }
    } catch {
      setError("Нет соединения с сервером.");
    } finally {
      setDeletingId(null);
    }
  }

  function updateTrack(updated: TrackDTO) {
    setTracks((current) => current.map((track) => (track.id === updated.id ? updated : track)));
    setActiveTrack((current) => (current?.id === updated.id ? updated : current));
  }

  async function toggleFavorite(track: TrackDTO) {
    const isFavorite = favorites.has(track.id);
    setFavorites((current) => {
      const next = new Set(current);
      if (isFavorite) next.delete(track.id);
      else next.add(track.id);
      return next;
    });

    const response = await fetch(isFavorite ? `/api/favorites?trackId=${track.id}` : "/api/favorites", {
      method: isFavorite ? "DELETE" : "POST",
      headers: isFavorite ? undefined : { "Content-Type": "application/json" },
      body: isFavorite ? undefined : JSON.stringify({ trackId: track.id })
    });

    if (!response.ok) {
      setFavorites((current) => {
        const next = new Set(current);
        if (isFavorite) next.add(track.id);
        else next.delete(track.id);
        return next;
      });
      showToast({ kind: "error", title: "Не удалось обновить избранное" });
      return;
    }

    showToast({ kind: "success", title: isFavorite ? "Убрано из избранного" : "Добавлено в избранное" });
  }

  const duration = Math.max(durationMs || activeTrack?.durationMs || 0, 1);

  return (
    <main className="flex-1 overflow-y-auto px-4 py-5 pb-28 md:px-7">
      <audio
        ref={audioRef}
        src={source ?? undefined}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(event) => {
          const nextDuration = Math.round(event.currentTarget.duration * 1000);
          if (Number.isFinite(nextDuration)) setDurationMs(nextDuration);
        }}
        onTimeUpdate={(event) => setPositionMs(Math.round(event.currentTarget.currentTime * 1000))}
        preload="metadata"
      />

      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 pr-14">
          <div>
            <p className="text-sm text-muted-foreground">Ваша музыка</p>
            <h1 className="text-4xl font-bold tracking-normal md:text-5xl">Медиатека</h1>
          </div>
          <UploadTrackModal onUploaded={(track) => setTracks((current) => [track, ...current])} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-5">
            <div className="glass overflow-hidden rounded-[2rem] p-4 md:p-5">
              <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
                <div className="relative aspect-square overflow-hidden rounded-[1.5rem] bg-foreground/10">
                  {activeTrack?.coverUrl ? (
                    <Image src={activeTrack.coverUrl} alt="" fill className="object-cover" sizes="180px" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-foreground/6">
                      <Disc3 className="h-14 w-14 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-col justify-center">
                  <p className="text-sm font-medium text-primary">Сейчас выбрано</p>
                  <h2 className="mt-1 truncate text-3xl font-bold tracking-normal">{activeTrack?.title ?? "Выберите трек"}</h2>
                  <p className="mt-1 truncate text-muted-foreground">{activeTrack?.artist ?? "Нажмите на обложку или кнопку воспроизведения"}</p>

                  <div className="mt-5 grid grid-cols-[42px_1fr_42px] items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDuration(positionMs)}</span>
                    <Slider value={[Math.min(positionMs, duration)]} max={duration} step={500} disabled={!source} onValueChange={seek} />
                    <span className="text-right">{activeTrack?.durationMs || durationMs ? formatDuration(duration) : "0:00"}</span>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Button size="icon" variant="glass" disabled={!tracks.length} onClick={() => stepTrack(-1)} aria-label="Предыдущий трек">
                      <SkipBack className="h-5 w-5" />
                    </Button>
                    <Button className="h-14 w-14" size="icon" disabled={!source} onClick={togglePlay} aria-label={playing ? "Пауза" : "Играть"}>
                      {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 fill-current" />}
                    </Button>
                    <Button size="icon" variant="glass" disabled={!tracks.length} onClick={() => stepTrack(1)} aria-label="Следующий трек">
                      <SkipForward className="h-5 w-5" />
                    </Button>
                    <div className="ml-auto flex w-40 items-center gap-2">
                      <Volume2 className="h-4 w-4 text-muted-foreground" />
                      <Slider value={[volume]} max={1} step={0.01} onValueChange={(value) => setVolume(value[0] ?? 0.8)} />
                    </div>
                  </div>
                </div>
              </div>
              {error ? <p className="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
            </div>

            <div className="glass rounded-[2rem] p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Треки</h2>
                  <p className="text-sm text-muted-foreground">{tracks.length ? `${tracks.length} треков в медиатеке` : "Медиатека пока пустая"}</p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Поиск по названию, артисту, альбому" value={query} onChange={(event) => setQuery(event.target.value)} />
                </div>
              </div>

              {filteredTracks.length ? (
                <div className="space-y-1">
                  {filteredTracks.map((track) => (
                    <div key={track.id} className={deletingId === track.id ? "pointer-events-none opacity-45" : ""}>
                      <TrackCard
                        track={track}
                        favorite={favorites.has(track.id)}
                        onFavoriteToggle={toggleFavorite}
                        onPlay={playTrack}
                        onUpdated={updateTrack}
                        onDelete={deleteTrack}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid place-items-center rounded-3xl border border-dashed border-border p-10 text-center">
                  <Music className="h-10 w-10 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">{tracks.length ? "Ничего не найдено" : "Добавьте первый трек"}</h3>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    {tracks.length ? "Попробуйте изменить запрос поиска." : "Загрузите локальный аудиофайл или импортируйте данные из Apple Music."}
                  </p>
                  {!tracks.length ? (
                    <div className="mt-5">
                      <UploadTrackModal onUploaded={(track) => setTracks((current) => [track, ...current])} />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-5">
            <PlaylistPanel playlists={playlists} activeTrack={activeTrack} />
            <AppleMusicSearch
              onImported={(track) => {
                setTracks((current) => [track, ...current.filter((item) => item.id !== track.id)]);
                setActiveTrack(track);
              }}
            />
            <div className="glass rounded-[2rem] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold">Локальные файлы</h2>
                  <p className="text-sm text-muted-foreground">mp3, m4a, wav, flac</p>
                </div>
              </div>
              <div className="mt-4">
                <UploadTrackModal onUploaded={(track) => setTracks((current) => [track, ...current])} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
