import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { parseTTMLLyricsServer } from "@/lib/ttml.server";

export const runtime = "nodejs";

const maxLyricsFileSize = 2 * 1024 * 1024;
const allowedLyricsExtensions = new Set(["ttml", "xml", "txt"]);

export async function GET(_: Request, { params }: { params: Promise<{ trackId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { trackId } = await params;
  const lyrics = await prisma.lyricsFile.findFirst({ where: { trackId }, orderBy: { createdAt: "desc" } });

  return NextResponse.json({ lyrics: lyrics?.parsed ?? [] });
}

export async function POST(request: Request, { params }: { params: Promise<{ trackId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { trackId } = await params;
  const track = await prisma.track.findUnique({ where: { id: trackId }, select: { uploadedById: true } });

  if (!track) {
    return NextResponse.json({ error: "Трек не найден." }, { status: 404 });
  }

  if (track.uploadedById !== user.id) {
    return NextResponse.json({ error: "Можно добавлять текст только к своим трекам." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size < 1) {
    return NextResponse.json({ error: "Файл текста не найден." }, { status: 400 });
  }

  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  if (!allowedLyricsExtensions.has(extension)) {
    return NextResponse.json({ error: "Текст должен быть в формате .ttml, .xml или .txt." }, { status: 400 });
  }

  if (file.size > maxLyricsFileSize) {
    return NextResponse.json({ error: "Файл текста не должен быть больше 2 МБ." }, { status: 400 });
  }

  const rawText = (await file.text()).trim();
  if (!rawText) {
    return NextResponse.json({ error: "Файл текста пустой." }, { status: 400 });
  }

  const parsed = parseTTMLLyricsServer(rawText);
  const lyrics = await prisma.lyricsFile.create({
    data: {
      trackId,
      filename: file.name,
      rawText,
      parsed
    }
  });

  return NextResponse.json({ filename: lyrics.filename, lyrics: lyrics.parsed }, { status: 201 });
}
