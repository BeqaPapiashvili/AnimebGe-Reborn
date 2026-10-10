import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { Store } from "lucide-react";
import { AdminShop } from "@/components/admin-shop";
import { recordAudit } from "@/lib/audit";
import { getSession, isAdmin } from "@/lib/auth";
import { listAdminShop, saveAdminShopItem, setAdminShopActive, type ShopKind } from "@/lib/shop";

export const metadata: Metadata = { title: "მაღაზია | ადმინპანელი" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function save(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  const item = {
    id: Number(formData.get("id")) || 0,
    type: String(formData.get("type") ?? ""),
    name: String(formData.get("name") ?? ""),
    image: String(formData.get("image") ?? ""),
    price: Number(formData.get("price")),
    active: formData.get("active") === "1",
    limited: formData.get("limited") === "1",
    stock: Number(formData.get("stock")) || 1,
  };
  await saveAdminShopItem(item);
  await recordAudit(user, "მაღაზია", `${item.type} · ${item.name.slice(0, 40)} · ${item.price}`);
  revalidatePath("/admin/shop");
  revalidatePath("/shop");
}

async function toggle(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  const id = Number(formData.get("id"));
  const active = formData.get("active") !== "1";
  await setAdminShopActive(id, active);
  await recordAudit(user, "მაღაზია", `${active ? "ჩართვა" : "გამორთვა"} · ${id}`);
  revalidatePath("/admin/shop");
  revalidatePath("/shop");
}

export default async function AdminShopPage({ searchParams }: Props) {
  const user = await getSession();
  if (!user || !isAdmin(user)) notFound();
  const params = await searchParams;
  const type: ShopKind = params.type === "cover" || params.type === "frame" ? params.type : "avatar";
  const q = typeof params.q === "string" ? params.q : "";
  const page = Math.max(1, Number(params.page) || 1);
  const list = await listAdminShop(type, q, page);
  return (
    <div className="min-h-screen bg-[#020202] pb-20 text-white">
      <div className="sticky top-0 z-40 border-b border-white/5 bg-[#020202]/80 px-6 py-5 backdrop-blur-2xl lg:px-10">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4">
          <div className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/5">
            <Store className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl tracking-tight">მაღაზია</h1>
            <p className="text-[11px] text-white/35">{list.active} ჩართული · {list.total} სულ</p>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] px-6 pt-6 lg:px-10">
        <AdminShop type={type} q={q} page={page} pages={list.pages} found={list.found} counts={list.counts} rows={list.rows} save={save} toggle={toggle} />
      </div>
    </div>
  );
}
