import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { loginSchema } from "@/lib/validation/schemas";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { checkRateLimit, resetRateLimit } from "@/lib/auth/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    // Rate limiting by email and client IP
    const clientIp = req.headers.get("x-forwarded-for") || "local";
    const rateLimitKey = `${clientIp}:${email}`;
    const rateCheck = checkRateLimit(rateLimitKey, 5, 60 * 1000);

    if (!rateCheck.allowed) {
      const waitSeconds = Math.ceil(rateCheck.resetInMs / 1000);
      return NextResponse.json(
        {
          error: `Too many login attempts. Please try again in ${waitSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const passwordMatch = await verifyPassword(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Login successful, reset rate limit
    resetRateLimit(rateLimitKey);

    const sessionUser = { id: user.id, email: user.email, name: user.name };
    const token = await createSessionToken(sessionUser);

    const response = NextResponse.json(
      { user: sessionUser, message: "Logged in successfully" },
      { status: 200 }
    );
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 }
    );
  }
}
