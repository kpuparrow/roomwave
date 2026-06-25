"use client";

import Image from "next/image";
import { FileText, ImagePlus, Music, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ToastProvider";
import type { TrackDTO } from "@/lib/types";

const maxLyricsFileSize = 2 * 1024 * 1024;
const allowedLyricsExtensions = [".ttml", ".xml", ".txt"];

export function EditTrackModal({ track, onUpdated }: { track: TrackDTO; onUpdated?: (track: TrackDTO) => void }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(track.title);
  const [artist, setArtist] = useState(track.artist ?? "");
  const [album, setAlbum] = useState(track.album ?? "");
  const [cover, setCover] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(track.coverUrl);
  const [lyricsFile, setLyricsFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(track.title);
    setArtist(track.artist ?? "");
    setAlbum(track.album ?? "");
    setCover(null);
    setPreviewUrl(track.coverUrl);
    setLyricsFile(null);
    setError(null);
  }, [open, track.album, track.artist, track.coverUrl, track.id, track.title]);

  function selectCover(file: File) {
    setCover(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function selectLyrics(file: File) {
    const filename = file.name.toLowerCase();
    const hasAllowedExtension = allowedLyricsExtensions.some((extension) => filename.endsWith(extension));

    if (!hasAllowedExtension) {
      setError("Выберите файл текста в формате .ttml, .xml или .txt.");
      return;
    }

    if (file.size > maxLyricsFileSize) {
      setError("Файл текста не должен быть больше 2 МБ.");
      return;
    }

    setLyricsFile(file);
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("artist", artist);
      formData.set("album", album);
      if (cover) formData.set("cover", cover);

      const response = await fetch(`/api/tracks/${track.id}`, { method: "PATCH", body: formData });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error ?? "Не удалось сохранить трек.");
        return;
      }

      if (lyricsFile) {
        const lyricsData = new FormData();
        lyricsData.set("file", lyricsFile);

        const lyricsResponse = await fetch(`/api/tracks/${track.id}/lyrics`, { method: "POST", body: lyricsData });
        const lyricsPayload = await lyricsResponse.json().catch(() => null);

        if (!lyricsResponse.ok) {
          onUpdated?.(payload.track);
          setError(lyricsPayload?.error ?? "Не удалось сохранить текст трека.");
          showToast({ kind: "error", title: "Трек обновлен, но текст не сохранен" });
          return;
        }
      }

      onUpdated?.(payload.track);
      setLyricsFile(null);
      showToast({ kind: "success", title: lyricsFile ? "Трек и текст обновлены" : "Трек обновлен" });
      setOpen(false);
    } catch {
      setError("Нет соединения с сервером.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Редактировать трек">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактирование трека</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Можно изменить название, артиста, альбом, обложку и TTML-текст загруженного трека.
          </p>
        </DialogHeader>
        <div className="grid gap-5 sm:grid-cols-[150px_1fr]">
          <label className="group relative aspect-square cursor-pointer overflow-hidden rounded-3xl bg-foreground/10">
            {previewUrl ? (
              <Image src={previewUrl} alt="" fill className="object-cover" sizes="150px" />
            ) : (
              <Music className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
            )}
            <span className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-black shadow-lg">
                <ImagePlus className="h-5 w-5" />
              </span>
            </span>
            <input
              className="hidden"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => event.target.files?.[0] && selectCover(event.target.files[0])}
            />
          </label>

          <div className="grid gap-3">
            <label className="grid gap-2 text-sm font-medium">
              Название
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Артист
              <Input value={artist} onChange={(event) => setArtist(event.target.value)} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Альбом
              <Input value={album} onChange={(event) => setAlbum(event.target.value)} />
            </label>
          </div>
        </div>

        <div className="rounded-3xl border border-border/70 bg-foreground/[.03] p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold">Текст трека</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Добавьте синхронизированный TTML или обычный текст. Он появится в lyrics-view этого трека.
                </p>
                {lyricsFile ? <p className="mt-2 truncate text-sm text-primary">Выбран файл: {lyricsFile.name}</p> : null}
              </div>
            </div>
            <Button asChild size="sm" variant="glass">
              <label className={busy ? "pointer-events-none cursor-not-allowed opacity-60" : "cursor-pointer"}>
                {lyricsFile ? "Заменить файл" : "Добавить TTML"}
                <input
                  className="hidden"
                  type="file"
                  accept=".ttml,.xml,.txt,text/plain,text/xml,application/xml"
                  onChange={(event) => event.target.files?.[0] && selectLyrics(event.target.files[0])}
                />
              </label>
            </Button>
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button disabled={busy || title.trim().length < 1} onClick={save}>
          {busy ? "Сохраняем..." : "Сохранить изменения"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
