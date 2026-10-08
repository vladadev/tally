"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { Receipt, LogOut, User as UserIcon, LayoutDashboard } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface UserState {
  id: string;
  name: string;
  email: string;
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { success, error } = useToast();
  const [user, setUser] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        setUser(null);
        success("Logged out successfully");
        router.push("/login");
        router.refresh();
      } else {
        error("Failed to log out");
      }
    } catch {
      error("Network error during logout");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-zinc-900 dark:text-zinc-50 group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform">
            <Receipt className="w-5 h-5" />
          </div>
          <span>Tally</span>
        </Link>

        {/* Navigation & Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {!loading && (
            <>
              {user ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <Link href="/dashboard">
                    <Button
                      variant={pathname === "/dashboard" ? "secondary" : "ghost"}
                      size="sm"
                      className="hidden sm:inline-flex"
                    >
                      <LayoutDashboard className="w-4 h-4 mr-1.5" />
                      Dashboard
                    </Button>
                  </Link>
                  <Link href="/profile">
                    <Button
                      variant={pathname === "/profile" ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                    >
                      <UserIcon className="w-4 h-4" />
                      <span className="hidden sm:inline max-w-[120px] truncate">
                        {user.name}
                      </span>
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    title="Log out"
                    aria-label="Log out"
                  >
                    <LogOut className="w-4 h-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="ghost" size="sm">
                      Log in
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="primary" size="sm">
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
