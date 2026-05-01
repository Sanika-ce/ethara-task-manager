"use client";

import { UserRole } from "@/types";

export function useRoleGuard(role: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(role);
}
