import type { Metadata } from "next";
import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";
import { searchCatalog } from "@/lib/catalog";
import { getLists, getUserListMap } from "@/lib/lists";
import { parseSearchQuery } from "@/lib/search-query";

export const metadata: Metadata = { title: "ძებნა | Animeb" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SearchPage({ searchParams }: Props) {
  const query = parseSearchQuery(await searchParams);
  const user = await getSession();
  const [page, lists, listMap] = await Promise.all([
    searchCatalog(query),
    getLists(),
    user ? getUserListMap(user.id) : Promise.resolve(new Map<number, number>()),
  ]);
  const userLists: Record<number, number> = {};
  for (const [id, listId] of listMap) userLists[id] = listId;
  return <Home user={user} lists={lists} search={{ ...page, query, userLists }} />;
}
