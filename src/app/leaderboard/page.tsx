import type { Metadata } from "next";
import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";
import { leaderboardPage } from "@/lib/hub";

export const metadata: Metadata = { title: "Leaderboard | Animeb" };
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const user = await getSession();
  return <Home user={user} hub={{ kind: "ranks", page: await leaderboardPage() }} />;
}
