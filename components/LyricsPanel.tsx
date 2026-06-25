"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TTMLLyricsRenderer } from "@/components/TTMLLyricsRenderer";
import type { LyricsLine, TrackDTO } from "@/lib/types";

export function LyricsPanel({ track, positionMs }: { track: TrackDTO | null; positionMs: number }) {
  const [lines, setLines] = useState<LyricsLine[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!track) return setLines([]);
    fetch(`/api/tracks/${track.id}/lyrics`)
      .then((response) => response.json())
      .then((payload) => setLines(payload.lyrics ?? []))
      .catch(() => setLines([]));
  }, [track]);

  async function uploadLyrics(file: File) {
    if (!track) return;
    setBusy(true);
    const formData = new FormData();
    formData.set("file", file);
    const response = await fetch(`/api/tracks/${track.id}/lyrics`, { method: "POST", body: formData });
    setBusy(false);
    if (response.ok) {
      const payload = await response.json();
      setLines(payload.lyrics ?? []);
    }
  }

  return (
    <div className="glass rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Текст</h3>
        </div>
        <Button asChild size="sm" variant="glass" disabled={!track || busy}>
          <label>
            TTML
            <input className="hidden" type="file" accept=".ttml,.xml,.txt" onChange={(event) => event.target.files?.[0] && uploadLyrics(event.target.files[0])} />
          </label>
        </Button>
      </div>
      <TTMLLyricsRenderer lines={lines} positionMs={positionMs} />
    </div>
  );
}
