"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/finance/format";
import {
  ArrowLeft,
  Settings,
  Link as LinkIcon,
  RefreshCw,
  Copy,
  Trash2,
  UserX,
  LogOut,
  AlertTriangle,
  Crown,
} from "lucide-react";

interface MemberItem {
  id: string;
  name: string;
  email: string;
  role: string;
  balanceCents: number;
}

interface GroupDetail {
  id: string;
  name: string;
  description?: string | null;
  currency: string;
  inviteToken: string;
  ownerId: string;
  currentRole: string;
  members: MemberItem[];
}

export default function GroupSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: groupId } = use(params);
  const router = useRouter();
  const { success, error } = useToast();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Group Details Form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  // Modals & Action States
  const [regeneratingToken, setRegeneratingToken] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);

  const [memberToRemove, setMemberToRemove] = useState<MemberItem | null>(null);
  const [removingMember, setRemovingMember] = useState(false);

  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);

  const fetchGroup = async () => {
    try {
      const [userRes, groupRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/groups/${groupId}`),
      ]);

      if (!userRes.ok) {
        router.push(`/login?from=/groups/${groupId}/settings`);
        return;
      }
      const userData = await userRes.json();
      setCurrentUser(userData.user);

      if (!groupRes.ok) {
        error("Access denied or group not found");
        router.push("/dashboard");
        return;
      }
      const groupData = await groupRes.json();
      setGroup(groupData.group);
      setName(groupData.group.name);
      setDescription(groupData.group.description || "");
    } catch {
      error("Failed to load group settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroup();
  }, [groupId]);

  const isOwner = group?.currentRole === "OWNER";
  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/invite/${group?.inviteToken}`
      : "";

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSavingDetails(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        error(data.error || "Failed to update group");
        return;
      }
      success("Group details updated");
      setGroup((prev) => (prev ? { ...prev, name, description } : null));
    } catch {
      error("Network error");
    } finally {
      setSavingDetails(false);
    }
  };

  const handleCopyInvite = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    success("Invite link copied to clipboard!");
  };

  const handleRegenerateInvite = async () => {
    setRegeneratingToken(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/invite/regenerate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        error(data.error || "Failed to regenerate invite token");
        return;
      }
      setGroup((prev) => (prev ? { ...prev, inviteToken: data.inviteToken } : null));
      success("Invite link regenerated! Previous links are now invalid.");
    } catch {
      error("Network error");
    } finally {
      setRegeneratingToken(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setRemovingMember(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${memberToRemove.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        error(data.error || "Failed to remove member");
        return;
      }
      success(`Removed ${memberToRemove.name} from the group`);
      setMemberToRemove(null);
      fetchGroup();
    } catch {
      error("Network error removing member");
    } finally {
      setRemovingMember(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!currentUser) return;
    setLeavingGroup(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${currentUser.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        error(data.error || "Failed to leave group");
        return;
      }
      success("You have left the group");
      router.push("/dashboard");
    } catch {
      error("Network error");
    } finally {
      setLeavingGroup(false);
    }
  };

  const handleDeleteGroup = async () => {
    setDeletingGroup(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        error(data.error || "Failed to delete group");
        return;
      }
      success("Group deleted successfully");
      router.push("/dashboard");
    } catch {
      error("Network error deleting group");
    } finally {
      setDeletingGroup(false);
    }
  };

  if (loading || !group) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 w-full space-y-6 animate-pulse">
        <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-36" />
        <div className="h-48 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  const userBalance = group.members.find((m) => m.id === currentUser?.id)?.balanceCents ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
      {/* Back button */}
      <div>
        <Link
          href={`/groups/${groupId}`}
          className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to {group.name}
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Settings className="w-7 h-7 text-zinc-500" />
            Group Settings
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage members, invite links, and group configuration
          </p>
        </div>
        <Badge variant={isOwner ? "default" : "secondary"}>
          {isOwner ? "Owner" : "Member"}
        </Badge>
      </div>

      {/* Invite Link Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <CardTitle>Invite Members</CardTitle>
          </div>
          <CardDescription>
            Share this link with anyone you want to invite to this group
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 px-3 py-2 text-xs sm:text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono text-zinc-700 dark:text-zinc-300"
            />
            <div className="flex items-center gap-2">
              <Button onClick={handleCopyInvite} variant="secondary" className="flex-1 sm:flex-none">
                <Copy className="w-4 h-4 mr-1.5" />
                Copy
              </Button>
              {isOwner && (
                <Button
                  onClick={handleRegenerateInvite}
                  variant="outline"
                  isLoading={regeneratingToken}
                  title="Generate a new invite link and invalidate the old one"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Regenerate
                </Button>
              )}
            </div>
          </div>
          {isOwner && (
            <p className="text-xs text-zinc-400">
              Regenerating will instantly deactivate the current invite link.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Group Details (Owner only) */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>Update name and description for this group</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveDetails} className="space-y-4">
              <Input
                label="Group Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-zinc-500">
                  Currency: <strong className="font-mono">{group.currency}</strong> (cannot be changed)
                </div>
                <Button type="submit" isLoading={savingDetails}>
                  Save Details
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Member Management */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({group.members.length})</CardTitle>
          <CardDescription>
            Members must have a €0.00 net balance before they can be removed or leave
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {group.members.map((member) => {
              const isMemberOwner = member.role === "OWNER";
              const canRemove = isOwner && !isMemberOwner;
              const hasZeroBalance = member.balanceCents === 0;

              return (
                <div
                  key={member.id}
                  className="py-3.5 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                        <span>{member.name}</span>
                        {isMemberOwner && (
                          <Crown className="w-3.5 h-3.5 text-amber-500 inline shrink-0" />
                        )}
                        {member.id === currentUser?.id && (
                          <span className="text-xs text-zinc-400 font-normal">(you)</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-zinc-400">Balance</div>
                      <div
                        className={`text-xs font-semibold ${
                          member.balanceCents > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : member.balanceCents < 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-zinc-500"
                        }`}
                      >
                        {formatMoney(member.balanceCents, group.currency)}
                      </div>
                    </div>

                    {canRemove && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!hasZeroBalance}
                        onClick={() => setMemberToRemove(member)}
                        title={
                          hasZeroBalance
                            ? `Remove ${member.name}`
                            : `Cannot remove member with non-zero balance (${formatMoney(
                                member.balanceCents,
                                group.currency
                              )})`
                        }
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                      >
                        <UserX className="w-4 h-4 sm:mr-1" />
                        <span className="hidden sm:inline">Remove</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10">
        <CardHeader>
          <CardTitle className="text-rose-700 dark:text-rose-400 text-lg">
            Danger Zone
          </CardTitle>
          <CardDescription>
            Actions with irreversible consequences for this group
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Leave group (non-owner or owner when alone) */}
          {!isOwner && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <div>
                <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  Leave this group
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  You can only leave if your balance is completely settled (€0.00).
                </p>
              </div>
              <Button
                variant="outline"
                disabled={userBalance !== 0}
                onClick={() => setLeaveModalOpen(true)}
                title={
                  userBalance === 0
                    ? "Leave group"
                    : `Cannot leave: your balance is ${formatMoney(userBalance, group.currency)}`
                }
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                Leave Group
              </Button>
            </div>
          )}

          {/* Delete group (Owner only) */}
          {isOwner && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900/50">
              <div>
                <h4 className="font-semibold text-sm text-rose-700 dark:text-rose-400">
                  Delete this group
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Permanently deletes the group, all expenses, settlements, and logs. This cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setDeleteModalOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete Group
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog: Remove Member */}
      <Dialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        title="Remove Member"
        description={`Are you sure you want to remove ${memberToRemove?.name} from this group?`}
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Their balance is settled (€0.00). Once removed, they will lose access to this group's expenses and activity.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMemberToRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              isLoading={removingMember}
              onClick={handleRemoveMember}
            >
              Remove
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Confirmation Dialog: Leave Group */}
      <Dialog
        open={leaveModalOpen}
        onOpenChange={setLeaveModalOpen}
        title="Leave Group"
        description="Are you sure you want to leave this group?"
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Your balance is settled (€0.00). You will need an invite link to rejoin this group later.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setLeaveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              isLoading={leavingGroup}
              onClick={handleLeaveGroup}
            >
              Leave Group
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Confirmation Dialog: Delete Group */}
      <Dialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Group"
        description="This action cannot be undone."
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>
              All expenses, shares, settlements, and activity logs associated with <strong>{group.name}</strong> will be permanently deleted.
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              isLoading={deletingGroup}
              onClick={handleDeleteGroup}
            >
              Delete Group Permanently
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
