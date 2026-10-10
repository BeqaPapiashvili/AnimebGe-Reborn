"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

type FooterLinks = { twitter: string; discord: string; reddit: string };
type HelpItem = { q: string; a: string };
type XpPath = { id: string; on: boolean; amount: number; cap: number; after: number; max: number; percent: number; min: number; coins: number; coinsSmall: number; gate: number };

const field = "h-10 w-full rounded-xl border border-white/8 bg-black/30 px-3 text-sm outline-none transition focus:border-[#e93748]/50";
const area = "min-h-20 w-full resize-y rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm leading-6 outline-none transition focus:border-[#e93748]/50";
const saveBtn = "h-10 cursor-pointer rounded-xl bg-[#e93748] px-4 text-sm text-white shadow-[0_8px_24px_rgba(233,55,72,0.22)]";

type Slide = { id: number; title: string; poster: string; banner: string; note: string; noBanner: boolean };
type Pool = { id: string; label: string; hint: string; items: Slide[] };

function SlideThumb({ item }: { item: Slide }) {
  const src = item.banner || item.poster;
  return (
    <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-[#0f0f11]">
      {src ? <img src={src} alt="" loading="lazy" className="size-full object-cover" /> : null}
      {item.noBanner ? <span className="absolute inset-x-0 bottom-0 bg-black/75 py-0.5 text-center text-[10px] text-[#ff8a95]">ბანერი არ აქვს</span> : null}
    </div>
  );
}

function SlideHero({ item }: { item: Slide }) {
  const src = item.banner || item.poster;
  return (
    <div className="relative aspect-[21/8] overflow-hidden rounded-2xl bg-[#0f0f11]">
      {src ? <img src={src} alt="" className="absolute inset-0 size-full object-cover" /> : null}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,10,0.85),rgba(10,10,10,0.3)_55%,transparent),linear-gradient(0deg,rgba(10,10,10,0.8),transparent_60%)]" />
      <div className="absolute bottom-5 left-6 max-w-[70%]">
        <span className="rounded bg-[#e93748] px-2 py-0.5 text-[11px] font-semibold text-white">პირველი სლაიდი</span>
        <p className="mt-2 line-clamp-2 text-2xl leading-tight font-bold text-white">{item.title}</p>
        <p className="mt-1 text-xs text-white/50">{item.note}</p>
      </div>
    </div>
  );
}

const iconBtn = "grid size-8 cursor-pointer place-items-center rounded-lg text-white/40 transition hover:bg-white/8 hover:text-white disabled:cursor-default disabled:opacity-20 disabled:hover:bg-transparent";

export function AdminSlides({ mode, picks, pools, save }: { mode: string; picks: Slide[]; pools: Pool[]; save: (formData: FormData) => void | Promise<void> }) {
  const [source, setSource] = useState(mode);
  const [picked, setPicked] = useState(picks);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Slide[]>([]);
  const [browse, setBrowse] = useState(pools.find((item) => item.id === "updated")?.id ?? pools[0]?.id ?? "");
  const [saved, setSaved] = useState(() => JSON.stringify({ mode, ids: picks.map((item) => item.id) }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pool = pools.find((item) => item.id === (source === "manual" ? browse : source));
  const effective = source === "manual" && !picked.length ? "auto" : source;
  const current = JSON.stringify({ mode: effective, ids: effective === "manual" ? picked.map((item) => item.id) : [] });
  const dirty = current !== saved;
  const liveLabel = mode === "manual" ? "ხელით" : pools.find((item) => item.id === mode)?.label ?? mode;
  const preview = source === "manual" ? picked : pool?.items ?? [];

  async function search(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setFound([]);
      return;
    }
    const res = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}`);
    const body = await res.json();
    const rows = Array.isArray(body?.results) ? body.results as { id: number; title: string; poster?: string; banner?: string; score?: string; year?: string }[] : [];
    setFound(rows.slice(0, 8).map((row) => ({
      id: row.id,
      title: row.title,
      poster: row.poster ?? "",
      banner: row.banner ?? "",
      note: [row.score ? `★ ${row.score}` : "", row.year].filter(Boolean).join(" · "),
      noBanner: !row.banner,
    })));
  }

  function add(item: Slide) {
    if (picked.some((row) => row.id === item.id) || picked.length >= 12) return;
    setPicked([...picked, item]);
  }

  function move(index: number, dir: number) {
    const next = [...picked];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPicked(next);
  }

  async function submit(formData: FormData) {
    setBusy(true);
    setError("");
    try {
      await save(formData);
      setSaved(current);
      if (effective !== source) setSource(effective);
    } catch {
      setError("ვერ შეინახა, სცადე თავიდან.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={submit} className="max-w-[1200px] space-y-5">
      <input type="hidden" name="mode" value={effective} />
      <input type="hidden" name="json" value={JSON.stringify(picked.map((item) => item.id))} />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#121214] px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-white/40">ახლა საიტზე</p>
          <p className="text-base font-semibold">{liveLabel}</p>
        </div>
        <span className={`rounded-lg px-3 py-1.5 text-xs ${error ? "bg-[#e93748]/15 text-[#ff8a95]" : dirty ? "bg-amber-400/10 text-amber-300" : "bg-emerald-400/10 text-emerald-300"}`}>
          {error || (busy ? "ინახება..." : dirty ? "შეუნახავი ცვლილებები" : "შენახულია, მთავარზე ესე ჩანს")}
        </span>
        <button disabled={busy || !dirty} className={`${saveBtn} disabled:cursor-default disabled:opacity-40 disabled:shadow-none`}>{busy ? "ინახება..." : "შენახვა"}</button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[{ id: "manual", label: "ხელით", hint: "თვითონ ირჩევ და ალაგებ, მაქსიმუმ 12" }, ...pools].map((item) => {
          const on = source === item.id;
          return (
            <button key={item.id} type="button" onClick={() => setSource(item.id)} className={`relative cursor-pointer rounded-2xl px-4 py-3 text-left transition ${on ? "bg-[#e93748] text-white shadow-[0_10px_30px_rgba(233,55,72,0.25)]" : "bg-[#18181b] text-white/80 hover:bg-[#1f1f23]"}`}>
              <span className="block text-sm font-semibold">{item.label}</span>
              <span className={`mt-0.5 block text-xs leading-5 ${on ? "text-white/80" : "text-white/40"}`}>{item.hint}</span>
              {mode === item.id ? <span className={`absolute top-3 right-3 size-2 rounded-full ${on ? "bg-white" : "bg-emerald-400"}`} title="ახლა საიტზე" /> : null}
            </button>
          );
        })}
      </div>

      <div className={`grid gap-5 ${source === "manual" ? "lg:grid-cols-[minmax(0,1fr)_420px]" : ""}`}>
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold">{source === "manual" ? `სლაიდერის რიგი · ${picked.length}/12` : `მთავარზე გამოჩნდება · ${preview.length}`}</p>
            {source === "manual" && picked.length ? <button type="button" className="cursor-pointer text-xs text-white/40 hover:text-[#ff8a95]" onClick={() => setPicked([])}>ყველას მოშორება</button> : null}
          </div>
          {preview[0] ? <SlideHero item={preview[0]} /> : null}
          {preview.length ? (
            <div className="space-y-1.5">
              {preview.map((item, index) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl bg-[#121214] p-2 pr-3">
                  <span className="w-6 text-center text-xs text-white/30">{index + 1}</span>
                  <SlideThumb item={item} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{item.title}</p>
                    <p className="text-xs text-white/35">{item.note}</p>
                  </div>
                  {source === "manual" ? (
                    <div className="flex shrink-0 gap-0.5">
                      <button type="button" className={iconBtn} disabled={index === 0} onClick={() => move(index, -1)} aria-label="ზემოთ"><ChevronUp className="size-4" /></button>
                      <button type="button" className={iconBtn} disabled={index === picked.length - 1} onClick={() => move(index, 1)} aria-label="ქვემოთ"><ChevronDown className="size-4" /></button>
                      <button type="button" className={`${iconBtn} hover:text-[#ff8a95]`} onClick={() => setPicked(picked.filter((row) => row.id !== item.id))} aria-label="წაშლა"><Trash2 className="size-4" /></button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-[#121214] px-5 py-10 text-center text-sm text-white/40">
              {source === "manual" ? "ჯერ არაფერია არჩეული. მარჯვნიდან დაამატე. ცარიელი სია შენახვისას ბანერებზე გადავა." : "ამ სიაში ანიმე არ ჩანს."}
            </p>
          )}
        </div>

        {source === "manual" ? (
          <div className="space-y-3 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl bg-[#121214] p-3">
              <input className={field} value={query} placeholder="მოძებნე ანიმე სახელით" onChange={(event) => search(event.target.value)} />
              {found.length ? (
                <div className="mt-2 space-y-1">
                  {found.map((item) => {
                    const has = picked.some((row) => row.id === item.id);
                    return (
                      <button key={item.id} type="button" disabled={has || picked.length >= 12} className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-1.5 text-left hover:bg-white/5 disabled:cursor-default disabled:opacity-40" onClick={() => { add(item); setFound([]); setQuery(""); }}>
                        <SlideThumb item={item} />
                        <span className="min-w-0 flex-1 truncate text-sm">{item.title}</span>
                        <span className="text-xs text-white/35">{has ? "არის" : "+"}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <div className="rounded-2xl bg-[#121214] p-3">
              <div className="flex flex-wrap gap-1">
                {pools.filter((item) => item.id !== "auto").map((item) => (
                  <button key={item.id} type="button" onClick={() => setBrowse(item.id)} className={`h-8 cursor-pointer rounded-lg px-3 text-xs transition ${browse === item.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}>{item.label}</button>
                ))}
              </div>
              <button type="button" className="mt-2 h-9 w-full cursor-pointer rounded-xl bg-[#18181b] text-xs text-white/70 transition hover:bg-[#1f1f23] hover:text-white" onClick={() => {
                const next = [...picked];
                for (const item of pool?.items ?? []) {
                  if (next.length >= 12) break;
                  if (!next.some((row) => row.id === item.id)) next.push(item);
                }
                setPicked(next);
              }}>მთელი სიის ჩასმა</button>
              <div className="mt-2 max-h-[520px] space-y-1 overflow-y-auto pr-1">
                {(pool?.items ?? []).map((item) => {
                  const has = picked.some((row) => row.id === item.id);
                  return (
                    <button key={item.id} type="button" disabled={has || picked.length >= 12} className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-1.5 text-left hover:bg-white/5 disabled:cursor-default disabled:opacity-40" onClick={() => add(item)}>
                      <SlideThumb item={item} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{item.title}</p>
                        <p className="text-xs text-white/35">{item.note}</p>
                      </div>
                      <span className="text-xs text-white/35">{has ? "არის" : "+"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </form>
  );
}

export function AdminFooter({ links, save }: { links: FooterLinks; save: (formData: FormData) => void }) {
  return (
    <form action={save} className="max-w-3xl space-y-4">
      <p className="text-sm text-white/45">ცარიელი ველი ხატულას მალავს. ჩასვი Animeb-ის გვერდის მისამართი.</p>
      {(["twitter", "discord", "reddit"] as const).map((key) => (
        <label key={key} className="block space-y-1.5">
          <span className="text-xs text-white/45">{key === "twitter" ? "Twitter" : key === "discord" ? "Discord" : "Reddit"}</span>
          <input className={field} name={key} defaultValue={links[key]} placeholder="https://" />
        </label>
      ))}
      <button className={saveBtn}>შენახვა</button>
    </form>
  );
}

export function AdminHelp({ items, save }: { items: HelpItem[]; save: (formData: FormData) => void }) {
  const [rows, setRows] = useState(items);
  function move(index: number, dir: number) {
    const next = [...rows];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
  }
  return (
    <form action={save} className="max-w-3xl space-y-3">
      <input type="hidden" name="json" value={JSON.stringify(rows)} />
      {rows.map((item, index) => (
        <div key={index} className="space-y-2 rounded-2xl border border-white/8 bg-[#101013] p-4">
          <div className="flex justify-end gap-1">
            <button type="button" className="grid size-8 cursor-pointer place-items-center rounded-lg text-white/40 hover:bg-white/5" onClick={() => move(index, -1)} aria-label="ზემოთ"><ChevronUp className="size-4" /></button>
            <button type="button" className="grid size-8 cursor-pointer place-items-center rounded-lg text-white/40 hover:bg-white/5" onClick={() => move(index, 1)} aria-label="ქვემოთ"><ChevronDown className="size-4" /></button>
            <button type="button" className="grid size-8 cursor-pointer place-items-center rounded-lg text-white/40 hover:bg-white/5" onClick={() => setRows(rows.filter((_, row) => row !== index))} aria-label="წაშლა"><Trash2 className="size-4" /></button>
          </div>
          <input className={field} value={item.q} onChange={(event) => setRows(rows.map((row, i) => i === index ? { ...row, q: event.target.value } : row))} placeholder="კითხვა" />
          <textarea className={area} value={item.a} onChange={(event) => setRows(rows.map((row, i) => i === index ? { ...row, a: event.target.value } : row))} placeholder="პასუხი" />
        </div>
      ))}
      <div className="flex gap-2">
        <button type="button" className="h-10 cursor-pointer rounded-xl border border-white/10 px-4 text-sm text-white/70" onClick={() => rows.length < 20 && setRows([...rows, { q: "", a: "" }])}>კითხვის დამატება</button>
        <button className={saveBtn}>შენახვა</button>
      </div>
    </form>
  );
}

const xpCatalog: { id: string; title: string; text: string; fields: { key: keyof XpPath; label: string; unit: string }[] }[] = [
  { id: "episode", title: "ეპიზოდის ყურება", text: "ერთი ეპიზოდი ერთხელ. სრული ქულა დღეში ლიმიტამდე, მერე შემცირებული. 1 წუთზე მოკლე ეპიზოდი არ ითვლება.", fields: [
    { key: "amount", label: "სრული ქულა", unit: "ქულა" },
    { key: "cap", label: "დღეში რამდენი იღებს სრულ ქულას", unit: "ჯერ · 0 ულიმიტოა" },
    { key: "after", label: "ლიმიტის შემდეგ ქულა", unit: "ქულა" },
    { key: "percent", label: "რამდენი უნდა ნახოს", unit: "პროცენტი" },
    { key: "coins", label: "სრული ეპიზოდის მონეტა", unit: "მონეტა" },
    { key: "coinsSmall", label: "შემცირებული ეპიზოდის მონეტა", unit: "მონეტა" },
    { key: "gate", label: "რამდენი შემცირებული იღებს მონეტას დღეში", unit: "ჯერ, მერე მონეტა 0-ია · 0 ულიმიტოა" },
  ] },
  { id: "streak", title: "ზედიზედ დღეები", text: "იმ დღის პირველ ნანახ ეპიზოდზე. მონეტა ამ გზას არ ერიცხება. გამოტოვებული დღე სერიას ნულავს.", fields: [
    { key: "amount", label: "პირველი დღის ქულა", unit: "ქულა" },
    { key: "after", label: "ყოველ მომდევნო დღეს ემატება", unit: "ქულა" },
    { key: "max", label: "ჭერი", unit: "ქულა" },
  ] },
  { id: "series", title: "სერიალის დასრულება", text: "„დასრულებულში“ გადატანა, თუ გამოშვებული ეპიზოდებიც ნანახი აქვს. ერთ ანიმეზე ერთხელ.", fields: [
    { key: "amount", label: "ქულა", unit: "ქულა" },
    { key: "cap", label: "დღეში რამდენი სერიალი", unit: "ჯერ · 0 ულიმიტოა" },
    { key: "coins", label: "მონეტა", unit: "მონეტა" },
  ] },
  { id: "comment", title: "კომენტარი", text: "ანიმეს კომენტარი. ლიმიტი მხოლოდ კომენტარს ეხება.", fields: [
    { key: "amount", label: "ქულა", unit: "ქულა" },
    { key: "cap", label: "დღეში რამდენი", unit: "ჯერ · 0 ულიმიტოა" },
    { key: "min", label: "მინიმუმ სიმბოლო", unit: "სიმბოლო" },
    { key: "coins", label: "მონეტა", unit: "მონეტა" },
  ] },
  { id: "post", title: "პოსტი", text: "საზოგადოების პოსტი. ლიმიტი მხოლოდ პოსტს ეხება.", fields: [
    { key: "amount", label: "ქულა", unit: "ქულა" },
    { key: "cap", label: "დღეში რამდენი", unit: "ჯერ · 0 ულიმიტოა" },
    { key: "min", label: "მინიმუმ სიმბოლო", unit: "სიმბოლო" },
    { key: "coins", label: "მონეტა", unit: "მონეტა" },
  ] },
  { id: "reply", title: "პასუხი", text: "პოსტზე პასუხი. ლიმიტი მხოლოდ პასუხს ეხება.", fields: [
    { key: "amount", label: "ქულა", unit: "ქულა" },
    { key: "cap", label: "დღეში რამდენი", unit: "ჯერ · 0 ულიმიტოა" },
    { key: "min", label: "მინიმუმ სიმბოლო", unit: "სიმბოლო" },
    { key: "coins", label: "მონეტა", unit: "მონეტა" },
  ] },
  { id: "rate", title: "შეფასება", text: "ანიმეს მოწონება ან არმოწონება. ერთ ანიმეზე ერთხელ.", fields: [
    { key: "amount", label: "ქულა", unit: "ქულა" },
    { key: "cap", label: "დღეში რამდენი", unit: "ჯერ · 0 ულიმიტოა" },
    { key: "coins", label: "მონეტა", unit: "მონეტა" },
  ] },
  { id: "visit", title: "ყოველდღიური შესვლა", text: "მხოლოდ მონეტა. დღეში ერთხელ, პირველ შესვლაზე.", fields: [
    { key: "coins", label: "მონეტა", unit: "მონეტა" },
  ] },
  { id: "week", title: "ზედიზედ შესვლის კვირა", text: "მხოლოდ მონეტა. ერიცხება, როცა ზედიზედ შესვლა ამ დღეების ჯერადს მიაღწევს.", fields: [
    { key: "coins", label: "მონეტა", unit: "მონეტა" },
    { key: "gate", label: "ყოველ რამდენ დღეში", unit: "დღე" },
  ] },
  { id: "emote", title: "ემოუტი", text: "მხოლოდ მონეტა. ყურების რეაქცია. ქულა არ ერიცხება.", fields: [
    { key: "coins", label: "მონეტა", unit: "მონეტა" },
    { key: "cap", label: "დღეში რამდენი", unit: "ჯერ · 0 ულიმიტოა" },
  ] },
  { id: "list", title: "სიაში დამატება", text: "მხოლოდ მონეტა. ანიმეს სიაში ჩაგდება.", fields: [
    { key: "coins", label: "მონეტა", unit: "მონეტა" },
    { key: "cap", label: "დღეში რამდენი", unit: "ჯერ · 0 ულიმიტოა" },
  ] },
  { id: "friend", title: "მეგობარი", text: "მხოლოდ მონეტა. ორივე იღებს, წყვილზე ერთხელ.", fields: [
    { key: "coins", label: "მონეტა თითოს", unit: "მონეტა" },
  ] },
];

export function AdminXp({ rules, save }: { rules: XpPath[]; save: (formData: FormData) => void }) {
  const [rows, setRows] = useState(xpCatalog.map((item) => rules.find((row) => row.id === item.id)).filter((row): row is XpPath => !!row));
  function setField(id: string, key: keyof XpPath, value: number) {
    setRows(rows.map((row) => row.id === id ? { ...row, [key]: value } : row));
  }
  return (
    <form action={save} className="max-w-3xl space-y-4">
      <input type="hidden" name="json" value={JSON.stringify(rows)} />
      <p className="text-sm text-white/45">აქ ის რიცხვებია, რომლებსაც საიტი ახლა რეალურად არიცხავს. ქულა და მონეტა ცალ-ცალკე წერია. გამორთული გზა აღარ იხდის. უკვე მიცემული ქულა და მონეტა არ იცვლება.</p>
      {rows.map((row) => {
        const meta = xpCatalog.find((item) => item.id === row.id);
        if (!meta) return null;
        return (
          <section key={row.id} className={`space-y-3 rounded-2xl border border-white/8 bg-[#101013] p-4 ${row.on ? "" : "opacity-50"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm">{meta.title}</h2>
                <p className="mt-1 text-xs text-white/40">{meta.text}</p>
              </div>
              <button type="button" className={`relative h-6 w-11 cursor-pointer rounded-full ${row.on ? "bg-[#e93748]" : "bg-white/15"}`} aria-pressed={row.on} onClick={() => setRows(rows.map((item) => item.id === row.id ? { ...item, on: !item.on } : item))}>
                <span className={`absolute top-0.5 size-5 rounded-full bg-white ${row.on ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {meta.fields.map((fieldItem) => (
                <label key={fieldItem.key} className="space-y-1.5">
                  <span className="block text-xs text-white/45">{fieldItem.label}</span>
                  <input className={field} type="number" value={Number(row[fieldItem.key]) || 0} onChange={(event) => setField(row.id, fieldItem.key, Number(event.target.value))} />
                  <span className="block text-[11px] text-white/30">{fieldItem.unit}</span>
                </label>
              ))}
            </div>
          </section>
        );
      })}
      <button className={saveBtn}>შენახვა</button>
    </form>
  );
}
