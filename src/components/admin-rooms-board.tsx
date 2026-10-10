"use client";

import { useState } from "react";
import { Check, ExternalLink, Pencil, X } from "lucide-react";

type RoomCard = { code: string; host: string; title: string; episode: number; visibility: string; closed: boolean; at: string };

const access = [
  ["public", "საჯარო"],
  ["link", "ბმულით"],
  ["friends", "მეგობრები"],
] as const;

export function AdminRoomsBoard({
  rows,
  save,
  close,
}: {
  rows: RoomCard[];
  save: (formData: FormData) => void;
  close: (formData: FormData) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  if (!rows.length) return <p className="py-24 text-center text-sm text-white/30">ოთახი არ არის.</p>;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {rows.map((row) => (
        <article key={row.code} className={`flex flex-col rounded-[1.75rem] border bg-white/[0.02] p-6 ${editing === row.code ? "border-primary/40" : "border-white/5"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] ${row.closed ? "bg-white/8 text-white/50" : "bg-green-500/15 text-green-400"}`}>{row.closed ? "დახურულია" : "ღიაა"}</span>
                <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] text-white/70">{access.find(([value]) => value === row.visibility)?.[1] ?? "საჯარო"}</span>
                {row.at ? <span className="text-xs text-white/35">{row.at}</span> : null}
              </div>
              {editing === row.code ? null : <h2 className="mt-3 text-lg">{row.title || "უსათაურო ოთახი"}</h2>}
              <p className="mt-1 text-sm text-white/40">{row.host || "წაშლილი მომხმარებელი"} · სერია {row.episode || "—"}</p>
            </div>
            <span className="flex gap-2">
              {editing === row.code ? null : (
                <button type="button" aria-label="ოთახის რედაქტირება" className="grid size-10 cursor-pointer place-items-center rounded-xl border border-white/10 text-white/50 hover:text-primary" onClick={() => setEditing(row.code)}>
                  <Pencil className="size-4" />
                </button>
              )}
              <a href={`/watch2gether/${row.code}`} aria-label="ოთახის გახსნა" className="grid size-10 place-items-center rounded-xl border border-white/10 text-white/50 hover:text-white"><ExternalLink className="size-4" /></a>
            </span>
          </div>
          {editing === row.code ? (
            <form action={save} className="mt-4 space-y-3" onSubmit={() => setEditing(null)}>
              <input type="hidden" name="code" value={row.code} />
              <input name="title" defaultValue={row.title} required maxLength={255} aria-label="ოთახის სახელი" className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-primary/50" />
              <select name="visibility" defaultValue={row.visibility} aria-label="ვინ ხედავს" className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none">
                {access.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <div className="flex gap-2">
                <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm text-white"><Check className="size-4" />შენახვა</button>
                <button type="button" className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/60" onClick={() => setEditing(null)}><X className="size-4" />გაუქმება</button>
              </div>
            </form>
          ) : <p className="mt-4 rounded-2xl bg-black/30 px-4 py-3 font-mono text-sm tracking-widest text-white/70">{row.code}</p>}
          {row.closed ? null : (
            <form action={close} className="mt-4">
              <input type="hidden" name="code" value={row.code} />
              <button className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/70 hover:border-primary/40 hover:text-primary">დახურვა</button>
            </form>
          )}
        </article>
      ))}
    </div>
  );
}
