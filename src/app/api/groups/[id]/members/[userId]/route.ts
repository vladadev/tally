import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getUserGroupBalance } from "@/lib/auth/permissions";
import { formatMoney } from "@/lib/finance/format";
import { logActivity } from "@/lib/activity";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId, userId: targetUserId } = await params;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: true,
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const isSelf = session.id === targetUserId;
    const isOwner = group.ownerId === session.id;

    if (!isSelf && !isOwner) {
      return NextResponse.json(
        { error: "Only the group owner can remove other members" },
        { status: 403 }
      );
    }

    if (isSelf && isOwner && group.memberships.length > 1) {
      return NextResponse.json(
        {
          error:
            "As the group owner, you cannot leave while other members are present. You can delete the group in Settings.",
        },
        { status: 400 }
      );
    }

    // Verify target user's membership exists
    const targetMembership = group.memberships.find((m) => m.userId === targetUserId);
    if (!targetMembership) {
      return NextResponse.json({ error: "Member not found in this group" }, { status: 404 });
    }

    // CRITICAL BUSINESS RULE: User balance must be exactly 0 cents
    const netBalance = await getUserGroupBalance(groupId, targetUserId);
    if (netBalance !== 0) {
      const formatted = formatMoney(netBalance, group.currency);
      const actionStr = isSelf ? "leave this group" : "remove this member";
      return NextResponse.json(
        {
          error: `Cannot ${actionStr}: balance must be €0.00 / settled, but is currently ${formatted}. Please settle up all debts before proceeding.`,
        },
        { status: 400 }
      );
    }

    // Delete membership
    await prisma.membership.delete({
      where: {
        userId_groupId: {
          userId: targetUserId,
          groupId,
        },
      },
    });

    await logActivity(
      groupId,
      session.id,
      isSelf ? "MEMBER_LEFT" : "MEMBER_REMOVED",
      {
        targetUserId,
        actorName: session.name,
      }
    );

    return NextResponse.json({
      message: isSelf ? "Left group successfully" : "Member removed successfully",
    });
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
