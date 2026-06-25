import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import type { UserProfile } from "@/lib/types";

const cookieName = "roomwave_session";
const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret-change-me");

export async function createSession(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { sessionVersion: true } });
  const token = await new SignJWT({ userId, sessionVersion: user?.sessionVersion ?? 0 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret);

  const store = await cookies();
  store.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(cookieName);
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if (!token) return null;

  try {
    const verified = await jwtVerify<{ userId: string; sessionVersion?: number }>(token, secret);
    const user = await prisma.user.findUnique({
      where: { id: verified.payload.userId },
      select: { id: true, email: true, username: true, name: true, avatarUrl: true, status: true, sessionVersion: true }
    });
    if (!user || user.sessionVersion !== (verified.payload.sessionVersion ?? 0)) return null;
    const { sessionVersion: _, ...profile } = user;
    return profile;
  } catch {
    return null;
  }
}
