import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { toTrackDTO } from "@/lib/mappers";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const schema = z.object({
  trackId: z.string().min(1)
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const favorites = await prisma.favoriteTrack.findMany({
    where: { userId: user.id },
    include: { track: true },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    trackIds: favorites.map((favorite) => favorite.trackId),
    tracks: favorites.map((favorite) => toTrackDTO(favorite.track))
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = checkRateLimit(`favorite:${user.id}:${getClientIp(request)}`, { limit: 90, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfterMs);

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Трек не найден." }, { status: 400 });

  const track = await prisma.track.findFirst({
    where: {
      id: parsed.data.trackId,
      OR: [{ uploadedById: user.id }, { source: "APPLE_MUSIC" }]
    }
  });
  if (!track) return NextResponse.json({ error: "Трек не найден." }, { status: 404 });

  await prisma.favoriteTrack.upsert({
    where: { userId_trackId: { userId: user.id, trackId: track.id } },
    update: {},
    create: { userId: user.id, trackId: track.id }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get("trackId");
  if (!trackId) return NextResponse.json({ error: "Трек не найден." }, { status: 400 });

  await prisma.favoriteTrack.deleteMany({ where: { userId: user.id, trackId } });
  return NextResponse.json({ ok: true });
}
