import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "@/lib/finance/format";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(100, "Max 100 characters"),
  description: z.string().trim().max(500, "Max 500 characters").optional(),
  currency: z.enum(SUPPORTED_CURRENCIES, {
    errorMap: () => ({ message: "Currency must be EUR, USD, RSD, or GBP" }),
  }),
});

export const updateGroupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(100),
  description: z.string().trim().max(500).optional(),
});

export const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Entertainment",
  "Utilities",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const createExpenseSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(255),
  amountCents: z
    .number()
    .int("Amount must be in integer cents")
    .positive("Amount must be greater than zero")
    .max(100000000, "Amount cannot exceed 1,000,000.00"),
  date: z.string().refine(
    (d) => {
      const parsed = new Date(d);
      if (isNaN(parsed.getTime())) return false;
      const maxFuture = new Date();
      maxFuture.setDate(maxFuture.getDate() + 1);
      maxFuture.setHours(23, 59, 59, 999);
      return parsed <= maxFuture;
    },
    { message: "Date cannot be more than 1 day in the future" }
  ),
  category: z.enum(EXPENSE_CATEGORIES, {
    errorMap: () => ({ message: "Please select a valid category" }),
  }),
  note: z.string().trim().max(1000).optional(),
  paidById: z.string().min(1, "Please select who paid"),
  splitType: z.enum(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"]),
  shares: z
    .array(
      z.object({
        userId: z.string(),
        amountCents: z.number().int().min(0),
      })
    )
    .min(1, "At least one member must participate in the split"),
});

export const createSettlementSchema = z
  .object({
    fromUserId: z.string().min(1, "Payer member is required"),
    toUserId: z.string().min(1, "Recipient member is required"),
    amountCents: z
      .number()
      .int()
      .positive("Settlement amount must be greater than zero")
      .max(100000000, "Amount cannot exceed 1,000,000.00"),
    date: z.string().refine(
      (d) => {
        const parsed = new Date(d);
        if (isNaN(parsed.getTime())) return false;
        const maxFuture = new Date();
        maxFuture.setDate(maxFuture.getDate() + 1);
        maxFuture.setHours(23, 59, 59, 999);
        return parsed <= maxFuture;
      },
      { message: "Date cannot be more than 1 day in the future" }
    ),
  })
  .refine((data) => data.fromUserId !== data.toUserId, {
    message: "Cannot settle payment with yourself",
    path: ["toUserId"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
