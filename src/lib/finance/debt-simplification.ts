export interface SuggestedPayment {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
}

/**
 * Greedy Debt Simplification Algorithm (Minimum Cash Flow)
 *
 * Given a collection of net balances among group members (summing to zero),
 * finds the minimum (or near-minimum) set of direct payments to settle all debts.
 *
 * Algorithm description:
 * 1. Filter out members who are already settled (balance === 0).
 * 2. Partition into debtors (balance < 0) and creditors (balance > 0).
 * 3. In each step, match the person who owes the most (largest debtor) with
 *    the person who is owed the most (largest creditor).
 * 4. Settle the minimum of what debtor owes and creditor is owed.
 * 5. Update remaining amounts and remove members whose balance reaches 0.
 * 6. Repeat until all debts are resolved.
 *
 * Complexity: O(N log N) where N is number of members with non-zero balances.
 * Produces at most N - 1 transactions.
 */
export function simplifyDebts(
  balances: Record<string, number> | { userId: string; netBalanceCents: number }[]
): SuggestedPayment[] {
  // Normalize into working array
  const entries: { userId: string; netCents: number }[] = Array.isArray(balances)
    ? balances.map((b) => ({ userId: b.userId, netCents: b.netBalanceCents }))
    : Object.entries(balances).map(([userId, netCents]) => ({ userId, netCents }));

  const debtors: { userId: string; amountOwed: number }[] = [];
  const creditors: { userId: string; amountCredit: number }[] = [];

  for (const entry of entries) {
    if (entry.netCents < 0) {
      debtors.push({ userId: entry.userId, amountOwed: -entry.netCents });
    } else if (entry.netCents > 0) {
      creditors.push({ userId: entry.userId, amountCredit: entry.netCents });
    }
  }

  const payments: SuggestedPayment[] = [];

  while (debtors.length > 0 && creditors.length > 0) {
    // Sort to greedily pick the largest debtor and creditor
    debtors.sort((a, b) => b.amountOwed - a.amountOwed);
    creditors.sort((a, b) => b.amountCredit - a.amountCredit);

    const maxDebtor = debtors[0];
    const maxCreditor = creditors[0];

    const paymentAmount = Math.min(maxDebtor.amountOwed, maxCreditor.amountCredit);

    if (paymentAmount > 0) {
      payments.push({
        fromUserId: maxDebtor.userId,
        toUserId: maxCreditor.userId,
        amountCents: paymentAmount,
      });

      maxDebtor.amountOwed -= paymentAmount;
      maxCreditor.amountCredit -= paymentAmount;
    }

    if (maxDebtor.amountOwed === 0) {
      debtors.shift();
    }
    if (maxCreditor.amountCredit === 0) {
      creditors.shift();
    }
  }

  return payments;
}
