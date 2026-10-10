import type { Metadata } from "next";
import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";
import { getHelp } from "@/lib/site-config";

export const metadata: Metadata = { title: "დახმარება | Animeb" };
export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const [user, items] = await Promise.all([getSession(), getHelp()]);
  return <Home user={user} hub={{ kind: "help", items }} />;
}
