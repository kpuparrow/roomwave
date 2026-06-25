"use client";

import { motion } from "framer-motion";
import { Music2 } from "lucide-react";
import type { LyricsLine } from "@/lib/types";
import { getActiveLyricsIndex } from "@/lib/ttml";
import { cn } from "@/lib/utils";

type VisibleLyric = {
  index: number;
  line: LyricsLine;
  distance: number;
};

const lyricsEase = [0.22, 0.72, 0.24, 1] as const;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function getDisplayLyricsIndex(lines: LyricsLine[], positionMs: number) {
  const activeIndex = getActiveLyricsIndex(lines, positionMs);
  if (activeIndex >= 0) return activeIndex;

  let previousTimedIndex = -1;
  for (let index = 0; index < lines.length; index++) {
    const startMs = lines[index]?.startMs;
    if (startMs !== null && startMs !== undefined && startMs <= positionMs) {
      previousTimedIndex = index;
    }
  }

  if (previousTimedIndex >= 0) return previousTimedIndex;

  const firstTimedIndex = lines.findIndex((line) => line.startMs !== null);
  return firstTimedIndex >= 0 ? firstTimedIndex : 0;
}

function getFirstTimedIndex(lines: LyricsLine[]) {
  return lines.findIndex((line) => line.startMs !== null);
}

function getActiveTextClass(text: string) {
  const length = text.length;
  if (length > 150) return "text-[20px] leading-[1.16] sm:text-[26px] xl:text-[31px]";
  if (length > 118) return "text-[22px] leading-[1.16] sm:text-[28px] xl:text-[34px]";
  if (length > 84) return "text-[25px] leading-[1.15] sm:text-[32px] xl:text-[39px]";
  if (length > 62) return "text-[30px] leading-[1.13] sm:text-[40px] xl:text-[48px]";
  return "text-[34px] leading-[1.12] sm:text-[46px] xl:text-[56px]";
}

function getPassiveTextClass(text: string) {
  return text.length > 92 ? "text-lg leading-snug sm:text-[22px] xl:text-[26px]" : "text-xl leading-snug sm:text-[26px] xl:text-[30px]";
}

function isTallActiveText(text: string) {
  return text.length > 52;
}

function getSideOffset(activeText: string) {
  if (activeText.length > 150) return 210;
  if (activeText.length > 118) return 196;
  if (activeText.length > 84) return 178;
  if (activeText.length > 62) return 162;
  return 148;
}

function getSlotHeight(active: boolean, activeText: string) {
  if (!active) return 86;
  if (activeText.length > 150) return 292;
  if (activeText.length > 118) return 268;
  if (activeText.length > 84) return 238;
  if (activeText.length > 62) return 214;
  return 186;
}

function getLyricY(distance: number, activeText: string) {
  const sideOffset = getSideOffset(activeText);
  if (distance <= -2) return -sideOffset * 2;
  if (distance >= 2) return sideOffset * 2;
  return distance * sideOffset;
}

function getLyricOpacity(distance: number, activeText: string) {
  if (distance === 0) return 1;
  if (distance === -1) return 0.2;
  if (distance === 1) return isTallActiveText(activeText) ? 0.16 : 0.2;
  return 0;
}

function getLyricScale(distance: number) {
  if (distance === 0) return 1;
  if (Math.abs(distance) === 1) return 0.96;
  return 0.94;
}

function IntroMelody({ opacity }: { opacity: number }) {
  return (
    <motion.div
      animate={{ opacity }}
      transition={{ duration: 0.75, ease: lyricsEase }}
      className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center"
    >
      <motion.div
        animate={{ scale: [0.96, 1.08, 0.96] }}
        transition={{ duration: 2.8, ease: "easeInOut", repeat: Infinity }}
      >
        <Music2 className="h-24 w-24 text-primary/85" />
      </motion.div>
    </motion.div>
  );
}

function FullscreenLyricsStack({ lines, activeIndex, opacity = 1, y = 0 }: { lines: LyricsLine[]; activeIndex: number; opacity?: number; y?: number }) {
  const activeText = lines[activeIndex]?.text ?? "";
  const visibleLines: VisibleLyric[] = [-2, -1, 0, 1, 2]
    .map((distance) => {
      const index = activeIndex + distance;
      const line = lines[index];
      return line ? { index, line, distance } : null;
    })
    .filter((item): item is VisibleLyric => Boolean(item));

  return (
    <motion.div
      animate={{ opacity, y }}
      transition={{ duration: 0.8, ease: lyricsEase }}
      className="relative h-[450px] max-h-[66vh] min-h-[380px] w-full max-w-[940px] overflow-hidden"
    >
      {visibleLines.map(({ index, line, distance }) => {
        const active = distance === 0;

        return (
          <motion.div
            key={`fullscreen-lyric-${index}`}
            initial={false}
            animate={{
              opacity: getLyricOpacity(distance, activeText),
              scale: getLyricScale(distance),
              y: getLyricY(distance, activeText)
            }}
            transition={{
              opacity: { duration: 0.9, ease: lyricsEase },
              scale: { duration: 1.05, ease: lyricsEase },
              y: { duration: 1.1, ease: lyricsEase }
            }}
            className="absolute left-0 right-0 top-1/2 flex origin-left transform-gpu items-center will-change-transform"
            style={{
              height: getSlotHeight(active, activeText),
              marginTop: -getSlotHeight(active, activeText) / 2
            }}
          >
            <p
              className={cn(
                "max-w-full whitespace-pre-wrap break-words font-bold tracking-normal text-white",
                active
                  ? "max-h-[280px] border-l-4 border-primary pl-6"
                  : "max-h-[72px] pl-7",
                active ? getActiveTextClass(line.text) : getPassiveTextClass(line.text)
              )}
              style={{
                overflow: "hidden",
                overflowWrap: "anywhere",
                textShadow: active ? "0 8px 26px rgba(0,0,0,.28)" : "0 6px 18px rgba(0,0,0,.18)",
                ...(!active
                  ? {
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 2
                    }
                  : null)
              }}
            >
              {line.text}
            </p>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

export function TTMLLyricsRenderer({ lines, positionMs, fullscreen = false }: { lines: LyricsLine[]; positionMs: number; fullscreen?: boolean }) {
  if (!lines.length) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground",
          fullscreen && "flex h-full items-center justify-center border-0 text-lg text-white/60"
        )}
      >
        Текст не загружен
      </div>
    );
  }

  const timed = lines.some((line) => line.startMs !== null);

  if (fullscreen) {
    const firstTimedIndex = timed ? getFirstTimedIndex(lines) : -1;
    const firstStartMs = firstTimedIndex >= 0 ? lines[firstTimedIndex]?.startMs : null;
    const activeIndex = timed ? getDisplayLyricsIndex(lines, positionMs) : 0;
    const hasIntro = timed && firstStartMs !== null;
    const introStartMs = hasIntro ? firstStartMs - 1000 : 0;
    const introEndMs = hasIntro ? firstStartMs + 650 : 0;
    const introProgress = hasIntro ? clamp01((positionMs - introStartMs) / Math.max(introEndMs - introStartMs, 1)) : 1;
    const introOpacity = hasIntro ? 0.88 * (1 - introProgress) : 0;
    const lyricsOpacity = hasIntro ? clamp01((positionMs - (firstStartMs - 760)) / 1280) : 1;
    const lyricsY = hasIntro ? (1 - lyricsOpacity) * 24 : 0;
    const lyricsIndex = hasIntro && positionMs < firstStartMs ? firstTimedIndex : activeIndex;

    return (
      <div className="flex h-full items-center overflow-hidden">
        {hasIntro ? <IntroMelody opacity={introOpacity} /> : null}
        <FullscreenLyricsStack lines={lines} activeIndex={lyricsIndex} opacity={lyricsOpacity} y={lyricsY} />
      </div>
    );
  }

  const activeIndex = getActiveLyricsIndex(lines, positionMs);

  return (
    <div className="max-h-[440px] overflow-y-auto pr-2">
      <div className="space-y-4 py-24">
        {lines.map((line, index) => {
          const active = !timed || index === activeIndex;

          return (
            <p
              key={`${line.text}-${index}`}
              className={cn(
                "max-w-full whitespace-pre-wrap break-words text-lg font-semibold leading-snug text-muted-foreground transition-colors duration-200",
                active && "text-foreground"
              )}
            >
              {line.text}
            </p>
          );
        })}
      </div>
    </div>
  );
}
