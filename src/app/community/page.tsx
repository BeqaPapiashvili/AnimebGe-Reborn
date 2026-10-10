import type { Metadata } from "next";
import { Home } from "@/components/home";
import { getSession, isAdmin } from "@/lib/auth";
import { getCommunityPage } from "@/lib/community";
import { communityCategories, type CommunityCategory } from "@/lib/community-types";

export const metadata: Metadata = { title: "საზოგადოება | Animeb" };
export const dynamic = "force-dynamic";

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const cat = String((await searchParams).cat ?? "");
  const topic = communityCategories.some((item) => item.id === cat) ? (cat as CommunityCategory) : "all";
  const user = await getSession();
  const page = await getCommunityPage(user?.id);
  if (user) {
    page.viewer = { name: user.name, avatar: user.avatar, frame: user.frame };
    page.admin = isAdmin(user);
  }
  return <Home user={user} hub={{ kind: "community", page, topic }} />;
}
