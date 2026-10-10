import type { Metadata } from "next";
import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";
import { getWatchlist } from "@/lib/catalog";
import { getLists } from "@/lib/lists";
import { emptyFacets, parseWatchQuery } from "@/lib/watchlist";

export const metadata: Metadata = { title: "სია | Animeb" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function WatchlistPage({ searchParams }: Props) {
  const query = parseWatchQuery(await searchParams);
  const user = await getSession();
  const [lists, page] = await Promise.all([
    getLists(),
    user ? getWatchlist(user.id, query) : Promise.resolve({ items: [], total: 0, facets: emptyFacets }),
  ]);
  return <Home user={user} lists={lists} watchlist={{ page, query }} />;
}
