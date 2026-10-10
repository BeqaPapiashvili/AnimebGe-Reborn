import { getSession } from "@/lib/auth";
import { buyShopItem, getShop, shopFilters, wearShopItem } from "@/lib/shop";

export async function GET(request: Request) {
  const user = await getSession();
  const params = new URL(request.url).searchParams;
  const raw = params.get("type");
  const type = raw === "avatar" || raw === "cover" || raw === "frame" ? raw : "all";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const shop = await getShop(user?.id, type, page, shopFilters(params));
  return Response.json({ pages: shop.pages, items: shop.items });
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ ok: false, error: "შესვლა სჭირდება." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { action?: string; id?: number };
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ ok: false }, { status: 400 });
  const error = body.action === "wear" ? await wearShopItem(user.id, id) : await buyShopItem(user.id, id);
  return Response.json(error ? { ok: false, error } : { ok: true }, { status: error ? 400 : 200 });
}
