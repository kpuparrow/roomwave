"use client";

import Link from "next/link";
import { Plus, Radio } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ProfileMenu } from "@/components/ProfileMenu";
import type { ServerDTO, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SidebarServers({ servers, activeServerId, user }: { servers: ServerDTO[]; activeServerId?: string; user: UserProfile }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createServer() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Не удалось создать сервер.");
        return;
      }

      const roomId = payload.server?.rooms?.[0]?.id;
      router.push(roomId ? `/app/servers/${payload.server.id}/rooms/${roomId}` : `/app/servers/${payload.server.id}`);
      router.refresh();
      setName("");
      setOpen(false);
    } catch {
      setError("Нет соединения с сервером.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="relative z-50 flex h-full w-[82px] flex-col items-center gap-3 border-r border-border/70 bg-background/86 px-3 py-4 backdrop-blur-2xl">
      <Link href="/app" className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg" title="Главная">
        <Radio className="h-5 w-5" />
      </Link>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pb-1">
        {servers.map((server) => (
          <Link key={server.id} href={`/app/servers/${server.id}`} aria-label={server.name} title={server.name}>
            <motion.div
              whileHover={{ scale: 1.04 }}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/8 text-sm font-bold transition",
                activeServerId === server.id && "rounded-xl bg-foreground text-background"
              )}
            >
              {server.name.slice(0, 2).toUpperCase()}
            </motion.div>
          </Link>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="icon" variant="glass" aria-label="Создать сервер" title="Создать сервер">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый сервер</DialogTitle>
            <p className="text-sm text-muted-foreground">Сервер объединяет комнаты, очередь и участников для совместного прослушивания.</p>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              placeholder="Например: Вечерний сет"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && createServer()}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" disabled={busy || name.trim().length < 2} onClick={createServer}>
              {busy ? "Создаем..." : "Создать сервер"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ProfileMenu user={user} placement="dock" />
    </aside>
  );
}
