import type { Metadata } from "next";
import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";
import { getHomeData } from "@/lib/catalog";

export const metadata: Metadata = { title: "განრიგი | Animeb" };
export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const user = await getSession();
  const data = await getHomeData(user?.id);
  return <Home user={user} hub={{ kind: "schedule", items: data.schedule }} />;
}
