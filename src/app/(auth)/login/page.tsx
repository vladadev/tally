"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { loginSchema } from "@/lib/validation/schemas";
import { Receipt, AlertTriangle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";
  const { success, error: toastError } = useToast();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const result = loginSchema.safeParse(formData);
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
      const res = await fetch("/api/auth/login", {
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
          setServerError(data.error || "Invalid credentials");
          toastError(data.error || "Login failed");
        }
        return;
      }

      success("Welcome back!");
      router.push(from);
      router.refresh();
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
      toastError("Network error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl border-zinc-200/80 dark:border-zinc-800">
      <CardHeader className="text-center pb-6">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-600/10 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
          <Receipt className="w-6 h-6" />
        </div>
        <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
        <CardDescription>Enter your credentials to access your groups and balances</CardDescription>
      </CardHeader>
      <CardContent>
        {serverError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="alice@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            autoComplete="email"
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={errors.password}
            autoComplete="current-password"
            required
          />
          <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
            Sign In
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Don&apos;t have an account yet?{" "}
          <Link
            href={`/register${from !== "/dashboard" ? `?from=${encodeURIComponent(from)}` : ""}`}
            className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Register now
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 py-12">
      <Suspense fallback={<div className="w-full max-w-md h-96 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
