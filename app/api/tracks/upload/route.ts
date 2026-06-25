import path from "node:path";
import { NextResponse } from "next/server";
import { parseBuffer } from "music-metadata";
import { v4 as uuid } from "uuid";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { saveStorageObject } from "@/lib/storage";
import { fileStem } from "@/lib/utils";

export const runtime = "nodejs";

const allowedMimeTypes = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/x-flac"
]);
const maxAudioBytes = Number(process.env.MAX_AUDIO_UPLOAD_MB ?? 120) * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = checkRateLimit(`track-upload:${user.id}:${getClientIp(request)}`, { limit: 20, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfterMs);

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Аудиофайл не найден." }, { status: 400 });
  if (!allowedMimeTypes.has(file.type)) return NextResponse.json({ error: "Поддерживаются mp3, m4a, wav и flac." }, { status: 400 });
  if (file.size > maxAudioBytes) return NextResponse.json({ error: `Файл не должен быть больше ${Math.round(maxAudioBytes / 1024 / 1024)} МБ.` }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = path.extname(file.name) || mimeToExt(file.type);
  const basename = `${uuid()}${extension}`;
  const storedAudio = await saveStorageObject("tracks", basename, buffer);

  const metadata = await parseBuffer(buffer, file.type).catch(() => null);
  let coverUrl: string | null = null;
  const picture = metadata?.common.picture?.[0];
  if (picture) {
    const coverName = `${uuid()}.${picture.format.includes("png") ? "png" : "jpg"}`;
    const storedCover = await saveStorageObject("covers", coverName, picture.data);
    coverUrl = storedCover.publicUrl;
  }

  const track = await prisma.track.create({
    data: {
      source: "LOCAL",
      title: metadata?.common.title ?? fileStem(file.name),
      artist: metadata?.common.artist ?? null,
      album: metadata?.common.album ?? null,
      durationMs: metadata?.format.duration ? Math.round(metadata.format.duration * 1000) : null,
      audioUrl: storedAudio.publicUrl,
      coverUrl,
      mimeType: file.type,
      sizeBytes: file.size,
      uploadedById: user.id
    }
  });

  return NextResponse.json({ track }, { status: 201 });
}

function mimeToExt(mime: string) {
  if (mime.includes("mp4") || mime.includes("m4a")) return ".m4a";
  if (mime.includes("wav")) return ".wav";
  if (mime.includes("flac")) return ".flac";
  return ".mp3";
}
