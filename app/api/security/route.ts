import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email().optional(),
  oldPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
  newPasswordRepeat: z.string().min(8).optional()
}).refine((data) => !data.newPassword || data.newPassword === data.newPasswordRepeat, {
  message: "Новые пароли не совпадают.",
  path: ["newPasswordRepeat"]
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = checkRateLimit(`security:${user.id}:${getClientIp(request)}`, { limit: 8, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfterMs);

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Проверьте данные безопасности." }, { status: 400 });

  const current = await prisma.user.findUnique({ where: { id: user.id } });
  if (!current) return NextResponse.json({ error: "Пользователь не найден." }, { status: 404 });

  const wantsPasswordChange = Boolean(parsed.data.newPassword);
  if (wantsPasswordChange) {
    if (!parsed.data.oldPassword || !(await bcrypt.compare(parsed.data.oldPassword, current.passwordHash))) {
      return NextResponse.json({ error: "Старый пароль указан неверно." }, { status: 403 });
    }
  }

  if (parsed.data.email && parsed.data.email !== current.email) {
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return NextResponse.json({ error: "Эта почта уже занята." }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      email: parsed.data.email ?? current.email,
      passwordHash: parsed.data.newPassword ? await bcrypt.hash(parsed.data.newPassword, 12) : current.passwordHash,
      sessionVersion: parsed.data.newPassword ? { increment: 1 } : undefined
    }
  });

  return NextResponse.json({ ok: true });
}
