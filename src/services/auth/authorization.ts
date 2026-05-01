import { createSupabaseServerClient } from "@/lib/supabase-server";
import { SyncroUser, UserRole } from "@/types";

const protectedRoutes: Array<{ path: string; allowedRoles: UserRole[] }> = [
  { path: "/admin", allowedRoles: [UserRole.ADMIN] },
  { path: "/workspace", allowedRoles: [UserRole.ADMIN, UserRole.MEMBER] }
];

export async function getCurrentUserContext(): Promise<SyncroUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return null;
  }

  const role = (user.user_metadata.role as UserRole | undefined) ?? UserRole.MEMBER;
  const fullName =
    (user.user_metadata.full_name as string | undefined) ??
    user.email.split("@")[0] ??
    "Team Member";

  return {
    id: user.id,
    email: user.email,
    fullName,
    role
  };
}

export function canAccessRoute(pathname: string, role: UserRole): boolean {
  const matchedRule = protectedRoutes.find((route) => pathname.startsWith(route.path));

  if (!matchedRule) {
    return true;
  }

  return matchedRule.allowedRoles.includes(role);
}
