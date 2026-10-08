"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Runtime error caught by boundary:", error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Something went wrong
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          An unexpected error occurred while processing your request.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Button onClick={() => reset()} variant="secondary">
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button onClick={() => (window.location.href = "/dashboard")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
