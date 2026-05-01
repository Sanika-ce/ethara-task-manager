"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, CheckCircle2, Edit3, Zap } from "lucide-react";
import { toast } from "sonner";

import { createSupabaseBrowserClient } from "@/lib/supabase";
import { getTimeAgo } from "@/lib/time-utils";

type ActivityLog = {
  id: string;
  action: string;
  description: string;
  created_by: string;
  created_at: string;
  metadata?: {
    project_name?: string;
    task_title?: string;
    user_name?: string;
  };
};

export function ActivityFeed() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadActivities = async () => {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("activity_log")
        .select("id, action, description, created_by, created_at, metadata")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Failed to load activity feed:", error);
        setIsLoading(false);
        return;
      }

      setActivities((data ?? []) as ActivityLog[]);
      setIsLoading(false);
    };

    void loadActivities();

    // Listen for activity updates (real-time)
    const channel = supabase
      .channel("activity_feed_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_log"
        },
        (payload) => {
          setActivities((prev) => [payload.new as ActivityLog, ...prev.slice(0, 9)]);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "create":
        return <Plus size={16} className="text-indigo-400" />;
      case "complete":
      case "done":
        return <CheckCircle2 size={16} className="text-emerald-400" />;
      case "update":
      case "assign":
        return <Edit3 size={16} className="text-amber-400" />;
      case "priority":
        return <Zap size={16} className="text-orange-400" />;
      default:
        return <Edit3 size={16} className="text-slate-400" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "create":
        return "border-indigo-300/20 bg-indigo-500/10";
      case "complete":
      case "done":
        return "border-emerald-300/20 bg-emerald-500/10";
      case "update":
      case "assign":
        return "border-amber-300/20 bg-amber-500/10";
      case "priority":
        return "border-orange-300/20 bg-orange-500/10";
      default:
        return "border-slate-300/20 bg-slate-500/10";
    }
  };

  return (
    <aside className="rounded-2xl border border-white/10 bg-slate-900/55 p-5 shadow-glass backdrop-blur-xl h-fit sticky top-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Activity Feed</p>
          <p className="mt-1 text-sm text-slate-400">Team updates</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-700 rounded w-3/4"></div>
                <div className="h-2 bg-slate-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-slate-400">No activity yet. Create your first project to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <div key={activity.id} className="relative">
              {/* Timeline line */}
              {index !== activities.length - 1 && (
                <div className="absolute left-4 top-10 h-6 w-0.5 bg-gradient-to-b from-slate-600 to-transparent"></div>
              )}

              {/* Activity item */}
              <div className="flex gap-3">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border ${getActionColor(activity.action)} flex-shrink-0 relative z-10`}
                >
                  {getActionIcon(activity.action)}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-xs text-white">
                    <span className="font-semibold">{activity.description}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{getTimeAgo(activity.created_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
