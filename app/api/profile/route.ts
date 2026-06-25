import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2).max(64),
  status: z.string().max(80).optional()
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте никнейм и статус." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      status: parsed.data.status?.trim() || "Слушаю вместе"
    },
    select: { id: true, email: true, username: true, name: true, avatarUrl: true, status: true }
  });

  return NextResponse.json({ user: updated });
}
