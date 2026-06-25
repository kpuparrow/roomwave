import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  trackId: z.string().min(1)
});

export async function POST(request: Request, { params }: { params: Promise<{ playlistId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { playlistId } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Трек не найден." }, { status: 400 });

  const playlist = await prisma.playlist.findFirst({ where: { id: playlistId, userId: user.id } });
  if (!playlist) return NextResponse.json({ error: "Плейлист не найден." }, { status: 404 });

  const last = await prisma.playlistTrack.findFirst({ where: { playlistId }, orderBy: { position: "desc" } });
  await prisma.playlistTrack.upsert({
    where: { playlistId_trackId: { playlistId, trackId: parsed.data.trackId } },
    update: {},
    create: {
      playlistId,
      trackId: parsed.data.trackId,
      position: (last?.position ?? -1) + 1
    }
  });
  await prisma.playlist.update({ where: { id: playlistId }, data: { updatedAt: new Date() } });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ playlistId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { playlistId } = await params;
  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get("trackId");
  if (!trackId) return NextResponse.json({ error: "Трек не найден." }, { status: 400 });

  const playlist = await prisma.playlist.findFirst({ where: { id: playlistId, userId: user.id } });
  if (!playlist) return NextResponse.json({ error: "Плейлист не найден." }, { status: 404 });

  await prisma.playlistTrack.deleteMany({ where: { playlistId, trackId } });
  return NextResponse.json({ ok: true });
}
