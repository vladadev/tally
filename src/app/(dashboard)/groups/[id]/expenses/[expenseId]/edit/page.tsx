"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { SplitType } from "@/lib/finance/splits";

interface GroupData {
  id: string;
  name: string;
  currency: string;
  members: { id: string; name: string; email: string }[];
}

interface ExpenseData {
  id: string;
  description: string;
  amountCents: number;
  date: string;
  category: string;
  note?: string | null;
  paidById: string;
  splitType: SplitType;
  shares: { userId: string; amountCents: number }[];
}

export default function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string; expenseId: string }>;
}) {
  const { id: groupId, expenseId } = use(params);
  const router = useRouter();
  const { error } = useToast();

  const [group, setGroup] = useState<GroupData | null>(null);
  const [expense, setExpense] = useState<ExpenseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/groups/${groupId}`),
      fetch(`/api/groups/${groupId}/expenses/${expenseId}`),
    ])
      .then(async ([gRes, eRes]) => {
        if (!gRes.ok || !eRes.ok) throw new Error("Not found");
        const gData = await gRes.json();
        const eData = await eRes.json();
        setGroup(gData.group);
        setExpense(eData.expense);
      })
      .catch(() => {
        error("Failed to load expense or access denied");
        router.push(`/groups/${groupId}`);
      })
      .finally(() => setLoading(false));
  }, [groupId, expenseId, router]);

  if (loading || !group || !expense) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 w-full space-y-6 animate-pulse">
        <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-36" />
        <div className="h-96 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 w-full space-y-6">
      <Link
        href={`/groups/${groupId}`}
        className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Back to {group.name}
      </Link>

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Edit Expense
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Modify details for &ldquo;{expense.description}&rdquo;
        </p>
      </div>

      <ExpenseForm
        groupId={group.id}
        currency={group.currency}
        members={group.members}
        initialData={expense}
        isEdit={true}
      />
    </div>
  );
}
