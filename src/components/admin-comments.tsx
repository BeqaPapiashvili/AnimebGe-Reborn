"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, Pencil, Pin, Trash2, X } from "lucide-react";

export type CommentCard = {
  id: number;
  author: string;
  anime: string;
  postId: number;
  text: string;
  visible: boolean;
  pinned: boolean;
  at: string;
};

export function AdminComments({
  rows,
  act,
  save,
}: {
  rows: CommentCard[];
  act: (formData: FormData) => void;
  save: (formData: FormData) => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  if (!rows.length) return <p className="py-24 text-center text-sm text-white/30">ვერაფერი მოიძებნა.</p>;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {rows.map((row) => (
        <article key={row.id} className={`flex flex-col rounded-[1.75rem] border bg-white/[0.02] p-6 ${editing === row.id ? "border-primary/40" : "border-white/5"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] ${row.visible ? "bg-green-500/15 text-green-400" : "bg-white/8 text-white/50"}`}>{row.visible ? "ჩანს" : "დამალული"}</span>
                {row.pinned ? <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] text-primary">ჩამაგრებული</span> : null}
                {row.at ? <span className="text-xs text-white/35">{row.at}</span> : null}
              </div>
              <h2 className="mt-3 text-base">{row.author}</h2>
              {row.postId ? <a href={`/admin/anime/${row.postId}`} className="mt-1 block truncate text-sm text-white/40 hover:text-white">{row.anime || "ანიმე"}</a> : <p className="mt-1 text-sm text-white/40">ანიმე წაშლილია</p>}
            </div>
            {editing === row.id ? null : (
              <button type="button" aria-label="კომენტარის რედაქტირება" className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-white/10 text-white/50 hover:text-primary" onClick={() => setEditing(row.id)}>
                <Pencil className="size-4" />
              </button>
            )}
          </div>
          {editing === row.id ? (
            <form action={save} className="mt-4" onSubmit={() => setEditing(null)}>
              <input type="hidden" name="id" value={row.id} />
              <textarea name="text" defaultValue={row.text} required maxLength={2000} autoFocus aria-label="კომენტარის ტექსტი" className="min-h-32 w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-sm leading-6 text-white outline-none focus:border-primary/50" />
              <div className="mt-3 flex gap-2">
                <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm text-white"><Check className="size-4" />შენახვა</button>
                <button type="button" className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/60" onClick={() => setEditing(null)}><X className="size-4" />გაუქმება</button>
              </div>
            </form>
          ) : <p className="mt-4 flex-1 rounded-2xl bg-black/30 p-4 text-sm leading-6 whitespace-pre-line text-white/80">{row.text || "—"}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={act}>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="kind" value={row.visible ? "hide" : "show"} />
              <button className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/70 hover:text-white">{row.visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}{row.visible ? "დამალვა" : "ჩვენება"}</button>
            </form>
            <form action={act}>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="kind" value="pin" />
              <input type="hidden" name="pinned" value={row.pinned ? "1" : "0"} />
              <button className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/70 hover:text-white"><Pin className="size-4" />{row.pinned ? "მოხსნა" : "ჩამაგრება"}</button>
            </form>
            <form action={act}>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="kind" value="delete" />
              <button title="პასუხებიც წაიშლება" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/50 hover:border-primary/40 hover:text-primary"><Trash2 className="size-4" />წაშლა</button>
            </form>
          </div>
        </article>
      ))}
    </div>
  );
}
