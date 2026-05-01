"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FolderKanban, User, Calendar, FileText } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";

import { createSupabaseBrowserClient } from "@/lib/supabase";

type ProjectDetail = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  ownerName?: string;
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) {
        toast.error("Project ID not found.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("id, name, description, owner_id, created_at")
        .eq("id", projectId)
        .single();

      if (projectError || !projectData) {
        toast.error("Failed to load project details.");
        setIsLoading(false);
        return;
      }

      // Fetch owner name
      const { data: ownerData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", projectData.owner_id)
        .single();

      setProject({
        ...projectData,
        ownerName: ownerData?.full_name || "Unknown Owner"
      });
      setIsLoading(false);
    };

    void loadProject();
  }, [projectId, supabase]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  };

  if (isLoading) {
    return (
      <main className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-6 shadow-glass backdrop-blur-xl animate-pulse">
          <div className="flex gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-slate-700"></div>
            <div className="flex-1 space-y-2">
              <div className="h-6 w-48 bg-slate-700 rounded"></div>
              <div className="h-4 w-96 bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="space-y-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-indigo-300 hover:text-indigo-200 transition mb-4"
        >
          <ArrowLeft size={16} />
          Back to Projects
        </button>
        <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-6 shadow-glass backdrop-blur-xl text-center">
          <p className="text-slate-400">Project not found. Please try again.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-indigo-300 hover:text-indigo-200 transition mb-2"
      >
        <ArrowLeft size={16} />
        Back to Projects
      </button>

      {/* Project Header */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-6 shadow-glass backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <div className="rounded-lg border border-indigo-300/30 bg-indigo-500/20 p-3">
            <FolderKanban size={32} className="text-indigo-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-semibold text-white">{project.name}</h1>
            <p className="mt-2 text-slate-300">{project.description || "No description provided"}</p>
          </div>
        </div>
      </section>

      {/* Project Details Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Owner Card */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-6 shadow-glass backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-4">
            <User size={18} className="text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Project Owner</h2>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
            <p className="text-sm text-slate-400">Owner</p>
            <p className="mt-2 text-lg font-semibold text-white">{project.ownerName}</p>
          </div>
        </section>

        {/* Created Date Card */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-6 shadow-glass backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Project Timeline</h2>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
            <p className="text-sm text-slate-400">Created On</p>
            <p className="mt-2 text-lg font-semibold text-white">{formatDate(project.created_at)}</p>
          </div>
        </section>
      </div>

      {/* Project Overview */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-6 shadow-glass backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={18} className="text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Project Overview</h2>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-400">Description</p>
            <p className="mt-2 text-white leading-relaxed">
              {project.description || "No description has been provided for this project."}
            </p>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
            <p className="text-sm text-slate-400 mb-2">Project ID</p>
            <p className="text-xs font-mono text-slate-300">{project.id}</p>
          </div>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="rounded-2xl border border-dashed border-indigo-300/30 bg-indigo-500/10 p-6">
        <h2 className="text-lg font-semibold text-indigo-200 mb-2">Coming Soon</h2>
        <p className="text-sm text-indigo-300/80">
          Additional project management features such as tasks, team members, and timeline views will be available soon.
        </p>
      </section>
    </main>
  );
}
