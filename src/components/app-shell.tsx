"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FolderKanban, LayoutDashboard, ListTodo, LogOut, Menu, Settings, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { GlobalStatBar } from "@/components/global-stat-bar";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { StatMetric, SyncroUser, TaskStatus } from "@/types";

type AppShellProps = {
  children: React.ReactNode;
  user: SyncroUser;
  permissions: {
    canAccessAdmin: boolean;
  };
};

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function AppShell({ children, user, permissions }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [metrics, setMetrics] = useState<StatMetric[]>([
    { label: "Total Projects", value: "--" },
    { label: "Tasks Pending", value: "--" },
    { label: "Team Members", value: "--" }
  ]);

  const navItems = useMemo<NavItem[]>(() => {
    const baseItems: NavItem[] = [
      { href: "/workspace", label: "Dashboard", icon: LayoutDashboard },
      { href: "/workspace/projects", label: "Projects", icon: FolderKanban },
      { href: "/workspace/tasks", label: "Tasks", icon: ListTodo },
      { href: "/workspace/settings", label: "Settings", icon: Settings }
    ];

    if (permissions.canAccessAdmin) {
      baseItems.unshift({ href: "/admin", label: "Command Center", icon: Shield });
    }

    return baseItems;
  }, [permissions.canAccessAdmin]);

  const loadMetrics = useCallback(async () => {
    const [projectsResult, pendingTasksResult, membersResult] = await Promise.all([
      supabase.from("projects").select("*", { count: "exact", head: true }),
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .neq("status", TaskStatus.DONE),
      supabase.from("profiles").select("*", { count: "exact", head: true })
    ]);

    if (projectsResult.error || pendingTasksResult.error || membersResult.error) {
      return;
    }

    setMetrics([
      { label: "Total Projects", value: String(projectsResult.count ?? 0) },
      { label: "Tasks Pending", value: String(pendingTasksResult.count ?? 0) },
      { label: "Team Members", value: String(membersResult.count ?? 0) }
    ]);
  }, [supabase]);

  useEffect(() => {
    void loadMetrics();

    const handleStatsRefresh = () => {
      void loadMetrics();
    };

    window.addEventListener("syncro:stats:refresh", handleStatsRefresh);
    return () => {
      window.removeEventListener("syncro:stats:refresh", handleStatsRefresh);
    };
  }, [loadMetrics]);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error("Logout failed. Please try again.");
      return;
    }

    toast.success("Logged out successfully.");
    router.push("/auth/sign-in");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-100">
      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-4 md:px-6 lg:px-8">
        <button
          type="button"
          className="fixed right-4 top-4 z-50 rounded-lg border border-white/20 bg-slate-900/80 px-3 py-2 text-xs font-medium backdrop-blur-md md:hidden"
          onClick={() => setSidebarOpen((prev) => !prev)}
        >
          <span className="inline-flex items-center gap-1">
            <Menu size={14} />
            Menu
          </span>
        </button>

        <aside
          className={`fixed left-4 top-4 z-40 h-[calc(100vh-2rem)] w-72 rounded-2xl border border-white/15 bg-slate-950/65 p-5 shadow-glass backdrop-blur-xl transition-transform duration-300 md:sticky md:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-[120%]"
          }`}
        >
          <div className="mb-8 border-b border-white/10 pb-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-violet-300/70">Syncro</p>
            <p className="mt-2 text-xl font-semibold">Team Task Manager</p>
            <p className="mt-1 text-xs text-slate-400">{user.fullName}</p>
            <span className="mt-3 inline-flex rounded-full border border-indigo-300/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-indigo-200">
              {permissions.canAccessAdmin ? "Admin Access" : "Member Access"}
            </span>
          </div>

          <nav className="space-y-2 border-b border-white/10 pb-4">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                    isActive
                      ? "border border-violet-400/40 bg-violet-500/20 text-violet-100"
                      : "border border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={15} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/25"
          >
            <LogOut size={15} />
            Logout
          </button>
        </aside>

        <div className="w-full pt-16 md:pt-0">
          <header className="mb-4 rounded-2xl border border-indigo-300/15 bg-slate-900/55 px-5 py-4 shadow-glass backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-200/70">Execution Layer</p>
            <h2 className="mt-2 text-lg font-medium text-white">Ship with alignment, not chaos.</h2>
          </header>
          <GlobalStatBar metrics={metrics} />
          {children}
        </div>
      </div>
    </div>
  );
}
