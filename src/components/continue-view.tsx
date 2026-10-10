"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { animeHref } from "@/lib/data";
import type { ContinueCard } from "@/lib/continue-types";

const sorts = [
  { id: "recent", label: "ბოლოს ნანახი" },
  { id: "title", label: "სახელით" },
  { id: "progress", label: "პროგრესით" },
] as const;

type Sort = (typeof sorts)[number]["id"];

function ago(value: string) {
  const then = new Date(value.replace(" ", "T"));
  const minutes = Math.max(0, Math.round((Date.now() - then.getTime()) / 60000));
  if (!Number.isFinite(minutes) || minutes < 1) return "ახლა";
  if (minutes < 60) return `${minutes} წუთის წინ`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} საათის წინ`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} დღის წინ`;
  return value.slice(0, 10);
}

export function ContinueView({ items }: { items: ContinueCard[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(items);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [leaving, setLeaving] = useState<number[]>([]);

  const shown = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("ka");
    const list = rows.filter((item) => !term || item.title.toLocaleLowerCase("ka").includes(term));
    if (sort === "title") return [...list].sort((a, b) => a.title.localeCompare(b.title, "ka"));
    if (sort === "progress") return [...list].sort((a, b) => b.progressPct - a.progressPct);
    return list;
  }, [rows, q, sort]);

  function remove(id: number) {
    setLeaving((list) => [...list, id]);
    window.setTimeout(() => {
      setRows((list) => list.filter((item) => item.id !== id));
      setLeaving((list) => list.filter((item) => item !== id));
    }, 180);
    fetch("/api/history", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: id }) }).then((res) => {
      if (!res.ok) router.refresh();
    });
  }

  return (
    <div className="rise bg-[#070707] pt-20 text-white">
      <div className="border-b border-white/5 bg-[#0a0a0a] px-6 py-8 text-center">
        <h1 className="text-4xl leading-10 font-extrabold tracking-[-0.9px]">განაგრძე ყურება</h1>
        <p className="mt-1 text-sm font-medium text-[#99a1af]">იქიდან გააგრძელე, სადაც შეჩერდი</p>
      </div>

      <div className="mx-auto w-full max-w-[1280px] px-4 pb-16 sm:px-8">
        <div className="flex flex-col gap-3 border-b border-white/5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block sm:w-[320px]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute top-1/2 left-3 -translate-y-1/2 text-[#6a7282]" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="მოძებნე ანიმე" aria-label="განაგრძე ყურების ძებნა" className="h-10 w-full rounded-md bg-[#141414] pr-3 pl-9 text-sm text-white outline-none placeholder:text-[#6a7282]" />
          </label>
          <div className="flex gap-1" role="tablist" aria-label="დალაგება">
            {sorts.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={sort === item.id} className={`h-9 cursor-pointer rounded-md px-3 text-sm font-semibold ${sort === item.id ? "bg-[#e93748]/12 text-[#e93748]" : "text-[#9ca3af] hover:text-white"}`} onClick={() => setSort(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {rows.length ? <p className="pt-6 text-sm font-medium text-[#99a1af]"><b className="font-bold text-white">{shown.length}</b> ანიმე</p> : null}

        {!rows.length ? (
          <div className="py-24 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full border border-white/10 bg-[#141414] text-[#e93748]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </span>
            <p className="mt-4 text-base font-semibold">ჯერ არაფერი დაგიწყია</p>
            <p className="mt-1 text-sm text-[#99a1af]">როცა ეპიზოდს ჩართავ, აქ გამოჩნდება.</p>
            <a href="/" className="mt-5 inline-flex h-9 items-center rounded-md bg-[#e93748] px-4 text-sm font-semibold text-white">მთავარზე</a>
          </div>
        ) : shown.length ? (
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((item, index) => (
              <article key={item.id} className={`cw-card cw-in min-w-0 ${leaving.includes(item.id) ? "is-leaving" : ""}`} style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
                <div className="relative aspect-video overflow-hidden rounded-lg bg-[#1a1a1a]">
                  {item.banner || item.poster ? <img src={item.banner || item.poster} alt="" className="cw-img h-full w-full object-cover" /> : null}
                  <span className="cw-shade absolute inset-0 bg-black/45" />
                  <button type="button" className="absolute inset-0 cursor-pointer" aria-label={`${item.title}, ეპიზოდი ${item.episode}`} onClick={() => router.push(`${animeHref(item.slug)}/watch?ep=${item.episode}`)}>
                    <span className="cw-play absolute top-1/2 left-1/2 grid size-12 place-items-center rounded-full bg-white text-black shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5"><path d="M8 5v14l11-7z" /></svg>
                    </span>
                  </button>
                  <span className="pointer-events-none absolute top-2 left-2 rounded bg-black/80 px-2 py-1 text-sm font-semibold">ეპ {item.episode}</span>
                  <button type="button" className="cw-close absolute top-2 right-2 grid size-8 cursor-pointer place-items-center rounded-md bg-black/70 text-white hover:bg-[#e93748]" aria-label="განაგრძე ყურებიდან ამოღება" onClick={() => remove(item.id)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                  <span className="pointer-events-none absolute right-2 bottom-3 rounded bg-black/75 px-2 py-1 text-sm font-semibold">{item.progress}</span>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-white/15"><span className="block h-full bg-[#e93748]" style={{ width: `${item.progressPct}%` }} /></div>
                </div>
                <h2 className="font-bog mt-2 truncate text-sm font-normal">{item.title}</h2>
                <p className="mt-0.5 truncate text-xs text-[#99a1af]">{[item.format, item.year, ago(item.updated)].filter(Boolean).join(" · ")}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="py-16 text-center text-sm text-[#99a1af]">არაფერი მოიძებნა</p>
        )}
      </div>
    </div>
  );
}
