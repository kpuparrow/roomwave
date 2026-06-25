import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tracks = await prisma.track.findMany({
    where: { uploadedById: user.id },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ tracks });
}
