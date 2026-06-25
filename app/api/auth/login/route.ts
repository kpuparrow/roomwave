import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth/session";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const schema = z.object({
  login: z.string().trim().min(1),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  const limit = checkRateLimit(`auth:login:${getClientIp(request)}`, { limit: 10, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfterMs);

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Введите логин или почту и пароль." }, { status: 400 });
  }

  const login = parsed.data.login;
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: login }, { email: login.toLowerCase() }] }
  });

  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Неверный логин, почта или пароль." }, { status: 401 });
  }

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
