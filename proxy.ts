import { NextResponse, type NextRequest } from "next/server";

export function proxy(_: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(self), autoplay=(self)");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|uploads|favicon.ico).*)"]
};
