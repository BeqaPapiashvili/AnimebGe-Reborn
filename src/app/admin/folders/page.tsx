import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { Folder, Search } from "lucide-react";
import { AdminFoldersBoard } from "@/components/admin-folders-board";
import { deleteAdminFolder, listAdminFolders, saveAdminFolder, setFolderVisibility } from "@/lib/admin-control";
import { recordAudit } from "@/lib/audit";
import { getSession, isAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "სიები | ადმინპანელი" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const labels = [
  ["public", "საჯარო"],
  ["unlisted", "ბმულით"],
  ["private", "პირადი"],
] as const;

async function visibility(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  const id = Number(formData.get("id"));
  await setFolderVisibility(id, String(formData.get("visibility") ?? ""));
  await recordAudit(user, "სია", `ხილვადობა · ${id}`);
  revalidatePath("/admin/folders");
}

async function save(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  const id = Number(formData.get("id"));
  await saveAdminFolder(id, String(formData.get("name") ?? ""), String(formData.get("description") ?? ""));
  await recordAudit(user, "სია", `შენახვა · ${id}`);
  revalidatePath("/admin/folders");
}

async function remove(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  const id = Number(formData.get("id"));
  await deleteAdminFolder(id);
  await recordAudit(user, "სია", `წაშლა · ${id}`);
  revalidatePath("/admin/folders");
}

export default async function FoldersPage({ searchParams }: Props) {
  const user = await getSession();
  if (!user || !isAdmin(user)) notFound();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const filter = labels.some(([value]) => value === params.visibility) ? String(params.visibility) : "";
  const list = await listAdminFolders(q, filter);
  const href = (value: string) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (value) query.set("visibility", value);
    const text = query.toString();
    return text ? `/admin/folders?${text}` : "/admin/folders";
  };
  return (
    <div className="min-h-screen bg-[#020202] pb-20 text-white">
      <div className="sticky top-0 z-40 border-b border-white/5 bg-[#020202]/80 px-8 py-8 backdrop-blur-2xl lg:px-12">
        <div className="mx-auto flex max-w-[1600px] items-center gap-6">
          <div className="grid size-16 place-items-center rounded-[2rem] border border-white/10 bg-white/5">
            <Folder className="size-8 text-primary" />
          </div>
          <div>
            <h1 className="mb-2 text-4xl tracking-tight">სიები</h1>
            <p className="text-[10px] tracking-[0.2em] text-white/30 uppercase">{list.total} სია · {list.public} საჯარო · {list.private} პირადი</p>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] space-y-8 px-8 pt-10 lg:px-12">
        <form action="/admin/folders" className="flex flex-col gap-4 lg:flex-row lg:items-center">
          {filter ? <input type="hidden" name="visibility" value={filter} /> : null}
          <div className="relative w-full lg:max-w-xl">
            <Search className="pointer-events-none absolute top-1/2 left-6 size-5 -translate-y-1/2 text-white/20" />
            <input name="q" defaultValue={q} placeholder="სიის ან მფლობელის სახელი" aria-label="ძებნა" className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-5 pr-6 pl-16 text-sm outline-none placeholder:text-white/20 focus:border-primary/50" />
          </div>
          <div className="flex flex-wrap rounded-2xl border border-white/10 bg-white/[0.03] p-1">
            {[["", "ყველა"], ...labels].map(([value, label]) => (
              <a key={value || "all"} href={href(value)} className={`rounded-xl px-4 py-3 text-sm ${filter === value ? "bg-primary text-white" : "text-white/45"}`}>{label}</a>
            ))}
          </div>
        </form>
        <AdminFoldersBoard rows={list.rows} save={save} visibility={visibility} remove={remove} />
      </div>
    </div>
  );
}
