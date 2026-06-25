"use client";

import Link from "next/link";
import { Compass, Headphones, Library, Plus, Radio, Settings, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RoomDTO, ServerDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ServerChannelList({ server, activeRoomId }: { server: ServerDTO; activeRoomId?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");

  async function createRoom() {
    if (!name.trim()) return;
    const response = await fetch(`/api/servers/${server.id}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    if (response.ok) {
      const { room } = await response.json();
      router.push(`/app/servers/${server.id}/rooms/${room.id}`);
      router.refresh();
      setName("");
    }
  }

  return (
    <aside className="hidden h-full w-72 flex-col border-r border-border/70 bg-background/56 p-4 backdrop-blur-xl md:flex">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[.18em] text-muted-foreground">Сервер</p>
        <h2 className="mt-1 truncate text-xl font-semibold">{server.name}</h2>
      </div>
      <nav className="space-y-1">
        <NavLink href={`/app/servers/${server.id}`} icon={<Radio className="h-4 w-4" />} label="Обзор сервера" />
        <NavLink href="/app/discover" icon={<Compass className="h-4 w-4" />} label="Открытые сессии" />
        <NavLink href="/app/library" icon={<Library className="h-4 w-4" />} label="Медиатека" />
        <NavLink href="/app/upload" icon={<Upload className="h-4 w-4" />} label="Загрузка" />
        <NavLink href="/app/settings" icon={<Settings className="h-4 w-4" />} label="Настройки" />
      </nav>
      <div className="mt-8 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-muted-foreground">Комнаты</p>
        <Button size="icon" variant="ghost" onClick={createRoom} aria-label="Создать комнату">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <Input className="my-3" placeholder="Новая комната" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && createRoom()} />
      <div className="space-y-1 overflow-y-auto">
        {server.rooms.map((room: RoomDTO) => (
          <Link
            key={room.id}
            href={`/app/servers/${server.id}/rooms/${room.id}`}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition hover:bg-foreground/7",
              activeRoomId === room.id && "bg-foreground text-background hover:bg-foreground"
            )}
          >
            <Headphones className="h-4 w-4" />
            <span className="truncate">{room.name}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-foreground/7 hover:text-foreground">
      {icon}
      {label}
    </Link>
  );
}
