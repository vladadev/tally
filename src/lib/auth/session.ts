import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

const COOKIE_NAME = "tally_session";
const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || "default_super_secret_session_key_32_characters_long"
);
const TOKEN_EXPIRY = "7d";

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    userId: user.id,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    if (!payload.userId || typeof payload.userId !== "string") {
      return null;
    }
    return {
      id: payload.userId as string,
      email: (payload.email as string) || "",
      name: (payload.name as string) || "",
    };
  } catch {
    return null;
  }
}

/**
 * Retrieves the current authenticated user session from request cookies.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionCookie) return null;
  return verifySessionToken(sessionCookie);
}

/**
 * Attaches the session cookie to an outgoing NextResponse.
 */
export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * Clears the session cookie on logout.
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
