import type { Metadata } from "next";
import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";
import { profileCard } from "@/lib/profile";
import { getShop, shopFilters } from "@/lib/shop";

export const metadata: Metadata = { title: "მაღაზია | Animeb" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ShopPage({ searchParams }: Props) {
  const user = await getSession();
  const params = await searchParams;
  const type = params.type === "avatar" || params.type === "cover" || params.type === "frame" ? params.type : "all";
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (typeof value === "string") query.set(key, value);
  const filters = shopFilters(query);
  const page = Math.max(1, Number(params.page) || 1);
  const [shop, face] = await Promise.all([
    getShop(user?.id, type, page, filters),
    user ? profileCard(user.id) : Promise.resolve(null),
  ]);
  return <Home user={user} hub={{ kind: "shop", signedIn: !!user, type, filters, page, balance: shop.balance, pages: shop.pages, items: shop.items, face }} />;
}
