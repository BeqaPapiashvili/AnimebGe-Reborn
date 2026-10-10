import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { AlertCircle, Check, ExternalLink, Pencil, RotateCcw } from "lucide-react";
import { getSession, isAdmin } from "@/lib/auth";
import { listReports, setReportStatus } from "@/lib/hub";

export const metadata: Metadata = { title: "რეპორტები | ადმინპანელი" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function mark(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await setReportStatus(id, formData.get("status") === "done" ? "done" : "open");
  revalidatePath("/admin/reports");
}

function when(value: string) {
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ka-GE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function reasonOf(message: string) {
  return message.split("\n")[0]?.match(/^მიზეზი:\s*(.+)$/)?.[1] ?? "";
}

export default async function ReportsPage({ searchParams }: Props) {
  const user = await getSession();
  if (!user || !isAdmin(user)) notFound();
  const params = await searchParams;
  const status = params.status === "done" || params.status === "all" ? params.status : "open";
  const list = await listReports(status === "all" ? "" : status);
  const href = (value: string) => (value === "open" ? "/admin/reports" : `/admin/reports?status=${value}`);
  return (
    <div className="min-h-screen bg-[#020202] pb-20 text-white">
      <div className="sticky top-0 z-40 border-b border-white/5 bg-[#020202]/80 px-8 py-8 backdrop-blur-2xl lg:px-12">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="grid size-16 place-items-center rounded-[2rem] border border-white/10 bg-white/5">
              <AlertCircle className="size-8 text-primary" />
            </div>
            <div>
              <h1 className="mb-2 text-4xl tracking-tight">რეპორტები</h1>
              <p className="text-[10px] tracking-[0.2em] text-white/30 uppercase">{list.open} ღია · {list.done} გასწორებული</p>
            </div>
          </div>
          <div className="flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
            {[["open", "ღია"], ["done", "გასწორებული"], ["all", "ყველა"]].map(([value, label]) => (
              <a key={value} href={href(value)} className={`rounded-xl px-4 py-3 text-sm ${status === value ? "bg-primary text-white" : "text-white/45"}`}>{label}</a>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-[1600px] gap-4 px-8 pt-10 lg:px-12 xl:grid-cols-2">
        {list.rows.length ? list.rows.map((row) => {
          const reason = reasonOf(row.message);
          const done = row.status === "done";
          return (
            <article key={row.id} className="flex flex-col rounded-[1.75rem] border border-white/5 bg-white/[0.02] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] ${done ? "bg-green-500/15 text-green-400" : "bg-primary/15 text-primary"}`}>{done ? "გასწორებულია" : "ღიაა"}</span>
                    {reason ? <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] text-white/70">{reason}</span> : null}
                    <span className="text-xs text-white/35">{when(row.created_at)}</span>
                  </div>
                  <h2 className="mt-3 truncate text-lg">{row.title || "წაშლილი ანიმე"}</h2>
                  <p className="mt-1 text-sm text-white/40">სერია {row.episode} · {row.name || "წაშლილი მომხმარებელი"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {row.post_id ? <a href={`/admin/anime/${row.post_id}`} aria-label="რედაქტირება" className="grid size-10 place-items-center rounded-xl border border-white/10 text-white/50 hover:text-primary"><Pencil className="size-4" /></a> : null}
                  {row.slug ? <a href={`/anime/${row.slug}/watch?ep=${row.episode}`} aria-label="საიტზე ნახვა" className="grid size-10 place-items-center rounded-xl border border-white/10 text-white/50 hover:text-white"><ExternalLink className="size-4" /></a> : null}
                </div>
              </div>
              <p className="mt-4 flex-1 rounded-2xl bg-black/30 p-4 text-sm leading-6 whitespace-pre-line text-white/80">{row.message}</p>
              <form action={mark} className="mt-4">
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="status" value={done ? "open" : "done"} />
                <button type="submit" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/70 hover:border-primary/40 hover:text-white">
                  {done ? <RotateCcw className="size-4" /> : <Check className="size-4" />}
                  {done ? "ხელახლა გახსნა" : "გასწორებულად მონიშვნა"}
                </button>
              </form>
            </article>
          );
        }) : <p className="col-span-full py-24 text-center text-sm text-white/30">ამ სიაში რეპორტი არ არის.</p>}
      </div>
    </div>
  );
}
