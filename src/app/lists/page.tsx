import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";
import { listFolders } from "@/lib/folders";

export const metadata: Metadata = { title: "ჩემი სიები | Animeb" };
export const dynamic = "force-dynamic";

export default async function ListsPage() {
  const user = await getSession();
  if (!user) redirect("/");
  const folders = await listFolders(user.id);
  return <Home user={user} myLists={{ folders }} />;
}
