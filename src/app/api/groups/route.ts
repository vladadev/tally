import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createGroupSchema } from "@/lib/validation/schemas";
import { calculateGroupBalances } from "@/lib/finance/balances";
import { logActivity } from "@/lib/activity";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all groups where user is a member
    const memberships = await prisma.membership.findMany({
      where: { userId: session.id },
      include: {
        group: {
          include: {
            memberships: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
            expenses: {
              include: {
                shares: { select: { userId: true, amountCents: true } },
              },
            },
            settlements: {
              select: { fromUserId: true, toUserId: true, amountCents: true },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const groupsWithBalances = memberships.map((m) => {
      const g = m.group;
      const memberIds = g.memberships.map((mem) => mem.userId);

      const { balanceMap, totalSpentCents } = calculateGroupBalances(
        memberIds,
        g.expenses.map((e) => ({
          paidById: e.paidById,
          amountCents: e.amountCents,
          shares: e.shares,
        })),
        g.settlements
      );

      return {
        id: g.id,
        name: g.name,
        description: g.description,
        currency: g.currency,
        role: m.role,
        memberCount: g.memberships.length,
        userNetBalanceCents: balanceMap[session.id] ?? 0,
        totalSpentCents,
        createdAt: g.createdAt,
      };
    });

    return NextResponse.json({ groups: groupsWithBalances });
  } catch (error) {
    console.error("List groups error:", error);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = createGroupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, description, currency } = result.data;

    const group = await prisma.group.create({
      data: {
        name,
        description: description || null,
        currency,
        ownerId: session.id,
        memberships: {
          create: {
            userId: session.id,
            role: "OWNER",
          },
        },
      },
    });

    await logActivity(group.id, session.id, "GROUP_CREATED", {
      groupName: group.name,
      currency: group.currency,
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error("Create group error:", error);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
