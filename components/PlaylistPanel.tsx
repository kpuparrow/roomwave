"use client";

import { ListPlus, Music2, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ToastProvider";
import type { PlaylistDTO, TrackDTO } from "@/lib/types";

export function PlaylistPanel({
  playlists: initialPlaylists,
  activeTrack
}: {
  playlists: PlaylistDTO[];
  activeTrack: TrackDTO | null;
}) {
  const { showToast } = useToast();
  const [playlists, setPlaylists] = useState(initialPlaylists);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function createPlaylist() {
    if (name.trim().length < 2) return;
    setBusy(true);
    const response = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() })
    });
    setBusy(false);
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      showToast({ kind: "error", title: "Не удалось создать плейлист", description: payload?.error });
      return;
    }
    setPlaylists((current) => [payload.playlist, ...current]);
    setName("");
    showToast({ kind: "success", title: "Плейлист создан" });
  }

  async function addToPlaylist(playlist: PlaylistDTO) {
    if (!activeTrack) return;
    const response = await fetch(`/api/playlists/${playlist.id}/tracks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId: activeTrack.id })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      showToast({ kind: "error", title: "Не удалось добавить трек", description: payload?.error });
      return;
    }
    setPlaylists((current) => current.map((item) => (item.id === playlist.id ? { ...item, trackCount: item.trackCount + 1 } : item)));
    showToast({ kind: "success", title: "Трек добавлен в плейлист", description: playlist.name });
  }

  return (
    <div className="glass rounded-[2rem] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Music2 className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Плейлисты</h2>
      </div>
      <div className="mb-4 flex gap-2">
        <Input placeholder="Новый плейлист" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && createPlaylist()} />
        <Button size="icon" disabled={busy || name.trim().length < 2} onClick={createPlaylist} aria-label="Создать плейлист">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2">
        {playlists.length ? (
          playlists.map((playlist) => (
            <div key={playlist.id} className="flex items-center gap-3 rounded-2xl bg-foreground/[.05] p-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Music2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{playlist.name}</p>
                <p className="text-xs text-muted-foreground">{playlist.trackCount} треков</p>
              </div>
              <Button size="icon" variant="ghost" disabled={!activeTrack} onClick={() => addToPlaylist(playlist)} aria-label="Добавить текущий трек">
                <ListPlus className="h-4 w-4" />
              </Button>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">Создайте первый плейлист и добавляйте туда выбранные треки.</div>
        )}
      </div>
    </div>
  );
}
