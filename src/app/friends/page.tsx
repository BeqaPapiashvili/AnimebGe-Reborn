import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";
import { getFriendsPage } from "@/lib/friends";

export const metadata: Metadata = { title: "მეგობრები | Animeb" };
export const dynamic = "force-dynamic";

const tabs = new Set(["friends", "requests", "notices", "blocked"]);

export default async function FriendsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await getSession();
  if (!user) redirect("/");
  const { tab } = await searchParams;
  const page = await getFriendsPage(user.id);
  return <Home user={user} friends={{ page, tab: tabs.has(tab ?? "") ? (tab as "friends" | "requests" | "notices" | "blocked") : "friends" }} />;
}
