import { NextResponse } from "next/server";
import { clearSession, getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.user.update({ where: { id: user.id }, data: { sessionVersion: { increment: 1 } } });
  await clearSession();
  return NextResponse.json({ ok: true });
}
