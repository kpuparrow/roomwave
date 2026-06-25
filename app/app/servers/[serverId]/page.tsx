import Link from "next/link";
import { notFound } from "next/navigation";
import { Headphones, Radio, Users } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { ServerMembersPanel } from "@/components/ServerMembersPanel";
import { ServerSettingsPanel } from "@/components/ServerSettingsPanel";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function ServerPage({ params }: { params: Promise<{ serverId: string }> }) {
  const user = await getCurrentUser();
  const { serverId } = await params;
  const server = await prisma.server.findFirst({
    where: { id: serverId, members: { some: { userId: user?.id } } },
    include: {
      rooms: { orderBy: { createdAt: "asc" } },
      members: {
        include: { user: { select: { id: true, email: true, username: true, name: true, avatarUrl: true, status: true } } },
        orderBy: { id: "asc" }
      },
      _count: { select: { members: true } }
    }
  });
  if (!server) notFound();

  return (
    <main className="flex-1 overflow-y-auto px-4 py-5 md:px-7">
      <div className="mx-auto grid max-w-6xl gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="glass relative overflow-hidden rounded-[2rem] p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,45,85,.18),transparent_28%),radial-gradient(circle_at_90%_10%,rgba(50,173,230,.14),transparent_26%)]" />
          <div className="relative z-10">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Radio className="h-4 w-4" />
                  Музыкальный сервер
                </p>
                <h1 className="mt-2 text-4xl font-bold tracking-normal md:text-6xl">{server.name}</h1>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/65 px-4 py-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4 text-primary" />
                {server._count.members} участников
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {server.rooms.map((room) => (
            <Link key={room.id} href={`/app/servers/${server.id}/rooms/${room.id}`}>
              <GlassCard className="transition hover:-translate-y-1">
                <Headphones className="mb-8 h-8 w-8 text-primary" />
                <h2 className="text-2xl font-semibold">{room.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">Открыть синхронный плеер</p>
              </GlassCard>
            </Link>
              ))}
            </div>
          </div>
        </section>

        <aside className="grid gap-5">
          <ServerSettingsPanel
            serverId={server.id}
            initialName={server.name}
            initialDescription={server.description}
            initialVisibility={server.visibility}
            initialMood={server.mood}
            initialPublicSession={server.publicSession}
            initialDjBattleEnabled={server.djBattleEnabled}
            roomCount={server.rooms.length}
            memberCount={server._count.members}
            isOwner={server.ownerId === user?.id}
          />

          <ServerMembersPanel
            serverId={server.id}
            currentUserId={user!.id}
            canManage={server.ownerId === user?.id || server.members.some((member) => member.userId === user?.id && member.role === "ADMIN")}
            members={server.members.map((member) => ({
              id: member.id,
              role: member.role,
              user: member.user
            }))}
          />
        </aside>
      </div>
    </main>
  );
}
