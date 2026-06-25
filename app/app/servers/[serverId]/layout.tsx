import { notFound, redirect } from "next/navigation";
import { ServerChannelList } from "@/components/ServerChannelList";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function ServerLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ serverId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { serverId } = await params;
  const server = await prisma.server.findFirst({
    where: { id: serverId, members: { some: { userId: user.id } } },
    include: { rooms: { orderBy: { createdAt: "asc" } } }
  });
  if (!server) notFound();

  return (
    <>
      <ServerChannelList
        server={{
          id: server.id,
          name: server.name,
          iconUrl: server.iconUrl,
          rooms: server.rooms.map((room) => ({ id: room.id, name: room.name, hostId: room.hostId }))
        }}
      />
      {children}
    </>
  );
}
