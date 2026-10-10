import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";
import { findProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const handle = decodeURIComponent(name);
  return { title: `@${handle} | Animeb` };
}

export default async function ProfilePage({ params }: Props) {
  const { name } = await params;
  const user = await getSession();
  const profile = await findProfile(decodeURIComponent(name), user?.id);
  if (!profile) notFound();
  return <Home user={user} profile={profile} />;
}
