import type { LyricsLine } from "@/lib/types";
import { parseTimeToMs } from "@/lib/ttml";

export function parseTTMLLyricsServer(ttml: string): LyricsLine[] {
  if (!ttml.trim()) return [];
  if (!ttml.includes("<")) {
    return ttml
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({ startMs: null, endMs: null, text }));
  }

  const paragraphMatches = Array.from(ttml.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi));
  const parsed = paragraphMatches
    .map((match) => {
      const attrs = match[1] ?? "";
      const body = match[2] ?? "";
      const startMs = parseTimeToMs(readAttribute(attrs, "begin") ?? readAttribute(attrs, "start"));
      const durMs = parseTimeToMs(readAttribute(attrs, "dur"));
      const endMs = parseTimeToMs(readAttribute(attrs, "end")) ?? (startMs !== null && durMs !== null ? startMs + durMs : null);
      const text = body
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      return text ? { startMs, endMs, text } : null;
    })
    .filter((line): line is LyricsLine => Boolean(line));

  return parsed.length
    ? parsed
    : ttml
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((text) => ({ startMs: null, endMs: null, text }));
}

function readAttribute(attrs: string, name: string) {
  const match = attrs.match(new RegExp(`${name}=["']([^"']+)["']`, "i"));
  return match?.[1] ?? null;
}
