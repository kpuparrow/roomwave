import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { saveStorageObject } from "@/lib/storage";

export const runtime = "nodejs";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const maxAvatarBytes = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Файл аватарки не найден." }, { status: 400 });
  if (!allowed.has(file.type)) return NextResponse.json({ error: "Поддерживаются jpg, png, webp и gif." }, { status: 400 });
  if (file.size > maxAvatarBytes) return NextResponse.json({ error: "Аватарка не должна быть больше 5 МБ." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.type.includes("png") ? ".png" : file.type.includes("webp") ? ".webp" : file.type.includes("gif") ? ".gif" : ".jpg";
  const filename = `${uuid()}${extension}`;
  const storedAvatar = await saveStorageObject("avatars", filename, buffer);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: storedAvatar.publicUrl },
    select: { avatarUrl: true }
  });

  return NextResponse.json({ avatarUrl: updated.avatarUrl });
}
