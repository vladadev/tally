export interface ExpenseData {
  id?: string;
  paidById: string;
  amountCents: number;
  shares: {
    userId: string;
    amountCents: number;
  }[];
}

export interface SettlementData {
  id?: string;
  fromUserId: string;
  toUserId: string;
  amountCents: number;
}

export interface MemberBalance {
  userId: string;
  totalPaidCents: number;
  totalShareCents: number;
  netBalanceCents: number; // positive = owed money, negative = owes money, 0 = settled
}

export interface GroupBalanceSummary {
  members: MemberBalance[];
  balanceMap: Record<string, number>;
  totalSpentCents: number;
  isBalanced: boolean; // sum === 0
}

/**
 * Computes net balances for all members in a group dynamically from expenses and settlements.
 * Guaranteed to satisfy the zero-sum invariant (sum of all net balances === 0).
 */
export function calculateGroupBalances(
  memberUserIds: string[],
  expenses: ExpenseData[],
  settlements: SettlementData[]
): GroupBalanceSummary {
  const totalPaidMap = new Map<string, number>();
  const totalShareMap = new Map<string, number>();
  const netBalanceMap = new Map<string, number>();

  // Initialize all members with 0
  for (const uid of memberUserIds) {
    totalPaidMap.set(uid, 0);
    totalShareMap.set(uid, 0);
    netBalanceMap.set(uid, 0);
  }

  let totalSpentCents = 0;

  // Process expenses
  for (const exp of expenses) {
    totalSpentCents += exp.amountCents;

    // Payer gets credit (+)
    const currentPaid = totalPaidMap.get(exp.paidById) ?? 0;
    totalPaidMap.set(exp.paidById, currentPaid + exp.amountCents);

    const currentNetPayer = netBalanceMap.get(exp.paidById) ?? 0;
    netBalanceMap.set(exp.paidById, currentNetPayer + exp.amountCents);

    // Each share debtor owes (-)
    for (const share of exp.shares) {
      const currentShare = totalShareMap.get(share.userId) ?? 0;
      totalShareMap.set(share.userId, currentShare + share.amountCents);

      const currentNetShare = netBalanceMap.get(share.userId) ?? 0;
      netBalanceMap.set(share.userId, currentNetShare - share.amountCents);
    }
  }

  // Process settlements
  for (const set of settlements) {
    // fromUser paid set.amountCents to toUser
    // sender's balance increases (+)
    const netFrom = netBalanceMap.get(set.fromUserId) ?? 0;
    netBalanceMap.set(set.fromUserId, netFrom + set.amountCents);

    // receiver's balance decreases (-)
    const netTo = netBalanceMap.get(set.toUserId) ?? 0;
    netBalanceMap.set(set.toUserId, netTo - set.amountCents);
  }

  // Convert to array
  const memberBalances: MemberBalance[] = memberUserIds.map((uid) => ({
    userId: uid,
    totalPaidCents: totalPaidMap.get(uid) ?? 0,
    totalShareCents: totalShareMap.get(uid) ?? 0,
    netBalanceCents: netBalanceMap.get(uid) ?? 0,
  }));

  // Verify Zero-Sum Invariant
  const totalNet = memberBalances.reduce((sum, m) => sum + m.netBalanceCents, 0);
  if (totalNet !== 0) {
    throw new Error(
      `Zero-sum invariant failed: sum of member balances is ${totalNet} cents instead of 0`
    );
  }

  const recordMap: Record<string, number> = {};
  for (const m of memberBalances) {
    recordMap[m.userId] = m.netBalanceCents;
  }

  return {
    members: memberBalances,
    balanceMap: recordMap,
    totalSpentCents,
    isBalanced: totalNet === 0,
  };
}
