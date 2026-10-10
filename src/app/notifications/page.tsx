import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";
import { listNotifications } from "@/lib/notifications";

export const metadata: Metadata = { title: "შეტყობინებები | Animeb" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getSession();
  if (!user) redirect("/");
  const inbox = await listNotifications(user.id);
  return <Home user={user} inbox={inbox.items} />;
}
