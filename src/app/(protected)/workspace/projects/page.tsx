"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderKanban, FolderOpen, ArrowRight, Search, Filter, User, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { Project } from "@/types";

type ProjectWithDetails = Project & {
  createdAt?: string;
  ownerName?: string;
};

export default function ProjectsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [allProjects, setAllProjects] = useState<ProjectWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [owners, setOwners] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, description, owner_id, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to load projects.");
        setIsLoading(false);
        return;
      }

      const ownerIds = [...new Set((data ?? []).map((p) => p.owner_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ownerIds);

      const ownerMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name || "Unknown Owner"]));

      const projectsWithDetails: ProjectWithDetails[] = (data ?? []).map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        ownerId: project.owner_id,
        createdAt: project.created_at,
        ownerName: ownerMap.get(project.owner_id) || "Unknown Owner"
      }));

      setAllProjects(projectsWithDetails);
      const uniqueOwners = Array.from(ownerMap.entries()).map(([id, name]) => ({ id, name }));
      setOwners(uniqueOwners);
      setIsLoading(false);
    };
    loadProjects();
  }, [supabase]);

  const filteredProjects = useMemo(() => {
    let filtered = allProjects;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query));
    }
    if (ownerFilter !== "all") {
      filtered = filtered.filter(p => p.ownerId === ownerFilter);
    }
    return filtered;
  }, [searchQuery, ownerFilter, allProjects]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-6 shadow-glass backdrop-blur-xl">
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-indigo-200/70">
          <FolderKanban size={14} /> Projects View
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Project portfolio overview</h1>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-5 shadow-glass backdrop-blur-xl">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-slate-900/70 py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-indigo-300/50 transition"
            />
          </div>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-slate-900/70 py-2.5 pl-10 pr-3 text-sm text-white outline-none cursor-pointer"
            >
              <option value="all">All Owners</option>
              {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-56 rounded-2xl border border-white/10 bg-slate-900/55 animate-pulse" />)}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/20 p-12 text-center text-slate-400">
          <FolderOpen size={48} className="mx-auto mb-4" />
          <p>No projects found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <article key={project.id} className="group rounded-2xl border border-white/10 bg-slate-900/55 p-5 shadow-glass backdrop-blur-xl hover:border-indigo-300/30 transition-all flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-lg bg-indigo-500/20 p-2.5"><FolderKanban size={20} className="text-indigo-400" /></div>
                <p className="font-semibold text-white text-sm line-clamp-1">{project.name}</p>
              </div>
              <p className="text-xs text-slate-400 mb-4 line-clamp-2 flex-grow">{project.description || "No description provided"}</p>
              <div className="mb-4 flex flex-wrap gap-3 text-[10px] uppercase tracking-wider text-slate-500">
                <span className="flex items-center gap-1"><User size={12} /> {project.ownerName}</span>
                <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(project.createdAt)}</span>
              </div>
              <button 
                onClick={() => router.push(`/workspace/projects/${project.id}`)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-300/30 bg-indigo-500/20 px-3 py-2 text-xs font-medium text-indigo-100 hover:bg-indigo-500/35 transition"
              >
                View Details <ArrowRight size={14} />
              </button>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
