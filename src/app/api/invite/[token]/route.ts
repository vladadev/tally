import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/activity";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const group = await prisma.group.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        name: true,
        description: true,
        currency: true,
        owner: { select: { name: true } },
        _count: { select: { memberships: true } },
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Invalid or expired invite link" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        currency: group.currency,
        ownerName: group.owner.name,
        memberCount: group._count.memberships,
      },
    });
  } catch (error) {
    console.error("Invite lookup error:", error);
    return NextResponse.json(
      { error: "Failed to process invite" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json(
        { error: "Please log in to join this group" },
        { status: 401 }
      );
    }

    const { token } = await params;

    const group = await prisma.group.findUnique({
      where: { inviteToken: token },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Invalid or expired invite link" },
        { status: 404 }
      );
    }

    // Check if already a member
    const existing = await prisma.membership.findUnique({
      where: {
        userId_groupId: {
          userId: session.id,
          groupId: group.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json({
        groupId: group.id,
        message: "You are already a member of this group",
      });
    }

    // Add membership
    await prisma.membership.create({
      data: {
        userId: session.id,
        groupId: group.id,
        role: "MEMBER",
      },
    });

    await logActivity(group.id, session.id, "MEMBER_JOINED", {
      userName: session.name,
    });

    return NextResponse.json({
      groupId: group.id,
      message: "Successfully joined the group!",
    });
  } catch (error) {
    console.error("Join group error:", error);
    return NextResponse.json(
      { error: "Failed to join group" },
      { status: 500 }
    );
  }
}
