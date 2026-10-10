import type { Metadata } from "next";
import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";
import { levelCap, levelLadder } from "@/lib/levels";
import { loadLevelSpans, readXpRules } from "@/lib/site-config";

export const metadata: Metadata = { title: "დონეების სისტემა | Animeb" };
export const dynamic = "force-dynamic";

export default async function LevelsPage() {
  const user = await getSession();
  await loadLevelSpans();
  const rules = await readXpRules();
  return <Home user={user} hub={{ kind: "levels", progressHref: user ? `/@${encodeURIComponent(user.name)}` : undefined, ranks: levelLadder(), cap: levelCap(), rules }} />;
}
