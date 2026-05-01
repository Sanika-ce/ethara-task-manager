"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Filter, Search, Zap, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { dispatchStatsRefresh } from "@/lib/events";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { Task, TaskStatus, TaskPriority } from "@/types";

export function MemberWorkspace() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TaskStatus>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | TaskPriority>("ALL");

  useEffect(() => {
    const loadTasks = async () => {
      setIsLoading(true);
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, assignee_id, project_id, priority")
        .eq("assignee_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Could not load your tasks.");
        setIsLoading(false);
        return;
      }

      setTasks(
        (data ?? []).map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status as TaskStatus,
          assigneeId: task.assignee_id,
          projectId: task.project_id,
          priority: (task.priority as TaskPriority) || TaskPriority.MEDIUM
        }))
      );
      setIsLoading(false);
    };

    void loadTasks();
  }, [supabase]);

  const completedCount = useMemo(
    () => tasks.filter((task) => task.status === TaskStatus.DONE).length,
    [tasks]
  );

  const pendingCount = useMemo(
    () => tasks.filter((task) => task.status !== TaskStatus.DONE).length,
    [tasks]
  );

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "ALL" ? true : task.status === statusFilter;
      const matchesPriority = priorityFilter === "ALL" ? true : task.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [searchQuery, statusFilter, priorityFilter, tasks]);

  const getPriorityColor = (priority?: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return "border-red-300/30 bg-red-500/10 text-red-200";
      case TaskPriority.MEDIUM:
        return "border-amber-300/30 bg-amber-500/10 text-amber-200";
      case TaskPriority.LOW:
        return "border-green-300/30 bg-green-500/10 text-green-200";
      default:
        return "border-slate-300/30 bg-slate-500/10 text-slate-200";
    }
  };

  async function toggleTaskStatus(taskId: string) {
    if (!currentUserId) {
      toast.error("Please sign in again.");
      return;
    }

    const targetTask = tasks.find((task) => task.id === taskId);
    if (!targetTask) {
      return;
    }

    const nextStatus = targetTask.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
    const previousTasks = tasks;
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, status: nextStatus } : task))
    );

    const { error } = await supabase
      .from("tasks")
      .update({ status: nextStatus })
      .eq("id", taskId)
      .eq("assignee_id", currentUserId);

    if (error) {
      setTasks(previousTasks);
      toast.error("Task status update failed.");
      return;
    }

    toast.success(
      nextStatus === TaskStatus.DONE
        ? `"${targetTask.title}" marked as DONE.`
        : `"${targetTask.title}" moved back to TODO.`
    );
    dispatchStatsRefresh();
  }

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-6 shadow-glass backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-200/70">Work View</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Focused execution list</h1>
        <p className="mt-2 text-sm text-slate-300">
          Stay in flow. Toggle completion instantly and keep your lane clear.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <article className="rounded-2xl border border-white/10 bg-slate-900/55 p-5 shadow-glass backdrop-blur-xl xl:col-span-3 space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Personal Progress</p>
          <div className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-300">Total Assigned</p>
              <p className="mt-2 text-3xl font-semibold text-white">{tasks.length}</p>
            </div>
            <div className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-4">
              <p className="text-sm text-emerald-200">Completed</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-100">{completedCount}</p>
            </div>
            <div className="rounded-xl border border-amber-300/20 bg-amber-500/10 p-4">
              <p className="text-sm text-amber-200">Pending</p>
              <p className="mt-2 text-3xl font-semibold text-amber-100">{pendingCount}</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-900/55 p-5 shadow-glass backdrop-blur-xl xl:col-span-9 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white">My Tasks</p>
            <span className="rounded-full border border-amber-300/25 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">
              {pendingCount} Pending
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search task title..."
                className="w-full rounded-lg border border-white/20 bg-slate-900/70 py-2 pl-9 pr-3 text-sm text-white outline-none"
              />
            </label>

            <label className="relative">
              <Filter
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "ALL" | TaskStatus)}
                className="w-full rounded-lg border border-white/20 bg-slate-900/70 py-2 pl-9 pr-3 text-sm text-white outline-none"
              >
                <option value="ALL">All statuses</option>
                <option value={TaskStatus.TODO}>TODO</option>
                <option value={TaskStatus.IN_PROGRESS}>IN_PROGRESS</option>
                <option value={TaskStatus.REVIEW}>REVIEW</option>
                <option value={TaskStatus.DONE}>DONE</option>
              </select>
            </label>

            <label className="relative">
              <Zap
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value as "ALL" | TaskPriority)}
                className="w-full rounded-lg border border-white/20 bg-slate-900/70 py-2 pl-9 pr-3 text-sm text-white outline-none"
              >
                <option value="ALL">All priorities</option>
                <option value={TaskPriority.HIGH}>High Priority</option>
                <option value={TaskPriority.MEDIUM}>Medium Priority</option>
                <option value={TaskPriority.LOW}>Low Priority</option>
              </select>
            </label>
          </div>

          {isLoading ? (
            <p className="text-sm text-slate-400">Loading your tasks...</p>
          ) : visibleTasks.length === 0 && tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 py-12 px-4 text-center">
              <AlertCircle size={48} className="mb-4 text-emerald-400/60" />
              <h3 className="text-lg font-semibold text-white">All caught up!</h3>
              <p className="mt-2 text-sm text-slate-400">
                You've completed all assigned tasks. Great work! 🎉
              </p>
            </div>
          ) : visibleTasks.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-400 text-center">
              No tasks match this search or filter.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleTasks.map((task) => {
                const isDone = task.status === TaskStatus.DONE;

                return (
                  <article
                    key={task.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${isDone ? "text-slate-400 line-through" : "text-white"}`}>
                          {task.title}
                        </p>
                        {task.priority && (
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400">
                        <CheckCircle2 size={12} />
                        {task.status.replaceAll("_", " ")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleTaskStatus(task.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition whitespace-nowrap ${
                        isDone
                          ? "border-slate-400/30 bg-slate-500/10 text-slate-200 hover:bg-slate-500/20"
                          : "border-emerald-300/30 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
                      }`}
                    >
                      Mark as {isDone ? "TODO" : "DONE"}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
