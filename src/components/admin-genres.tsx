"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Search, Trash2, X } from "lucide-react";

export function AdminGenres({
  rows,
  rename,
  add,
  remove,
}: {
  rows: { id: number; name: string; count: number }[];
  rename: (formData: FormData) => void;
  add: (formData: FormData) => void;
  remove: (formData: FormData) => void;
}) {
  const [needle, setNeedle] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const shown = rows.filter((row) => row.name.toLowerCase().includes(needle.trim().toLowerCase()));
  return (
    <div className="space-y-8">
      <form action={add} className="flex max-w-xl gap-2">
        <input name="name" required minLength={2} maxLength={50} placeholder="ახალი ჟანრი" aria-label="ახალი ჟანრი" className="h-12 min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm outline-none focus:border-primary/50" />
        <button className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-2xl bg-[#e93748] px-4 text-sm text-white"><Plus className="size-4" /> დამატება</button>
      </form>
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute top-1/2 left-6 size-5 -translate-y-1/2 text-white/20" />
        <input value={needle} onChange={(event) => setNeedle(event.target.value)} placeholder="ძებნა ჟანრით" aria-label="ჟანრის ძებნა" className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-5 pr-6 pl-16 text-sm text-white outline-none placeholder:text-white/20 focus:border-primary/50" />
      </div>
      {shown.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {shown.map((row) => (
            <article key={row.id} className={`rounded-[2rem] border bg-white/[0.02] p-5 ${editing === row.id ? "border-primary/40" : "border-white/5"}`}>
              {editing === row.id ? (
                <form action={rename} className="flex items-center gap-2" onSubmit={() => setEditing(null)}>
                  <input type="hidden" name="id" value={row.id} />
                  <input name="name" defaultValue={row.name} required autoFocus aria-label="ჟანრის სახელი" className="h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-4 text-sm text-white outline-none focus:border-primary/50" />
                  <button className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-white" aria-label="შენახვა"><Check className="size-4" /></button>
                  <button type="button" className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-xl border border-white/10 text-white/50" aria-label="გაუქმება" onClick={() => setEditing(null)}><X className="size-4" /></button>
                </form>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg">{row.name}</p>
                    <p className="mt-1 text-[10px] tracking-widest text-white/30 uppercase">{row.count} ანიმე</p>
                  </div>
                  <button type="button" className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-xl border border-white/5 bg-white/[0.03] text-white/40 hover:text-primary" aria-label="სახელის შეცვლა" onClick={() => setEditing(row.id)}>
                    <Pencil className="size-4" />
                  </button>
                  <form action={remove} onSubmit={(event) => { if (!confirm(row.count ? `„${row.name}“ ${row.count} ანიმეს მოშორდება და წაიშლება.` : `„${row.name}“ წაიშალოს?`)) event.preventDefault(); }}>
                    <input type="hidden" name="id" value={row.id} />
                    <button className="grid size-12 cursor-pointer place-items-center rounded-xl border border-white/5 bg-white/[0.03] text-white/40 hover:text-[#e93748]" aria-label="წაშლა"><Trash2 className="size-4" /></button>
                  </form>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="py-20 text-center text-sm text-white/30">ასეთი ჟანრი არ არის.</p>
      )}
    </div>
  );
}
