import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { updateGroupSchema } from "@/lib/validation/schemas";
import { calculateGroupBalances } from "@/lib/finance/balances";
import { simplifyDebts } from "@/lib/finance/debt-simplification";
import { logActivity } from "@/lib/activity";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;

    // Strict membership check
    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: {
          userId: session.id,
          groupId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied. You are not a member of this group." },
        { status: 403 }
      );
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
        expenses: {
          include: {
            paidBy: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } },
            shares: {
              include: {
                user: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { date: "desc" },
        },
        settlements: {
          include: {
            fromUser: { select: { id: true, name: true } },
            toUser: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { date: "desc" },
        },
        activityLogs: {
          include: {
            actor: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const memberIds = group.memberships.map((m) => m.userId);

    const balanceSummary = calculateGroupBalances(
      memberIds,
      group.expenses.map((e) => ({
        paidById: e.paidById,
        amountCents: e.amountCents,
        shares: e.shares,
      })),
      group.settlements
    );

    const suggestedPayments = simplifyDebts(balanceSummary.balanceMap);

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        currency: group.currency,
        inviteToken: group.inviteToken,
        ownerId: group.ownerId,
        createdAt: group.createdAt,
        currentRole: membership.role,
        members: group.memberships.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
          joinedAt: m.joinedAt,
          balanceCents: balanceSummary.balanceMap[m.user.id] ?? 0,
        })),
        expenses: group.expenses,
        settlements: group.settlements,
        activityLogs: group.activityLogs,
        balances: balanceSummary.members,
        suggestedPayments,
        totalSpentCents: balanceSummary.totalSpentCents,
      },
    });
  } catch (error) {
    console.error("Get group error:", error);
    return NextResponse.json({ error: "Failed to fetch group details" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;

    // Check ownership
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.ownerId !== session.id) {
      return NextResponse.json(
        { error: "Only the group owner can update group settings" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = updateGroupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await prisma.group.update({
      where: { id: groupId },
      data: {
        name: result.data.name,
        description: result.data.description || null,
      },
    });

    await logActivity(groupId, session.id, "GROUP_UPDATED", {
      name: updated.name,
    });

    return NextResponse.json({ group: updated });
  } catch (error) {
    console.error("Update group error:", error);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}

export async function DELETE(
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
        { error: "Only the group owner can delete this group" },
        { status: 403 }
      );
    }

    await prisma.group.delete({
      where: { id: groupId },
    });

    return NextResponse.json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Delete group error:", error);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}
