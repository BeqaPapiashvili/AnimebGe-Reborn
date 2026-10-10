import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { getSession, isAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user || !isAdmin(user)) notFound();
  return <AdminShell name={user.name}>{children}</AdminShell>;
}
