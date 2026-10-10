import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Home } from "@/components/home";
import { getSession, isAdmin } from "@/lib/auth";
import { getCommunityPost } from "@/lib/community";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await getCommunityPost(Number(id));
  return { title: data ? `${data.post.title} | Animeb` : "პოსტი | Animeb" };
}

export default async function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSession();
  const data = await getCommunityPost(Number(id), user?.id);
  if (!data) notFound();
  if (user) {
    data.page.viewer = { name: user.name, avatar: user.avatar, frame: user.frame };
    data.page.admin = isAdmin(user);
  }
  return <Home user={user} hub={{ kind: "community-post", page: data.page, post: data.post }} />;
}
