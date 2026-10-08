"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/finance/format";
import {
  Users,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

interface GroupItem {
  id: string;
  name: string;
  description?: string | null;
  currency: string;
  role: string;
  memberCount: number;
  userNetBalanceCents: number;
  totalSpentCents: number;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login?from=/dashboard");
          return null;
        }
        return fetch("/api/groups");
      })
      .then((res) => (res && res.ok ? res.json() : null))
      .then((data) => {
        if (data?.groups) {
          setGroups(data.groups);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  // Aggregate totals across groups (for display, grouping by currency or primary)
  const totalOwed = groups
    .filter((g) => g.userNetBalanceCents > 0)
    .reduce((sum, g) => sum + g.userNetBalanceCents, 0);

  const totalOwe = groups
    .filter((g) => g.userNetBalanceCents < 0)
    .reduce((sum, g) => sum + Math.abs(g.userNetBalanceCents), 0);

  const netBalance = totalOwed - totalOwe;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8 animate-pulse">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-60" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
          <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
          <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
        </div>
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Dashboard
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Overview of your shared expenses and groups
          </p>
        </div>
        <Link href="/groups/new">
          <Button className="w-full sm:w-auto shadow-md">
            <PlusCircle className="w-4 h-4 mr-2" />
            Create Group
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total Owed To You */}
        <Card className="border-emerald-200/60 dark:border-emerald-900/40 bg-linear-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-zinc-900">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                You are owed
              </span>
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-300 pt-1">
              {formatMoney(totalOwed, "EUR")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Money other group members owe you
            </p>
          </CardContent>
        </Card>

        {/* Total You Owe */}
        <Card className="border-rose-200/60 dark:border-rose-900/40 bg-linear-to-br from-rose-50/50 to-white dark:from-rose-950/20 dark:to-zinc-900">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                You owe
              </span>
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-3xl font-extrabold text-rose-700 dark:text-rose-300 pt-1">
              {formatMoney(totalOwe, "EUR")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Total debt you have yet to settle
            </p>
          </CardContent>
        </Card>

        {/* Net Balance */}
        <Card className="border-zinc-200/80 dark:border-zinc-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Net Balance
              </span>
              <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <CardTitle
              className={`text-3xl font-extrabold pt-1 ${
                netBalance > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : netBalance < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-zinc-700 dark:text-zinc-300"
              }`}
            >
              {formatMoney(netBalance, "EUR")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {netBalance > 0
                ? "Overall, people owe you"
                : netBalance < 0
                ? "Overall, you owe money"
                : "You are all settled up!"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Your Groups List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Your Groups ({groups.length})
          </h2>
        </div>

        {groups.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              No groups yet
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1 mb-6">
              Create a group for your apartment, trip, or project to begin tracking shared expenses.
            </p>
            <Link href="/groups/new">
              <Button>
                <PlusCircle className="w-4 h-4 mr-2" />
                Create your first group
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {groups.map((group) => {
              const net = group.userNetBalanceCents;
              return (
                <Link key={group.id} href={`/groups/${group.id}`} className="group block">
                  <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-800 flex flex-col justify-between">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-lg">
                            {group.name}
                          </CardTitle>
                          {group.description && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                              {group.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="shrink-0 font-mono text-[11px]">
                          {group.currency}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-2">
                      <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          <span>
                            {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {group.role.toLowerCase()}
                        </Badge>
                      </div>

                      {/* User's Net Balance in Group */}
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          Your balance
                        </span>
                        {net > 0 && (
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            you are owed {formatMoney(net, group.currency)}
                          </span>
                        )}
                        {net < 0 && (
                          <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                            you owe {formatMoney(Math.abs(net), group.currency)}
                          </span>
                        )}
                        {net === 0 && (
                          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            settled up
                          </span>
                        )}
                      </div>
                    </CardContent>

                    <div className="px-6 py-3 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-b-2xl border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      <span>View expenses & balances</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
