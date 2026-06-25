import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getCurrentUser } from "@/lib/auth/session";
import { toTrackDTO } from "@/lib/mappers";
import { prisma } from "@/lib/prisma";
import { deleteStorageObjectByPublicUrl, saveStorageObject } from "@/lib/storage";

export const runtime = "nodejs";

const allowedCoverTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ trackId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { trackId } = await params;
  const track = await prisma.track.findUnique({ where: { id: trackId } });
  if (!track) return NextResponse.json({ error: "Трек не найден." }, { status: 404 });
  if (track.uploadedById !== user.id) {
    return NextResponse.json({ error: "Можно редактировать только свои треки." }, { status: 403 });
  }

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const artist = String(formData.get("artist") ?? "").trim();
  const album = String(formData.get("album") ?? "").trim();
  const cover = formData.get("cover");

  if (title.length < 1 || title.length > 120) {
    return NextResponse.json({ error: "Название трека должно быть от 1 до 120 символов." }, { status: 400 });
  }

  let coverUrl = track.coverUrl;
  if (cover instanceof File && cover.size > 0) {
    if (!allowedCoverTypes.has(cover.type)) {
      return NextResponse.json({ error: "Обложка должна быть png, jpg, webp или gif." }, { status: 400 });
    }
    if (cover.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Обложка не должна быть больше 5 МБ." }, { status: 400 });
    }

    const extension = cover.type.includes("png") ? ".png" : cover.type.includes("webp") ? ".webp" : cover.type.includes("gif") ? ".gif" : ".jpg";
    const coverName = `${uuid()}${extension}`;
    const storedCover = await saveStorageObject("covers", coverName, Buffer.from(await cover.arrayBuffer()));
    coverUrl = storedCover.publicUrl;
  }

  const updated = await prisma.track.update({
    where: { id: trackId },
    data: {
      title,
      artist: artist || null,
      album: album || null,
      coverUrl
    }
  });

  return NextResponse.json({ track: toTrackDTO(updated) });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ trackId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { trackId } = await params;
  const track = await prisma.track.findUnique({ where: { id: trackId } });
  if (!track) return NextResponse.json({ error: "Трек не найден." }, { status: 404 });
  if (track.uploadedById !== user.id) {
    return NextResponse.json({ error: "Можно удалять только свои треки." }, { status: 403 });
  }

  await prisma.playerState.updateMany({
    where: { currentTrackId: trackId },
    data: { currentTrackId: null, positionMs: 0, isPlaying: false }
  });
  await prisma.track.delete({ where: { id: trackId } });
  await Promise.all([deleteStorageObjectByPublicUrl(track.audioUrl), deleteStorageObjectByPublicUrl(track.coverUrl)]);
  return NextResponse.json({ ok: true });
}
