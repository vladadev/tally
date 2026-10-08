import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createExpenseSchema } from "@/lib/validation/schemas";
import { logActivity } from "@/lib/activity";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId, expenseId } = await params;

    // Check membership
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

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        paidBy: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        shares: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!expense || expense.groupId !== groupId) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({ expense });
  } catch (error) {
    console.error("Get expense error:", error);
    return NextResponse.json({ error: "Failed to fetch expense" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId, expenseId } = await params;

    const [group, existingExpense] = await Promise.all([
      prisma.group.findUnique({ where: { id: groupId } }),
      prisma.expense.findUnique({
        where: { id: expenseId },
        include: { shares: true },
      }),
    ]);

    if (!group || !existingExpense || existingExpense.groupId !== groupId) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Permission: Only creator or group owner can edit
    const isCreator = existingExpense.createdById === session.id;
    const isOwner = group.ownerId === session.id;

    if (!isCreator && !isOwner) {
      return NextResponse.json(
        { error: "Only the creator or group owner can edit this expense" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = createExpenseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      description,
      amountCents,
      date,
      category,
      note,
      paidById,
      splitType,
      shares,
    } = result.data;

    // Verify sum of shares equals total amount
    const sumShares = shares.reduce((acc, s) => acc + s.amountCents, 0);
    if (sumShares !== amountCents) {
      return NextResponse.json(
        {
          error: `Sum of shares (${sumShares} cents) does not match total amount (${amountCents} cents)`,
        },
        { status: 400 }
      );
    }

    // Update expense and recreate shares atomically
    const updated = await prisma.$transaction(async (tx) => {
      await tx.expenseShare.deleteMany({
        where: { expenseId },
      });

      return tx.expense.update({
        where: { id: expenseId },
        data: {
          description,
          amountCents,
          date: new Date(date),
          category,
          note: note || null,
          paidById,
          splitType,
          shares: {
            create: shares.map((s) => ({
              userId: s.userId,
              amountCents: s.amountCents,
            })),
          },
        },
        include: {
          paidBy: { select: { id: true, name: true } },
          shares: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      });
    });

    await logActivity(groupId, session.id, "EXPENSE_UPDATED", {
      expenseId,
      description: updated.description,
      amountCents: updated.amountCents,
      category: updated.category,
    });

    return NextResponse.json({ expense: updated });
  } catch (error) {
    console.error("Update expense error:", error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId, expenseId } = await params;

    const [group, existingExpense] = await Promise.all([
      prisma.group.findUnique({ where: { id: groupId } }),
      prisma.expense.findUnique({ where: { id: expenseId } }),
    ]);

    if (!group || !existingExpense || existingExpense.groupId !== groupId) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Permission check: only creator or group owner can delete
    const isCreator = existingExpense.createdById === session.id;
    const isOwner = group.ownerId === session.id;

    if (!isCreator && !isOwner) {
      return NextResponse.json(
        { error: "Only the creator or group owner can delete this expense" },
        { status: 403 }
      );
    }

    // Delete expense (shares cascade delete via foreign key)
    await prisma.expense.delete({
      where: { id: expenseId },
    });

    await logActivity(groupId, session.id, "EXPENSE_DELETED", {
      expenseId,
      description: existingExpense.description,
      amountCents: existingExpense.amountCents,
    });

    return NextResponse.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Delete expense error:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
