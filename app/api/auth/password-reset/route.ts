import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { createPlainToken, hashToken } from "@/lib/token";

const requestSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8),
  passwordRepeat: z.string().min(8)
}).refine((data) => data.password === data.passwordRepeat, {
  message: "Пароли не совпадают.",
  path: ["passwordRepeat"]
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Введите почту." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return NextResponse.json({ ok: true });

  const token = createPlainToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 1000 * 60 * 30)
    }
  });
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login?resetToken=${token}`;
  await sendEmail({ to: user.email, subject: "Восстановление пароля RoomWave", text: `Ссылка для восстановления пароля: ${url}` });

  return NextResponse.json({ ok: true, devToken: process.env.NODE_ENV === "production" ? undefined : token });
}

export async function PATCH(request: Request) {
  const parsed = resetSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Проверьте новый пароль." }, { status: 400 });

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(parsed.data.token) } });
  if (!record || record.usedAt || record.expiresAt <= new Date()) return NextResponse.json({ error: "Ссылка устарела." }, { status: 400 });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash: await bcrypt.hash(parsed.data.password, 12),
        sessionVersion: { increment: 1 }
      }
    }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } })
  ]);

  return NextResponse.json({ ok: true });
}
