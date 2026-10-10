import type { Metadata } from "next";
import { Clapperboard, ExternalLink, Pencil, Plus, Search } from "lucide-react";
import { listAdminAnime } from "@/lib/admin";

export const metadata: Metadata = { title: "ანიმეები | ადმინპანელი" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminAnimePage({ searchParams }: Props) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const status = params.status === "visible" || params.status === "hidden" ? params.status : "";
  const page = Math.max(1, Number(params.page) || 1);
  const list = await listAdminAnime(q, page, status);
  const href = (next: number, nextStatus = status) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (nextStatus) query.set("status", nextStatus);
    if (next > 1) query.set("page", String(next));
    const text = query.toString();
    return text ? `/admin/anime?${text}` : "/admin/anime";
  };
  const windowStart = Math.max(1, Math.min(page - 2, list.pages - 4));
  const numbers = Array.from({ length: Math.min(5, list.pages) }, (_, index) => windowStart + index).filter((number) => number >= 1 && number <= list.pages);
  return (
    <div className="min-h-screen bg-[#020202] pb-20 text-white">
      <div className="sticky top-0 z-40 border-b border-white/5 bg-[#020202]/80 px-8 py-8 backdrop-blur-2xl lg:px-12">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="grid size-16 place-items-center rounded-[2rem] border border-white/10 bg-white/5">
              <Clapperboard className="size-8 text-primary" />
            </div>
            <div>
              <h1 className="mb-2 text-4xl tracking-tight">ანიმეები</h1>
              <p className="text-[10px] tracking-[0.2em] text-white/30 uppercase">{list.total} ანიმე</p>
            </div>
          </div>
          <a href="/admin/anime/new" className="inline-flex items-center gap-3 rounded-2xl bg-primary px-8 py-5 text-xs tracking-widest text-white uppercase"><Plus className="size-5" /> დამატება</a>
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] space-y-8 px-8 pt-10 lg:px-12">
        <form action="/admin/anime" className="flex flex-col gap-4 lg:flex-row lg:items-center">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <div className="relative w-full lg:max-w-xl">
            <Search className="pointer-events-none absolute top-1/2 left-6 size-5 -translate-y-1/2 text-white/20" />
            <input name="q" defaultValue={q} placeholder="ძებნა სათაურით ან მისამართით" aria-label="ძებნა" className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-5 pr-6 pl-16 text-sm outline-none placeholder:text-white/20 focus:border-primary/50" />
          </div>
          <div className="flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
            {[["", "ყველა"], ["visible", "ჩანს"], ["hidden", "დამალული"]].map(([value, label]) => (
              <a key={value || "all"} href={href(1, value)} className={`rounded-xl px-4 py-3 text-sm ${status === value ? "bg-primary text-white" : "text-white/45"}`}>{label}</a>
            ))}
          </div>
        </form>
        {list.items.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {list.items.map((item) => (
              <article key={item.id} className="group overflow-hidden rounded-[1.5rem] border border-white/5 bg-white/[0.02]">
                <a href={`/admin/anime/${item.id}`} className="relative block aspect-[2/3] overflow-hidden bg-white/5">
                  {item.poster ? <img src={item.poster} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : null}
                  <span className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-[10px] ${item.published ? "bg-green-500/90 text-white" : "bg-black/70 text-white/70"}`}>{item.published ? "ჩანს" : "დამალული"}</span>
                </a>
                <div className="p-3">
                  <a href={`/admin/anime/${item.id}`} className="line-clamp-2 text-sm leading-5 group-hover:text-primary">{item.title}</a>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-xs text-white/35">{item.year || "—"}</p>
                    <span className="flex gap-1">
                      <a href={`/admin/anime/${item.id}`} aria-label="რედაქტირება" className="grid size-8 place-items-center rounded-lg border border-white/10 text-white/50 hover:text-primary"><Pencil className="size-3.5" /></a>
                      {item.slug ? <a href={`/anime/${item.slug}/watch`} aria-label="საიტზე ნახვა" className="grid size-8 place-items-center rounded-lg border border-white/10 text-white/50 hover:text-white"><ExternalLink className="size-3.5" /></a> : null}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : <p className="py-24 text-center text-sm text-white/30">ვერაფერი მოიძებნა.</p>}
        {list.pages > 1 ? (
          <div className="flex items-center justify-center gap-2">
            {page > 1 ? <a href={href(page - 1)} className="grid size-11 place-items-center rounded-2xl border border-white/10 text-white/50">←</a> : null}
            {numbers.map((number) => (
              <a key={number} href={href(number)} className={`grid size-11 place-items-center rounded-2xl text-sm ${number === page ? "bg-primary text-white" : "border border-white/10 text-white/50"}`}>{number}</a>
            ))}
            {page < list.pages ? <a href={href(page + 1)} className="grid size-11 place-items-center rounded-2xl border border-white/10 text-white/50">→</a> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
