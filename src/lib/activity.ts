import { prisma } from "@/lib/db/prisma";

export type ActivityType =
  | "GROUP_CREATED"
  | "GROUP_UPDATED"
  | "MEMBER_JOINED"
  | "MEMBER_REMOVED"
  | "MEMBER_LEFT"
  | "EXPENSE_CREATED"
  | "EXPENSE_UPDATED"
  | "EXPENSE_DELETED"
  | "SETTLEMENT_CREATED";

export async function logActivity(
  groupId: string,
  actorId: string,
  type: ActivityType,
  payload: Record<string, unknown>
) {
  try {
    await prisma.activityLog.create({
      data: {
        groupId,
        actorId,
        type,
        payload: JSON.stringify(payload),
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}
