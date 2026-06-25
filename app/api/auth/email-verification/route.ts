import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { createPlainToken, hashToken } from "@/lib/token";

const verifySchema = z.object({ token: z.string().min(16) });

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = createPlainToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
    }
  });

  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/email-verification?token=${token}`;
  await sendEmail({ to: user.email, subject: "Подтверждение почты RoomWave", text: `Откройте ссылку для подтверждения почты: ${url}` });
  return NextResponse.json({ ok: true, devToken: process.env.NODE_ENV === "production" ? undefined : token });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = verifySchema.safeParse({ token: searchParams.get("token") });
  if (!parsed.success) return NextResponse.json({ error: "Некорректный токен." }, { status: 400 });

  const tokenHash = hashToken(parsed.data.token);
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt <= new Date()) return NextResponse.json({ error: "Ссылка устарела." }, { status: 400 });

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } })
  ]);

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/app/settings`);
}
