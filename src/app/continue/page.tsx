import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";
import { getContinueItems } from "@/lib/continue";

export const metadata: Metadata = { title: "განაგრძე ყურება | Animeb" };
export const dynamic = "force-dynamic";

export default async function ContinuePage() {
  const user = await getSession();
  if (!user) redirect("/");
  const items = await getContinueItems(user.id);
  return <Home user={user} continueWatch={items} />;
}
