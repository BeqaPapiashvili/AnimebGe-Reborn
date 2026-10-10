"use client";

import { useState } from "react";
import { Calendar, ChevronDown, ChevronUp, Clapperboard, Flame, MessageSquare, Play, Sparkles } from "lucide-react";
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

export function AdminHomeOrder({
  blocks,
  save,
}: {
  blocks: { id: string; title: string; on: boolean }[];
  save: (formData: FormData) => Promise<void>;
}) {
  const [items, setItems] = useState(blocks);
  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= items.length) return;
    const copy = [...items];
    const [row] = copy.splice(index, 1);
    copy.splice(next, 0, row);
    setItems(copy);
  }
  return (
    <form action={save} className="grid max-w-3xl gap-2">
      <input type="hidden" name="json" value={JSON.stringify(items)} />
      <p className="mb-2 text-sm text-white/40">რიგი მთავარ გვერდზეც იგივეა. ცარიელი ბლოკი მაინც არ ჩანს.</p>
      {items.map((item, index) => {
        const Icon = blockIcon[item.id as keyof typeof blockIcon] ?? Sparkles;
        return (
          <div key={item.id} className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${item.on ? "border-white/8 bg-[#101013]" : "border-white/5 bg-transparent opacity-55"}`}>
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-white/70"><Icon className="size-4" /></span>
            <span className="w-5 text-center text-xs tabular-nums text-white/25">{index + 1}</span>
            <input value={item.title} onChange={(event) => setItems((rows) => rows.map((row, i) => i === index ? { ...row, title: event.target.value } : row))} className={field} />
            <button type="button" role="switch" aria-checked={item.on} aria-label="ჩართვა" onClick={() => setItems((rows) => rows.map((row, i) => i === index ? { ...row, on: !row.on } : row))} className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition ${item.on ? "bg-[#e93748]" : "bg-white/10"}`}>
              <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${item.on ? "left-[22px]" : "left-0.5"}`} />
            </button>
            <span className="flex shrink-0 overflow-hidden rounded-xl border border-white/8">
              <button type="button" className="grid size-9 cursor-pointer place-items-center text-white/40 hover:bg-white/5 hover:text-white" aria-label="ზემოთ" onClick={() => move(index, -1)}><ChevronUp className="size-4" /></button>
              <button type="button" className="grid size-9 cursor-pointer place-items-center border-l border-white/8 text-white/40 hover:bg-white/5 hover:text-white" aria-label="ქვემოთ" onClick={() => move(index, 1)}><ChevronDown className="size-4" /></button>
            </span>
          </div>
        );
      })}
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
