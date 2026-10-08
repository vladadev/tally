import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.ownerId !== session.id) {
      return NextResponse.json(
        { error: "Only the owner can regenerate invite links" },
        { status: 403 }
      );
    }

    // Generate unguessable 24-character token
    const newToken = crypto.randomBytes(16).toString("hex");

    const updated = await prisma.group.update({
      where: { id: groupId },
      data: { inviteToken: newToken },
    });

    return NextResponse.json({
      inviteToken: updated.inviteToken,
      message: "Invite link regenerated successfully",
    });
  } catch (error) {
    console.error("Regenerate invite error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate invite link" },
      { status: 500 }
    );
  }
}
