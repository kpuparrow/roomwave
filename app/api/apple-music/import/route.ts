import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const schema = z.object({
  appleMusicId: z.string(),
  title: z.string(),
  artist: z.string().optional(),
  album: z.string().optional(),
  durationMs: z.number().optional(),
  coverUrl: z.string().optional(),
  previewUrl: z.string().optional()
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = checkRateLimit(`apple-import:${user.id}:${getClientIp(request)}`, { limit: 60, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfterMs);

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Некорректные метаданные Apple Music." }, { status: 400 });

  const data = parsed.data;
  const track = await prisma.track.upsert({
    where: { appleMusicId: data.appleMusicId },
    update: {
      title: data.title,
      artist: data.artist,
      album: data.album,
      durationMs: data.durationMs,
      coverUrl: data.coverUrl,
      previewUrl: data.previewUrl,
      uploadedById: user.id
    },
    create: {
      source: "APPLE_MUSIC",
      appleMusicId: data.appleMusicId,
      title: data.title,
      artist: data.artist,
      album: data.album,
      durationMs: data.durationMs,
      coverUrl: data.coverUrl,
      previewUrl: data.previewUrl,
      uploadedById: user.id
    }
  });

  return NextResponse.json({ track }, { status: 201 });
}
