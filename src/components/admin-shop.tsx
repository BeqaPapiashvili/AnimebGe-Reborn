"use client";

import { useState } from "react";
import { Crown, Eye, EyeOff, Search, Upload } from "lucide-react";
import { LiveMedia } from "@/components/live-media";

type Kind = "avatar" | "cover" | "frame";
type Row = { id: number; name: string; image: string; price: number; active: boolean; limited: boolean; stock: number };

const labels: Record<Kind, string> = { avatar: "ავატარები", cover: "ქოვერები", frame: "ჩარჩოები" };
const accept = "image/png,image/jpeg,image/webp,image/gif,image/avif,video/mp4,video/webm,.gif,.webp,.png,.jpg,.jpeg,.avif,.mp4,.webm,.mov,.m4v";
const field = "h-10 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-primary/50";

function useUpload(type: Kind, onUploaded: (path: string) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function send(file: File) {
    setBusy(true);
    setError("");
    const body = new FormData();
    body.set("type", type);
    body.set("file", file);
    const res = await fetch("/api/admin/shop/upload", { method: "POST", body });
    const data = (await res.json().catch(() => ({}))) as { path?: string; error?: string };
    setBusy(false);
    if (!res.ok || !data.path) {
      setError(data.error || "ვერ აიტვირთა.");
      return;
    }
    onUploaded(data.path);
  }
  return { busy, error, send };
}

function Hint({ busy, filled, round }: { busy: boolean; filled: boolean; round?: boolean }) {
  return (
    <span className={`absolute inset-0 grid place-items-center bg-black/50 text-white ${round ? "rounded-full" : ""} ${filled && !busy ? "opacity-0 transition group-hover:opacity-100" : ""}`}>
      <Upload className="size-4" />
    </span>
  );
}

function Shot({ kind, image, busy, bar }: { kind: Kind; image: string; busy: boolean; bar?: boolean }) {
  if (kind === "cover") {
    return (
      <span className={`relative block w-full overflow-hidden bg-[#121216] ${bar ? "h-16 rounded-xl" : "h-36"}`}>
        {image ? <LiveMedia key={image} src={image} className="size-full object-cover" /> : null}
        <Hint busy={busy} filled={!!image} />
      </span>
    );
  }
  if (kind === "frame") {
    return (
      <span className={`relative mx-auto grid place-items-center ${bar ? "size-16" : "size-28"}`}>
        <span className={`rounded-full bg-white/8 ${bar ? "size-10" : "size-16"}`} />
        {image ? <img src={image} alt="" className="pointer-events-none absolute size-[132%] object-contain" /> : null}
        <span className={`absolute right-0 bottom-0 grid size-6 place-items-center rounded-full bg-black/70 text-white ${image && !busy ? "opacity-0 transition group-hover:opacity-100" : ""}`}>
          <Upload className="size-3" />
        </span>
      </span>
    );
  }
  return (
    <span className={`relative mx-auto block overflow-hidden rounded-full bg-[#121216] ${bar ? "size-16" : "size-24"}`}>
      {image ? <LiveMedia key={image} src={image} className="size-full object-cover" /> : null}
      <Hint busy={busy} filled={!!image} round />
    </span>
  );
}

function FileButton({ kind, image, onUploaded, className, bar }: { kind: Kind; image: string; onUploaded: (path: string) => void; className?: string; bar?: boolean }) {
  const { busy, error, send } = useUpload(kind, onUploaded);
  return (
    <div className={className}>
      <label className="group block cursor-pointer">
        <input type="file" accept={accept} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void send(file); event.target.value = ""; }} />
        <Shot kind={kind} image={image} busy={busy} bar={bar} />
      </label>
      {error ? <p className="mt-1 text-[11px] text-primary">{error}</p> : null}
    </div>
  );
}

function Composer({ type, save }: { type: Kind; save: (formData: FormData) => void }) {
  const [image, setImage] = useState("");
  const [capped, setCapped] = useState(false);
  const [stock, setStock] = useState(1);
  const wide = type === "cover";
  return (
    <form key={type} action={async (formData) => { await save(formData); setImage(""); setCapped(false); setStock(1); }} className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-[#0c0c0c] p-4 sm:flex-row sm:items-center">
      <input type="hidden" name="id" value="0" />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="active" value="1" />
      <input type="hidden" name="image" value={image} />
      <FileButton kind={type} image={image} onUploaded={setImage} bar className={wide ? "w-full overflow-hidden rounded-xl sm:w-72" : "shrink-0"} />
      <input name="name" required placeholder="სახელი" aria-label="სახელი" className={`${field} min-w-0 flex-1`} />
      <input name="price" type="number" min={1} defaultValue={type === "cover" ? 6000 : type === "frame" ? 2500 : 1200} required aria-label="ფასი" className={`${field} w-full sm:w-32`} />
      <label className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl px-1 text-sm text-white/70">
        <input type="checkbox" name="limited" value="1" checked={capped} onChange={(event) => setCapped(event.target.checked)} className="size-4 accent-primary" /> ლიმიტი
      </label>
      {capped ? <input name="stock" type="number" min={1} max={9999} value={stock} onChange={(event) => setStock(Math.max(1, Number(event.target.value) || 1))} aria-label="რამდენი ცალი გაიყიდოს" className={`${field} w-24`} /> : <input type="hidden" name="stock" value={stock} />}
      <button disabled={!image} className="h-10 shrink-0 cursor-pointer rounded-xl bg-primary px-5 text-sm font-semibold text-white disabled:cursor-default disabled:opacity-40">დამატება</button>
    </form>
  );
}

function ItemCard({ row, type, save, toggle }: { row: Row; type: Kind; save: (formData: FormData) => void; toggle: (formData: FormData) => void }) {
  const [image, setImage] = useState(row.image);
  const [capped, setCapped] = useState(row.limited);
  const [stock, setStock] = useState(row.stock || 1);
  return (
    <article className={`overflow-hidden rounded-2xl border border-white/8 bg-[#0c0c0c] ${row.active ? "" : "opacity-50"}`}>
      <FileButton kind={type} image={image} onUploaded={setImage} className={type === "cover" ? "" : "px-4 pt-5"} />
      <form action={save} className="space-y-2 px-4 pt-3 pb-3">
        <input type="hidden" name="id" value={row.id} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="active" value={row.active ? "1" : "0"} />
        <input type="hidden" name="image" value={image} />
        <input name="name" defaultValue={row.name} required aria-label="სახელი" className={`${field} w-full`} />
        <div className="flex items-center gap-2">
          <input name="price" type="number" min={1} defaultValue={row.price} required aria-label="ფასი" className={`${field} min-w-0 flex-1`} />
          <button className="h-10 shrink-0 cursor-pointer rounded-xl bg-primary px-3.5 text-sm font-semibold text-white">შენახვა</button>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 text-sm text-white/70">
            <input type="checkbox" name="limited" value="1" checked={capped} onChange={(event) => setCapped(event.target.checked)} className="size-4 accent-primary" />
            <Crown className="size-3.5 text-[#e2b340]" />
            ლიმიტი
          </label>
          {capped ? (
            <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3">
              <input name="stock" type="number" min={1} max={9999} value={stock} onChange={(event) => setStock(Math.max(1, Number(event.target.value) || 1))} aria-label="რამდენი ცალი გაიყიდოს" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none" />
              <span className="shrink-0 text-xs text-white/40">ცალი</span>
            </label>
          ) : (
            <input type="hidden" name="stock" value={stock} />
          )}
        </div>
      </form>
      <form action={toggle} className="px-4 pb-3">
        <input type="hidden" name="id" value={row.id} />
        <input type="hidden" name="active" value={row.active ? "1" : "0"} />
        <button className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-white/40 hover:text-white">
          {row.active ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          {row.active ? "დამალვა" : "ჩართვა"}
        </button>
      </form>
    </article>
  );
}

export function AdminShop({
  type,
  q,
  page,
  pages,
  found,
  counts,
  rows,
  save,
  toggle,
}: {
  type: Kind;
  q: string;
  page: number;
  pages: number;
  found: number;
  counts: Partial<Record<Kind, number>>;
  rows: Row[];
  save: (formData: FormData) => void;
  toggle: (formData: FormData) => void;
}) {
  const href = (nextType: Kind, nextPage = 1) => {
    const query = new URLSearchParams({ type: nextType });
    if (q) query.set("q", q);
    if (nextPage > 1) query.set("page", String(nextPage));
    return `/admin/shop?${query}`;
  };
  const grid = type === "cover" ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : type === "frame" ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex h-11 rounded-xl border border-white/8 bg-white/[0.03] p-1">
          {(Object.keys(labels) as Kind[]).map((value) => (
            <a key={value} href={href(value)} className={`inline-flex items-center gap-2 rounded-lg px-3.5 text-sm ${type === value ? "bg-primary text-white" : "text-white/55"}`}>
              {labels[value]}
              <span className={type === value ? "text-white/70" : "text-white/30"}>{counts[value] ?? 0}</span>
            </a>
          ))}
        </div>
        <form method="get" action="/admin/shop" className="relative min-w-0 flex-1">
          <input type="hidden" name="type" value={type} />
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/30" />
          <input name="q" defaultValue={q} placeholder="სახელით ძებნა" aria-label="ძებნა" className="h-11 w-full rounded-xl border border-white/8 bg-white/[0.03] pr-3 pl-10 text-sm outline-none placeholder:text-white/30 focus:border-primary/50" />
        </form>
      </div>
      <Composer type={type} save={save} />
      {rows.length ? (
        <div className={`grid gap-4 ${grid}`}>
          {rows.map((row) => <ItemCard key={`${row.id}-${row.image}`} row={row} type={type} save={save} toggle={toggle} />)}
        </div>
      ) : <p className="py-16 text-center text-sm text-white/30">ამ სიაში არაფერია.</p>}
      {pages > 1 ? (
        <div className="flex items-center justify-between text-sm text-white/45">
          <span>{found} ნივთი</span>
          <div className="flex items-center gap-2">
            {page > 1 ? <a href={href(type, page - 1)} className="rounded-lg border border-white/10 px-3 py-1.5 text-white">წინა</a> : null}
            <span>{page} / {pages}</span>
            {page < pages ? <a href={href(type, page + 1)} className="rounded-lg border border-white/10 px-3 py-1.5 text-white">შემდეგი</a> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
