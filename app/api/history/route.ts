import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { toTrackDTO } from "@/lib/mappers";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  trackId: z.string().min(1),
  roomId: z.string().optional(),
  positionMs: z.number().int().min(0).optional()
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const history = await prisma.listeningHistory.findMany({
    where: { userId: user.id },
    include: { track: true },
    orderBy: { listenedAt: "desc" },
    take: 40
  });

  return NextResponse.json({
    history: history.map((item) => ({
      id: item.id,
      track: toTrackDTO(item.track),
      roomId: item.roomId,
      positionMs: item.positionMs,
      listenedAt: item.listenedAt
    }))
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Трек не найден." }, { status: 400 });

  await prisma.listeningHistory.create({
    data: {
      userId: user.id,
      trackId: parsed.data.trackId,
      roomId: parsed.data.roomId,
      positionMs: parsed.data.positionMs
    }
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
