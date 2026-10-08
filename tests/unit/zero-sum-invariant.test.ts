import { describe, it, expect } from "vitest";
import { calculateGroupBalances, ExpenseData, SettlementData } from "@/lib/finance/balances";
import { calculateSplit } from "@/lib/finance/splits";

describe("Zero-Sum Balance Invariant", () => {
  it("asserts sum of all member balances strictly equals zero across 200 random simulations", () => {
    const memberPool = ["u1", "u2", "u3", "u4", "u5", "u6", "u7"];

    for (let sim = 0; sim < 200; sim++) {
      // Pick random subset of members (at least 2)
      const shuffled = [...memberPool].sort(() => Math.random() - 0.5);
      const groupSize = Math.floor(Math.random() * (memberPool.length - 2)) + 2;
      const members = shuffled.slice(0, groupSize);

      const numExpenses = Math.floor(Math.random() * 15) + 1;
      const expenses: ExpenseData[] = [];

      for (let i = 0; i < numExpenses; i++) {
        const payer = members[Math.floor(Math.random() * members.length)];
        const amountCents = Math.floor(Math.random() * 50000) + 1; // 1 cent to 500 dollars

        // Pick split type
        const splitTypeRoll = Math.floor(Math.random() * 4);
        let shares;

        if (splitTypeRoll === 0) {
          // EQUAL
          shares = calculateSplit(amountCents, {
            type: "EQUAL",
            memberIds: members,
          });
        } else if (splitTypeRoll === 1) {
          // SHARES (ratios)
          const shareWeights = members.map((m) => ({
            userId: m,
            weight: Math.floor(Math.random() * 5) + 1,
          }));
          shares = calculateSplit(amountCents, {
            type: "SHARES",
            shares: shareWeights,
          });
        } else if (splitTypeRoll === 2) {
          // PERCENTAGE
          // generate random raw weights then normalize to 100%
          const rawWeights = members.map(() => Math.random() + 0.1);
          const sumWeights = rawWeights.reduce((a, b) => a + b, 0);
          let sumPerc = 0;
          const percentages = members.map((m, idx) => {
            if (idx === members.length - 1) {
              return { userId: m, percentage: Math.round((100 - sumPerc) * 100) / 100 };
            }
            const p = Math.round(((rawWeights[idx] / sumWeights) * 100) * 100) / 100;
            sumPerc += p;
            return { userId: m, percentage: p };
          });
          shares = calculateSplit(amountCents, {
            type: "PERCENTAGE",
            shares: percentages,
          });
        } else {
          // EXACT
          // Use equal split as base exact split to ensure exact sum
          shares = calculateSplit(amountCents, {
            type: "EQUAL",
            memberIds: members,
          });
        }

        expenses.push({
          paidById: payer,
          amountCents,
          shares,
        });
      }

      // Add random settlements
      const numSettlements = Math.floor(Math.random() * 5);
      const settlements: SettlementData[] = [];
      for (let s = 0; s < numSettlements; s++) {
        const from = members[Math.floor(Math.random() * members.length)];
        let to = members[Math.floor(Math.random() * members.length)];
        while (to === from) {
          to = members[Math.floor(Math.random() * members.length)];
        }
        settlements.push({
          fromUserId: from,
          toUserId: to,
          amountCents: Math.floor(Math.random() * 2000) + 1,
        });
      }

      // Compute balances
      const result = calculateGroupBalances(members, expenses, settlements);

      // Verify invariant: sum === 0
      const totalBalance = result.members.reduce((sum, m) => sum + m.netBalanceCents, 0);
      expect(totalBalance).toBe(0);
      expect(result.isBalanced).toBe(true);
    }
  });
});
