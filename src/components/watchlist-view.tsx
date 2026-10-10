"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Marks } from "@/components/marks";
import { Pager } from "@/components/pager";
import { animeHref } from "@/lib/data";
import { folderColor, folderKey, type SiteList } from "@/lib/list-model";
import { splitFilter, watchlistHref, type WatchPage, type WatchQuery } from "@/lib/watchlist";

const sortOptions = [
  { value: "updated", label: "განახლებით" },
  { value: "title", label: "სახელით" },
  { value: "year", label: "წლით" },
  { value: "score", label: "შეფასებით" },
];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`filter-chevron shrink-0 text-[#9ca3af] ${open ? "is-open" : ""}`} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="pl-1 text-[13px] font-bold tracking-[0.3px] text-white">{label}</p>
      <div className="pt-1.5">{children}</div>
    </div>
  );
}

function Menu({ open, children }: { open: boolean; children: ReactNode }) {
  if (!open) return null;
  return <div className="filter-pop absolute top-full right-0 left-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-md border border-white/8 bg-[#0a0a0a] p-1 shadow-[0_18px_40px_rgba(0,0,0,0.55)]">{children}</div>;
}

function optionClass(on: boolean) {
  return `flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-2 text-left text-sm transition-colors duration-150 ${on ? "bg-[#e93748]/10 text-[#e93748]" : "text-[#d1d5dc] hover:bg-white/5"}`;
}

export function WatchlistView({ page, query, lists, signedIn, onAuth }: { page: WatchPage; query: WatchQuery; lists: SiteList[]; signedIn: boolean; onAuth: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState(query.q);
  const [open, setOpen] = useState("");
  const [hidden, setHidden] = useState<number[]>([]);
  const panel = useRef<HTMLDivElement>(null);
  const items = page.items.filter((item) => !hidden.includes(item.id));
  const shown = Math.max(0, page.total - hidden.length);

  function go(next: Partial<WatchQuery>, keepOffset = false, stayOpen = false) {
    const merged: WatchQuery = { ...query, ...next, offset: keepOffset ? (next.offset ?? query.offset) : 0 };
    router.push(watchlistHref(merged), { scroll: false });
    if (!stayOpen) setOpen("");
  }

  function toggleMany(current: string, value: string) {
    const selected = new Set(splitFilter(current));
    if (selected.has(value)) selected.delete(value);
    else selected.add(value);
    return [...selected].join(",");
  }

  useEffect(() => setQ(query.q), [query.q]);
  useEffect(() => setHidden([]), [page.total, page.items]);

  useEffect(() => {
    const typed = q.trim();
    if (typed === query.q) return;
    const timer = setTimeout(() => router.push(watchlistHref({ ...query, q: typed, offset: 0 }), { scroll: false }), 250);
    return () => clearTimeout(timer);
  }, [q, query, router]);

  useEffect(() => {
    function onDown(event: MouseEvent) {
      if (!panel.current?.contains(event.target as Node)) setOpen("");
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  async function remove(id: number) {
    if (!signedIn) return onAuth();
    setHidden((list) => [...list, id]);
    const res = await fetch("/api/lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: id, listId: null }) });
    if (!res.ok) setHidden((list) => list.filter((item) => item !== id));
    else router.refresh();
  }

  const currentFolder = lists.find((list) => folderKey(list.id) === query.folder);
  const chips = [
    ...(query.q ? [{ key: "q", label: query.q, clear: { q: "" } }] : []),
    ...(currentFolder ? [{ key: "folder", label: currentFolder.label, clear: { folder: "" } }] : []),
    ...splitFilter(query.genre).map((label) => ({ key: `genre-${label}`, label, clear: { genre: toggleMany(query.genre, label) } })),
    ...splitFilter(query.tag).map((label) => ({ key: `tag-${label}`, label, clear: { tag: toggleMany(query.tag, label) } })),
    ...(query.year ? [{ key: "year", label: query.year, clear: { year: "" } }] : []),
    ...(query.status ? [{ key: "status", label: query.status, clear: { status: "" } }] : []),
    ...(query.season ? [{ key: "season", label: query.season, clear: { season: "" } }] : []),
    ...(query.format ? [{ key: "format", label: query.format, clear: { format: "" } }] : []),
  ];

  function clearChip(next: Partial<WatchQuery>) {
    if (next.q === "") setQ("");
    go(next);
  }

  return (
    <div className="rise bg-[#070707] pt-20">
      <div className="border-b border-white/5 bg-[#0a0a0a] px-6 py-8 text-center">
        <h1 className="text-4xl leading-10 font-extrabold tracking-[-0.9px] text-white">სია</h1>
        <p className="mt-1 text-sm font-medium text-[#99a1af]">მართე და დაალაგე შენი ანიმე</p>
      </div>

      <div className="mx-auto w-full max-w-[1280px] px-4 pb-12 sm:px-8">
        <div ref={panel} className="border-b border-white/5 py-4">
          <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2 xl:grid-cols-5">
            <Field label="ძებნა" className="xl:col-span-2">
              <label className="relative block">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute top-1/2 left-3 -translate-y-1/2 text-[#6a7282]" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
                <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="ჩაწერე საძიებოდ..." aria-label="სიის ძებნა" className="h-10 w-full rounded-md bg-[#141414] pr-3 pl-9 text-sm text-white outline-none placeholder:text-[#6a7282]" />
              </label>
            </Field>
            <Field label="საქაღალდე">
              <div className="relative">
                <button type="button" className={`filter-trigger flex h-10 w-full items-center justify-between rounded-md border px-3 text-sm ${currentFolder ? "border-[#e93748]/40 bg-[#e93748]/10 text-white" : "border-white/5 bg-[#141414] text-[#d1d5dc]"}`} aria-expanded={open === "folder"} onClick={() => setOpen(open === "folder" ? "" : "folder")}>
                  <span className="truncate">{currentFolder?.label ?? "ყველა საქაღალდე"}</span>
                  {currentFolder ? <Clear onClear={() => clearChip({ folder: "" })} /> : <Chevron open={open === "folder"} />}
                </button>
                <Menu open={open === "folder"}>
                  <button type="button" className={optionClass(!query.folder)} onClick={() => go({ folder: "" })}>ყველა საქაღალდე</button>
                  {lists.map((list) => (
                    <button key={list.id} type="button" className={optionClass(query.folder === folderKey(list.id))} onClick={() => go({ folder: folderKey(list.id) })}>{list.label}</button>
                  ))}
                </Menu>
              </div>
            </Field>
            <MultiField label="ჟანრი" placeholder="აირჩიე ჟანრი" open={open === "genre"} values={splitFilter(query.genre)} options={page.facets.genres} onToggle={() => setOpen(open === "genre" ? "" : "genre")} onPick={(value) => go({ genre: toggleMany(query.genre, value) }, false, true)} onClear={() => go({ genre: "" }, false, true)} />
            <MultiField label="თეგები" placeholder="აირჩიე თეგი" open={open === "tag"} values={splitFilter(query.tag)} options={page.facets.tags} onToggle={() => setOpen(open === "tag" ? "" : "tag")} onPick={(value) => go({ tag: toggleMany(query.tag, value) }, false, true)} onClear={() => go({ tag: "" }, false, true)} />
            <SingleField label="წელი" placeholder="ნებისმიერი წელი" open={open === "year"} value={query.year} options={page.facets.years} onToggle={() => setOpen(open === "year" ? "" : "year")} onPick={(value) => go({ year: value })} />
            <SingleField label="სტატუსი" placeholder="ნებისმიერი სტატუსი" open={open === "status"} value={query.status} options={page.facets.statuses} onToggle={() => setOpen(open === "status" ? "" : "status")} onPick={(value) => go({ status: value })} />
            <SingleField label="სეზონი" placeholder="ნებისმიერი სეზონი" open={open === "season"} value={query.season} options={page.facets.seasons} onToggle={() => setOpen(open === "season" ? "" : "season")} onPick={(value) => go({ season: value })} />
            <SingleField label="ფორმატი" placeholder="ნებისმიერი ფორმატი" open={open === "format"} value={query.format} options={page.facets.formats} onToggle={() => setOpen(open === "format" ? "" : "format")} onPick={(value) => go({ format: value })} />
            <Field label="დალაგება">
              <div className="relative">
                <button type="button" className="filter-trigger flex h-10 w-full items-center justify-between rounded-md border border-white/5 bg-[#141414] px-3 text-sm text-[#d1d5dc]" aria-expanded={open === "sort"} onClick={() => setOpen(open === "sort" ? "" : "sort")}>
                  <span>{sortOptions.find((item) => item.value === query.sort)?.label ?? "განახლებით"}</span>
                  <Chevron open={open === "sort"} />
                </button>
                <Menu open={open === "sort"}>
                  {sortOptions.map((item) => (
                    <button key={item.value} type="button" className={optionClass(query.sort === item.value)} onClick={() => go({ sort: item.value })}>{item.label}</button>
                  ))}
                </Menu>
              </div>
            </Field>
          </div>
          {chips.length ? (
            <div className="flex flex-wrap gap-2 pt-4">
              {chips.map((chip) => (
                <button key={chip.key} type="button" className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-[#e93748]/45 bg-[#e93748]/8 px-2.5 text-[11px] font-bold tracking-[0.4px] text-[#e93748] uppercase" onClick={() => clearChip(chip.clear)}>
                  {chip.label}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {!signedIn ? (
          <div className="py-16 text-center">
            <p className="text-sm text-[#99a1af]">სიის სანახავად შედი ანგარიშში.</p>
            <button type="button" className="mt-4 h-9 cursor-pointer rounded-md bg-[#e93748] px-4 text-sm font-semibold text-white" onClick={onAuth}>შესვლა</button>
          </div>
        ) : (
          <>
            <p className="pt-6 text-sm font-medium text-[#99a1af]">სიაში <b className="font-bold text-white">{shown}</b> ანიმე</p>
            {items.length ? (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {items.map((item) => {
                  const color = folderColor(item.listId);
                  return (
                    <article key={item.id} className="min-w-0">
                      <a href={animeHref(item.slug)} className="group block pt-3">
                        <div className="relative h-[260px] overflow-hidden rounded-[7.2px] bg-[#18181b] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
                          {item.poster ? <img src={item.poster} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : null}
                          <span className="absolute top-2 left-2 rounded-full border border-white/10 bg-black/80 px-1.5 py-0.5 text-[10px] leading-[15px] font-bold tracking-[0.25px] uppercase" style={{ color }}>{item.folderLabel}</span>
                          <span className="absolute bottom-2 left-1.5 flex h-5 items-center gap-1 rounded border border-white/20 bg-black/90 px-1.5 text-[9px] text-white backdrop-blur-sm">
                            <Marks sub={item.sub} dub={item.dub} total={item.total} />
                          </span>
                        </div>
                      </a>
                      <div className="mt-2 flex items-center gap-2 px-0.5">
                        <span className="size-1.5 shrink-0 rounded-full" style={{ background: color }} />
                        <h3 className="font-bog truncate text-[13px] leading-[19.5px] font-normal text-white">{item.title}</h3>
                      </div>
                      <div className="flex items-center justify-between px-0.5 pt-0.5">
                        <p className="truncate text-[11px] leading-[16.5px] text-[#a1a1aa]">{[item.format, item.duration ? `${item.duration}წთ` : ""].filter(Boolean).join(" · ")}</p>
                        <button type="button" className="grid size-5 shrink-0 cursor-pointer place-items-center rounded-[5.76px] border border-white/10 bg-white/5 text-[#d1d5dc] hover:border-[#e93748] hover:text-[#e93748]" aria-label={`${item.title} სიიდან ამოღება`} onClick={() => remove(item.id)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="py-16 text-center text-sm text-[#99a1af]">{page.total ? "ამ ფილტრით ანიმე ვერ მოიძებნა." : "სია ცარიელია."}</p>
            )}
            <Pager page={Math.floor(query.offset / query.limit) + 1} pages={Math.ceil(page.total / query.limit)} onPick={(next) => go({ offset: (next - 1) * query.limit }, true)} />
          </>
        )}
      </div>
    </div>
  );
}

function Clear({ onClear }: { onClear: () => void }) {
  return (
    <span role="button" tabIndex={0} className="grid size-5 shrink-0 cursor-pointer place-items-center rounded text-[#e93748]" aria-label="გასუფთავება" onClick={(event) => { event.stopPropagation(); onClear(); }} onKeyDown={(event) => { if (event.key === "Enter") { event.stopPropagation(); onClear(); } }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M6 6l12 12M18 6 6 18" /></svg>
    </span>
  );
}

function SingleField({ label, placeholder, open, value, options, onToggle, onPick }: { label: string; placeholder: string; open: boolean; value: string; options: string[]; onToggle: () => void; onPick: (value: string) => void }) {
  return (
    <Field label={label}>
      <div className="relative">
        <button type="button" className={`filter-trigger flex h-10 w-full items-center justify-between rounded-md border px-3 text-sm ${value ? "border-[#e93748]/40 bg-[#e93748]/10 text-white" : "border-white/5 bg-[#141414] text-[#d1d5dc]"}`} aria-expanded={open} onClick={onToggle}>
          <span className="truncate">{value || placeholder}</span>
          {value ? <Clear onClear={() => onPick("")} /> : <Chevron open={open} />}
        </button>
        <Menu open={open}>
          <button type="button" className={optionClass(!value)} onClick={() => onPick("")}>{placeholder}</button>
          {options.map((option) => (
            <button key={option} type="button" className={optionClass(value === option)} onClick={() => onPick(option)}>{option}</button>
          ))}
        </Menu>
      </div>
    </Field>
  );
}

function MultiField({ label, placeholder, open, values, options, onToggle, onPick, onClear }: { label: string; placeholder: string; open: boolean; values: string[]; options: string[]; onToggle: () => void; onPick: (value: string) => void; onClear: () => void }) {
  const text = values.length === 0 ? placeholder : values.join(", ");
  return (
    <Field label={label}>
      <div className="relative">
        <button type="button" className={`filter-trigger flex h-10 w-full items-center justify-between rounded-md border px-3 text-sm ${values.length ? "border-[#e93748]/40 bg-[#e93748]/10 text-white" : "border-white/5 bg-[#141414] text-[#d1d5dc]"}`} aria-expanded={open} onClick={onToggle}>
          <span className="truncate">{text}</span>
          {values.length ? <Clear onClear={onClear} /> : <Chevron open={open} />}
        </button>
        <Menu open={open}>
          {options.length ? options.map((option) => (
            <button key={option} type="button" className={optionClass(values.includes(option))} onClick={() => onPick(option)}>{option}</button>
          )) : <p className="px-2.5 py-2 text-sm text-[#6a7282]">გასაფილტრი ჯერ არაფერია.</p>}
        </Menu>
      </div>
    </Field>
  );
}
