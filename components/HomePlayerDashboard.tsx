"use client";

import Link from "next/link";
import Image from "next/image";
import { Captions, Disc3, Headphones, ListMusic, Pause, Play, Plus, Radio, Search, SkipBack, SkipForward, Trash2, Users, Volume2, Waves, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { TTMLLyricsRenderer } from "@/components/TTMLLyricsRenderer";
import type { LyricsLine, ServerDTO, TrackDTO, UserProfile } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

export function HomePlayerDashboard({
  user,
  servers,
  tracks
}: {
  user: UserProfile;
  servers: ServerDTO[];
  tracks: TrackDTO[];
}) {
  const router = useRouter();
  const [serverName, setServerName] = useState("Вечерний сет");
  const [busy, setBusy] = useState(false);
  const [libraryTracks, setLibraryTracks] = useState(tracks);
  const [previewTrack, setPreviewTrack] = useState<TrackDTO | null>(tracks[0] ?? null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewVolume, setPreviewVolume] = useState(0.75);
  const [previewPositionMs, setPreviewPositionMs] = useState(0);
  const [previewDurationMs, setPreviewDurationMs] = useState(tracks[0]?.durationMs ?? 0);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [lyricsLines, setLyricsLines] = useState<LyricsLine[]>([]);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewSource = previewTrack?.audioUrl ?? previewTrack?.previewUrl ?? null;
  const firstRoom = useMemo(() => {
    const server = servers[0];
    const room = server?.rooms[0];
    return server && room ? { server, room } : null;
  }, [servers]);

  useEffect(() => {
    setLibraryTracks(tracks);
    if (!previewTrack && tracks[0]) setPreviewTrack(tracks[0]);
  }, [previewTrack, tracks]);

  useEffect(() => {
    if (previewAudioRef.current) previewAudioRef.current.volume = previewVolume;
  }, [previewVolume]);

  useEffect(() => {
    if (!lyricsOpen || !previewTrack) {
      if (!lyricsOpen) setLyricsLines([]);
      return;
    }

    let cancelled = false;
    fetch(`/api/tracks/${previewTrack.id}/lyrics`)
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled) setLyricsLines(payload.lyrics ?? []);
      })
      .catch(() => {
        if (!cancelled) setLyricsLines([]);
      });

    return () => {
      cancelled = true;
    };
  }, [lyricsOpen, previewTrack]);

  useEffect(() => {
    const audio = previewAudioRef.current;
    if (!audio || !previewSource) return;
    if (previewPlaying) audio.play().catch(() => setPreviewPlaying(false));
  }, [previewSource, previewPlaying]);

  async function createServer() {
    if (!serverName.trim()) return;
    setBusy(true);
    const response = await fetch("/api/servers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: serverName })
    });
    setBusy(false);

    if (response.ok) {
      const { server } = await response.json();
      const roomId = server.rooms?.[0]?.id;
      router.push(roomId ? `/app/servers/${server.id}/rooms/${roomId}` : `/app/servers/${server.id}`);
      router.refresh();
    }
  }

  function playTrack(track: TrackDTO) {
    setPreviewTrack(track);
    setPreviewPositionMs(0);
    setPreviewDurationMs(track.durationMs ?? 0);
    setPreviewPlaying(true);
  }

  function togglePreview() {
    const audio = previewAudioRef.current;
    if (!audio || !previewSource) return;
    if (previewPlaying) {
      audio.pause();
      setPreviewPlaying(false);
    } else {
      audio.play().then(() => setPreviewPlaying(true)).catch(() => setPreviewPlaying(false));
    }
  }

  function stepPreview(direction: 1 | -1) {
    if (!libraryTracks.length) return;
    const currentIndex = Math.max(0, libraryTracks.findIndex((track) => track.id === previewTrack?.id));
    const nextIndex = (currentIndex + direction + libraryTracks.length) % libraryTracks.length;
    playTrack(libraryTracks[nextIndex]);
  }

  async function deleteTrack(track: TrackDTO) {
    const response = await fetch(`/api/tracks/${track.id}`, { method: "DELETE" });
    if (!response.ok) return;
    setLibraryTracks((current) => current.filter((item) => item.id !== track.id));
    if (previewTrack?.id === track.id) {
      setPreviewTrack(null);
      setPreviewPlaying(false);
      setPreviewPositionMs(0);
    }
  }

  function seekPreview(value: number[]) {
    const next = value[0] ?? 0;
    setPreviewPositionMs(next);
    if (previewAudioRef.current) previewAudioRef.current.currentTime = next / 1000;
  }

  return (
    <main className="flex-1 overflow-y-auto px-4 py-5 md:px-7 xl:px-9">
      <audio
        ref={previewAudioRef}
        src={previewSource ?? undefined}
        onEnded={() => setPreviewPlaying(false)}
        onLoadedMetadata={(event) => {
          const duration = Math.round(event.currentTarget.duration * 1000);
          if (Number.isFinite(duration)) setPreviewDurationMs(duration);
        }}
        onTimeUpdate={(event) => setPreviewPositionMs(Math.round(event.currentTarget.currentTime * 1000))}
        preload="metadata"
      />
      {lyricsOpen ? (
        <div className="fixed inset-0 z-[80] overflow-hidden bg-[#07070b] text-white">
          {previewTrack?.coverUrl ? (
            <>
              <Image src={previewTrack.coverUrl} alt="" fill className="scale-125 object-cover opacity-[.62] blur-3xl saturate-150" sizes="100vw" priority />
              <Image src={previewTrack.coverUrl} alt="" fill className="scale-105 object-cover opacity-[.16] blur-md saturate-125" sizes="100vw" priority />
            </>
          ) : null}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 22% 44%, rgba(244,63,94,.20), transparent 34%), linear-gradient(90deg, rgba(7,7,11,.68), rgba(7,7,11,.36) 46%, rgba(7,7,11,.74))"
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#07070b]/90 via-[#07070b]/48 to-transparent" />
          <Button
            size="icon"
            variant="glass"
            className="absolute right-5 top-5 z-20 border-white/10 bg-white/10 text-white hover:bg-white/16"
            onClick={() => setLyricsOpen(false)}
            aria-label="Закрыть текст"
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="relative mx-auto grid h-full w-full max-w-[1240px] items-center gap-7 px-6 pb-28 pt-10 lg:grid-cols-[310px_minmax(0,1fr)]">
            <aside className="hidden min-h-0 flex-col justify-center lg:flex">
              <div className="relative aspect-square w-full max-w-[290px] overflow-hidden rounded-[1.6rem] bg-white/10 shadow-2xl shadow-black/45 ring-1 ring-white/10">
                {previewTrack?.coverUrl ? (
                  <Image src={previewTrack.coverUrl} alt="" fill className="object-cover" sizes="290px" />
                ) : (
                  <Disc3 className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-white/45" />
                )}
              </div>
              <div className="mt-5 max-w-[290px]">
                <h2 className="text-2xl font-bold leading-tight tracking-normal text-white xl:text-3xl">{previewTrack?.title ?? "Трек не выбран"}</h2>
                <p className="mt-2 text-base text-white/55">{previewTrack?.artist ?? "Неизвестный артист"}</p>
              </div>
            </aside>
            <section className="min-h-0 overflow-hidden">
              <TTMLLyricsRenderer lines={lyricsLines} positionMs={previewPositionMs} fullscreen />
            </section>
          </div>
        </div>
      ) : null}
      <div className="grid min-h-[calc(100vh-40px)] w-full max-w-none gap-5 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="glass relative overflow-hidden rounded-[2rem] p-5 md:p-7 xl:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_26%_20%,rgba(255,45,85,.20),transparent_30%),radial-gradient(circle_at_78%_18%,rgba(50,173,230,.18),transparent_28%)]" />
          <div className="relative z-10 grid h-full gap-7 lg:grid-cols-[minmax(260px,420px)_1fr]">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative aspect-square self-center overflow-hidden rounded-[2rem] bg-foreground/10 shadow-2xl"
            >
              {previewTrack?.coverUrl ? (
                <Image src={previewTrack.coverUrl} alt="" fill className="object-cover" sizes="420px" priority />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-[linear-gradient(145deg,rgba(255,45,85,.32),rgba(52,199,89,.16),rgba(50,173,230,.24))]">
                  <Disc3 className="h-24 w-24 text-white/90" />
                  <Waves className="mt-5 h-10 w-10 text-white/70" />
                </div>
              )}
            </motion.div>

            <div className="flex min-w-0 flex-col justify-center">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-primary">
                <Radio className="h-4 w-4" />
                Живой плеер RoomWave
              </div>
              <h1 className="max-w-3xl text-5xl font-bold tracking-normal md:text-7xl">
                Слушайте вместе в одной комнате.
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                Музыкальные комнаты с серверами, диджеями, общей очередью, синхронным плеером и текстами песен.
              </p>
              <div className="mt-8 w-full max-w-none">
                <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{previewTrack?.title ?? "Трек не выбран"}</span>
                  <span>{formatDuration(previewDurationMs || (previewTrack?.durationMs ?? 0))}</span>
                </div>
                <Slider value={[previewPositionMs]} max={Math.max(previewDurationMs || (previewTrack?.durationMs ?? 1), 1)} step={500} disabled={!previewSource} onValueChange={seekPreview} />
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>{formatDuration(previewPositionMs)}</span>
                  <span>{formatDuration(previewDurationMs || (previewTrack?.durationMs ?? 0))}</span>
                </div>
                <div className="mt-6 flex items-center gap-3">
                  <Button size="icon" variant="glass" disabled={!libraryTracks.length} onClick={() => stepPreview(-1)} aria-label="Предыдущий превью-трек">
                    <SkipBack className="h-5 w-5" />
                  </Button>
                  <Button className="h-16 w-16" size="icon" disabled={!previewSource} onClick={togglePreview} aria-label={previewPlaying ? "Пауза превью" : "Включить превью"}>
                    {previewPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 fill-current" />}
                  </Button>
                  <Button size="icon" variant="glass" disabled={!libraryTracks.length} onClick={() => stepPreview(1)} aria-label="Следующий превью-трек">
                    <SkipForward className="h-5 w-5" />
                  </Button>
                  <Button size="icon" variant="glass" disabled={!previewTrack} onClick={() => setLyricsOpen(true)} aria-label="Открыть текст" title="Текст">
                    <Captions className="h-5 w-5" />
                  </Button>
                  <div className="ml-auto hidden w-40 items-center gap-2 sm:flex">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    <Slider value={[previewVolume]} max={1} step={0.01} onValueChange={(value) => setPreviewVolume(value[0] ?? 0.75)} />
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-3 rounded-[1.5rem] border border-white/20 bg-background/55 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-white/[.06] sm:grid-cols-[1fr_auto]">
                <Input value={serverName} onChange={(event) => setServerName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && createServer()} />
                <Button onClick={createServer} disabled={busy || !serverName.trim()}>
                  <Plus className="h-4 w-4" />
                  Создать музыкальный сервер
                </Button>
              </div>

              {firstRoom ? (
                <Button asChild variant="glass" className="mt-3 w-fit">
                  <Link href={`/app/servers/${firstRoom.server.id}/rooms/${firstRoom.room.id}`}>
                    <Headphones className="h-4 w-4" />
                    Продолжить в {firstRoom.room.name}
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="grid gap-5">
          <section className="glass rounded-[2rem] p-5">
            <div className="mb-4 flex items-center justify-between">
              <Link href="/app/discover" className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <p className="text-xs uppercase tracking-[.18em] text-muted-foreground">Серверы</p>
                <h2 className="text-2xl font-semibold transition group-hover:text-primary">Комнаты</h2>
              </Link>
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2">
              {servers.length ? (
                servers.map((server) => (
                  <Link key={server.id} href={`/app/servers/${server.id}`} className="flex items-center gap-3 rounded-2xl bg-foreground/[.05] p-3 transition hover:bg-foreground/[.09]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground">
                      {server.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{server.name}</p>
                      <p className="text-xs text-muted-foreground">{server.rooms.length} комнат</p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                  Создайте первый сервер прямо в панели плеера.
                </div>
              )}
            </div>
          </section>

          <section className="glass rounded-[2rem] p-5">
            <Link href="/app/library" className="mb-4 flex w-fit items-center gap-2 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ListMusic className="h-4 w-4 text-primary" />
              <h2 className="font-semibold transition hover:text-primary">Библиотека</h2>
            </Link>
            <div className="grid grid-cols-2 gap-3">
              {libraryTracks.length ? (
                libraryTracks.slice(0, 6).map((track) => (
                  <div key={track.id} className="group min-w-0">
                    <div className="relative aspect-square overflow-hidden rounded-2xl bg-foreground/10 shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-lg">
                      <button className="absolute inset-0 z-10" onClick={() => playTrack(track)} aria-label={`Включить ${track.title}`} />
                      {track.coverUrl ? <Image src={track.coverUrl} alt="" fill className="object-cover" sizes="170px" /> : <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,rgba(255,45,85,.24),rgba(50,173,230,.18))]"><Disc3 className="h-9 w-9 text-primary" /></div>}
                      <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100"><span className="grid h-11 w-11 place-items-center rounded-full bg-white text-black shadow-lg"><Play className="h-5 w-5 fill-current" /></span></div>
                      <button className="absolute right-2 top-2 z-20 grid h-8 w-8 place-items-center rounded-full bg-background/80 opacity-0 shadow backdrop-blur transition group-hover:opacity-100" onClick={() => deleteTrack(track)} aria-label={`Удалить ${track.title}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold">{track.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{track.artist ?? "Неизвестный артист"}</p>
                  </div>
                ))
              ) : (
                <div className="col-span-2 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                  Загрузите треки или импортируйте метаданные Apple Music, чтобы наполнить очередь.
                </div>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button asChild variant="glass">
                <Link href="/app/library">
                  <Search className="h-4 w-4" />
                  Медиатека
                </Link>
              </Button>
              <Button asChild variant="glass">
                <Link href="/app/upload">
                  <Plus className="h-4 w-4" />
                  Загрузка
                </Link>
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
