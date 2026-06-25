import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { AppleMusicService } from "@/lib/apple-music";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = checkRateLimit(`apple-search:${user.id}:${getClientIp(request)}`, { limit: 30, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfterMs);

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const service = new AppleMusicService();
  const tracks = await service.searchTracks(query);
  return NextResponse.json({ tracks, mockMode: !process.env.APPLE_MUSIC_DEVELOPER_TOKEN });
}
