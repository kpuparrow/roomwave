import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth/session";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const schema = z
  .object({
    email: z.string().trim().toLowerCase().email("Введите корректную почту."),
    username: z
      .string()
      .trim()
      .min(3, "Логин должен быть минимум 3 символа.")
      .max(32, "Логин должен быть не длиннее 32 символов.")
      .regex(/^[\p{L}\p{N}_.-]+$/u, "В логине можно использовать буквы, цифры, точку, дефис и нижнее подчеркивание."),
    password: z.string().min(8, "Пароль должен быть минимум 8 символов."),
    passwordRepeat: z.string().min(8, "Повторите пароль."),
    name: z.string().trim().min(2, "Имя должно быть минимум 2 символа.").max(64, "Имя слишком длинное.")
  })
  .refine((data) => data.password === data.passwordRepeat, {
    message: "Пароли не совпадают.",
    path: ["passwordRepeat"]
  });

export async function POST(request: Request) {
  const limit = checkRateLimit(`auth:register:${getClientIp(request)}`, { limit: 5, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfterMs);

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Проверьте почту, логин, имя и пароль." }, { status: 400 });
  }

  const { email, username, password, name } = parsed.data;
  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (existing) {
    return NextResponse.json({ error: "Пользователь с такой почтой или логином уже существует." }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      email,
      username,
      name,
      passwordHash: await bcrypt.hash(password, 12)
    }
  });

  await createSession(user.id);
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatarUrl,
      status: user.status
    }
  });
}
