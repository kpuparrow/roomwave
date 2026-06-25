import type { LyricsLine } from "@/lib/types";

const timeExpression = /^(\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d{1,3})?$/;

export function parseTimeToMs(value: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d+(?:\.\d+)?s$/.test(trimmed)) return Math.round(Number(trimmed.slice(0, -1)) * 1000);
  if (/^\d+ms$/.test(trimmed)) return Number(trimmed.slice(0, -2));
  if (!timeExpression.test(trimmed)) return null;

  const parts = trimmed.split(":");
  const [secondsRaw, minutesRaw, hoursRaw] = parts.reverse();
  const seconds = Number(secondsRaw);
  const minutes = Number(minutesRaw ?? 0);
  const hours = Number(hoursRaw ?? 0);
  return Math.round(((hours * 60 + minutes) * 60 + seconds) * 1000);
}

export function parseTTMLLyrics(ttml: string): LyricsLine[] {
  if (!ttml.trim()) return [];

  if (!ttml.includes("<")) {
    return ttml
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({ startMs: null, endMs: null, text }));
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(ttml, "application/xml");
  const parserError = document.querySelector("parsererror");
  if (parserError) {
    return stripMarkupFallback(ttml);
  }

  const nodes = Array.from(document.getElementsByTagName("p"));
  const lines = nodes
    .map((node) => {
      const begin = node.getAttribute("begin") ?? node.getAttribute("start");
      const end = node.getAttribute("end");
      const dur = node.getAttribute("dur");
      const startMs = parseTimeToMs(begin);
      const durationMs = parseTimeToMs(dur);
      const endMs = parseTimeToMs(end) ?? (startMs !== null && durationMs !== null ? startMs + durationMs : null);
      const text = normalizeLyricsText(node.textContent ?? "");
      return text ? { startMs, endMs, text } : null;
    })
    .filter((line): line is LyricsLine => Boolean(line));

  return lines.length ? lines : stripMarkupFallback(ttml);
}

export function getActiveLyricsIndex(lines: LyricsLine[], positionMs: number) {
  return lines.findIndex((line, index) => {
    if (line.startMs === null) return false;
    const nextStart = lines[index + 1]?.startMs ?? Number.POSITIVE_INFINITY;
    const end = line.endMs ?? nextStart;
    return positionMs >= line.startMs && positionMs < end;
  });
}

function stripMarkupFallback(input: string): LyricsLine[] {
  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .split(/\r?\n/)
    .map((line) => normalizeLyricsText(line))
    .filter(Boolean)
    .map((text) => ({ startMs: null, endMs: null, text }));
}

function normalizeLyricsText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
