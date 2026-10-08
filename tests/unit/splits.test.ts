import { describe, it, expect } from "vitest";
import {
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  calculateSplit,
} from "@/lib/finance/splits";

describe("Split Calculations", () => {
  describe("Equal Split", () => {
    it("splits evenly when divisible", () => {
      const shares = calculateEqualSplit(3000, ["u1", "u2", "u3"]);
      expect(shares).toEqual([
        { userId: "u1", amountCents: 1000 },
        { userId: "u2", amountCents: 1000 },
        { userId: "u3", amountCents: 1000 },
      ]);
      expect(shares.reduce((s, x) => s + x.amountCents, 0)).toBe(3000);
    });

    it("distributes leftover cents deterministically when not divisible", () => {
      // 100 cents among 3 people -> 34, 33, 33 (since u1 gets extra cent)
      const shares = calculateEqualSplit(100, ["u1", "u2", "u3"]);
      expect(shares.find((s) => s.userId === "u1")?.amountCents).toBe(34);
      expect(shares.find((s) => s.userId === "u2")?.amountCents).toBe(33);
      expect(shares.find((s) => s.userId === "u3")?.amountCents).toBe(33);
      expect(shares.reduce((s, x) => s + x.amountCents, 0)).toBe(100);
    });

    it("handles 1 person getting full amount", () => {
      const shares = calculateEqualSplit(1599, ["u1"]);
      expect(shares).toEqual([{ userId: "u1", amountCents: 1599 }]);
    });

    it("throws error for 0 members", () => {
      expect(() => calculateEqualSplit(1000, [])).toThrow();
    });
  });

  describe("Exact Split", () => {
    it("accepts valid exact split summing to total", () => {
      const shares = calculateExactSplit(2500, [
        { userId: "u1", amountCents: 1500 },
        { userId: "u2", amountCents: 1000 },
      ]);
      expect(shares.reduce((s, x) => s + x.amountCents, 0)).toBe(2500);
    });

    it("throws when exact shares do not sum to total", () => {
      expect(() =>
        calculateExactSplit(2500, [
          { userId: "u1", amountCents: 1500 },
          { userId: "u2", amountCents: 900 },
        ])
      ).toThrow(/Exact shares sum to 2400 cents, but total is 2500 cents/);
    });

    it("throws on negative shares", () => {
      expect(() =>
        calculateExactSplit(2500, [
          { userId: "u1", amountCents: 3000 },
          { userId: "u2", amountCents: -500 },
        ])
      ).toThrow(/Negative amount not allowed/);
    });
  });

  describe("Percentage Split", () => {
    it("splits correctly by percentage", () => {
      const shares = calculatePercentageSplit(10000, [
        { userId: "u1", percentage: 50 },
        { userId: "u2", percentage: 30 },
        { userId: "u3", percentage: 20 },
      ]);
      expect(shares).toEqual([
        { userId: "u1", amountCents: 5000 },
        { userId: "u2", amountCents: 3000 },
        { userId: "u3", amountCents: 2000 },
      ]);
      expect(shares.reduce((s, x) => s + x.amountCents, 0)).toBe(10000);
    });

    it("allocates remainder cents to highest fractional remainder", () => {
      // 100 cents split 33.33%, 33.33%, 33.34%
      const shares = calculatePercentageSplit(100, [
        { userId: "u1", percentage: 33.33 },
        { userId: "u2", percentage: 33.33 },
        { userId: "u3", percentage: 33.34 },
      ]);
      expect(shares.reduce((s, x) => s + x.amountCents, 0)).toBe(100);
    });

    it("throws if percentages do not sum to 100%", () => {
      expect(() =>
        calculatePercentageSplit(1000, [
          { userId: "u1", percentage: 50 },
          { userId: "u2", percentage: 40 },
        ])
      ).toThrow(/Percentages must sum to 100%/);
    });
  });

  describe("Shares (Ratios) Split", () => {
    it("splits according to ratio 2:1:1", () => {
      const shares = calculateSharesSplit(4000, [
        { userId: "u1", weight: 2 },
        { userId: "u2", weight: 1 },
        { userId: "u3", weight: 1 },
      ]);
      expect(shares).toEqual([
        { userId: "u1", amountCents: 2000 },
        { userId: "u2", amountCents: 1000 },
        { userId: "u3", amountCents: 1000 },
      ]);
      expect(shares.reduce((s, x) => s + x.amountCents, 0)).toBe(4000);
    });

    it("handles uneven ratios with remainder distribution", () => {
      const shares = calculateSharesSplit(100, [
        { userId: "u1", weight: 3 },
        { userId: "u2", weight: 2 },
        { userId: "u3", weight: 2 },
      ]);
      expect(shares.reduce((s, x) => s + x.amountCents, 0)).toBe(100);
    });

    it("throws if total weight is 0", () => {
      expect(() =>
        calculateSharesSplit(100, [
          { userId: "u1", weight: 0 },
          { userId: "u2", weight: 0 },
        ])
      ).toThrow(/Total share weight must be greater than zero/);
    });
  });

  describe("calculateSplit Dispatcher", () => {
    it("dispatches equal split correctly", () => {
      const result = calculateSplit(1500, {
        type: "EQUAL",
        memberIds: ["a", "b"],
      });
      expect(result.reduce((s, x) => s + x.amountCents, 0)).toBe(1500);
    });
  });
});
