"use client";

import { useRef, useState } from "react";
import { Calendar, ChevronDown, ChevronUp, Clapperboard, Film, Flame, ListPlus, MessageSquare, Play, Plus, Radio, RotateCcw, Search, SlidersHorizontal, Sparkles, Star, Trash2, TrendingUp, X } from "lucide-react";
import type { GuideDoc } from "@/data/guide";
import { applyRankNames, defaultSpans, grouped, levelLadder, xpForLevel, type LevelSpan } from "@/lib/levels";

const field = "h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm outline-none transition focus:border-[#e93748]/50";
const area = "min-h-20 w-full resize-y rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm leading-6 outline-none transition focus:border-[#e93748]/50";
const saveBtn = "h-10 cursor-pointer rounded-xl bg-[#e93748] text-sm text-white shadow-[0_8px_24px_rgba(233,55,72,0.22)]";

const blockIcon = {
  continue: Play,
  latest: Clapperboard,
  fresh: Sparkles,
  upcoming: Calendar,
  trend: Flame,
  schedule: Calendar,
  posts: MessageSquare,
} as const;

export function AdminNotice({
  notice,
  save,
}: {
  notice: { on: boolean; kicker: string; text: string; href: string; label: string };
  save: (formData: FormData) => Promise<void>;
}) {
  const [draft, setDraft] = useState(notice);
  return (
    <form action={save} className="grid max-w-3xl gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="grid gap-3 rounded-2xl border border-white/8 bg-[#101013] p-5">
        <button type="button" role="switch" aria-checked={draft.on} onClick={() => setDraft((row) => ({ ...row, on: !row.on }))} className="flex cursor-pointer items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5">
          <span className="text-sm">ჩართულია მთავარ გვერდზე</span>
          <span className={`relative h-6 w-11 rounded-full transition ${draft.on ? "bg-[#e93748]" : "bg-white/10"}`}>
            <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${draft.on ? "left-[22px]" : "left-0.5"}`} />
          </span>
        </button>
        <input type="hidden" name="on" value={draft.on ? "1" : "0"} />
        <label className="grid gap-1.5 text-xs text-white/40">პატარა წარწერა<input name="kicker" value={draft.kicker} onChange={(event) => setDraft((row) => ({ ...row, kicker: event.target.value }))} className={field} /></label>
        <label className="grid gap-1.5 text-xs text-white/40">ტექსტი<textarea name="text" value={draft.text} onChange={(event) => setDraft((row) => ({ ...row, text: event.target.value }))} className={area} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs text-white/40">ბმული<input name="href" value={draft.href} onChange={(event) => setDraft((row) => ({ ...row, href: event.target.value }))} placeholder="https:// ან /გვერდი" className={field} /></label>
          <label className="grid gap-1.5 text-xs text-white/40">ღილაკის წარწერა<input name="label" value={draft.label} onChange={(event) => setDraft((row) => ({ ...row, label: event.target.value }))} className={field} /></label>
        </div>
        <button type="submit" className={saveBtn}>შენახვა</button>
      </div>
      <div className="h-fit rounded-2xl border border-white/8 bg-[#070709] p-4">
        <p className="mb-3 text-[11px] tracking-[0.16em] text-white/30 uppercase">როგორ გამოჩნდება</p>
        {draft.on && draft.text ? (
          <div className="relative border border-[#e93748]/30 bg-black px-3 py-3">
            <span className="absolute top-3 left-0 h-8 w-[3px] bg-[#e93748]" />
            <p className="pl-2 text-[9px] font-extrabold tracking-[1.4px] text-[#e93748] uppercase">{draft.kicker || "განცხადება"}</p>
            <p className="mt-1 pl-2 text-[13px] leading-5 text-[#c7ccd4]">{draft.text}</p>
            {draft.href ? <span className="mt-2 ml-2 inline-flex h-6 items-center border border-white/10 px-2 text-[10px] font-bold tracking-wide text-white/60 uppercase">{draft.label || "გახსნა"}</span> : null}
          </div>
        ) : <p className="text-sm text-white/35">გამორთულია. მთავარზე არ გამოჩნდება.</p>}
      </div>
    </form>
  );
}

type HomeSourceId = "pick" | "rating" | "popular" | "ongoing" | "movies";
type HomeRow = { id: string; title: string; on: boolean; source?: HomeSourceId; picks?: { id: number; title: string }[]; size?: number };

const sourceInfo: Record<HomeSourceId, { label: string; text: string; icon: typeof Star }> = {
  pick: { label: "ჩემი არჩევანი", text: "ანიმეებს თვითონ ირჩევ", icon: ListPlus },
  rating: { label: "საუკეთესო რეიტინგით", text: "ავტომატურად, ქულით", icon: Star },
  popular: { label: "პოპულარული", text: "ავტომატურად, ნახვებით", icon: TrendingUp },
  ongoing: { label: "მიმდინარე", text: "ახლა რომ გადის", icon: Radio },
  movies: { label: "ფილმები", text: "მხოლოდ ფილმები", icon: Film },
};
const sideIds = new Set(["trend", "schedule", "posts"]);
const sectionId = () => `c-${Math.random().toString(36).slice(2, 10).padEnd(8, "0")}`;
const softField = "h-10 w-full rounded-xl bg-[#0f0f11] px-3 text-sm outline-none transition focus:ring-1 focus:ring-[#e93748]/50";

function PickSearch({ picks, onChange }: { picks: { id: number; title: string }[]; onChange: (next: { id: number; title: string }[]) => void }) {
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<{ id: number; title: string; poster?: string; year?: string; type?: string }[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function search(value: string) {
    setTerm(value);
    if (timer.current) clearTimeout(timer.current);
    if (!value.trim()) {
      setHits([]);
      return;
    }
    timer.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(value.trim())}`).then((res) => res.json()).then((body) => setHits(Array.isArray(body?.results) ? body.results : [])).catch(() => setHits([]));
    }, 250);
  }
  const chosen = new Set(picks.map((pick) => pick.id));
  return (
    <div className="grid gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/30" />
        <input value={term} onChange={(event) => search(event.target.value)} placeholder="მოძებნე ანიმე და დაამატე..." className={`${softField} pl-9`} />
        {hits.length ? (
          <div className="absolute inset-x-0 top-11 z-20 max-h-72 overflow-y-auto rounded-xl bg-[#18181b] p-1 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            {hits.map((hit) => (
              <button
                key={hit.id}
                type="button"
                disabled={chosen.has(hit.id) || picks.length >= 24}
                onClick={() => { onChange([...picks, { id: hit.id, title: hit.title }]); setTerm(""); setHits([]); }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-white/5 disabled:cursor-default disabled:opacity-40"
              >
                {hit.poster ? <img src={hit.poster} alt="" className="h-11 w-8 shrink-0 rounded object-cover" /> : <span className="h-11 w-8 shrink-0 rounded bg-white/5" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{hit.title}</span>
                  <span className="text-[11px] text-white/35">{[hit.type, hit.year].filter(Boolean).join(" · ")}</span>
                </span>
                {chosen.has(hit.id) ? <span className="text-[11px] text-[#ff8a95]">დამატებულია</span> : <Plus className="size-4 text-white/40" />}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {picks.length ? (
        <div className="flex flex-wrap gap-1.5">
          {picks.map((pick, index) => (
            <span key={pick.id} className="inline-flex h-8 items-center gap-2 rounded-lg bg-[#0f0f11] pr-1 pl-2.5 text-xs">
              <span className="tabular-nums text-white/30">{index + 1}</span>
              <span className="max-w-48 truncate">{pick.title}</span>
              <button type="button" aria-label="ამოშლა" onClick={() => onChange(picks.filter((item) => item.id !== pick.id))} className="grid size-6 cursor-pointer place-items-center rounded-md text-white/40 hover:bg-white/5 hover:text-white"><X className="size-3.5" /></button>
            </span>
          ))}
        </div>
      ) : <p className="text-xs text-white/35">ჯერ ანიმე არ არის არჩეული. სექცია მთავარზე მაშინ გამოჩნდება, როცა ერთს მაინც დაამატებ.</p>}
    </div>
  );
}

export function AdminHomeOrder({
  blocks,
  defaults,
  save,
}: {
  blocks: HomeRow[];
  defaults: HomeRow[];
  save: (formData: FormData) => Promise<void>;
}) {
  const [items, setItems] = useState<HomeRow[]>(blocks);
  const [open, setOpen] = useState("");
  const [adding, setAdding] = useState(false);
  const removed = defaults.filter((block) => !items.some((item) => item.id === block.id));
  const patch = (id: string, next: Partial<HomeRow>) => setItems((rows) => rows.map((row) => row.id === id ? { ...row, ...next } : row));
  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= items.length) return;
    const copy = [...items];
    const [row] = copy.splice(index, 1);
    copy.splice(next, 0, row);
    setItems(copy);
  }
  function addCustom(source: HomeSourceId) {
    const id = sectionId();
    setItems((rows) => [...rows, { id, title: sourceInfo[source].label, on: true, source, picks: source === "pick" ? [] : undefined, size: 12 }]);
    setOpen(id);
    setAdding(false);
  }
  return (
    <form action={save} className="grid max-w-3xl gap-2">
      <input type="hidden" name="json" value={JSON.stringify(items)} />
      <p className="mb-2 text-sm text-white/40">რიგი მთავარ გვერდზეც იგივეა. ცვლილებები „შენახვის“ შემდეგ გამოჩნდება. ცარიელი სექცია მთავარზე არ ჩანს.</p>
      {items.map((item, index) => {
        const info = item.source ? sourceInfo[item.source] : null;
        const Icon = info?.icon ?? blockIcon[item.id as keyof typeof blockIcon] ?? Sparkles;
        const expanded = Boolean(info) && open === item.id;
        return (
          <div key={item.id} className={`rounded-2xl transition ${item.on ? "bg-[#18181b]" : "bg-[#121214] opacity-60"}`}>
            <div className="flex items-center gap-2.5 p-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#0f0f11] text-white/70"><Icon className="size-4" /></span>
              <span className="w-5 text-center text-xs tabular-nums text-white/25">{String(index + 1).padStart(2, "0")}</span>
              <input value={item.title} onChange={(event) => patch(item.id, { title: event.target.value })} className={softField} aria-label="სათაური" />
              {sideIds.has(item.id) ? <span className="hidden shrink-0 rounded-lg bg-[#0f0f11] px-2 py-1 text-[10px] text-white/40 sm:block">გვერდით</span> : null}
              {info ? (
                <button type="button" onClick={() => setOpen(expanded ? "" : item.id)} className={`flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-xs transition ${expanded ? "bg-[#e93748]/15 text-[#ff8a95]" : "bg-[#0f0f11] text-white/50 hover:text-white"}`}>
                  <SlidersHorizontal className="size-3.5" />
                  <span className="hidden sm:inline">პარამეტრები</span>
                </button>
              ) : null}
              <button type="button" role="switch" aria-checked={item.on} aria-label={item.on ? "დამალვა" : "გამოჩენა"} title={item.on ? "ჩანს — დააჭირე დასამალად" : "დამალულია — დააჭირე გამოსაჩენად"} onClick={() => patch(item.id, { on: !item.on })} className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition ${item.on ? "bg-[#e93748]" : "bg-white/10"}`}>
                <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${item.on ? "left-[22px]" : "left-0.5"}`} />
              </button>
              <span className="flex shrink-0 overflow-hidden rounded-xl bg-[#0f0f11]">
                <button type="button" disabled={index === 0} className="grid size-9 cursor-pointer place-items-center text-white/40 hover:bg-white/5 hover:text-white disabled:cursor-default disabled:opacity-30" aria-label="ზემოთ" onClick={() => move(index, -1)}><ChevronUp className="size-4" /></button>
                <button type="button" disabled={index === items.length - 1} className="grid size-9 cursor-pointer place-items-center text-white/40 hover:bg-white/5 hover:text-white disabled:cursor-default disabled:opacity-30" aria-label="ქვემოთ" onClick={() => move(index, 1)}><ChevronDown className="size-4" /></button>
              </span>
              <button type="button" aria-label="წაშლა" title="წაშლა" onClick={() => setItems((rows) => rows.filter((row) => row.id !== item.id))} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl bg-[#0f0f11] text-white/40 transition hover:bg-[#e93748]/15 hover:text-[#ff8a95]"><Trash2 className="size-4" /></button>
            </div>
            {expanded && item.source ? (
              <div className="grid gap-4 px-3 pt-1 pb-4">
                <div>
                  <p className="mb-2 text-[11px] text-white/40">რა ჩანდეს</p>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                    {(Object.keys(sourceInfo) as HomeSourceId[]).map((source) => {
                      const SourceIcon = sourceInfo[source].icon;
                      return (
                        <button key={source} type="button" onClick={() => patch(item.id, { source, picks: source === "pick" ? item.picks ?? [] : item.picks })} className={`flex cursor-pointer flex-col items-start gap-1.5 rounded-xl p-2.5 text-left transition ${item.source === source ? "bg-[#e93748]/15 text-[#ff8a95]" : "bg-[#0f0f11] text-white/55 hover:text-white"}`}>
                          <SourceIcon className="size-4" />
                          <span className="text-[11px] leading-tight">{sourceInfo[source].label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[11px] text-white/35">{sourceInfo[item.source].text}</p>
                </div>
                <div>
                  <p className="mb-2 text-[11px] text-white/40">რამდენი ანიმე</p>
                  <div className="inline-flex gap-1 rounded-xl bg-[#0f0f11] p-1">
                    {[6, 12, 18].map((size) => (
                      <button key={size} type="button" onClick={() => patch(item.id, { size })} className={`h-8 w-12 cursor-pointer rounded-lg text-xs transition ${(item.size ?? 12) === size ? "bg-[#e93748] text-white" : "text-white/45 hover:text-white"}`}>{size}</button>
                    ))}
                  </div>
                </div>
                {item.source === "pick" ? <PickSearch picks={item.picks ?? []} onChange={(picks) => patch(item.id, { picks })} /> : null}
              </div>
            ) : null}
          </div>
        );
      })}
      {!items.length ? <p className="rounded-2xl bg-[#121214] px-4 py-6 text-center text-sm text-white/40">მთავარზე სექცია აღარ დარჩა. დაამატე ქვემოდან.</p> : null}

      {adding ? (
        <div className="grid gap-3 rounded-2xl bg-[#121214] p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm">ახალი სექცია</p>
            <button type="button" aria-label="დახურვა" onClick={() => setAdding(false)} className="grid size-8 cursor-pointer place-items-center rounded-lg text-white/40 hover:bg-white/5 hover:text-white"><X className="size-4" /></button>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {(Object.keys(sourceInfo) as HomeSourceId[]).map((source) => {
              const SourceIcon = sourceInfo[source].icon;
              return (
                <button key={source} type="button" onClick={() => addCustom(source)} className="flex cursor-pointer items-center gap-3 rounded-xl bg-[#18181b] p-3 text-left transition hover:bg-[#1f1f23]">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e93748]/12 text-[#ff8a95]"><SourceIcon className="size-4" /></span>
                  <span>
                    <span className="block text-sm">{sourceInfo[source].label}</span>
                    <span className="text-[11px] text-white/40">{sourceInfo[source].text}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {removed.length ? (
            <>
              <p className="mt-1 text-[11px] text-white/40">წაშლილი სექციების დაბრუნება</p>
              <div className="flex flex-wrap gap-1.5">
                {removed.map((block) => (
                  <button key={block.id} type="button" onClick={() => { setItems((rows) => [...rows, { ...block, on: true }]); setAdding(false); }} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-[#18181b] px-3 text-xs text-white/70 transition hover:bg-[#1f1f23] hover:text-white">
                    <RotateCcw className="size-3.5" />{block.title}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#121214] text-sm text-white/60 transition hover:bg-[#18181b] hover:text-white">
          <Plus className="size-4" />სექციის დამატება
        </button>
      )}
      <button type="submit" className={`mt-2 ${saveBtn}`}>შენახვა</button>
    </form>
  );
}

function lines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

export function AdminGuide({ doc, save }: { doc: GuideDoc; save: (formData: FormData) => Promise<void> }) {
  const [draft, setDraft] = useState(doc);
  const [error, setError] = useState("");
  function allowed(section: number, block: number) {
    return draft.sections[section].blocks[block].rows?.find((row) => row.ok)?.items.join("\n") ?? "";
  }
  function banned(section: number, block: number) {
    return draft.sections[section].blocks[block].rows?.filter((row) => !row.ok).flatMap((row) => row.items).join("\n") ?? "";
  }
  function setRows(section: number, block: number, ok: boolean, value: string) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((part, s) => s !== section ? part : {
        ...part,
        blocks: part.blocks.map((item, b) => {
          if (b !== block) return item;
          const yes = ok ? lines(value) : lines(allowed(section, block));
          const no = ok ? lines(banned(section, block)) : lines(value);
          const rows = [
            ...(yes.length ? [{ ok: true, items: yes }] : []),
            ...(no.length ? [{ ok: false, items: no }] : []),
          ];
          return { ...item, rows: rows.length ? rows : undefined };
        }),
      }),
    }));
  }
  return (
    <form action={save} className="grid max-w-4xl gap-3" onSubmit={(event) => { if (!draft.sections.length) { event.preventDefault(); setError("ერთი სექცია მაინც უნდა დარჩეს."); } }}>
      <input type="hidden" name="json" value={JSON.stringify(draft)} />
      {draft.sections.map((section, s) => (
        <details key={section.id} open={s === 0} className="group rounded-2xl border border-white/8 bg-[#101013] open:shadow-[0_16px_40px_rgba(0,0,0,0.25)]">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
            <span className="grid size-8 place-items-center rounded-lg bg-[#e93748]/15 text-sm text-[#e93748]">{section.n}</span>
            <span className="min-w-0 flex-1 truncate text-sm">{section.title}</span>
            <span className="text-xs text-white/30">{section.blocks.length}</span>
            <ChevronDown className="size-4 text-white/30 transition group-open:rotate-180" />
          </summary>
          <div className="grid gap-3 border-t border-white/6 px-4 pt-4 pb-4">
            <input value={section.title} onChange={(event) => setDraft((current) => ({ ...current, sections: current.sections.map((part, i) => i === s ? { ...part, title: event.target.value } : part) }))} className={field} />
            <textarea value={section.lead} onChange={(event) => setDraft((current) => ({ ...current, sections: current.sections.map((part, i) => i === s ? { ...part, lead: event.target.value } : part) }))} className={area} placeholder="შესავალი" />
            {section.blocks.map((block, b) => (
              <div key={`${section.id}-${b}`} className="grid gap-2 rounded-xl border border-white/6 bg-black/25 p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[11px] text-white/40">{block.code}</span>
                  <input value={block.title} onChange={(event) => setDraft((current) => ({ ...current, sections: current.sections.map((part, i) => i !== s ? part : { ...part, blocks: part.blocks.map((item, j) => j === b ? { ...item, title: event.target.value } : item) }) }))} className={field} />
                </div>
                <textarea value={block.body} onChange={(event) => setDraft((current) => ({ ...current, sections: current.sections.map((part, i) => i !== s ? part : { ...part, blocks: part.blocks.map((item, j) => j === b ? { ...item, body: event.target.value } : item) }) }))} className={area} placeholder="ტექსტი. ბმული ასე: [სახელი](https://...)" />
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="grid gap-1 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] p-2 text-xs text-emerald-200/70">ნებადართული
                    <textarea value={allowed(s, b)} onChange={(event) => setRows(s, b, true, event.target.value)} className={`${area} border-transparent bg-transparent`} />
                  </label>
                  <label className="grid gap-1 rounded-xl border border-[#e93748]/20 bg-[#e93748]/[0.05] p-2 text-xs text-[#ffb3ba]">აკრძალული
                    <textarea value={banned(s, b)} onChange={(event) => setRows(s, b, false, event.target.value)} className={`${area} border-transparent bg-transparent`} />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </details>
      ))}
      <label className="grid gap-1.5 rounded-2xl border border-white/8 bg-[#101013] p-4 text-xs text-white/40">შედეგის საფეხურები, თითო ხაზზე
        <textarea value={draft.steps.join("\n")} onChange={(event) => setDraft((current) => ({ ...current, steps: lines(event.target.value) }))} className={area} />
      </label>
      {error ? <p className="text-xs text-[#e93748]">{error}</p> : null}
      <button type="submit" className={saveBtn}>შენახვა</button>
    </form>
  );
}

const bandLabel = ["დონე 1–10", "დონე 11–20", "დონე 21–30", "დონე 31–40", "დონე 41–50", "დონე 51–60", "დონე 61–70", "დონე 71–80"];

const rankSpan = ["დონე 1–9", "დონე 10–19", "დონე 20–29", "დონე 30–39", "დონე 40–49", "დონე 50–59", "დონე 60–69", "დონე 70–79", "დონე 80"];

export function AdminLevels({ spans, names, save }: { spans: LevelSpan[]; names: { name: string; color: string }[]; save: (formData: FormData) => Promise<void> }) {
  const [steps, setSteps] = useState(spans.map((span) => span.step));
  const [ranks, setRanks] = useState(names);
  const table = defaultSpans.map((span, index) => ({ to: span.to, step: Math.max(100, Number(steps[index]) || span.step) }));
  applyRankNames(ranks);
  const ladder = levelLadder(table);
  return (
    <form action={save} className="grid max-w-4xl gap-4">
      <p className="text-sm text-white/40">80 დონე ანგარიშზე ისეა შენახული. იცვლება შუალედის ქულა, რანგის სახელი და ფერი.</p>
      <div className="grid gap-3 md:grid-cols-3">
        {rankSpan.map((label, index) => (
          <label key={label} className="grid gap-2 rounded-2xl border border-white/8 bg-[#101013] p-3.5">
            <span className="text-xs text-white/40">{label}</span>
            <span className="flex items-center gap-2">
              <input type="color" name="color" value={ranks[index]?.color ?? "#e93748"} onChange={(event) => setRanks((rows) => rows.map((row, i) => i === index ? { ...row, color: event.target.value } : row))} className="h-10 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent" aria-label={`${label} ფერი`} />
              <input name="rank" value={ranks[index]?.name ?? ""} onChange={(event) => setRanks((rows) => rows.map((row, i) => i === index ? { ...row, name: event.target.value } : row))} className={field} />
            </span>
          </label>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {bandLabel.map((label, index) => {
          const color = ladder[index]?.color ?? "#e93748";
          const next = ladder[index + 1];
          return (
            <label key={label} className="grid gap-2 rounded-2xl border border-white/8 bg-[#101013] p-3.5">
              <span className="flex items-center gap-2 text-sm">
                <span className="h-8 w-1 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
                {label}
              </span>
              <input name="step" type="number" min={100} max={100000} value={steps[index]} onChange={(event) => setSteps((rows) => rows.map((row, i) => i === index ? Number(event.target.value) : row))} className={field} />
              <span className="text-xs" style={{ color }}>{next ? `${next.name} · ${grouped(xpForLevel(defaultSpans[index].to, table))} ქულა` : ladder[index]?.name}</span>
            </label>
          );
        })}
      </div>
      <button type="submit" className={saveBtn}>შენახვა</button>
    </form>
  );
}
