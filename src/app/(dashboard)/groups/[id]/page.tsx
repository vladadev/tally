"use client";

import React, { useEffect, useState, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { SettlementModal } from "@/components/balances/SettlementModal";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/finance/format";
import { EXPENSE_CATEGORIES } from "@/lib/validation/schemas";
import {
  PlusCircle,
  Settings,
  Download,
  Share2,
  Search,
  Filter,
  ArrowRight,
  HandCoins,
  CheckCircle2,
  Trash2,
  Edit,
  Clock,
  PieChart,
  User,
  Copy,
  Receipt,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Crown,
} from "lucide-react";

interface MemberItem {
  id: string;
  name: string;
  email: string;
  role: string;
  balanceCents: number;
}

interface ExpenseShareItem {
  id: string;
  userId: string;
  amountCents: number;
  user: { id: string; name: string };
}

interface ExpenseItem {
  id: string;
  description: string;
  amountCents: number;
  date: string;
  category: string;
  note?: string | null;
  paidById: string;
  createdById: string;
  splitType: string;
  paidBy: { id: string; name: string };
  createdBy: { id: string; name: string };
  shares: ExpenseShareItem[];
}

interface SettlementItem {
  id: string;
  amountCents: number;
  date: string;
  fromUser: { id: string; name: string };
  toUser: { id: string; name: string };
  createdBy: { id: string; name: string };
}

interface ActivityItem {
  id: string;
  type: string;
  payload: string;
  createdAt: string;
  actor: { id: string; name: string };
}

interface SuggestedPayment {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
}

interface GroupDetail {
  id: string;
  name: string;
  description?: string | null;
  currency: string;
  inviteToken: string;
  ownerId: string;
  currentRole: string;
  members: MemberItem[];
  expenses: ExpenseItem[];
  settlements: SettlementItem[];
  activityLogs: ActivityItem[];
  suggestedPayments: SuggestedPayment[];
  totalSpentCents: number;
}

export default function GroupDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: groupId } = use(params);
  const router = useRouter();
  const { success, error } = useToast();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Tabs: 'expenses' | 'balances' | 'activity' | 'stats'
  const [activeTab, setActiveTab] = useState<"expenses" | "balances" | "activity" | "stats">("expenses");

  // Expenses Tab State: Filters & Pagination
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPaidBy, setFilterPaidBy] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Invite Modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Settlement Modal
  const [settlementModalOpen, setSettlementModalOpen] = useState(false);
  const [settlementPreFill, setSettlementPreFill] = useState<{
    fromId?: string;
    toId?: string;
    amountCents?: number;
  }>({});

  // Delete Expense Confirmation
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseItem | null>(null);
  const [deletingExpense, setDeletingExpense] = useState(false);

  const fetchGroupData = async () => {
    try {
      const [uRes, gRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/groups/${groupId}`),
      ]);

      if (!uRes.ok) {
        router.push(`/login?from=/groups/${groupId}`);
        return;
      }
      const uData = await uRes.json();
      setCurrentUser(uData.user);

      if (!gRes.ok) {
        error("Access denied or group not found");
        router.push("/dashboard");
        return;
      }
      const gData = await gRes.json();
      setGroup(gData.group);
    } catch {
      error("Failed to load group details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupData();
  }, [groupId]);

  // Client-side filtered expenses for instant reactivity
  const filteredExpenses = useMemo(() => {
    if (!group) return [];
    return group.expenses.filter((exp) => {
      if (search.trim()) {
        const query = search.toLowerCase();
        if (!exp.description.toLowerCase().includes(query)) return false;
      }
      if (filterCategory && exp.category !== filterCategory) return false;
      if (filterPaidBy && exp.paidById !== filterPaidBy) return false;
      if (filterFromDate && new Date(exp.date) < new Date(filterFromDate)) return false;
      if (filterToDate) {
        const toD = new Date(filterToDate);
        toD.setHours(23, 59, 59, 999);
        if (new Date(exp.date) > toD) return false;
      }
      return true;
    });
  }, [group, search, filterCategory, filterPaidBy, filterFromDate, filterToDate]);

  const totalPages = Math.ceil(filteredExpenses.length / pageSize) || 1;
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredExpenses.slice(start, start + pageSize);
  }, [filteredExpenses, currentPage]);

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setDeletingExpense(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/expenses/${expenseToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        error(data.error || "Failed to delete expense");
        return;
      }
      success("Expense deleted");
      setExpenseToDelete(null);
      fetchGroupData();
    } catch {
      error("Network error deleting expense");
    } finally {
      setDeletingExpense(false);
    }
  };

  const handleOpenSettleUp = (fromUserId: string, toUserId: string, amountCents: number) => {
    setSettlementPreFill({ fromId: fromUserId, toId: toUserId, amountCents });
    setSettlementModalOpen(true);
  };

  // Stats derivations
  const stats = useMemo(() => {
    if (!group) return null;
    const categoryTotals: Record<string, number> = {};
    const monthlyTotals: Record<string, number> = {};
    const payerTotals: Record<string, number> = {};

    for (const exp of group.expenses) {
      // Category
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amountCents;

      // Month: YYYY-MM
      const d = new Date(exp.date);
      const monthKey = `${d.toLocaleString("default", { month: "short" })} ${d.getFullYear()}`;
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + exp.amountCents;

      // Payer
      payerTotals[exp.paidById] = (payerTotals[exp.paidById] || 0) + exp.amountCents;
    }

    let topPayerId = "";
    let maxPaid = 0;
    for (const [uid, cents] of Object.entries(payerTotals)) {
      if (cents > maxPaid) {
        maxPaid = cents;
        topPayerId = uid;
      }
    }
    const topPayerMember = group.members.find((m) => m.id === topPayerId);

    return {
      categoryTotals,
      monthlyTotals,
      topPayer: topPayerMember ? { name: topPayerMember.name, amount: maxPaid } : null,
    };
  }, [group]);

  if (loading || !group) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-6 animate-pulse">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-64" />
        <div className="h-28 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
        <div className="h-80 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  const currentUserBalance =
    group.members.find((m) => m.id === currentUser?.id)?.balanceCents ?? 0;
  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/invite/${group.inviteToken}`
      : "";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-3xl bg-linear-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-xl shadow-emerald-900/10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight">{group.name}</h1>
            <Badge className="bg-white/20 hover:bg-white/30 text-white border-none font-mono">
              {group.currency}
            </Badge>
          </div>
          {group.description && (
            <p className="text-emerald-100 text-sm max-w-xl">{group.description}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-emerald-200 pt-1">
            <span>{group.members.length} members</span>
            <span>•</span>
            <span>{group.expenses.length} expenses</span>
            <span>•</span>
            <span>Total spent: {formatMoney(group.totalSpentCents, group.currency)}</span>
          </div>
        </div>

        {/* Action Buttons & Current Balance */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center sm:text-right">
            <div className="text-[11px] uppercase tracking-wider text-emerald-200">
              Your Net Balance
            </div>
            <div className="text-lg font-bold">
              {currentUserBalance > 0 && `+${formatMoney(currentUserBalance, group.currency)}`}
              {currentUserBalance < 0 && `-${formatMoney(Math.abs(currentUserBalance), group.currency)}`}
              {currentUserBalance === 0 && "Settled up"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setInviteModalOpen(true)}
              className="bg-white text-zinc-900 hover:bg-emerald-50 border-none shadow-sm"
            >
              <Share2 className="w-4 h-4 mr-1.5" />
              Invite
            </Button>
            <Link href={`/groups/${groupId}/settings`}>
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                title="Group Settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-1 sm:gap-2">
          {(["expenses", "balances", "activity", "stats"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                activeTab === tab
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Action button inside tab bar */}
        <div className="flex items-center gap-2">
          <Link href={`/groups/${groupId}/expenses/new`}>
            <Button size="sm">
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Add Expense
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSettlementPreFill({});
              setSettlementModalOpen(true);
            }}
          >
            <HandCoins className="w-4 h-4 mr-1.5" />
            Settle Up
          </Button>
        </div>
      </div>

      {/* ===================== TAB 1: EXPENSES ===================== */}
      {activeTab === "expenses" && (
        <div className="space-y-6">
          {/* Filters & Search Header */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search by description..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={filterCategory}
                    onChange={(e) => {
                      setFilterCategory(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-9 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">All Categories</option>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterPaidBy}
                    onChange={(e) => {
                      setFilterPaidBy(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-9 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">All Payers</option>
                    {group.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        Paid by {m.name}
                      </option>
                    ))}
                  </select>

                  <a
                    href={`/api/groups/${groupId}/export`}
                    download
                    className="inline-flex items-center"
                  >
                    <Button variant="outline" size="sm">
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Export CSV
                    </Button>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses List */}
          {paginatedExpenses.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                No expenses found
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto mt-1 mb-4">
                {search || filterCategory || filterPaidBy
                  ? "Try adjusting your search or filters."
                  : "Start adding shared expenses for your group."}
              </p>
              <Link href={`/groups/${groupId}/expenses/new`}>
                <Button size="sm">
                  <PlusCircle className="w-4 h-4 mr-1.5" />
                  Add First Expense
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {paginatedExpenses.map((expense) => {
                const userShare = expense.shares.find((s) => s.userId === currentUser?.id);
                const isPayer = expense.paidById === currentUser?.id;
                const canEditOrDelete =
                  expense.createdById === currentUser?.id || group.currentRole === "OWNER";

                return (
                  <Card
                    key={expense.id}
                    className="transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
                  >
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Description, Category, Date, Paid by */}
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-bold text-sm">
                          {expense.category.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                              {expense.description}
                            </h4>
                            <Badge variant="outline" className="text-[10px]">
                              {expense.category}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] capitalize">
                              {expense.splitType.toLowerCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Paid by <strong className="font-medium text-zinc-700 dark:text-zinc-300">{expense.paidBy.name}</strong> on{" "}
                            {new Date(expense.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                          {expense.note && (
                            <p className="text-xs text-zinc-400 italic mt-1 line-clamp-1">
                              &ldquo;{expense.note}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Amounts & Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-5 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                        <div className="text-left sm:text-right">
                          <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                            {formatMoney(expense.amountCents, group.currency)}
                          </div>
                          <div className="text-xs">
                            {isPayer ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                you lent {formatMoney(expense.amountCents - (userShare?.amountCents || 0), group.currency)}
                              </span>
                            ) : userShare ? (
                              <span className="text-rose-600 dark:text-rose-400 font-medium">
                                you owe {formatMoney(userShare.amountCents, group.currency)}
                              </span>
                            ) : (
                              <span className="text-zinc-400">not involved</span>
                            )}
                          </div>
                        </div>

                        {canEditOrDelete && (
                          <div className="flex items-center gap-1">
                            <Link href={`/groups/${groupId}/expenses/${expense.id}/edit`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                                title="Edit Expense"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setExpenseToDelete(expense)}
                              className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-zinc-500">
                    Showing page {currentPage} of {totalPages} ({filteredExpenses.length} total)
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 2: BALANCES ===================== */}
      {activeTab === "balances" && (
        <div className="space-y-8">
          {/* Suggested Payments (Greedy Debt Simplification) */}
          <Card className="border-emerald-200/80 dark:border-emerald-900/60 bg-linear-to-br from-emerald-50/40 to-white dark:from-emerald-950/20 dark:to-zinc-900">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <HandCoins className="w-5 h-5 text-emerald-600" />
                    Suggested Payments
                  </CardTitle>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Minimum transactions to settle all group debts using greedy debt simplification
                  </p>
                </div>
                <Badge variant="default" className="text-xs">
                  {group.suggestedPayments.length === 0
                    ? "All Settled Up"
                    : `${group.suggestedPayments.length} payment${
                        group.suggestedPayments.length === 1 ? "" : "s"
                      } needed`}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-2">
              {group.suggestedPayments.length === 0 ? (
                <div className="py-6 text-center text-sm text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Everyone in this group is fully settled up!</span>
                </div>
              ) : (
                <div className="divide-y divide-emerald-100 dark:divide-emerald-900/40">
                  {group.suggestedPayments.map((p, idx) => {
                    const fromName =
                      group.members.find((m) => m.id === p.fromUserId)?.name || "Member";
                    const toName =
                      group.members.find((m) => m.id === p.toUserId)?.name || "Member";
                    const isUserPayer = p.fromUserId === currentUser?.id;
                    const isUserRecipient = p.toUserId === currentUser?.id;

                    return (
                      <div
                        key={idx}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span className={isUserPayer ? "text-rose-600 font-bold" : ""}>
                            {fromName} {isUserPayer && "(you)"}
                          </span>
                          <span className="text-zinc-400">pays</span>
                          <span className={isUserRecipient ? "text-emerald-600 font-bold" : ""}>
                            {toName} {isUserRecipient && "(you)"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
                            {formatMoney(p.amountCents, group.currency)}
                          </span>
                          <Button
                            size="sm"
                            variant="subtle"
                            onClick={() =>
                              handleOpenSettleUp(p.fromUserId, p.toUserId, p.amountCents)
                            }
                          >
                            Settle Up
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Group Member Balances Breakdown */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Member Net Balances
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {group.members.map((member) => {
                const bal = member.balanceCents;
                return (
                  <Card key={member.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center justify-center font-bold text-sm">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold flex items-center gap-1">
                            <span>{member.name}</span>
                            {member.role === "OWNER" && (
                              <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 truncate max-w-[130px]">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          bal > 0 ? "success" : bal < 0 ? "destructive" : "secondary"
                        }
                        className="text-xs"
                      >
                        {bal > 0 && `+${formatMoney(bal, group.currency)}`}
                        {bal < 0 && `-${formatMoney(Math.abs(bal), group.currency)}`}
                        {bal === 0 && "€0.00"}
                      </Badge>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-500">
                      {bal > 0 && "Gets back from group"}
                      {bal < 0 && "Owes the group"}
                      {bal === 0 && "Settled up"}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Settlements History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Settlement History</CardTitle>
            </CardHeader>
            <CardContent>
              {group.settlements.length === 0 ? (
                <p className="text-xs text-zinc-400 py-4 text-center">
                  No settlements recorded yet.
                </p>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {group.settlements.map((set) => (
                    <div
                      key={set.id}
                      className="py-3 flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <HandCoins className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {set.fromUser.name}
                          </span>{" "}
                          paid{" "}
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {set.toUser.name}
                          </span>
                          <span className="text-xs text-zinc-400 block sm:inline sm:ml-2">
                            on {new Date(set.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {formatMoney(set.amountCents, group.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===================== TAB 3: ACTIVITY ===================== */}
      {activeTab === "activity" && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Feed</CardTitle>
          </CardHeader>
          <CardContent>
            {group.activityLogs.length === 0 ? (
              <p className="text-xs text-zinc-400 py-8 text-center">No activity logged yet.</p>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
                {group.activityLogs.map((log) => {
                  let parsedPayload: any = {};
                  try {
                    parsedPayload = JSON.parse(log.payload);
                  } catch {}

                  const renderLogMessage = () => {
                    switch (log.type) {
                      case "GROUP_CREATED":
                        return `created group "${parsedPayload.groupName}"`;
                      case "GROUP_UPDATED":
                        return `updated group settings`;
                      case "MEMBER_JOINED":
                        return `${parsedPayload.userName || "A member"} joined the group`;
                      case "MEMBER_LEFT":
                        return `left the group`;
                      case "MEMBER_REMOVED":
                        return `removed a member from the group`;
                      case "EXPENSE_CREATED":
                        return `added expense "${parsedPayload.description}" for ${formatMoney(
                          parsedPayload.amountCents || 0,
                          group.currency
                        )}`;
                      case "EXPENSE_UPDATED":
                        return `updated expense "${parsedPayload.description}"`;
                      case "EXPENSE_DELETED":
                        return `deleted an expense`;
                      case "SETTLEMENT_CREATED":
                        return `recorded a settlement of ${formatMoney(
                          parsedPayload.amountCents || 0,
                          group.currency
                        )} from ${parsedPayload.fromName} to ${parsedPayload.toName}`;
                      default:
                        return log.type.toLowerCase().replace(/_/g, " ");
                    }
                  };

                  return (
                    <div key={log.id} className="relative group">
                      <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-zinc-950" />
                      <div className="text-sm">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {log.actor.name}
                        </span>{" "}
                        <span className="text-zinc-600 dark:text-zinc-300">
                          {renderLogMessage()}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===================== TAB 4: STATS ===================== */}
      {activeTab === "stats" && stats && (
        <div className="space-y-6">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Card className="p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Total Group Spending
              </span>
              <div className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-2">
                {formatMoney(group.totalSpentCents, group.currency)}
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Across {group.expenses.length} shared expenses
              </p>
            </Card>

            <Card className="p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Top Payer
              </span>
              <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 truncate">
                {stats.topPayer ? stats.topPayer.name : "N/A"}
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Paid{" "}
                {stats.topPayer
                  ? formatMoney(stats.topPayer.amount, group.currency)
                  : "€0.00"}
              </p>
            </Card>

            <Card className="p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Average Expense
              </span>
              <div className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-2">
                {group.expenses.length > 0
                  ? formatMoney(
                      Math.round(group.totalSpentCents / group.expenses.length),
                      group.currency
                    )
                  : "€0.00"}
              </div>
              <p className="text-xs text-zinc-400 mt-1">Per transaction average</p>
            </Card>
          </div>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-600" />
                Spending by Category
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.keys(stats.categoryTotals).length === 0 ? (
                <p className="text-xs text-zinc-400 py-4 text-center">No expenses recorded yet.</p>
              ) : (
                Object.entries(stats.categoryTotals).map(([cat, cents]) => {
                  const perc =
                    group.totalSpentCents > 0
                      ? Math.round((cents / group.totalSpentCents) * 100)
                      : 0;
                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-zinc-800 dark:text-zinc-200">{cat}</span>
                        <span className="text-zinc-500 font-mono">
                          {formatMoney(cents, group.currency)} ({perc}%)
                        </span>
                      </div>
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 dark:bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${perc}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Monthly Spending */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Spending by Month</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(stats.monthlyTotals).length === 0 ? (
                <p className="text-xs text-zinc-400 py-4 text-center">No expenses recorded yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(stats.monthlyTotals).map(([month, cents]) => (
                    <div
                      key={month}
                      className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40"
                    >
                      <div className="text-xs font-semibold text-zinc-500">{month}</div>
                      <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
                        {formatMoney(cents, group.currency)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Share / Invite Modal */}
      <Dialog
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        title="Invite Members"
        description="Share this link with anyone you want to join this group"
      >
        <div className="space-y-4 pt-2">
          <input
            type="text"
            readOnly
            value={inviteUrl}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono text-zinc-700 dark:text-zinc-300"
          />
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                navigator.clipboard.writeText(inviteUrl);
                success("Invite link copied to clipboard!");
                setInviteModalOpen(false);
              }}
            >
              <Copy className="w-4 h-4 mr-1.5" />
              Copy Link
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Record Settlement Modal */}
      <SettlementModal
        open={settlementModalOpen}
        onOpenChange={setSettlementModalOpen}
        groupId={group.id}
        currency={group.currency}
        members={group.members}
        initialFromId={settlementPreFill.fromId}
        initialToId={settlementPreFill.toId}
        initialAmountCents={settlementPreFill.amountCents}
        onSettlementSaved={fetchGroupData}
      />

      {/* Delete Expense Dialog */}
      <Dialog
        open={!!expenseToDelete}
        onOpenChange={(open) => !open && setExpenseToDelete(null)}
        title="Delete Expense"
        description="Are you sure you want to delete this expense?"
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Deleting &ldquo;{expenseToDelete?.description}&rdquo; (
            {expenseToDelete && formatMoney(expenseToDelete.amountCents, group.currency)}) will
            automatically recalculate all group balances.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setExpenseToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              isLoading={deletingExpense}
              onClick={handleDeleteExpense}
            >
              Delete Expense
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
