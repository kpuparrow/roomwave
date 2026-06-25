import { NextResponse } from "next/server";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "local";
}

export function checkRateLimit(key: string, options: RateLimitOptions) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true, retryAfterMs: 0 };
  }

  if (bucket.count >= options.limit) {
    return { ok: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { ok: true, retryAfterMs: 0 };
}

export function rateLimitResponse(retryAfterMs: number) {
  const retryAfter = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return NextResponse.json(
    { error: "Слишком много запросов. Попробуйте еще раз чуть позже." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) }
    }
  );
}
