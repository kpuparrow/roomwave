"use client";

import { AnimatePresence, motion } from "framer-motion";
import { GripVertical, ListMusic, Play, Shuffle, ThumbsUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackCard } from "@/components/TrackCard";
import type { QueueItemDTO, QueueVoteDTO } from "@/lib/types";

export function QueuePanel({
  queue,
  votes = [],
  onPlay,
  onRemove,
  onShuffle,
  onReorder,
  onVote,
  canControl
}: {
  queue: QueueItemDTO[];
  votes?: QueueVoteDTO[];
  onPlay?: (trackId: string) => void;
  onRemove?: (queueItemId: string) => void;
  onShuffle?: () => void;
  onReorder?: (queueItemIds: string[]) => void;
  onVote?: (queueItem: QueueItemDTO) => void;
  canControl?: boolean;
}) {
  const voteByTrackId = new Map(votes.map((vote) => [vote.trackId, vote]));

  return (
    <div className="glass rounded-3xl p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListMusic className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Очередь</h3>
        </div>
        <Button size="icon" variant="ghost" disabled={!canControl || queue.length < 2} onClick={onShuffle} aria-label="Перемешать очередь">
          <Shuffle className="h-4 w-4" />
        </Button>
      </div>
      {queue.length ? (
        <div className="space-y-1">
          <AnimatePresence initial={false}>
            {queue.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div
                  draggable={Boolean(canControl)}
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)}
                  onDragOver={(event) => canControl && event.preventDefault()}
                  onDrop={(event) => {
                    if (!canControl) return;
                    const draggedId = event.dataTransfer.getData("text/plain");
                    if (!draggedId || draggedId === item.id) return;
                    const ids = queue.map((queueItem) => queueItem.id);
                    const from = ids.indexOf(draggedId);
                    const to = ids.indexOf(item.id);
                    if (from < 0 || to < 0) return;
                    ids.splice(to, 0, ids.splice(from, 1)[0]);
                    onReorder?.(ids);
                  }}
                  className="flex items-center gap-1"
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <TrackCard track={item.track} compact />
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => onVote?.(item)} aria-label="Голосовать за трек">
                    <span className="flex items-center gap-1 text-xs">
                      <ThumbsUp className="h-4 w-4" />
                      {voteByTrackId.get(item.track.id)?.score ?? 0}
                    </span>
                  </Button>
                  <Button size="icon" variant="ghost" disabled={!canControl} onClick={() => onPlay?.(item.track.id)} aria-label="Включить сейчас">
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => window.confirm(`Удалить «${item.track.title}» из очереди?`) && onRemove?.(item.id)} aria-label="Удалить из очереди">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Очередь пустая</div>
      )}
    </div>
  );
}
