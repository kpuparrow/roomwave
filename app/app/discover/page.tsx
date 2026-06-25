import Link from "next/link";
import { Radio, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { prisma } from "@/lib/prisma";

export default async function DiscoverPage() {
  const servers = await prisma.server.findMany({
    where: { OR: [{ visibility: "PUBLIC" }, { publicSession: true }] },
    include: { rooms: { orderBy: { createdAt: "asc" }, take: 3 }, _count: { select: { members: true } } },
    orderBy: { updatedAt: "desc" },
    take: 24
  });

  return (
    <main className="flex-1 overflow-y-auto px-4 py-5 md:px-7">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 pr-14">
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Публичные live-сессии
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-normal md:text-5xl">Комнаты по настроению</h1>
        </div>
        {servers.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {servers.map((server) => {
              const room = server.rooms[0];
              return (
                <Link key={server.id} href={room ? `/app/servers/${server.id}/rooms/${room.id}` : `/app/servers/${server.id}`}>
                  <GlassCard className="min-h-56 transition hover:-translate-y-1">
                    <div className="mb-8 flex items-center justify-between gap-3">
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
                        <Radio className="h-6 w-6" />
                      </div>
                      <span className="rounded-full bg-foreground/[.06] px-3 py-1 text-xs text-muted-foreground">{server._count.members} участников</span>
                    </div>
                    <h2 className="text-2xl font-semibold">{server.name}</h2>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{server.description || server.mood || "Открытая музыкальная сессия RoomWave"}</p>
                    {server.djBattleEnabled ? <p className="mt-4 text-sm font-medium text-primary">DJ battle включен</p> : null}
                  </GlassCard>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="glass rounded-[2rem] p-10 text-center text-muted-foreground">Публичных сессий пока нет. Сделайте сервер публичным в настройках сервера.</div>
        )}
      </div>
    </main>
  );
}
