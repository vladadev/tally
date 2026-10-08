"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { registerSchema } from "@/lib/validation/schemas";
import { Receipt } from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";
  const { success, error } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = registerSchema.safeParse(formData);
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
      const res = await fetch("/api/auth/register", {
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
          error(data.error || "Failed to register");
        }
        return;
      }

      success("Account created successfully!");
      router.push(from);
      router.refresh();
    } catch {
      error("An unexpected error occurred. Please try again.");
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
        <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
        <CardDescription>
          Join Tally to start splitting expenses with friends and roommates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Alice Walker"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            autoComplete="name"
            required
          />
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
            placeholder="•••••••• (min 8 chars)"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={errors.password}
            autoComplete="new-password"
            helperText="Must be at least 8 characters long"
            required
          />
          <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
            Register
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Already have an account?{" "}
          <Link
            href={`/login${from !== "/dashboard" ? `?from=${encodeURIComponent(from)}` : ""}`}
            className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 py-12">
      <Suspense fallback={<div className="w-full max-w-md h-96 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
