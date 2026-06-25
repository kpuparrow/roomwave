import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { canUseServer } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  serverId: z.string().min(1),
  targetUserId: z.string().optional(),
  messageId: z.string().optional(),
  reason: z.string().min(4).max(500)
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const serverId = searchParams.get("serverId");
  if (!serverId) return NextResponse.json({ error: "Сервер не найден." }, { status: 400 });
  if (!(await canUseServer(serverId, user.id, "moderateChat"))) return NextResponse.json({ error: "Нет доступа к жалобам." }, { status: 403 });

  const reports = await prisma.report.findMany({
    where: { serverId },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return NextResponse.json({ reports });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Опишите причину жалобы." }, { status: 400 });

  const member = await prisma.serverMember.findUnique({ where: { userId_serverId: { userId: user.id, serverId: parsed.data.serverId } } });
  if (!member) return NextResponse.json({ error: "Нет доступа к серверу." }, { status: 403 });

  const report = await prisma.report.create({
    data: {
      serverId: parsed.data.serverId,
      reporterId: user.id,
      targetUserId: parsed.data.targetUserId,
      messageId: parsed.data.messageId,
      reason: parsed.data.reason
    }
  });

  return NextResponse.json({ report }, { status: 201 });
}
