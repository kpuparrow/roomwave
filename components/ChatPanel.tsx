"use client";

import { Send, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import { playRoomSound } from "@/lib/sfx";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/socket-events";
import type { ChatMessageDTO, UserProfile } from "@/lib/types";

type RoomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function ChatPanel({
  socket,
  roomId,
  user,
  messages,
  canModerate = false
}: {
  socket: RoomSocket | null;
  roomId: string;
  user: UserProfile;
  messages: ChatMessageDTO[];
  canModerate?: boolean;
}) {
  const [text, setText] = useState("");

  function send() {
    if (!text.trim()) return;
    socket?.emit("chat:send", { roomId, user, text });
    setText("");
    playRoomSound("message");
  }

  return (
    <div className="glass rounded-3xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Чат</h3>
        <span className="text-xs text-muted-foreground">{messages.length}</span>
      </div>
      <div className="mb-3 max-h-64 space-y-3 overflow-y-auto pr-1">
        {messages.length ? (
          messages.map((message) => (
            <div key={message.id} className="flex gap-2">
              <UserAvatar user={message.user} className="h-8 w-8" />
              <div className="min-w-0 rounded-2xl bg-foreground/[.05] px-3 py-2">
                <div className="flex items-center gap-2">
                  <p className="truncate text-xs font-semibold">{message.user.name}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <p className="break-words text-sm">{message.text}</p>
              </div>
              {canModerate ? (
                <button
                  className="mt-1 grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => socket?.emit("chat:delete", { roomId, userId: user.id, messageId: message.id })}
                  aria-label="Удалить сообщение"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">Сообщений пока нет</div>
        )}
      </div>
      <div className="flex gap-2">
        <Input value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => event.key === "Enter" && send()} placeholder="Написать сообщение" />
        <Button size="icon" onClick={send} aria-label="Отправить сообщение">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
