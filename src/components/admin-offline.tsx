"use client";

import { useState } from "react";
import { CloudOff, ExternalLink, RefreshCw, Wrench } from "lucide-react";

type Kind = "maintenance" | "update" | "offline";
type Draft = { on: boolean; kind: Kind; title: string; text: string; until: string; href: string; label: string };

const field = "h-10 w-full rounded-xl bg-[#0f0f11] px-3 text-sm text-white outline-none transition focus:ring-1 focus:ring-[#e93748]/50";
const icons = { maintenance: Wrench, update: RefreshCw, offline: CloudOff } as const;

function localValue(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AdminOffline({ value, kinds, save }: { value: Draft; kinds: { id: Kind; label: string; title: string; text: string }[]; save: (formData: FormData) => Promise<void> }) {
  const [draft, setDraft] = useState(value);
  const [saved, setSaved] = useState(value);
  const [busy, setBusy] = useState(false);
  const preset = kinds.find((item) => item.id === draft.kind) ?? kinds[0];
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = <K extends keyof Draft>(key: K, next: Draft[K]) => setDraft((row) => ({ ...row, [key]: next }));

  async function submit(formData: FormData) {
    setBusy(true);
    try {
      await save(formData);
      setSaved(draft);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={submit} className="grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <input type="hidden" name="on" value={draft.on ? "1" : "0"} />
      <input type="hidden" name="kind" value={draft.kind} />
      <input type="hidden" name="until" value={draft.until ? new Date(draft.until).toISOString() : ""} />

      <div className="grid gap-4 rounded-2xl bg-[#101013] p-5">
        <button type="button" role="switch" aria-checked={draft.on} onClick={() => set("on", !draft.on)} className={`flex cursor-pointer items-center justify-between rounded-xl px-4 py-3.5 text-left transition ${draft.on ? "bg-[#e93748]/14" : "bg-white/[0.03]"}`}>
          <span>
            <span className="block text-sm font-semibold">{draft.on ? "საიტი გათიშულია" : "საიტი ჩართულია"}</span>
            <span className="mt-0.5 block text-xs text-white/40">{draft.on ? "მომხმარებლები ოფლაინ გვერდს ხედავენ. ადმინები — საიტს." : "ჩართვისას ყველა გვერდზე ოფლაინ ეკრანი გამოჩნდება."}</span>
          </span>
          <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${draft.on ? "bg-[#e93748]" : "bg-white/10"}`}>
            <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${draft.on ? "left-[22px]" : "left-0.5"}`} />
          </span>
        </button>

        <div>
          <p className="mb-2 text-xs text-white/40">მიზეზი</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {kinds.map((item) => {
              const Icon = icons[item.id];
              const on = draft.kind === item.id;
              return (
                <button key={item.id} type="button" onClick={() => set("kind", item.id)} className={`flex cursor-pointer flex-col items-start gap-2 rounded-xl p-3 text-left transition ${on ? "bg-[#e93748]/14 text-white" : "bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"}`}>
                  <Icon className={`size-4 ${on ? "text-[#ff8a95]" : ""}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <label className="grid gap-1.5 text-xs text-white/40">სათაური<input name="title" value={draft.title} onChange={(event) => set("title", event.target.value)} placeholder={preset.title} maxLength={80} className={field} /></label>
        <label className="grid gap-1.5 text-xs text-white/40">ტექსტი<textarea name="text" value={draft.text} onChange={(event) => set("text", event.target.value)} placeholder={preset.text} maxLength={500} className={`${field} h-auto min-h-24 resize-y py-2 leading-6`} /></label>
        <label className="grid gap-1.5 text-xs text-white/40">
          <span className="flex items-center justify-between">როდის დავბრუნდებით <span className="text-white/25">არასავალდებულო · გამოჩნდება ათვლა</span></span>
          <span className="flex gap-2">
            <input type="datetime-local" value={localValue(draft.until)} onChange={(event) => set("until", event.target.value ? new Date(event.target.value).toISOString() : "")} className={`${field} [color-scheme:dark]`} />
            {draft.until ? <button type="button" className="h-10 shrink-0 cursor-pointer rounded-xl bg-white/[0.05] px-3 text-xs text-white/60 hover:text-white" onClick={() => set("until", "")}>მოხსნა</button> : null}
          </span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs text-white/40">ბმული<input name="href" value={draft.href} onChange={(event) => set("href", event.target.value)} placeholder="https://discord.gg/..." className={field} /></label>
          <label className="grid gap-1.5 text-xs text-white/40">ღილაკის წარწერა<input name="label" value={draft.label} onChange={(event) => set("label", event.target.value)} placeholder="Discord" maxLength={24} className={field} /></label>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy || !dirty} className="h-10 flex-1 cursor-pointer rounded-xl bg-[#e93748] text-sm text-white shadow-[0_8px_24px_rgba(233,55,72,0.22)] disabled:cursor-default disabled:opacity-40">{busy ? "ინახება..." : dirty ? "შენახვა" : "შენახულია"}</button>
          <a href="/admin/site/offline" target="_blank" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white/[0.05] px-4 text-sm text-white/70 hover:text-white">
            გადახედვა <ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>

      <div className="h-fit overflow-hidden rounded-2xl bg-[#070707]">
        <div className="relative px-5 py-10 text-center">
          <span className="pointer-events-none absolute top-1/2 left-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e93748]/15 blur-[60px]" />
          <img src="/logo2.png" alt="" className="relative mx-auto h-7 mix-blend-lighten" />
          <span className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#e93748]/12 px-2.5 py-1 text-[10px] font-semibold text-[#ff8a95]"><span className="size-1.5 rounded-full bg-[#e93748]" />{preset.label}</span>
          <p className="relative mt-3 text-lg leading-6 font-bold">{draft.title || preset.title}</p>
          <p className="relative mt-2 line-clamp-4 text-xs leading-5 text-white/45">{draft.text || preset.text}</p>
          {draft.href ? <span className="relative mt-4 inline-flex h-7 items-center rounded-md bg-[#e93748] px-3 text-[11px] font-semibold">{draft.label || "სიახლეები"}</span> : null}
        </div>
        <p className="bg-white/[0.02] px-4 py-2.5 text-[11px] text-white/30">{saved.on ? "ახლა მომხმარებლები ამას ხედავენ" : "ჩართვამდე ეს არავის უჩანს"}</p>
      </div>
    </form>
  );
}
