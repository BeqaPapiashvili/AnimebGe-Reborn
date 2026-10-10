"use client";

import { useState } from "react";
import { Check, ExternalLink, Pencil, Pin, Trash2, X } from "lucide-react";

type Reply = { id: number; author: string; body: string };
type Post = { id: number; author: string; title: string; category: string; pinned: boolean; body: string; at: string; replyCount: number; messages: Reply[] };

export function AdminCommunityBoard({
  rows,
  categories,
  pin,
  save,
  remove,
  dropReply,
}: {
  rows: Post[];
  categories: { id: string; label: string }[];
  pin: (formData: FormData) => void;
  save: (formData: FormData) => void;
  remove: (formData: FormData) => void;
  dropReply: (formData: FormData) => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const label = (id: string) => categories.find((item) => item.id === id)?.label ?? id;
  if (!rows.length) return <p className="py-24 text-center text-sm text-white/30">პოსტი არ არის.</p>;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {rows.map((row) => (
        <article key={row.id} className={`flex flex-col rounded-[1.75rem] border bg-white/[0.02] p-6 ${editing === row.id ? "border-primary/40" : "border-white/5"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] text-white/70">{label(row.category)}</span>
                {row.pinned ? <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] text-primary">ჩამაგრებული</span> : null}
                {row.at ? <span className="text-xs text-white/35">{row.at}</span> : null}
              </div>
              {editing === row.id ? null : <h2 className="mt-3 text-lg">{row.title || "უსათაურო"}</h2>}
              <p className="mt-1 text-sm text-white/40">{row.author || "წაშლილი მომხმარებელი"} · {row.replyCount} პასუხი</p>
            </div>
            <span className="flex gap-2">
              {editing === row.id ? null : (
                <button type="button" aria-label="პოსტის რედაქტირება" className="grid size-10 cursor-pointer place-items-center rounded-xl border border-white/10 text-white/50 hover:text-primary" onClick={() => setEditing(row.id)}>
                  <Pencil className="size-4" />
                </button>
              )}
              <a href={`/community/${row.id}`} aria-label="პოსტის ნახვა" className="grid size-10 place-items-center rounded-xl border border-white/10 text-white/50 hover:text-white"><ExternalLink className="size-4" /></a>
            </span>
          </div>
          {editing === row.id ? (
            <form action={save} className="mt-4 space-y-3" onSubmit={() => setEditing(null)}>
              <input type="hidden" name="id" value={row.id} />
              <input name="title" defaultValue={row.title} required maxLength={160} aria-label="სათაური" className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-primary/50" />
              <select name="category" defaultValue={row.category} aria-label="კატეგორია" className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none">
                {categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              <textarea name="text" defaultValue={row.body} required maxLength={4000} aria-label="ტექსტი" className="min-h-32 w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-sm leading-6 outline-none focus:border-primary/50" />
              <div className="flex gap-2">
                <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm text-white"><Check className="size-4" />შენახვა</button>
                <button type="button" className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/60" onClick={() => setEditing(null)}><X className="size-4" />გაუქმება</button>
              </div>
            </form>
          ) : row.body ? <p className="mt-4 line-clamp-4 rounded-2xl bg-black/30 p-4 text-sm leading-6 whitespace-pre-line text-white/80">{row.body}</p> : null}
          {row.messages.length ? (
            <div className="mt-4 space-y-2">
              {row.messages.map((message) => (
                <div key={message.id} className="flex items-start gap-3 rounded-xl bg-black/20 px-3 py-2">
                  <p className="min-w-0 flex-1 text-sm text-white/70"><span className="text-white/40">{message.author || "წაშლილი"} · </span>{message.body}</p>
                  <form action={dropReply}>
                    <input type="hidden" name="id" value={message.id} />
                    <button aria-label="პასუხის წაშლა" className="grid size-8 place-items-center text-white/40 hover:text-primary"><Trash2 className="size-3.5" /></button>
                  </form>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={pin}>
              <input type="hidden" name="id" value={row.id} />
              <button className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/70 hover:text-white"><Pin className="size-4" />{row.pinned ? "მოხსნა" : "ჩამაგრება"}</button>
            </form>
            <form action={remove}>
              <input type="hidden" name="id" value={row.id} />
              <button title="პასუხებიც წაიშლება" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/50 hover:border-primary/40 hover:text-primary"><Trash2 className="size-4" />პოსტის წაშლა</button>
            </form>
          </div>
        </article>
      ))}
    </div>
  );
}
