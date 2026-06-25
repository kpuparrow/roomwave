import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const room = await prisma.musicRoom.findUnique({
    where: { id: roomId },
    include: { server: true, playerState: true }
  });
  if (!room) return NextResponse.json({ error: "Комната не найдена." }, { status: 404 });

  const track = room.playerState?.currentTrackId
    ? await prisma.track.findUnique({ where: { id: room.playerState.currentTrackId } })
    : null;

  const title = escapeXml(track?.title ?? room.name);
  const subtitle = escapeXml(track?.artist ?? room.server.name);
  const mood = escapeXml(room.mood ?? room.server.mood ?? "RoomWave live");
  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#311018"/>
      <stop offset=".52" stop-color="#111218"/>
      <stop offset="1" stop-color="#14313b"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="210" cy="160" r="210" fill="#f63d68" opacity=".28"/>
  <circle cx="980" cy="110" r="190" fill="#32ade6" opacity=".2"/>
  <rect x="78" y="78" width="1044" height="474" rx="52" fill="rgba(255,255,255,.10)" stroke="rgba(255,255,255,.18)"/>
  <text x="132" y="170" font-family="Inter, Arial, sans-serif" font-size="30" fill="#f63d68" font-weight="700">${mood}</text>
  <text x="132" y="300" font-family="Inter, Arial, sans-serif" font-size="72" fill="#fff" font-weight="800">${title}</text>
  <text x="136" y="370" font-family="Inter, Arial, sans-serif" font-size="34" fill="rgba(255,255,255,.72)" font-weight="600">${subtitle}</text>
  <text x="136" y="492" font-family="Inter, Arial, sans-serif" font-size="26" fill="rgba(255,255,255,.55)">Слушаем вместе в RoomWave</text>
  <rect x="930" y="402" width="118" height="118" rx="34" fill="#f63d68"/>
  <path d="M965 466c0-33 20-55 45-55s45 22 45 55" stroke="#fff" stroke-width="16" stroke-linecap="round"/>
  <path d="M957 462h17v42h-17c-12 0-22-10-22-22s10-20 22-20Z" fill="#fff"/>
  <path d="M1045 462h17c12 0 22 9 22 20s-10 22-22 22h-17v-42Z" fill="#fff"/>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60"
    }
  });
}

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
