import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center mb-2">
          <FileQuestion className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          404 - Page Not Found
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          The page or group you are looking for does not exist or may have been deleted.
        </p>
        <div className="pt-2">
          <Link href="/dashboard">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
