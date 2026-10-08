"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { updateProfileSchema, changePasswordSchema } from "@/lib/validation/schemas";
import { User, Lock, KeyRound } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [loadingUser, setLoadingUser] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nameError, setNameError] = useState("");
  const [updatingName, setUpdatingName] = useState(false);

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login?from=/profile");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          setName(data.user.name);
          setEmail(data.user.email);
        }
      })
      .finally(() => setLoadingUser(false));
  }, [router]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError("");

    const valResult = updateProfileSchema.safeParse({ name });
    if (!valResult.success) {
      setNameError(valResult.error.issues[0]?.message || "Invalid name");
      return;
    }

    setUpdatingName(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        error(data.error || "Failed to update profile");
        return;
      }
      success("Profile name updated successfully");
      router.refresh();
    } catch {
      error("Network error updating profile");
    } finally {
      setUpdatingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordErrors({ confirmPassword: "New passwords do not match" });
      return;
    }

    const valResult = changePasswordSchema.safeParse({
      currentPassword: passwords.currentPassword,
      newPassword: passwords.newPassword,
    });

    if (!valResult.success) {
      const errMap: Record<string, string> = {};
      for (const issue of valResult.error.issues) {
        if (issue.path[0]) {
          errMap[issue.path[0] as string] = issue.message;
        }
      }
      setPasswordErrors(errMap);
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        error(data.error || "Failed to update password");
        return;
      }
      success("Password changed successfully");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      error("Network error updating password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 w-full space-y-6 animate-pulse">
        <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-48" />
        <div className="h-48 bg-zinc-200 dark:bg-zinc-800 rounded-2xl w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 w-full space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Account Settings
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage your personal details and account security
        </p>
      </div>

      {/* Profile Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <CardTitle>Profile Details</CardTitle>
          </div>
          <CardDescription>Update your public display name</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateName} className="space-y-4">
            <Input
              label="Email"
              value={email}
              disabled
              helperText="Email address cannot be changed"
            />
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={nameError}
              required
            />
            <div className="flex justify-end">
              <Button type="submit" isLoading={updatingName}>
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>Ensure your account is using a strong password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={passwords.currentPassword}
              onChange={(e) =>
                setPasswords({ ...passwords, currentPassword: e.target.value })
              }
              error={passwordErrors.currentPassword}
              required
            />
            <Input
              label="New Password"
              type="password"
              value={passwords.newPassword}
              onChange={(e) =>
                setPasswords({ ...passwords, newPassword: e.target.value })
              }
              error={passwordErrors.newPassword}
              helperText="Must be at least 8 characters long"
              required
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={passwords.confirmPassword}
              onChange={(e) =>
                setPasswords({ ...passwords, confirmPassword: e.target.value })
              }
              error={passwordErrors.confirmPassword}
              required
            />
            <div className="flex justify-end">
              <Button type="submit" variant="secondary" isLoading={updatingPassword}>
                <KeyRound className="w-4 h-4 mr-1.5" />
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
