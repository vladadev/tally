"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface GroupData {
  id: string;
  name: string;
  currency: string;
  members: { id: string; name: string; email: string }[];
}

export default function NewExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: groupId } = use(params);
  const router = useRouter();
  const { error } = useToast();

  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/groups/${groupId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load group");
        return res.json();
      })
      .then((data) => {
        if (data?.group) setGroup(data.group);
      })
      .catch(() => {
        error("Failed to load group for expense creation");
        router.push("/dashboard");
      })
      .finally(() => setLoading(false));
  }, [groupId, router]);

  if (loading || !group) {
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
          Add an Expense
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Record a shared cost in {group.name}
        </p>
      </div>

      <ExpenseForm
        groupId={group.id}
        currency={group.currency}
        members={group.members}
      />
    </div>
  );
}
