"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { createGroupSchema } from "@/lib/validation/schemas";
import { SUPPORTED_CURRENCIES } from "@/lib/finance/format";
import { ArrowLeft, Users } from "lucide-react";

export default function NewGroupPage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    currency: "EUR" as (typeof SUPPORTED_CURRENCIES)[number],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = createGroupSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        if (issue.path[0]) {
          fieldErrors[issue.path[0] as string] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.issues) {
          const fieldErrors: Record<string, string> = {};
          for (const [key, msgs] of Object.entries(data.issues)) {
            fieldErrors[key] = (msgs as string[])[0];
          }
          setErrors(fieldErrors);
        } else {
          error(data.error || "Failed to create group");
        }
        return;
      }

      success("Group created successfully!");
      router.push(`/groups/${data.group.id}`);
      router.refresh();
    } catch {
      error("Network error creating group");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 w-full space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Back to Dashboard
      </Link>

      <Card className="shadow-xl border-zinc-200/80 dark:border-zinc-800">
        <CardHeader>
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
            <Users className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Create a new group</CardTitle>
          <CardDescription>
            Set up a group for your apartment, holiday, or joint project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Group Name"
              placeholder="e.g. Apartment 4B or Barcelona Trip"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              required
            />

            <div className="space-y-1.5">
              <label
                htmlFor="group-description"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Description (optional)
              </label>
              <textarea
                id="group-description"
                rows={3}
                placeholder="What is this group for?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="flex w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="currency-selector"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Currency
              </label>
              <select
                id="currency-selector"
                value={formData.currency}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    currency: e.target.value as (typeof SUPPORTED_CURRENCIES)[number],
                  })
                }
                className="flex h-10 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <option value="EUR">EUR (€) — Euro</option>
                <option value="USD">USD ($) — US Dollar</option>
                <option value="RSD">RSD (RSD) — Serbian Dinar</option>
                <option value="GBP">GBP (£) — British Pound</option>
              </select>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                All expenses in this group will be tracked in this currency.
              </p>
            </div>

            <Button type="submit" className="w-full mt-4" isLoading={isLoading}>
              Create Group
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
