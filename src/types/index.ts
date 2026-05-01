export enum UserRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER"
}

export enum TaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  REVIEW = "REVIEW",
  DONE = "DONE"
}

export enum TaskPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH"
}

export type SyncroUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  assigneeId: string | null;
  priority?: TaskPriority;
};

export type StatMetric = {
  label: string;
  value: string;
};

export type TeamMember = {
  id: string;
  fullName: string;
  email: string | null;
};
