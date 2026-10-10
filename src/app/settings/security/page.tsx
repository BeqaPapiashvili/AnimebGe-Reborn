import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";
import { getAccount } from "@/lib/settings";

export const metadata: Metadata = { title: "უსაფრთხოება | Animeb" };
export const dynamic = "force-dynamic";

export default async function SettingsSecurityPage() {
  const user = await getSession();
  if (!user) redirect("/");
  const account = await getAccount(user.id);
  if (!account) redirect("/");
  return <Home user={user} settings={{ section: "security", account }} />;
}
