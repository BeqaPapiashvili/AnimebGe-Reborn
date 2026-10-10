import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { Search, Tv } from "lucide-react";
import { AdminRoomsBoard } from "@/components/admin-rooms-board";
import { closeAdminRoom, listAdminRooms, saveAdminRoom } from "@/lib/admin-control";
import { recordAudit } from "@/lib/audit";
import { getSession, isAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "ოთახები | ადმინპანელი" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function close(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  const code = String(formData.get("code") ?? "");
  await closeAdminRoom(code);
  await recordAudit(user, "ოთახი", `დახურვა · ${code.slice(0, 20)}`);
  revalidatePath("/admin/rooms");
}

async function save(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  const code = String(formData.get("code") ?? "");
  await saveAdminRoom(code, String(formData.get("title") ?? ""), String(formData.get("visibility") ?? ""));
  await recordAudit(user, "ოთახი", `შენახვა · ${code.slice(0, 20)}`);
  revalidatePath("/admin/rooms");
}

export default async function RoomsPage({ searchParams }: Props) {
  const user = await getSession();
  if (!user || !isAdmin(user)) notFound();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const status = params.status === "open" || params.status === "closed" ? params.status : "";
  const list = await listAdminRooms(q, status);
  const href = (value: string) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (value) query.set("status", value);
    const text = query.toString();
    return text ? `/admin/rooms?${text}` : "/admin/rooms";
  };
  return (
    <div className="min-h-screen bg-[#020202] pb-20 text-white">
      <div className="sticky top-0 z-40 border-b border-white/5 bg-[#020202]/80 px-8 py-8 backdrop-blur-2xl lg:px-12">
        <div className="mx-auto flex max-w-[1600px] items-center gap-6">
          <div className="grid size-16 place-items-center rounded-[2rem] border border-white/10 bg-white/5">
            <Tv className="size-8 text-primary" />
          </div>
          <div>
            <h1 className="mb-2 text-4xl tracking-tight">ოთახები</h1>
            <p className="text-[10px] tracking-[0.2em] text-white/30 uppercase">{list.open} ღია · {Math.max(0, list.total - list.open)} დახურული</p>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] space-y-8 px-8 pt-10 lg:px-12">
        <form action="/admin/rooms" className="flex flex-col gap-4 lg:flex-row lg:items-center">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <div className="relative w-full lg:max-w-xl">
            <Search className="pointer-events-none absolute top-1/2 left-6 size-5 -translate-y-1/2 text-white/20" />
            <input name="q" defaultValue={q} placeholder="სათაური, მასპინძელი ან კოდი" aria-label="ძებნა" className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-5 pr-6 pl-16 text-sm outline-none placeholder:text-white/20 focus:border-primary/50" />
          </div>
          <div className="flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
            {[["", "ყველა"], ["open", "ღია"], ["closed", "დახურული"]].map(([value, label]) => (
              <a key={value || "all"} href={href(value)} className={`rounded-xl px-4 py-3 text-sm ${status === value ? "bg-primary text-white" : "text-white/45"}`}>{label}</a>
            ))}
          </div>
        </form>
        <AdminRoomsBoard rows={list.rows} save={save} close={close} />
      </div>
    </div>
  );
}
