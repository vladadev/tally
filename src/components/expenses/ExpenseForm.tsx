"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { EXPENSE_CATEGORIES } from "@/lib/validation/schemas";
import {
  formatMoney,
  parseToCents,
  centsToDecimalString,
} from "@/lib/finance/format";
import {
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  SplitType,
  CalculatedShare,
} from "@/lib/finance/splits";
import {
  Receipt,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface Member {
  id: string;
  name: string;
  email: string;
}

interface ExpenseFormProps {
  groupId: string;
  currency: string;
  members: Member[];
  initialData?: {
    id?: string;
    description: string;
    amountCents: number;
    date: string;
    category: string;
    note?: string | null;
    paidById: string;
    splitType: SplitType;
    shares: { userId: string; amountCents: number }[];
  };
  isEdit?: boolean;
}

export function ExpenseForm({
  groupId,
  currency,
  members,
  initialData,
  isEdit = false,
}: ExpenseFormProps) {
  const router = useRouter();
  const { success, error } = useToast();

  const [description, setDescription] = useState(initialData?.description || "");
  const [amountStr, setAmountStr] = useState(
    initialData ? centsToDecimalString(initialData.amountCents) : ""
  );
  const [date, setDate] = useState(
    initialData
      ? initialData.date.split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [category, setCategory] = useState(initialData?.category || "Food");
  const [paidById, setPaidById] = useState(
    initialData?.paidById || members[0]?.id || ""
  );
  const [note, setNote] = useState(initialData?.note || "");
  const [splitType, setSplitType] = useState<SplitType>(
    initialData?.splitType || "EQUAL"
  );

  // Equal split: selected member IDs (default: all members)
  const [selectedEqualMembers, setSelectedEqualMembers] = useState<string[]>(
    initialData?.splitType === "EQUAL" && initialData.shares.length > 0
      ? initialData.shares.map((s) => s.userId)
      : members.map((m) => m.id)
  );

  // Exact split: amount in decimal string per member
  const [exactInputs, setExactInputs] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const m of members) {
      const match = initialData?.shares.find((s) => s.userId === m.id);
      map[m.id] = match ? centsToDecimalString(match.amountCents) : "";
    }
    return map;
  });

  // Percentage split: percentage input per member
  const [percentageInputs, setPercentageInputs] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    const defaultPerc = (100 / members.length).toFixed(2);
    for (const m of members) {
      if (initialData?.splitType === "PERCENTAGE" && initialData.amountCents > 0) {
        const match = initialData.shares.find((s) => s.userId === m.id);
        const p = match ? ((match.amountCents / initialData.amountCents) * 100).toFixed(2) : "0";
        map[m.id] = p;
      } else {
        map[m.id] = defaultPerc;
      }
    }
    return map;
  });

  // Shares split: weight input per member (e.g. 1, 2)
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const m of members) {
      map[m.id] = "1";
    }
    return map;
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Parse total cents
  const totalCents = useMemo(() => parseToCents(amountStr), [amountStr]);

  // Compute live preview of shares
  const { calculatedShares, splitError } = useMemo(() => {
    if (totalCents <= 0) {
      return { calculatedShares: [], splitError: null };
    }

    try {
      if (splitType === "EQUAL") {
        if (selectedEqualMembers.length === 0) {
          return { calculatedShares: [], splitError: "Select at least one member" };
        }
        const shares = calculateEqualSplit(totalCents, selectedEqualMembers);
        return { calculatedShares: shares, splitError: null };
      }

      if (splitType === "EXACT") {
        const sharesList = members.map((m) => ({
          userId: m.id,
          amountCents: parseToCents(exactInputs[m.id] || "0"),
        }));
        const sum = sharesList.reduce((acc, s) => acc + s.amountCents, 0);
        const diff = totalCents - sum;
        let err = null;
        if (diff !== 0) {
          err =
            diff > 0
              ? `${formatMoney(diff, currency)} remaining to assign`
              : `${formatMoney(Math.abs(diff), currency)} over total amount`;
        }
        return { calculatedShares: sharesList, splitError: err };
      }

      if (splitType === "PERCENTAGE") {
        const percList = members.map((m) => ({
          userId: m.id,
          percentage: parseFloat(percentageInputs[m.id] || "0") || 0,
        }));
        const sumPerc = percList.reduce((acc, s) => acc + s.percentage, 0);
        if (Math.abs(sumPerc - 100) > 0.05) {
          return {
            calculatedShares: [],
            splitError: `Percentages must sum to 100% (currently ${sumPerc.toFixed(1)}%)`,
          };
        }
        const shares = calculatePercentageSplit(totalCents, percList);
        return { calculatedShares: shares, splitError: null };
      }

      if (splitType === "SHARES") {
        const shareList = members.map((m) => ({
          userId: m.id,
          weight: Math.max(0, parseInt(weightInputs[m.id] || "0", 10) || 0),
        }));
        const totalWeight = shareList.reduce((acc, s) => acc + s.weight, 0);
        if (totalWeight <= 0) {
          return { calculatedShares: [], splitError: "Total shares weight must be greater than 0" };
        }
        const shares = calculateSharesSplit(totalCents, shareList);
        return { calculatedShares: shares, splitError: null };
      }
    } catch (e: any) {
      return { calculatedShares: [], splitError: e.message || "Invalid split configuration" };
    }

    return { calculatedShares: [], splitError: null };
  }, [
    totalCents,
    splitType,
    selectedEqualMembers,
    exactInputs,
    percentageInputs,
    weightInputs,
    members,
    currency,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const errors: Record<string, string> = {};
    if (!description.trim()) errors.description = "Description is required";
    if (totalCents <= 0) errors.amount = "Amount must be greater than 0";
    if (totalCents > 100000000) errors.amount = "Amount exceeds 1,000,000 limit";
    if (!paidById) errors.paidById = "Payer must be selected";

    const selectedDate = new Date(date);
    const maxFuture = new Date();
    maxFuture.setDate(maxFuture.getDate() + 1);
    maxFuture.setHours(23, 59, 59, 999);
    if (selectedDate > maxFuture) {
      errors.date = "Date cannot be more than 1 day in the future";
    }

    if (splitError) {
      errors.split = splitError;
    }
    if (calculatedShares.length === 0) {
      errors.split = "Invalid split shares";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        description: description.trim(),
        amountCents: totalCents,
        date,
        category,
        note: note.trim() || undefined,
        paidById,
        splitType,
        shares: calculatedShares.map((s) => ({
          userId: s.userId,
          amountCents: s.amountCents,
        })),
      };

      const url = isEdit
        ? `/api/groups/${groupId}/expenses/${initialData?.id}`
        : `/api/groups/${groupId}/expenses`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || "Failed to save expense");
        return;
      }

      success(isEdit ? "Expense updated!" : "Expense added successfully!");
      router.push(`/groups/${groupId}`);
      router.refresh();
    } catch {
      error("Network error saving expense");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <CardTitle>{isEdit ? "Edit Expense" : "Expense Details"}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Description"
            placeholder="e.g. Grocery run at Lidl, Dinner, Taxi"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={formErrors.description}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={`Amount (${currency})`}
              type="number"
              step="0.01"
              min="0.01"
              max="1000000"
              placeholder="0.00"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              error={formErrors.amount}
              required
            />
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              error={formErrors.date}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="paid-by-select"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Paid By
              </label>
              <select
                id="paid-by-select"
                value={paidById}
                onChange={(e) => setPaidById(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="category-select"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Category
              </label>
              <select
                id="category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="expense-note"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Optional Note
            </label>
            <textarea
              id="expense-note"
              rows={2}
              placeholder="Additional details, itemized breakdown..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Split Types & Configuration */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle>Split Expense</CardTitle>
            {/* Split Type Selector */}
            <div className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-medium">
              {(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"] as SplitType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSplitType(t)}
                  className={`px-3 py-1.5 rounded-lg transition-all capitalize ${
                    splitType === t
                      ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                  }`}
                >
                  {t.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* EQUAL SPLIT */}
          {splitType === "EQUAL" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Select members who share this expense:</span>
                <button
                  type="button"
                  onClick={() => setSelectedEqualMembers(members.map((m) => m.id))}
                  className="text-emerald-600 hover:underline"
                >
                  Select all
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {members.map((m) => {
                  const isChecked = selectedEqualMembers.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800"
                          : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEqualMembers([...selectedEqualMembers, m.id]);
                          } else {
                            setSelectedEqualMembers(
                              selectedEqualMembers.filter((id) => id !== m.id)
                            );
                          }
                        }}
                        className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {m.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* EXACT AMOUNTS */}
          {splitType === "EXACT" && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">
                Enter the exact amount paid for each person. Sum must equal {formatMoney(totalCents, currency)}.
              </p>
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-4 p-2">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex-1 truncate">
                      {m.name}
                    </span>
                    <div className="w-40">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={exactInputs[m.id] || ""}
                        onChange={(e) =>
                          setExactInputs({ ...exactInputs, [m.id]: e.target.value })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PERCENTAGES */}
          {splitType === "PERCENTAGE" && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">
                Enter the percentage share for each person. Sum must equal 100%.
              </p>
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-4 p-2">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex-1 truncate">
                      {m.name}
                    </span>
                    <div className="w-32 relative">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={percentageInputs[m.id] || ""}
                        onChange={(e) =>
                          setPercentageInputs({
                            ...percentageInputs,
                            [m.id]: e.target.value,
                          })
                        }
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-zinc-400">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SHARES / RATIOS */}
          {splitType === "SHARES" && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">
                Enter proportion weights (e.g. 2 for someone paying double, 1 for single share).
              </p>
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-4 p-2">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex-1 truncate">
                      {m.name}
                    </span>
                    <div className="w-32">
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        placeholder="1"
                        value={weightInputs[m.id] || ""}
                        onChange={(e) =>
                          setWeightInputs({ ...weightInputs, [m.id]: e.target.value })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LIVE PREVIEW BOX */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Live Share Preview
              </span>
              {splitError ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>{splitError}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Balanced ({formatMoney(totalCents, currency)})</span>
                </div>
              )}
            </div>

            <div className="divide-y divide-zinc-200/60 dark:divide-zinc-800">
              {members.map((m) => {
                const share = calculatedShares.find((s) => s.userId === m.id);
                const amount = share ? share.amountCents : 0;
                return (
                  <div key={m.id} className="py-2 flex items-center justify-between text-sm">
                    <span className="text-zinc-700 dark:text-zinc-300">{m.name}</span>
                    <span
                      className={`font-mono font-medium ${
                        amount > 0
                          ? "text-zinc-900 dark:text-zinc-100"
                          : "text-zinc-400 dark:text-zinc-500"
                      }`}
                    >
                      {formatMoney(amount, currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {formErrors.split && (
            <p className="text-xs text-rose-600 dark:text-rose-400">{formErrors.split}</p>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/groups/${groupId}`)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting} disabled={!!splitError}>
              {isEdit ? "Update Expense" : "Save Expense"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
