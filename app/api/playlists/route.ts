import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(240).optional(),
  isPublic: z.boolean().optional()
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const playlists = await prisma.playlist.findMany({
    where: { userId: user.id },
    include: { _count: { select: { tracks: true } } },
    orderBy: { updatedAt: "desc" }
  });

  return NextResponse.json({
    playlists: playlists.map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      coverUrl: playlist.coverUrl,
      isPublic: playlist.isPublic,
      trackCount: playlist._count.tracks
    }))
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Название плейлиста должно быть от 2 до 80 символов." }, { status: 400 });

  const playlist = await prisma.playlist.create({
    data: {
      userId: user.id,
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
      isPublic: parsed.data.isPublic ?? false
    },
    include: { _count: { select: { tracks: true } } }
  });

  return NextResponse.json({
    playlist: {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      coverUrl: playlist.coverUrl,
      isPublic: playlist.isPublic,
      trackCount: playlist._count.tracks
    }
  }, { status: 201 });
}
