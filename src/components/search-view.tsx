"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimeCard } from "@/components/anime-card";
import { Pager } from "@/components/pager";
import type { SearchHit } from "@/lib/catalog";
import type { SiteList } from "@/lib/list-model";
import type { Anime } from "@/lib/types";
import { searchHref, type SearchFacets, type SearchQuery } from "@/lib/search-query";
import { splitFilter } from "@/lib/watchlist";

const sortOptions = [
  { value: "newest", label: "უახლესი" },
  { value: "popular", label: "პოპულარობა" },
  { value: "score", label: "შეფასება" },
  { value: "year", label: "წელი" },
];

function Chevron({ open }: { open: boolean }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`filter-chevron shrink-0 text-[#9ca3af] ${open ? "is-open" : ""}`}><path d="m6 9 6 6 6-6" /></svg>;
}

function optionClass(on: boolean) {
  return `flex w-full cursor-pointer items-center rounded px-2.5 py-2 text-left text-sm transition-colors duration-150 ${on ? "bg-[#e93748]/10 text-[#e93748]" : "text-[#d1d5dc] hover:bg-white/5"}`;
}

export function SearchView({ items, total, facets, query, lists = [], listOf, onList, onOpen }: { items: SearchHit[]; total: number; facets: SearchFacets; query: SearchQuery; lists?: SiteList[]; listOf?: (id: number) => number | null; onList?: (id: number | undefined, listId: number | null) => Promise<boolean>; onOpen?: (slug: string) => void }) {
  const router = useRouter();
  const [q, setQ] = useState(query.q);
  const [open, setOpen] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const page = Math.floor(query.offset / query.limit) + 1;
  const pages = Math.ceil(total / query.limit);

  function go(next: Partial<SearchQuery>, stayOpen = false) {
    router.push(searchHref({ ...query, ...next, offset: next.offset ?? 0 }), { scroll: false });
    if (!stayOpen) setOpen("");
  }

  function toggleGenre(value: string) {
    const selected = new Set(splitFilter(query.genre));
    if (selected.has(value)) selected.delete(value);
    else selected.add(value);
    return [...selected].join(",");
  }

  useEffect(() => setQ(query.q), [query.q]);
  useEffect(() => {
    const typed = q.trim();
    if (typed === query.q) return;
    const timer = setTimeout(() => router.push(searchHref({ ...query, q: typed, offset: 0 }), { scroll: false }), 250);
    return () => clearTimeout(timer);
  }, [q, query, router]);
  useEffect(() => {
    function onDown(event: MouseEvent) {
      if (!panel.current?.contains(event.target as Node)) setOpen("");
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const genreLabel = splitFilter(query.genre).join(", ");
  const sortLabel = sortOptions.find((option) => option.value === query.sort)?.label;
  const chips = [
    ...(query.q ? [{ key: "q", label: query.q, clear: { q: "" } }] : []),
    ...splitFilter(query.genre).map((label) => ({ key: `genre-${label}`, label, clear: { genre: toggleGenre(label) } })),
    ...(query.year ? [{ key: "year", label: query.year, clear: { year: "" } }] : []),
    ...(query.character ? [{ key: "character", label: query.character, clear: { character: "" } }] : []),
    ...(query.staff ? [{ key: "staff", label: query.staff, clear: { staff: "" } }] : []),
    ...(query.studio ? [{ key: "studio", label: query.studio, clear: { studio: "" } }] : []),
    ...(query.season ? [{ key: "season", label: query.season, clear: { season: "" } }] : []),
    ...(query.format ? [{ key: "format", label: query.format, clear: { format: "" } }] : []),
    ...(query.status ? [{ key: "status", label: query.status, clear: { status: "" } }] : []),
    ...(query.sort !== "newest" && sortLabel ? [{ key: "sort", label: sortLabel, clear: { sort: "newest" as const } }] : []),
  ];

  function clearChip(next: Partial<SearchQuery>) {
    if (next.q === "") setQ("");
    go(next);
  }

  return (
    <div className="bg-[#070707] pt-20 text-white">
      <div className="rise mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
        <aside className="h-fit w-full shrink-0 rounded-xl border border-white/8 bg-[#0c0c0c] px-3 lg:sticky lg:top-24 lg:w-[232px]">
          <SideGroup title="სეზონი">
            {facets.seasons.map((option) => <Radio key={option} label={option} on={query.season === option} onPick={() => go({ season: query.season === option ? "" : option })} />)}
          </SideGroup>
          <SideGroup title="ფორმატი">
            {facets.formats.map((option) => <Radio key={option} label={option} on={query.format === option} onPick={() => go({ format: query.format === option ? "" : option })} />)}
          </SideGroup>
          <SideGroup title="სტატუსი">
            {facets.statuses.map((option) => <Radio key={option} label={option} on={query.status === option} onPick={() => go({ status: query.status === option ? "" : option })} />)}
          </SideGroup>
          <SideGroup title="დალაგება">
            {sortOptions.map((option) => <Radio key={option.value} label={option.label} on={query.sort === option.value} onPick={() => go({ sort: option.value as SearchQuery["sort"] })} />)}
          </SideGroup>
        </aside>
        <div className="min-w-0 flex-1">
          <div ref={panel} className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <Field label="ძებნა">
              <label className="relative block">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute top-1/2 left-3 -translate-y-1/2 text-[#6a7282]" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
                <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="ძებნა" aria-label="ანიმეს ძებნა" className="h-10 w-full rounded-md border border-white/8 bg-[#141414] pr-9 pl-9 text-sm text-white outline-none placeholder:text-[#6a7282]" />
                {q ? <button type="button" className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded text-[#9ca3af] hover:text-white" aria-label="გასუფთავება" onClick={() => setQ("")}>×</button> : null}
              </label>
            </Field>
            <Menu label="ჟანრი" placeholder="ნებისმიერი" open={open === "genre"} value={genreLabel} onToggle={() => setOpen(open === "genre" ? "" : "genre")}>
              {facets.genres.map((option) => <button key={option} type="button" className={optionClass(splitFilter(query.genre).includes(option))} onClick={() => go({ genre: toggleGenre(option) }, true)}>{option}</button>)}
            </Menu>
            <Menu label="წელი" placeholder="ნებისმიერი" open={open === "year"} value={query.year} onToggle={() => setOpen(open === "year" ? "" : "year")}>
              <button type="button" className={optionClass(!query.year)} onClick={() => go({ year: "" })}>ნებისმიერი</button>
              {facets.years.map((option) => <button key={option} type="button" className={optionClass(query.year === option)} onClick={() => go({ year: option })}>{option}</button>)}
            </Menu>
            <Finder label="პერსონაჟი" placeholder="ნებისმიერი" open={open === "character"} value={query.character} options={facets.characters} onToggle={() => setOpen(open === "character" ? "" : "character")} onPick={(value) => go({ character: value })} />
            <Finder label="პერსონალი" placeholder="ნებისმიერი" open={open === "staff"} value={query.staff} options={facets.staff} onToggle={() => setOpen(open === "staff" ? "" : "staff")} onPick={(value) => go({ staff: value })} />
            <Finder label="სტუდია" placeholder="ნებისმიერი" open={open === "studio"} value={query.studio} options={facets.studios} onToggle={() => setOpen(open === "studio" ? "" : "studio")} onPick={(value) => go({ studio: value })} />
          </div>
          {chips.length ? (
            <div className="flex flex-wrap gap-2 pt-4">
              {chips.map((chip) => (
                <button key={chip.key} type="button" className="filter-chip inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-[#e93748]/45 bg-[#e93748]/8 px-2.5 text-[11px] font-bold tracking-[0.4px] text-[#e93748] uppercase" onClick={() => clearChip(chip.clear)}>
                  {chip.label}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                </button>
              ))}
            </div>
          ) : null}
          <p className="pt-5 text-sm text-[#9ca3af]">ნაპოვნია <b className="font-semibold text-white">{total.toLocaleString("en-US")}</b> შედეგი</p>
          {items.length ? (
            <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
              {items.map((item) => {
                const card: Anime = {
                  id: item.id,
                  slug: item.slug,
                  title: item.title,
                  poster: item.poster,
                  score: item.score ? item.score.toFixed(1) : undefined,
                  dub: item.dub,
                  total: item.total,
                  meta: [item.format, item.duration || item.year].filter(Boolean).join(" · "),
                };
                return <AnimeCard key={item.id} item={card} dense lists={lists} listId={listOf?.(item.id) ?? null} onList={onList ? (listId) => onList(item.id, listId) : undefined} onOpen={onOpen ?? (() => undefined)} />;
              })}
            </div>
          ) : (
            <div className="mt-8 rounded-xl border border-white/8 bg-[#0c0c0c] px-6 py-14 text-center">
              <p className="text-lg font-bold">ვერ მოიძებნა</p>
              <p className="mt-2 text-sm text-[#9ca3af]">ამ ფილტრს ანიმე არ ემთხვევა. მოხსენი ერთ-ერთი პირობა და სცადე თავიდან.</p>
            </div>
          )}
          <Pager page={page} pages={pages} onPick={(next) => go({ offset: (next - 1) * query.limit })} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><p className="pb-1.5 text-[13px] font-semibold text-white">{label}</p>{children}</div>;
}

function Menu({ label, placeholder, open, value, onToggle, children }: { label: string; placeholder: string; open: boolean; value: string; onToggle: () => void; children: ReactNode }) {
  const picked = Boolean(value);
  return (
    <Field label={label}>
      <div className="relative">
        <button type="button" className={`filter-trigger flex h-10 w-full items-center justify-between rounded-md border px-3 text-sm ${picked ? "border-[#e93748]/40 bg-[#e93748]/10 text-white" : "border-white/8 bg-[#141414] text-[#9ca3af]"}`} aria-expanded={open} onClick={onToggle}>
          <span className="truncate">{value || placeholder}</span>
          <Chevron open={open} />
        </button>
        {open ? <div className="filter-pop absolute top-full right-0 left-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-md border border-white/8 bg-[#0c0c0c] p-1 shadow-[0_18px_40px_rgba(0,0,0,0.55)]">{children}</div> : null}
      </div>
    </Field>
  );
}

function Finder({ label, placeholder, open, value, options, onToggle, onPick }: { label: string; placeholder: string; open: boolean; value: string; options: string[]; onToggle: () => void; onPick: (value: string) => void }) {
  const [needle, setNeedle] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) setNeedle("");
    else input.current?.focus();
  }, [open]);
  const shown = useMemo(() => {
    const text = needle.trim().toLowerCase();
    const list = text ? options.filter((option) => option.toLowerCase().includes(text)) : options;
    return list.slice(0, 80);
  }, [needle, options]);
  return (
    <Menu label={label} placeholder={placeholder} open={open} value={value} onToggle={onToggle}>
      <input ref={input} value={needle} onChange={(event) => setNeedle(event.target.value)} placeholder="ძებნა სიაში" aria-label={`${label} სიაში`} className="mb-1 h-8 w-full rounded bg-[#141414] px-2 text-sm text-white outline-none placeholder:text-[#6a7282]" />
      <button type="button" className={optionClass(!value)} onClick={() => onPick("")}>ნებისმიერი</button>
      {shown.map((option) => <button key={option} type="button" className={optionClass(value === option)} onClick={() => onPick(option)}>{option}</button>)}
      {!shown.length ? <p className="px-2.5 py-2 text-sm text-[#6a7282]">ვერ მოიძებნა</p> : null}
    </Menu>
  );
}

function SideGroup({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="border-b border-white/6 py-3 last:border-b-0">
      <button type="button" className="filter-trigger flex w-full items-center justify-between rounded-md px-2 py-1 text-[13px] font-semibold" aria-expanded={open} onClick={() => setOpen(!open)}>
        {title}
        <Chevron open={open} />
      </button>
      <div className={`filter-fold ${open ? "is-open" : ""}`}>
        <div className="filter-fold-inner">
          <div className="flex flex-col gap-0.5 pt-1.5">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Radio({ label, on, onPick }: { label: string; on: boolean; onPick: () => void }) {
  return (
    <button type="button" className={`filter-side-row flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] ${on ? "bg-[#e93748]/10 text-white" : "text-[#c4c4c4]"}`} aria-pressed={on} onClick={onPick}>
      <span className={`filter-dot grid size-3.5 shrink-0 place-items-center rounded-full border ${on ? "is-on border-[#e93748]" : "border-white/30"}`}>
        <span className="filter-dot-core size-2 rounded-full bg-[#e93748]" />
      </span>
      {label}
    </button>
  );
}
