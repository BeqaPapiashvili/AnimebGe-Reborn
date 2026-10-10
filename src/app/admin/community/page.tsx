import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { MessageSquare, Search } from "lucide-react";
import { AdminCommunityBoard } from "@/components/admin-community-board";
import { listAdminCommunity, removeAdminCommunity, removeAdminCommunityReply, saveAdminCommunity, toggleAdminCommunityPin } from "@/lib/admin-control";
import { recordAudit } from "@/lib/audit";
import { getSession, isAdmin } from "@/lib/auth";
import { communityCategories } from "@/lib/community-types";

export const metadata: Metadata = { title: "საზოგადოება | ადმინპანელი" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function pin(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  const id = Number(formData.get("id"));
  await toggleAdminCommunityPin(id);
  await recordAudit(user, "საზოგადოება", `მიმაგრება · ${id}`);
  revalidatePath("/admin/community");
}

async function remove(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  const id = Number(formData.get("id"));
  await removeAdminCommunity(id);
  await recordAudit(user, "საზოგადოება", `წაშლა · ${id}`);
  revalidatePath("/admin/community");
}

async function save(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  const id = Number(formData.get("id"));
  await saveAdminCommunity(id, String(formData.get("title") ?? ""), String(formData.get("category") ?? ""), String(formData.get("text") ?? ""));
  await recordAudit(user, "საზოგადოება", `შენახვა · ${id}`);
  revalidatePath("/admin/community");
}

async function dropReply(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  const id = Number(formData.get("id"));
  await removeAdminCommunityReply(id);
  await recordAudit(user, "საზოგადოება", `პასუხის წაშლა · ${id}`);
  revalidatePath("/admin/community");
}

export default async function CommunityPage({ searchParams }: Props) {
  const user = await getSession();
  if (!user || !isAdmin(user)) notFound();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const category = communityCategories.some((item) => item.id === params.category) ? String(params.category) : "";
  const pinnedOnly = params.pinned === "1";
  const list = await listAdminCommunity(q, category, pinnedOnly);
  const href = (nextCategory: string, nextPinned: boolean) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (nextCategory) query.set("category", nextCategory);
    if (nextPinned) query.set("pinned", "1");
    const text = query.toString();
    return text ? `/admin/community?${text}` : "/admin/community";
  };
  return (
    <div className="min-h-screen bg-[#020202] pb-20 text-white">
      <div className="sticky top-0 z-40 border-b border-white/5 bg-[#020202]/80 px-8 py-8 backdrop-blur-2xl lg:px-12">
        <div className="mx-auto flex max-w-[1600px] items-center gap-6">
          <div className="grid size-16 place-items-center rounded-[2rem] border border-white/10 bg-white/5">
            <MessageSquare className="size-8 text-primary" />
          </div>
          <div>
            <h1 className="mb-2 text-4xl tracking-tight">საზოგადოება</h1>
            <p className="text-[10px] tracking-[0.2em] text-white/30 uppercase">{list.total} პოსტი · {list.pinned} ჩამაგრებული</p>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] space-y-8 px-8 pt-10 lg:px-12">
        <form action="/admin/community" className="flex flex-col gap-4">
          {category ? <input type="hidden" name="category" value={category} /> : null}
          {pinnedOnly ? <input type="hidden" name="pinned" value="1" /> : null}
          <div className="relative w-full lg:max-w-xl">
            <Search className="pointer-events-none absolute top-1/2 left-6 size-5 -translate-y-1/2 text-white/20" />
            <input name="q" defaultValue={q} placeholder="სათაური ან ავტორი" aria-label="ძებნა" className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-5 pr-6 pl-16 text-sm outline-none placeholder:text-white/20 focus:border-primary/50" />
          </div>
          <div className="flex flex-wrap gap-2">
            {[["", "ყველა"], ...communityCategories.map((item) => [item.id, item.label]), ["pinned", "ჩამაგრებული"]].map(([value, label]) => {
              const on = value === "pinned" ? pinnedOnly && !category : category === value && !pinnedOnly;
              const target = value === "pinned" ? href("", true) : href(value, false);
              return <a key={value || "all"} href={target} className={`rounded-xl border px-4 py-2.5 text-sm ${on ? "border-primary bg-primary text-white" : "border-white/10 text-white/45"}`}>{label}</a>;
            })}
          </div>
        </form>
        <AdminCommunityBoard rows={list.rows} categories={communityCategories.map((item) => ({ id: item.id, label: item.label }))} pin={pin} save={save} remove={remove} dropReply={dropReply} />
      </div>
    </div>
  );
}
