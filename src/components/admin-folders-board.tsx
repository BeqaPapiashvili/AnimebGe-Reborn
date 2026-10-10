"use client";

import { useState } from "react";
import { Check, ExternalLink, Pencil, Trash2, X } from "lucide-react";

type FolderCard = { id: number; name: string; owner: string; description: string; visibility: string; count: number; at: string };

const choices = [
  ["public", "საჯარო"],
  ["unlisted", "ბმულით"],
  ["private", "პირადი"],
] as const;

export function AdminFoldersBoard({
  rows,
  save,
  visibility,
  remove,
}: {
  rows: FolderCard[];
  save: (formData: FormData) => void;
  visibility: (formData: FormData) => void;
  remove: (formData: FormData) => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  if (!rows.length) return <p className="py-24 text-center text-sm text-white/30">სია არ არის.</p>;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {rows.map((row) => (
        <article key={row.id} className={`flex flex-col rounded-[1.75rem] border bg-white/[0.02] p-6 ${editing === row.id ? "border-primary/40" : "border-white/5"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] text-white/70">{choices.find(([value]) => value === row.visibility)?.[1] ?? "საჯარო"}</span>
                <span className="text-xs text-white/35">{row.count} ანიმე</span>
                {row.at ? <span className="text-xs text-white/35">{row.at}</span> : null}
              </div>
              {editing === row.id ? null : <h2 className="mt-3 text-lg">{row.name}</h2>}
              <p className="mt-1 text-sm text-white/40">{row.owner || "წაშლილი მომხმარებელი"}</p>
            </div>
            <span className="flex gap-2">
              {editing === row.id ? null : (
                <button type="button" aria-label="სიის რედაქტირება" className="grid size-10 cursor-pointer place-items-center rounded-xl border border-white/10 text-white/50 hover:text-primary" onClick={() => setEditing(row.id)}>
                  <Pencil className="size-4" />
                </button>
              )}
              <a href={`/lists/${row.id}`} aria-label="სიის ნახვა" className="grid size-10 place-items-center rounded-xl border border-white/10 text-white/50 hover:text-white"><ExternalLink className="size-4" /></a>
            </span>
          </div>
          {editing === row.id ? (
            <form action={save} className="mt-4 space-y-3" onSubmit={() => setEditing(null)}>
              <input type="hidden" name="id" value={row.id} />
              <input name="name" defaultValue={row.name} required maxLength={60} aria-label="სიის სახელი" className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-primary/50" />
              <textarea name="description" defaultValue={row.description} maxLength={500} aria-label="აღწერა" className="min-h-24 w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-sm leading-6 outline-none focus:border-primary/50" />
              <div className="flex gap-2">
                <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm text-white"><Check className="size-4" />შენახვა</button>
                <button type="button" className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/60" onClick={() => setEditing(null)}><X className="size-4" />გაუქმება</button>
              </div>
            </form>
          ) : row.description ? <p className="mt-4 line-clamp-3 rounded-2xl bg-black/30 p-4 text-sm leading-6 text-white/80">{row.description}</p> : null}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {choices.map(([value, label]) => (
              <form key={value} action={visibility}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="visibility" value={value} />
                <button className={`rounded-xl border px-3 py-2 text-sm ${row.visibility === value ? "border-primary bg-primary text-white" : "border-white/10 text-white/60 hover:text-white"}`}>{label}</button>
              </form>
            ))}
            <form action={remove} className="ml-auto">
              <input type="hidden" name="id" value={row.id} />
              <button title="სია და მასში შენახული ანიმეები წაიშლება" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/50 hover:border-primary/40 hover:text-primary"><Trash2 className="size-4" />წაშლა</button>
            </form>
          </div>
        </article>
      ))}
    </div>
  );
}
