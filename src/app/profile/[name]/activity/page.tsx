import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";
import { getActivity } from "@/lib/profile";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const handle = decodeURIComponent(name);
  return { title: `@${handle} · აქტივობა | Animeb` };
}

export default async function ActivityPage({ params }: Props) {
  const { name } = await params;
  const user = await getSession();
  const activity = await getActivity(decodeURIComponent(name), user?.id);
  if (!activity) notFound();
  return <Home user={user} activity={activity} />;
}
