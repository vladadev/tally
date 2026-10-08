import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { centsToDecimalString } from "@/lib/finance/format";

function escapeCsvField(field: string | number | null | undefined): string {
  if (field === null || field === undefined) return '""';
  const str = String(field);
  return `"${str.replace(/"/g, '""')}"`;
}

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

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        expenses: {
          include: {
            paidBy: { select: { name: true } },
            shares: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
          orderBy: { date: "desc" },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const headers = [
      "Date",
      "Description",
      "Category",
      "Paid By",
      "Amount",
      "Currency",
      "Split Type",
      "Shares Breakdown",
      "Note",
    ];

    const rows = group.expenses.map((exp) => {
      const dateStr = exp.date.toISOString().split("T")[0];
      const sharesSummary = exp.shares
        .map((s) => `${s.user.name}: ${centsToDecimalString(s.amountCents)}`)
        .join("; ");

      return [
        escapeCsvField(dateStr),
        escapeCsvField(exp.description),
        escapeCsvField(exp.category),
        escapeCsvField(exp.paidBy.name),
        escapeCsvField(centsToDecimalString(exp.amountCents)),
        escapeCsvField(group.currency),
        escapeCsvField(exp.splitType),
        escapeCsvField(sharesSummary),
        escapeCsvField(exp.note || ""),
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\r\n");
    const sanitizedName = group.name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tally-${sanitizedName}-expenses.csv"`,
      },
    });
  } catch (error) {
    console.error("Export CSV error:", error);
    return NextResponse.json({ error: "Failed to export CSV" }, { status: 500 });
  }
}
