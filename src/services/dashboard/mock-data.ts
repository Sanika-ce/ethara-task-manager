import { Project, StatMetric, Task, TaskStatus } from "@/types";

export const seedProjects: Project[] = [
  {
    id: "proj-platform-refresh",
    name: "Platform Refresh",
    description: "Upgrade core workflow and delivery visibility.",
    ownerId: "owner-1"
  },
  {
    id: "proj-enterprise-rollout",
    name: "Enterprise Rollout",
    description: "Coordinate enterprise onboarding and integrations.",
    ownerId: "owner-1"
  }
];

export const seedTasks: Task[] = [
  {
    id: "task-1",
    projectId: "proj-platform-refresh",
    title: "Finalize sprint dependency map",
    status: TaskStatus.TODO,
    assigneeId: "member-1"
  },
  {
    id: "task-2",
    projectId: "proj-platform-refresh",
    title: "Review production release checklist",
    status: TaskStatus.IN_PROGRESS,
    assigneeId: "member-2"
  },
  {
    id: "task-3",
    projectId: "proj-enterprise-rollout",
    title: "Validate SSO provisioning flow",
    status: TaskStatus.REVIEW,
    assigneeId: "member-3"
  },
  {
    id: "task-4",
    projectId: "proj-enterprise-rollout",
    title: "Sign off stakeholder launch brief",
    status: TaskStatus.TODO,
    assigneeId: "member-1"
  }
];

export const defaultStatMetrics: StatMetric[] = [
  { label: "Total Projects", value: "12" },
  { label: "Tasks Pending", value: "37" },
  { label: "Team Members", value: "18" }
];
