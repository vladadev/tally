import { describe, it, expect } from "vitest";
import { calculateGroupBalances } from "@/lib/finance/balances";

describe("Balance Calculations", () => {
  const members = ["alice", "bob", "charlie"];

  it("calculates simple single expense balance", () => {
    // Alice paid 3000 cents, split equally 1000 each
    const expenses = [
      {
        paidById: "alice",
        amountCents: 3000,
        shares: [
          { userId: "alice", amountCents: 1000 },
          { userId: "bob", amountCents: 1000 },
          { userId: "charlie", amountCents: 1000 },
        ],
      },
    ];

    const result = calculateGroupBalances(members, expenses, []);
    expect(result.balanceMap["alice"]).toBe(2000); // paid 3000, owes 1000 -> +2000
    expect(result.balanceMap["bob"]).toBe(-1000); // paid 0, owes 1000 -> -1000
    expect(result.balanceMap["charlie"]).toBe(-1000); // paid 0, owes 1000 -> -1000
    expect(result.totalSpentCents).toBe(3000);
    expect(result.isBalanced).toBe(true);
  });

  it("updates balances correctly with settlements", () => {
    const expenses = [
      {
        paidById: "alice",
        amountCents: 3000,
        shares: [
          { userId: "alice", amountCents: 1000 },
          { userId: "bob", amountCents: 1000 },
          { userId: "charlie", amountCents: 1000 },
        ],
      },
    ];

    // Bob settles 1000 to Alice
    const settlements = [
      {
        fromUserId: "bob",
        toUserId: "alice",
        amountCents: 1000,
      },
    ];

    const result = calculateGroupBalances(members, expenses, settlements);
    expect(result.balanceMap["bob"]).toBe(0); // settled!
    expect(result.balanceMap["alice"]).toBe(1000); // still owed 1000 by charlie
    expect(result.balanceMap["charlie"]).toBe(-1000);
    expect(result.isBalanced).toBe(true);
  });

  it("shows all zeroes when empty", () => {
    const result = calculateGroupBalances(members, [], []);
    expect(result.balanceMap["alice"]).toBe(0);
    expect(result.balanceMap["bob"]).toBe(0);
    expect(result.balanceMap["charlie"]).toBe(0);
    expect(result.isBalanced).toBe(true);
  });
});
