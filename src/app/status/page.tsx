import type { Metadata } from "next";
import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";
import { siteStatus } from "@/lib/hub";

export const metadata: Metadata = { title: "სტატუსი | Animeb" };
export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const [user, status] = await Promise.all([getSession(), siteStatus()]);
  return <Home user={user} hub={{ kind: "status", ...status }} />;
}
