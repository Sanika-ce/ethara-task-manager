"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CircleCheck,
  ClipboardList,
  Columns3,
  Plus,
  Search,
  Sparkles,
  UserRoundPlus
} from "lucide-react";
import { toast } from "sonner";

import { dispatchStatsRefresh } from "@/lib/events";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { Project, Task, TaskStatus, TeamMember } from "@/types";
import { ActivityFeed } from "@/components/activity-feed";

export function AdminDashboard() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskProjectId, setTaskProjectId] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);

      const {
        data: { user }
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const [projectsResult, tasksResult, teamResult] = await Promise.all([
        supabase.from("projects").select("id, name, description, owner_id").order("created_at", { ascending: false }),
        supabase
          .from("tasks")
          .select("id, title, status, assignee_id, project_id")
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, email").order("created_at", { ascending: false })
      ]);

      if (projectsResult.error || tasksResult.error || teamResult.error) {
        toast.error("Unable to load dashboard data.");
        setIsLoading(false);
        return;
      }

      const mappedProjects: Project[] = (projectsResult.data ?? []).map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        ownerId: project.owner_id
      }));

      const mappedTasks: Task[] = (tasksResult.data ?? []).map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status as TaskStatus,
        assigneeId: task.assignee_id,
        projectId: task.project_id
      }));

      const mappedMembers: TeamMember[] = (teamResult.data ?? []).map((member) => ({
        id: member.id,
        fullName: member.full_name || member.email?.split("@")[0] || "Team Member",
        email: member.email
      }));

      setProjects(mappedProjects);
      setTasks(mappedTasks);
      setTeamMembers(mappedMembers);
      setTaskProjectId(mappedProjects[0]?.id ?? "");
      setTaskAssigneeId(mappedMembers[0]?.id ?? "");
      setIsLoading(false);
    };

    void loadDashboardData();
  }, [supabase]);

  const totalWorkloads = useMemo(() => {
    return teamMembers.map((member) => ({
      ...member,
      activeTasks: tasks.filter((task) => task.assigneeId === member.id).length
    }));
  }, [tasks, teamMembers]);

  const filteredTasks = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();

    if (!normalized) {
      return tasks;
    }

    return tasks.filter((task) => task.title.toLowerCase().includes(normalized));
  }, [tasks, searchQuery]);

  const boardColumns: TaskStatus[] = [
    TaskStatus.TODO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.REVIEW,
    TaskStatus.DONE
  ];

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!projectName.trim()) {
      toast.error("Project name is required.");
      return;
    }

    if (!currentUserId) {
      toast.error("Please sign in again to create a project.");
      return;
    }

    const optimisticProject: Project = {
      id: `temp-project-${Date.now()}`,
      name: projectName.trim(),
      description: projectDescription.trim() || "Execution-focused project stream.",
      ownerId: currentUserId
    };
    setProjects((previous) => [optimisticProject, ...previous]);

    const { data, error } = await supabase
      .from("projects")
      .insert({
        name: projectName.trim(),
        description: projectDescription.trim() || null,
        owner_id: currentUserId
      })
      .select("id, name, description, owner_id")
      .single();

    if (error || !data) {
      setProjects((previous) => previous.filter((project) => project.id !== optimisticProject.id));
      toast.error("Could not create project.");
      return;
    }

    setProjects((previous) =>
      previous.map((project) =>
        project.id === optimisticProject.id
          ? { id: data.id, name: data.name, description: data.description, ownerId: data.owner_id }
          : project
      )
    );

    // Log activity
    await supabase
      .from("activity_log")
      .insert({
        action: "CREATE",
        description: `Created project "${data.name}"`,
        created_by: currentUserId,
        metadata: {
          project_name: data.name,
          project_id: data.id
        }
      })
      .single();

    setProjectName("");
    setProjectDescription("");
    setModalOpen(false);
    toast.success("Project created. Team orchestration lane is ready.");
    dispatchStatsRefresh();
  }

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!taskTitle.trim() || !taskProjectId || !taskAssigneeId || !currentUserId) {
      toast.error("Fill project, assignee, and task title.");
      return;
    }

    const optimisticTask: Task = {
      id: `temp-task-${Date.now()}`,
      title: taskTitle.trim(),
      status: TaskStatus.TODO,
      assigneeId: taskAssigneeId,
      projectId: taskProjectId
    };
    setTasks((previous) => [optimisticTask, ...previous]);

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: taskTitle.trim(),
        status: TaskStatus.TODO,
        assignee_id: taskAssigneeId,
        project_id: taskProjectId,
        created_by: currentUserId
      })
      .select("id, title, status, assignee_id, project_id")
      .single();

    if (error || !data) {
      setTasks((previous) => previous.filter((task) => task.id !== optimisticTask.id));
      toast.error("Task creation failed.");
      return;
    }

    setTasks((previous) =>
      previous.map((task) =>
        task.id === optimisticTask.id
          ? {
              id: data.id,
              title: data.title,
              status: data.status as TaskStatus,
              assigneeId: data.assignee_id,
              projectId: data.project_id
            }
          : task
      )
    );
    setTaskTitle("");
    toast.success("Task created successfully.");
    dispatchStatsRefresh();
  }

  async function handleAssignment(taskId: string, assigneeId: string) {
    const previous = tasks;
    const targetTask = tasks.find((task) => task.id === taskId);
    const assignedMember = teamMembers.find((member) => member.id === assigneeId);

    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, assigneeId } : task)));

    const { error } = await supabase.from("tasks").update({ assignee_id: assigneeId }).eq("id", taskId);

    if (error) {
      setTasks(previous);
      toast.error("Assignment update failed.");
      return;
    }

    // Log activity
    if (targetTask && currentUserId && assignedMember) {
      await supabase
        .from("activity_log")
        .insert({
          action: "ASSIGN",
          description: `Assigned task "${targetTask.title}" to ${assignedMember.fullName}`,
          created_by: currentUserId,
          metadata: {
            task_title: targetTask.title,
            task_id: taskId,
            assigned_to: assignedMember.fullName,
            assigned_to_id: assigneeId
          }
        })
        .single();
    }

    toast.success(`Task assigned to ${assignedMember?.fullName ?? "team member"}.`);
  }

  async function updateTaskStatus(taskId: string, status: TaskStatus) {
    const previous = tasks;
    const targetTask = tasks.find((task) => task.id === taskId);
    
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status } : task)));

    const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);

    if (error) {
      setTasks(previous);
      toast.error("Status update failed.");
      return;
    }

    // Log activity
    if (targetTask && currentUserId) {
      const actionLabel = status === TaskStatus.DONE ? "completed" : `moved to ${status.replaceAll("_", " ")}`;
      await supabase
        .from("activity_log")
        .insert({
          action: status === TaskStatus.DONE ? "COMPLETE" : "UPDATE",
          description: `${status === TaskStatus.DONE ? "Completed" : "Updated"} task "${targetTask.title}"`,
          created_by: currentUserId,
          metadata: {
            task_title: targetTask.title,
            task_id: taskId,
            new_status: status
          }
        })
        .single();
    }

    toast.success(`Task moved to ${status.replaceAll("_", " ")}.`);
    dispatchStatsRefresh();
  }

  function getAssigneeName(task: Task): string {
    return teamMembers.find((member) => member.id === task.assigneeId)?.fullName ?? "Unassigned";
  }

  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <main className="space-y-5 xl:col-span-9">
      <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-6 shadow-glass backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-indigo-200/70">
              <Sparkles size={14} />
              Admin Command Center
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white">Command the full execution graph</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 rounded-lg border border-indigo-300/30 bg-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/35">
              <UserRoundPlus size={15} />
              Invite Member
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10">
              <CircleCheck size={15} />
              Review Sprint
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <article className="rounded-2xl border border-white/10 bg-slate-900/55 p-5 shadow-glass backdrop-blur-xl xl:col-span-4">
          <div className="flex items-center justify-between">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-300">
              <Columns3 size={14} />
              Project List
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-300/30 bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-100 transition hover:bg-indigo-500/35"
            >
              <Plus size={13} />
              Create New
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {projects.map((project) => (
              <div key={project.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-white">{project.name}</p>
                <p className="mt-1 text-sm text-slate-300">{project.description}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-900/55 p-5 shadow-glass backdrop-blur-xl xl:col-span-8">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-300">
            <ClipboardList size={14} />
            Create Task
          </p>
          <form onSubmit={handleCreateTask} className="mt-4 grid gap-3">
            <input
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder="Task title"
              className="w-full rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={taskProjectId}
                onChange={(event) => setTaskProjectId(event.target.value)}
                className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="" disabled>
                  Select project
                </option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <select
                value={taskAssigneeId}
                onChange={(event) => setTaskAssigneeId(event.target.value)}
                className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="" disabled>
                  Select assignee
                </option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-lg border border-indigo-300/35 bg-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-100 hover:bg-indigo-500/35"
            >
              Create Task
            </button>
          </form>
        </article>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-5 shadow-glass backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Task Board</p>
          <div className="relative w-full max-w-sm">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search task by title..."
              className="w-full rounded-lg border border-white/20 bg-slate-900/70 py-2 pl-9 pr-3 text-sm text-white outline-none"
            />
          </div>
        </div>
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading tasks...</p>
        ) : (
          <div className="grid gap-3 xl:grid-cols-4">
            {boardColumns.map((column) => (
              <div
                key={column}
                className="min-h-[260px] rounded-xl border border-white/10 bg-white/5 p-3"
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggingTaskId) {
                    void updateTaskStatus(draggingTaskId, column);
                    setDraggingTaskId(null);
                  }
                }}
              >
                <p className="mb-3 text-xs uppercase tracking-[0.15em] text-indigo-200/70">
                  {column.replaceAll("_", " ")}
                </p>
                <div className="space-y-2">
                  {filteredTasks
                    .filter((task) => task.status === column)
                    .map((task) => (
                      <article
                        key={task.id}
                        draggable
                        onDragStart={() => setDraggingTaskId(task.id)}
                        className="cursor-grab rounded-lg border border-white/10 bg-slate-950/60 p-3"
                      >
                        <p className="text-sm font-medium text-white">{task.title}</p>
                        <p className="mt-1 text-xs text-slate-400">Assignee: {getAssigneeName(task)}</p>
                        <div className="mt-2 space-y-2">
                          <select
                            value={task.assigneeId ?? ""}
                            onChange={(event) => handleAssignment(task.id, event.target.value)}
                            className="w-full rounded-md border border-white/20 bg-slate-950/80 px-2 py-1 text-xs text-slate-100 outline-none"
                          >
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.fullName}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              updateTaskStatus(
                                task.id,
                                column === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE
                              )
                            }
                            className="w-full rounded-md border border-emerald-300/25 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200"
                          >
                            Toggle DONE
                          </button>
                        </div>
                      </article>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-5 shadow-glass backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Team Workload Heatmap</p>
            <p className="mt-1 text-sm text-slate-400">Real-time capacity overview</p>
          </div>
          <div className="flex gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <span className="text-slate-400">Optimal</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-400"></div>
              <span className="text-slate-400">At Capacity</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              <span className="text-slate-400">Overloaded</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {totalWorkloads.map((member) => {
            const optimalCapacity = 5;
            const maxCapacity = 8;
            const percentage = Math.min((member.activeTasks / optimalCapacity) * 100, 100);
            const isOptimal = member.activeTasks <= optimalCapacity;
            const isOverloaded = member.activeTasks > maxCapacity;
            
            let barColor = "from-emerald-500 to-emerald-400";
            let statusLabel = "Optimal";
            let statusColor = "text-emerald-200";
            let statusBg = "bg-emerald-500/10";
            let statusBorder = "border-emerald-300/30";

            if (isOverloaded) {
              barColor = "from-red-500 to-red-400";
              statusLabel = "Overloaded";
              statusColor = "text-red-200";
              statusBg = "bg-red-500/10";
              statusBorder = "border-red-300/30";
            } else if (member.activeTasks > optimalCapacity) {
              barColor = "from-amber-500 to-amber-400";
              statusLabel = "At Capacity";
              statusColor = "text-amber-200";
              statusBg = "bg-amber-500/10";
              statusBorder = "border-amber-300/30";
            }

            return (
              <article
                key={member.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4 hover:border-white/20 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-white">{member.fullName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{member.email || "team member"}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${statusColor} ${statusBg} ${statusBorder}`}>
                    {statusLabel}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-400">
                      <span className="font-semibold text-white">{member.activeTasks}</span> / {optimalCapacity} tasks
                    </p>
                    <p className="text-xs text-slate-400">
                      {Math.round(percentage)}%
                    </p>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950/50 border border-white/10 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${barColor} transition-all duration-300 rounded-full`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {member.activeTasks > optimalCapacity && (
                  <p className="mt-3 text-xs text-slate-400">
                    💡 Consider redistributing {member.activeTasks - optimalCapacity} task{member.activeTasks - optimalCapacity === 1 ? '' : 's'} to balance the team.
                  </p>
                )}
              </article>
            );
          })}
        </div>

        {totalWorkloads.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-slate-400">No team members yet. Invite members to get started.</p>
          </div>
        )}
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleCreateProject}
            className="w-full max-w-lg space-y-4 rounded-2xl border border-indigo-300/20 bg-slate-950/90 p-6 shadow-glass backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Create New Project</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md border border-white/15 px-2 py-1 text-xs text-slate-300"
              >
                Close
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Project name"
                className="w-full rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none"
              />
              <textarea
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
                placeholder="Project description"
                rows={4}
                className="w-full rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg border border-indigo-300/35 bg-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-100 hover:bg-indigo-500/35"
            >
              Launch Project Stream
            </button>
          </form>
        </div>
      ) : null}
      </main>

      <aside className="xl:col-span-3">
        <ActivityFeed />
      </aside>
    </div>
  );
}
