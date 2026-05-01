import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getCurrentUserContext } from "@/services/auth/authorization";
import { UserRole } from "@/types";

export default async function ProtectedLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const userContext = await getCurrentUserContext();

  if (!userContext) {
    redirect("/auth/sign-in");
  }

  const roleConfig: Record<UserRole, { canAccessAdmin: boolean }> = {
    [UserRole.ADMIN]: { canAccessAdmin: true },
    [UserRole.MEMBER]: { canAccessAdmin: false }
  };

  const permissions = roleConfig[userContext.role];

  return (
    <AppShell
      user={userContext}
      permissions={permissions}
    >
      {children}
    </AppShell>
  );
}
