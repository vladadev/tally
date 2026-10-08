import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createSettlementSchema } from "@/lib/validation/schemas";
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

    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: {
          userId: session.id,
          groupId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const settlements = await prisma.settlement.findMany({
      where: { groupId },
      include: {
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ settlements });
  } catch (error) {
    console.error("List settlements error:", error);
    return NextResponse.json({ error: "Failed to fetch settlements" }, { status: 500 });
  }
}

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

    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: {
          userId: session.id,
          groupId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const result = createSettlementSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { fromUserId, toUserId, amountCents, date } = result.data;

    // Verify both users are members of this group
    const members = await prisma.membership.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const memberSet = new Set(members.map((m) => m.userId));

    if (!memberSet.has(fromUserId) || !memberSet.has(toUserId)) {
      return NextResponse.json(
        { error: "Both sender and recipient must be members of this group" },
        { status: 400 }
      );
    }

    const settlement = await prisma.settlement.create({
      data: {
        groupId,
        fromUserId,
        toUserId,
        amountCents,
        date: new Date(date),
        createdById: session.id,
      },
      include: {
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
    });

    await logActivity(groupId, session.id, "SETTLEMENT_CREATED", {
      settlementId: settlement.id,
      fromName: settlement.fromUser.name,
      toName: settlement.toUser.name,
      amountCents: settlement.amountCents,
    });

    return NextResponse.json({ settlement }, { status: 201 });
  } catch (error) {
    console.error("Create settlement error:", error);
    return NextResponse.json({ error: "Failed to record settlement" }, { status: 500 });
  }
}
