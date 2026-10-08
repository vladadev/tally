export type SplitType = "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";

export interface CalculatedShare {
  userId: string;
  amountCents: number;
}

/**
 * Calculates equal split among selected members.
 * Leftover cents from division are distributed deterministically
 * to members sorted by userId ascending so that sum(shares) === totalCents.
 */
export function calculateEqualSplit(totalCents: number, memberIds: string[]): CalculatedShare[] {
  if (memberIds.length === 0) {
    throw new Error("Cannot split expense among 0 members");
  }
  if (totalCents < 0) {
    throw new Error("Total amount must not be negative");
  }

  // Stable sort by memberId to ensure deterministic remainder distribution
  const sortedMembers = [...memberIds].sort();
  const n = sortedMembers.length;
  const baseShare = Math.floor(totalCents / n);
  const remainder = totalCents % n;

  return sortedMembers.map((userId, index) => ({
    userId,
    amountCents: baseShare + (index < remainder ? 1 : 0),
  }));
}

/**
 * Validates and formats exact split shares.
 * Sum of shares must strictly equal totalCents.
 */
export function calculateExactSplit(
  totalCents: number,
  shares: { userId: string; amountCents: number }[]
): CalculatedShare[] {
  if (shares.length === 0) {
    throw new Error("No member shares provided for exact split");
  }

  let sum = 0;
  for (const s of shares) {
    if (s.amountCents < 0) {
      throw new Error(`Negative amount not allowed for user ${s.userId}`);
    }
    sum += s.amountCents;
  }

  if (sum !== totalCents) {
    throw new Error(`Exact shares sum to ${sum} cents, but total is ${totalCents} cents`);
  }

  return shares.map((s) => ({
    userId: s.userId,
    amountCents: s.amountCents,
  }));
}

/**
 * Calculates percentage-based split.
 * Sum of percentages must equal 100.
 * Leftover cents are distributed to participants with the highest fractional remainder.
 */
export function calculatePercentageSplit(
  totalCents: number,
  shares: { userId: string; percentage: number }[]
): CalculatedShare[] {
  if (shares.length === 0) {
    throw new Error("No member shares provided for percentage split");
  }

  // Verify percentages sum to 100 (allowing minor floating rounding epsilon of 0.01)
  const totalPercentage = shares.reduce((acc, s) => acc + s.percentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error(`Percentages must sum to 100%, got ${totalPercentage.toFixed(2)}%`);
  }

  // Compute raw shares and fractional remainders
  // Using percentage * 100 for integer arithmetic (supports 2 decimal place percentages)
  // factor = 10,000
  const items = shares.map((s) => {
    const permille = Math.round(s.percentage * 100); // e.g. 33.33% -> 3333
    const product = totalCents * permille;
    const baseAmount = Math.floor(product / 10000);
    const fracRemainder = product % 10000;
    return {
      userId: s.userId,
      baseAmount,
      fracRemainder,
    };
  });

  const baseSum = items.reduce((sum, item) => sum + item.baseAmount, 0);
  const leftoverCents = totalCents - baseSum;

  // Sort by highest fractional remainder first, tie-break by userId
  const sortedByRemainder = [...items].sort((a, b) => {
    if (b.fracRemainder !== a.fracRemainder) {
      return b.fracRemainder - a.fracRemainder;
    }
    return a.userId.localeCompare(b.userId);
  });

  const bonusUsers = new Set(
    sortedByRemainder.slice(0, leftoverCents).map((item) => item.userId)
  );

  return items.map((item) => ({
    userId: item.userId,
    amountCents: item.baseAmount + (bonusUsers.has(item.userId) ? 1 : 0),
  }));
}

/**
 * Calculates shares-based split (ratios like 2:1:1).
 * Leftover cents are distributed to participants with the highest fractional remainder.
 */
export function calculateSharesSplit(
  totalCents: number,
  shares: { userId: string; weight: number }[]
): CalculatedShare[] {
  if (shares.length === 0) {
    throw new Error("No member shares provided for shares split");
  }

  const totalWeight = shares.reduce((acc, s) => acc + s.weight, 0);
  if (totalWeight <= 0) {
    throw new Error("Total share weight must be greater than zero");
  }

  const items = shares.map((s) => {
    if (s.weight < 0) {
      throw new Error(`Weight cannot be negative for user ${s.userId}`);
    }
    const product = totalCents * s.weight;
    const baseAmount = Math.floor(product / totalWeight);
    const fracRemainder = product % totalWeight;
    return {
      userId: s.userId,
      baseAmount,
      fracRemainder,
    };
  });

  const baseSum = items.reduce((sum, item) => sum + item.baseAmount, 0);
  const leftoverCents = totalCents - baseSum;

  // Sort by highest fractional remainder first, tie-break by userId
  const sortedByRemainder = [...items].sort((a, b) => {
    if (b.fracRemainder !== a.fracRemainder) {
      return b.fracRemainder - a.fracRemainder;
    }
    return a.userId.localeCompare(b.userId);
  });

  const bonusUsers = new Set(
    sortedByRemainder.slice(0, leftoverCents).map((item) => item.userId)
  );

  return items.map((item) => ({
    userId: item.userId,
    amountCents: item.baseAmount + (bonusUsers.has(item.userId) ? 1 : 0),
  }));
}

export type SplitInput =
  | { type: "EQUAL"; memberIds: string[] }
  | { type: "EXACT"; shares: { userId: string; amountCents: number }[] }
  | { type: "PERCENTAGE"; shares: { userId: string; percentage: number }[] }
  | { type: "SHARES"; shares: { userId: string; weight: number }[] };

/**
 * General split dispatcher that calculates shares and asserts the invariant sum === totalCents.
 */
export function calculateSplit(totalCents: number, input: SplitInput): CalculatedShare[] {
  let result: CalculatedShare[];

  switch (input.type) {
    case "EQUAL":
      result = calculateEqualSplit(totalCents, input.memberIds);
      break;
    case "EXACT":
      result = calculateExactSplit(totalCents, input.shares);
      break;
    case "PERCENTAGE":
      result = calculatePercentageSplit(totalCents, input.shares);
      break;
    case "SHARES":
      result = calculateSharesSplit(totalCents, input.shares);
      break;
  }

  // Safety check: always verify invariant
  const totalCalculated = result.reduce((sum, s) => sum + s.amountCents, 0);
  if (totalCalculated !== totalCents) {
    throw new Error(
      `Split calculation invariant violated: sum of shares (${totalCalculated}) does not match total (${totalCents})`
    );
  }

  return result;
}
