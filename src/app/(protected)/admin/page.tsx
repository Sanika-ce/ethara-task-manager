import { AdminDashboard } from "@/components/admin-dashboard";
import { getCurrentUserContext } from "@/services/auth/authorization";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const user = await getCurrentUserContext();

  if (!user || user.role !== UserRole.ADMIN) {
    redirect("/workspace");
  }

  return <AdminDashboard />;
}
