import { Home } from "@/components/home";
import { PlayView } from "@/components/play-view";
import { getSession } from "@/lib/auth";
import { loadPlay } from "@/lib/play";

export async function PlayScreen({
  section,
  id,
  name,
  searchParams,
}: {
  section: string;
  id?: number;
  name?: string;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const one = (key: string) => (typeof params[key] === "string" ? params[key] : "");
  const user = await getSession();
  const data = await loadPlay(section, user, {
    id,
    name,
    q: one("q") || name || "",
    title: one("title"),
    author: one("author"),
    rarity: one("rarity"),
    exclude: one("exclude"),
    sort: one("sort"),
    dir: one("dir"),
    page: Math.max(1, Number(one("page")) || 1),
    note: one("note"),
  });
  return <Home user={user} panel={<PlayView data={data} />} />;
}
