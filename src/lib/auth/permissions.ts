import { prisma } from "@/lib/db/prisma";
import { calculateGroupBalances } from "@/lib/finance/balances";

export interface MembershipRecord {
  id: string;
  userId: string;
  groupId: string;
  role: string; // OWNER | MEMBER
}

/**
 * Checks if a user is a member of the specified group.
 * Throws an error or returns null if not found.
 */
export async function getMembership(
  userId: string,
  groupId: string
): Promise<MembershipRecord | null> {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_groupId: {
        userId,
        groupId,
      },
    },
  });
  return membership;
}

/**
 * Checks if user is an owner of the specified group.
 */
export async function isGroupOwner(userId: string, groupId: string): Promise<boolean> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { ownerId: true },
  });
  return group?.ownerId === userId;
}

/**
 * Calculates current net balance for a specific user in a group.
 * Used for zero-balance checks before leaving or removing members.
 */
export async function getUserGroupBalance(
  groupId: string,
  targetUserId: string
): Promise<number> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      memberships: { select: { userId: true } },
      expenses: {
        include: {
          shares: { select: { userId: true, amountCents: true } },
        },
      },
      settlements: {
        select: { fromUserId: true, toUserId: true, amountCents: true },
      },
    },
  });

  if (!group) return 0;

  const memberIds = group.memberships.map((m) => m.userId);
  const { balanceMap } = calculateGroupBalances(
    memberIds,
    group.expenses.map((e) => ({
      paidById: e.paidById,
      amountCents: e.amountCents,
      shares: e.shares,
    })),
    group.settlements
  );

  return balanceMap[targetUserId] ?? 0;
}
