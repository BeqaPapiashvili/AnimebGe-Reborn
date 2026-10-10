import type { Metadata } from "next";
import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";
import { getGuide } from "@/lib/site-config";

export const metadata: Metadata = { title: "საზოგადოების წესები | Animeb" };
export const dynamic = "force-dynamic";

export default async function GuidePage() {
  const [user, doc] = await Promise.all([getSession(), getGuide()]);
  return <Home user={user} hub={{ kind: "guide", doc }} />;
}
