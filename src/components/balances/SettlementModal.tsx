"use client";

import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatMoney, parseToCents, centsToDecimalString } from "@/lib/finance/format";
import { ArrowRight, HandCoins } from "lucide-react";

interface Member {
  id: string;
  name: string;
}

interface SettlementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  currency: string;
  members: Member[];
  initialFromId?: string;
  initialToId?: string;
  initialAmountCents?: number;
  onSettlementSaved: () => void;
}

export function SettlementModal({
  open,
  onOpenChange,
  groupId,
  currency,
  members,
  initialFromId,
  initialToId,
  initialAmountCents,
  onSettlementSaved,
}: SettlementModalProps) {
  const { success, error } = useToast();

  const [fromUserId, setFromUserId] = useState(
    initialFromId || members[0]?.id || ""
  );
  const [toUserId, setToUserId] = useState(
    initialToId || (members[1] ? members[1].id : members[0]?.id || "")
  );
  const [amountStr, setAmountStr] = useState(
    initialAmountCents ? centsToDecimalString(initialAmountCents) : ""
  );
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (initialFromId) setFromUserId(initialFromId);
    if (initialToId) setToUserId(initialToId);
    if (initialAmountCents) setAmountStr(centsToDecimalString(initialAmountCents));
  }, [initialFromId, initialToId, initialAmountCents, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (fromUserId === toUserId) {
      setFormError("Sender and recipient cannot be the same member");
      return;
    }

    const amountCents = parseToCents(amountStr);
    if (amountCents <= 0) {
      setFormError("Amount must be greater than 0");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId,
          toUserId,
          amountCents,
          date,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || "Failed to record settlement");
        return;
      }

      success("Settlement recorded successfully!");
      onSettlementSaved();
      onOpenChange(false);
    } catch {
      error("Network error recording settlement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record a Settlement"
      description="Record a cash transfer or payment made between members"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Payer (From)
            </label>
            <select
              value={fromUserId}
              onChange={(e) => setFromUserId(e.target.value)}
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
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Recipient (To)
            </label>
            <select
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id} disabled={m.id === fromUserId}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={`Amount (${currency})`}
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            required
          />
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {formError && (
          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
            {formError}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            <HandCoins className="w-4 h-4 mr-1.5" />
            Record Payment
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
