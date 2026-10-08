import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { registerSchema } from "@/lib/validation/schemas";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password } = result.data;

    // Check duplicate email
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    const sessionUser = { id: user.id, email: user.email, name: user.name };
    const token = await createSessionToken(sessionUser);

    const response = NextResponse.json(
      { user: sessionUser, message: "Registered successfully" },
      { status: 201 }
    );
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 }
    );
  }
}
