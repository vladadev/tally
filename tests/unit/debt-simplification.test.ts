import { describe, it, expect } from "vitest";
import { simplifyDebts } from "@/lib/finance/debt-simplification";

describe("Debt Simplification Algorithm", () => {
  it("returns no payments when all balances are 0", () => {
    const balances = { u1: 0, u2: 0, u3: 0 };
    const payments = simplifyDebts(balances);
    expect(payments).toHaveLength(0);
  });

  it("settles simple two person debt", () => {
    const balances = {
      alice: 2000, // owed 2000
      bob: -2000, // owes 2000
    };
    const payments = simplifyDebts(balances);
    expect(payments).toEqual([
      { fromUserId: "bob", toUserId: "alice", amountCents: 2000 },
    ]);
  });

  it("minimizes transactions for 3 people", () => {
    const balances = {
      alice: 3000, // owed 3000
      bob: -2000, // owes 2000
      charlie: -1000, // owes 1000
    };
    const payments = simplifyDebts(balances);

    // Greedy matches largest debtor (bob 2000) with alice (3000), then charlie (1000) with alice
    expect(payments).toEqual([
      { fromUserId: "bob", toUserId: "alice", amountCents: 2000 },
      { fromUserId: "charlie", toUserId: "alice", amountCents: 1000 },
    ]);
    expect(payments.length).toBeLessThanOrEqual(2); // <= N - 1
  });

  it("settles complex multi-party debts with at most N-1 transactions", () => {
    const balances = {
      u1: -4500,
      u2: -2500,
      u3: -1000,
      u4: 3000,
      u5: 5000,
    };
    // Sum is -8000 + 8000 = 0. There are 5 people, so <= 4 transactions.
    const payments = simplifyDebts(balances);

    expect(payments.length).toBeLessThanOrEqual(4);

    // Verify all payment amounts are positive
    for (const p of payments) {
      expect(p.amountCents).toBeGreaterThan(0);
    }

    // Verify after applying all payments, everyone's balance is 0
    const workingBalances: Record<string, number> = { ...balances };
    for (const p of payments) {
      workingBalances[p.fromUserId] += p.amountCents;
      workingBalances[p.toUserId] -= p.amountCents;
    }

    for (const [user, finalBal] of Object.entries(workingBalances)) {
      expect(finalBal, `User ${user} should be settled to 0`).toBe(0);
    }
  });

  it("handles randomized scenarios and verifies all balances reach zero", () => {
    for (let i = 0; i < 50; i++) {
      // Create random zero-sum balances for 6 users
      const users = ["u1", "u2", "u3", "u4", "u5", "u6"];
      const b: Record<string, number> = {};
      let runningSum = 0;

      for (let j = 0; j < users.length - 1; j++) {
        const val = Math.floor(Math.random() * 20000) - 10000;
        b[users[j]] = val;
        runningSum += val;
      }
      b[users[users.length - 1]] = -runningSum; // balance sum === 0

      const payments = simplifyDebts(b);

      // Verify at most N-1 payments
      const activeCount = Object.values(b).filter((v) => v !== 0).length;
      if (activeCount > 0) {
        expect(payments.length).toBeLessThanOrEqual(activeCount - 1);
      }

      // Verify all settled
      const verify = { ...b };
      for (const p of payments) {
        expect(p.amountCents).toBeGreaterThan(0);
        verify[p.fromUserId] += p.amountCents;
        verify[p.toUserId] -= p.amountCents;
      }

      for (const val of Object.values(verify)) {
        expect(val).toBe(0);
      }
    }
  });
});
