"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrackCard } from "@/components/TrackCard";
import type { AppleMusicTrack, TrackDTO } from "@/lib/types";

export function AppleMusicSearch({ onImported }: { onImported?: (track: TrackDTO) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AppleMusicTrack[]>([]);
  const [busy, setBusy] = useState(false);
  const [mockMode, setMockMode] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function search() {
    if (!query.trim()) return;
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/apple-music/search?q=${encodeURIComponent(query)}`);
      const payload = await response.json();

      if (!response.ok) {
        setResults([]);
        setMessage(payload.error ?? "Не удалось выполнить поиск.");
        return;
      }

      const tracks = payload.tracks ?? [];
      setResults(tracks);
      setMockMode(Boolean(payload.mockMode));
      if (!tracks.length) setMessage("По этому запросу ничего не найдено.");
    } catch {
      setResults([]);
      setMessage("Нет соединения с сервисом поиска.");
    } finally {
      setBusy(false);
    }
  }

  async function importTrack(track: AppleMusicTrack) {
    setImportingId(track.appleMusicId);
    setMessage(null);

    try {
      const response = await fetch("/api/apple-music/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(track)
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(payload?.error ?? "Не удалось импортировать трек.");
        return;
      }

      onImported?.(payload.track);
      setMessage("Трек импортирован.");
    } catch {
      setMessage("Нет соединения с сервером.");
    } finally {
      setImportingId(null);
    }
  }

  return (
    <div className="glass rounded-3xl p-5">
      <div className="mb-4 flex items-center gap-2">
        <Search className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Apple Music</h3>
      </div>
      <div className="flex gap-2">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && search()} placeholder="Найти треки" />
        <Button onClick={search} disabled={busy || !query.trim()}>{busy ? "..." : "Найти"}</Button>
      </div>
      {mockMode ? <p className="mt-3 text-xs text-muted-foreground">Без ключа Apple Music используется легальный поиск iTunes preview и метаданных.</p> : null}
      {message ? <p className="mt-3 rounded-2xl bg-foreground/[.04] px-3 py-2 text-xs text-muted-foreground">{message}</p> : null}
      <div className="mt-4 space-y-1">
        {results.map((track) => (
          <div key={track.appleMusicId} className={importingId === track.appleMusicId ? "pointer-events-none opacity-55" : ""}>
            <TrackCard
              track={{
                id: track.appleMusicId,
                source: "APPLE_MUSIC",
                title: track.title,
                artist: track.artist,
                album: track.album ?? null,
                durationMs: track.durationMs ?? null,
                audioUrl: null,
                previewUrl: track.previewUrl ?? null,
                coverUrl: track.coverUrl ?? null
              }}
              onAdd={() => importTrack(track)}
              compact
            />
          </div>
        ))}
      </div>
    </div>
  );
}
