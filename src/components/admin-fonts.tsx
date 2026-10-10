"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Upload } from "lucide-react";
import { fontSlots, type FontRole, type SiteFont } from "@/lib/font-types";

const groups = [...new Set(fontSlots.map((slot) => slot.group))];

export function AdminFonts({
  fonts,
  use,
  save,
  remove,
}: {
  fonts: SiteFont[];
  use: Record<FontRole, string>;
  save: (formData: FormData) => Promise<void>;
  remove: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState(use);

  async function upload(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError("");
    const body = new FormData();
    body.set("file", file);
    body.set("name", name);
    const response = await fetch("/api/admin/fonts/upload", { method: "POST", body });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!response.ok) {
      setError(data?.error || "ატვირთვა ვერ მოხერხდა.");
      return;
    }
    setName("");
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <form action={save} className="grid gap-4">
        {groups.map((group) => (
          <section key={group} className="rounded-2xl border border-white/8 bg-[#101013] p-5">
            <h2 className="text-lg">{group}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {fontSlots.filter((slot) => slot.group === group).map((slot) => (
                <label key={slot.role} className="grid gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] p-3">
                  <span className="text-sm">{slot.label}</span>
                  <span className="text-xs text-white/35">{slot.hint}</span>
                  <select name={slot.role} value={picked[slot.role]} onChange={(event) => setPicked((current) => ({ ...current, [slot.role]: event.target.value }))} className="h-10 rounded-xl border border-white/8 bg-[#141417] px-3 text-sm outline-none">
                    {fonts.map((font) => (
                      <option key={`${slot.role}-${font.family}`} value={font.family}>{font.name}</option>
                    ))}
                  </select>
                  <span className="truncate text-base" style={{ fontFamily: `"${picked[slot.role]}", sans-serif` }}>ქართული ტექსტი · Animeb</span>
                </label>
              ))}
            </div>
          </section>
        ))}
        <button type="submit" className="h-10 cursor-pointer rounded-xl bg-[#e93748] text-sm text-white">შენახვა</button>
      </form>
      <section className="h-fit rounded-2xl border border-white/8 bg-[#101013] p-5 xl:sticky xl:top-24">
        <h2 className="text-lg">ფონტები</h2>
        <label className="mt-4 grid gap-2">
          <span className="text-xs text-white/40">ახალი ფონტის სახელი</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="მაგალითად Noto" className="h-10 rounded-xl border border-white/8 bg-white/[0.03] px-3 text-sm outline-none" />
        </label>
        <label className={`mt-3 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-sm ${busy ? "pointer-events-none opacity-50" : ""}`}>
          <Upload className="size-4" />
          {busy ? "იტვირთება" : "ფაილის ატვირთვა"}
          <input type="file" accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2" className="hidden" onChange={(event) => { void upload(event.target.files?.[0] ?? null); event.target.value = ""; }} />
        </label>
        {error ? <p className="mt-2 text-xs text-[#e93748]">{error}</p> : <p className="mt-2 text-xs text-white/30">ttf, otf, woff, woff2 · 8 მბ-მდე</p>}
        <ul className="mt-4 grid gap-2">
          {fonts.map((font) => (
            <li key={font.builtIn ? font.family : font.id} className="flex items-center gap-3 rounded-xl border border-white/8 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{font.name}</span>
                <span className="block truncate text-sm text-white/70" style={{ fontFamily: `"${font.family}", sans-serif` }}>აბგდევ · Animeb</span>
              </span>
              {font.builtIn ? <span className="text-[11px] text-white/30">ჩაშენებული</span> : (
                <form action={remove}>
                  <input type="hidden" name="id" value={font.id} />
                  <button type="submit" className="grid size-8 cursor-pointer place-items-center rounded-lg text-white/40 hover:bg-white/5 hover:text-white" aria-label="წაშლა">
                    <Trash2 className="size-4" />
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
