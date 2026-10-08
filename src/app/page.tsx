import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Receipt,
  Users,
  Divide,
  HandCoins,
  ShieldCheck,
  Download,
  PieChart,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Zero float rounding • Greedy debt simplification</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Split expenses,{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-600 to-teal-500">
              not friendships.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-zinc-600 dark:text-zinc-400">
            Tally tracks group spending for roommates, vacations, and dinners. See exact net
            balances and settle up with the minimum number of payments.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto shadow-lg shadow-emerald-600/20 text-base">
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Quick Demo Preview Card */}
          <div className="pt-12 max-w-4xl mx-auto">
            <Card className="border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md">
              <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-xs font-medium text-zinc-500">
                    Barcelona Trip 2026 • 4 members
                  </span>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">EUR (€)</Badge>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800">
                  <span className="text-xs text-zinc-500 font-semibold uppercase">Total Spending</span>
                  <div className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-1">€1,248.50</div>
                  <p className="text-xs text-zinc-400 mt-1">Across 18 group expenses</p>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold uppercase">Alice is owed</span>
                  <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">+€280.00</div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">From flight tickets & tapas</p>
                </div>

                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800">
                  <span className="text-xs text-zinc-500 font-semibold uppercase">Suggested Settle</span>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-2 flex items-center gap-1.5">
                    <span>Bob pays Alice</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono">€140.00</strong>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">Greedy minimum cash flow</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-16 bg-zinc-100/60 dark:bg-zinc-900/40 border-y border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              Engineered for accuracy and ease
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
              Everything you need to manage shared expenses fairly without mathematical drift.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                  <Divide className="w-5 h-5" />
                </div>
                <CardTitle>4 Flexible Split Types</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-500 dark:text-zinc-400 space-y-2">
                <p>
                  Equal split with deterministic odd-cent allocation, exact dollar amounts,
                  percentage shares, or custom weight ratios (like 2:1:1).
                </p>
                <div className="pt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Real-time live share preview</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                  <HandCoins className="w-5 h-5" />
                </div>
                <CardTitle>Debt Simplification</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-500 dark:text-zinc-400 space-y-2">
                <p>
                  Eliminate circular debts. Tally calculates the minimum number of payments
                  needed to resolve all debts across the entire group.
                </p>
                <div className="pt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>At most N-1 total transfers</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <CardTitle>Zero-Float Minor Units</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-500 dark:text-zinc-400 space-y-2">
                <p>
                  Stored strictly as integer cents. Never lose or gain a cent to JavaScript floating
                  point inaccuracies. Group sum invariant is always exactly zero.
                </p>
                <div className="pt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mathematically verified zero-sum</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Additional Features List */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Complete group transparency
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Every expense, edit, deletion, settlement, and membership change is logged in a chronological
              activity feed. Filter and search through expenses by category, date range, or member,
              and export everything to a formatted CSV at any time.
            </p>
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <Download className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>One-click CSV export with detailed share breakdowns</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <PieChart className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Monthly spending trends and category statistics</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Multi-currency support: EUR (€), USD ($), RSD, and GBP (£)</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-lg">
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
              Live Demo Accounts Available
            </h4>
            <p className="text-xs text-zinc-500">
              Run the seed command to instantly explore 2 pre-configured groups with realistic expenses:
            </p>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl font-mono text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
              <div>alice@example.com (password: password123)</div>
              <div>bob@example.com (password: password123)</div>
              <div>charlie@example.com (password: password123)</div>
              <div>diana@example.com (password: password123)</div>
            </div>
            <Link href="/login" className="block pt-2">
              <Button className="w-full">Sign In with Demo User</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-200 dark:border-zinc-800 py-8 px-4 text-center text-xs text-zinc-400">
        <p>© 2026 Tally. Built with Next.js, Prisma, Tailwind CSS, and strict TypeScript.</p>
      </footer>
    </div>
  );
}
