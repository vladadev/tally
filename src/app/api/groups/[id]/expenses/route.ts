import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createExpenseSchema } from "@/lib/validation/schemas";
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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category");
    const paidBy = searchParams.get("paidBy");
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { groupId };

    if (search.trim()) {
      where.description = { contains: search.trim() };
    }
    if (category) {
      where.category = category;
    }
    if (paidBy) {
      where.paidById = paidBy;
    }
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) {
        where.date.gte = new Date(fromDate);
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const [total, expenses] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
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
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      expenses,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("List expenses error:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
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

    // Verify sum of shares strictly equals amountCents
    const sumShares = shares.reduce((acc, s) => acc + s.amountCents, 0);
    if (sumShares !== amountCents) {
      return NextResponse.json(
        {
          error: `Sum of shares (${sumShares} cents) does not match total amount (${amountCents} cents)`,
        },
        { status: 400 }
      );
    }

    // Verify all share users and payer are members of this group
    const groupMembers = await prisma.membership.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const memberSet = new Set(groupMembers.map((m) => m.userId));

    if (!memberSet.has(paidById)) {
      return NextResponse.json(
        { error: "Payer is not a member of this group" },
        { status: 400 }
      );
    }

    for (const s of shares) {
      if (!memberSet.has(s.userId)) {
        return NextResponse.json(
          { error: `Participant ${s.userId} is not a member of this group` },
          { status: 400 }
        );
      }
    }

    // Create Expense and ExpenseShare inside a transaction
    const expense = await prisma.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          groupId,
          description,
          amountCents,
          date: new Date(date),
          category,
          note: note || null,
          paidById,
          createdById: session.id,
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

      return exp;
    });

    await logActivity(groupId, session.id, "EXPENSE_CREATED", {
      expenseId: expense.id,
      description: expense.description,
      amountCents: expense.amountCents,
      category: expense.category,
      paidByName: expense.paidBy.name,
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error("Create expense error:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
