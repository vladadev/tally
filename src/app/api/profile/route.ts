import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { updateProfileSchema } from "@/lib/validation/schemas";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = updateProfileSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: { name: result.data.name },
    });

    const updatedSession = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
    };

    const token = await createSessionToken(updatedSession);
    const response = NextResponse.json({ user: updatedSession, message: "Profile updated" });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
