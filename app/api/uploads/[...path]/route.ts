import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getLocalUploadRoot } from "@/lib/storage";

export const runtime = "nodejs";

const contentTypes: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".mp4": "audio/mp4",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ttml": "application/ttml+xml",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8"
};

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const uploadRoot = getLocalUploadRoot();
  const target = path.resolve(uploadRoot, ...segments);

  if (!target.startsWith(uploadRoot)) {
    return NextResponse.json({ error: "Invalid upload path" }, { status: 400 });
  }

  try {
    const fileStat = await stat(target);
    if (!fileStat.isFile()) return NextResponse.json({ error: "File not found" }, { status: 404 });

    const contentType = contentTypes[path.extname(target).toLowerCase()] ?? "application/octet-stream";
    const range = request.headers.get("range");

    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) return new Response(null, { status: 416 });

      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Math.min(Number(match[2]), fileStat.size - 1) : fileStat.size - 1;
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileStat.size) {
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${fileStat.size}` }
        });
      }

      const stream = Readable.toWeb(createReadStream(target, { start, end })) as ReadableStream;
      return new Response(stream, {
        status: 206,
        headers: {
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${fileStat.size}`,
          "Content-Type": contentType
        }
      });
    }

    const stream = Readable.toWeb(createReadStream(target)) as ReadableStream;
    return new Response(stream, {
      headers: {
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(fileStat.size),
        "Content-Type": contentType
      }
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
