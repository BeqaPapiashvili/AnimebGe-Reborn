import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { MessageCircle, Search } from "lucide-react";
import { AdminComments } from "@/components/admin-comments";
import { deleteAdminComment, listAdminComments, setCommentPinned, setCommentVisible, updateAdminComment } from "@/lib/admin-control";
import { recordAudit } from "@/lib/audit";
import { getSession, isAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "კომენტარები | ადმინპანელი" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function act(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  const id = Number(formData.get("id"));
  const kind = String(formData.get("kind"));
  if (kind === "hide") await setCommentVisible(id, false);
  else if (kind === "show") await setCommentVisible(id, true);
  else if (kind === "pin") await setCommentPinned(id, formData.get("pinned") !== "1");
  else if (kind === "delete") await deleteAdminComment(id);
  const action = kind === "hide" ? "დამალვა" : kind === "show" ? "ჩვენება" : kind === "pin" ? "მიმაგრება" : kind === "delete" ? "წაშლა" : kind;
  if (action) await recordAudit(user, "კომენტარი", `${action} · ${id}`);
  revalidatePath("/admin/comments");
}

async function save(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  const id = Number(formData.get("id"));
  await updateAdminComment(id, String(formData.get("text") ?? ""));
  await recordAudit(user, "კომენტარი", `ტექსტი · ${id}`);
  revalidatePath("/admin/comments");
}

export default async function CommentsPage({ searchParams }: Props) {
  const user = await getSession();
  if (!user || !isAdmin(user)) notFound();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const status = params.status === "visible" || params.status === "hidden" || params.status === "pinned" ? params.status : "";
  const list = await listAdminComments(q, status);
  const href = (value: string) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (value) query.set("status", value);
    const text = query.toString();
    return text ? `/admin/comments?${text}` : "/admin/comments";
  };
  return (
    <div className="min-h-screen bg-[#020202] pb-20 text-white">
      <div className="sticky top-0 z-40 border-b border-white/5 bg-[#020202]/80 px-8 py-8 backdrop-blur-2xl lg:px-12">
        <div className="mx-auto flex max-w-[1600px] items-center gap-6">
          <div className="grid size-16 place-items-center rounded-[2rem] border border-white/10 bg-white/5">
            <MessageCircle className="size-8 text-primary" />
          </div>
          <div>
            <h1 className="mb-2 text-4xl tracking-tight">კომენტარები</h1>
            <p className="text-[10px] tracking-[0.2em] text-white/30 uppercase">{list.total} სულ · {list.hidden} დამალული · {list.pinned} ჩამაგრებული</p>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] space-y-8 px-8 pt-10 lg:px-12">
        <form action="/admin/comments" className="flex flex-col gap-4 lg:flex-row lg:items-center">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <div className="relative w-full lg:max-w-xl">
            <Search className="pointer-events-none absolute top-1/2 left-6 size-5 -translate-y-1/2 text-white/20" />
            <input name="q" defaultValue={q} placeholder="ავტორი, ტექსტი ან ანიმე" aria-label="ძებნა" className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-5 pr-6 pl-16 text-sm outline-none placeholder:text-white/20 focus:border-primary/50" />
          </div>
          <div className="flex flex-wrap rounded-2xl border border-white/10 bg-white/[0.03] p-1">
            {[["", "ყველა"], ["visible", "ჩანს"], ["hidden", "დამალული"], ["pinned", "ჩამაგრებული"]].map(([value, label]) => (
              <a key={value || "all"} href={href(value)} className={`rounded-xl px-4 py-3 text-sm ${status === value ? "bg-primary text-white" : "text-white/45"}`}>{label}</a>
            ))}
          </div>
        </form>
        <AdminComments rows={list.rows} act={act} save={save} />
      </div>
    </div>
  );
}
