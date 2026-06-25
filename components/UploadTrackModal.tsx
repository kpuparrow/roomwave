"use client";

import { UploadCloud } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ToastProvider";
import type { TrackDTO } from "@/lib/types";

export function UploadTrackModal({ onUploaded }: { onUploaded?: (track: TrackDTO) => void }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/tracks/upload", { method: "POST", body: formData });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Не удалось загрузить трек.");
        return;
      }

      onUploaded?.(payload.track);
      showToast({ kind: "success", title: "Трек загружен", description: payload.track?.title });
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
        <Button variant="glass">
          <UploadCloud className="h-4 w-4" />
          Загрузить
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Загрузка локального трека</DialogTitle>
          <p className="text-sm text-muted-foreground">Поддерживаются mp3, m4a, wav и flac. Метаданные и обложка извлекаются автоматически.</p>
        </DialogHeader>
        <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-foreground/[.03] p-8 text-center transition hover:bg-foreground/[.06]">
          <UploadCloud className="mb-3 h-8 w-8 text-primary" />
          <span className="font-medium">{busy ? "Загрузка..." : "Выберите аудиофайл"}</span>
          <span className="mt-1 text-sm text-muted-foreground">После загрузки трек появится в медиатеке</span>
          <input className="hidden" type="file" accept=".mp3,.m4a,.wav,.flac,audio/*" disabled={busy} onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])} />
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
