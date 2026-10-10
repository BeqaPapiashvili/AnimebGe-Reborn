"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ImagePlus, Search, Sparkles, X } from "lucide-react";

const RANKS = ["E", "D", "C", "B", "A", "S", "S+", "RE"] as const;
const FRAMES: Record<string, string> = { E: "E", D: "D", C: "C", B: "B", A: "A", S: "S", "S+": "SSS" };
const W = 288;
const H = 432;
const PX = 82 / 72;

type Found = { id: number; title: string; poster?: string; year?: string };

function fit(text: string, size: number, max: number, minSize = 8) {
  if (typeof document === "undefined" || !text) return { text, px: size * PX };
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return { text, px: size * PX };
  let value = text.trim();
  let current = size;
  for (let step = 0; step < 200; step += 1) {
    ctx.font = `${current * PX}px CardFont`;
    if (ctx.measureText(value).width <= max) break;
    if (current > minSize) {
      current -= 1;
      continue;
    }
    const chars = [...value.replace(/\.\.\.$/, "")];
    if (chars.length <= 4) break;
    value = `${chars.slice(0, -1).join("").trimEnd()}...`;
  }
  return { text: value, px: current * PX };
}

function wrapName(text: string, max: number) {
  const value = text.trim();
  const ctx = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  if (!ctx || !value) return { lines: [value], px: 23 * PX };
  for (let size = 23; size >= 12; size -= 1) {
    ctx.font = `${size * PX}px CardFont`;
    if (ctx.measureText(value).width <= max) return { lines: [value], px: size * PX };
    const words = value.split(/\s+/);
    if (words.length < 2) continue;
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > max) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
    if (lines.length <= 2 && lines.every((item) => ctx.measureText(item).width <= max)) return { lines, px: size * PX };
  }
  const single = fit(value, 12, max);
  return { lines: [single.text], px: single.px };
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#e93748] text-sm font-semibold text-white transition hover:bg-[#ff4757] disabled:cursor-wait disabled:opacity-60">
      <Sparkles className="size-4" />
      {pending ? "იქმნება..." : "ქარდის შექმნა"}
    </button>
  );
}

export function AdminCardCreator({ action, added }: { action: (formData: FormData) => Promise<void>; added: boolean }) {
  const [name, setName] = useState("");
  const [anime, setAnime] = useState("");
  const [newsId, setNewsId] = useState(0);
  const [rank, setRank] = useState<string>("C");
  const [caption, setCaption] = useState(true);
  const [file, setFile] = useState<{ url: string; video: boolean } | null>(null);
  const [term, setTerm] = useState("");
  const [found, setFound] = useState<Found[]>([]);
  const [fontReady, setFontReady] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const face = new FontFace("CardFont", "url(/uploads/fonts/font.ttf)");
    face.load().then((loaded) => {
      document.fonts.add(loaded);
      setFontReady(true);
    }).catch(() => setFontReady(true));
  }, []);

  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((body: { results?: Found[] }) => setFound((body.results ?? []).slice(0, 6)))
        .catch(() => {});
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  useEffect(() => () => {
    if (file) URL.revokeObjectURL(file.url);
  }, [file]);

  function pick(next: File | undefined) {
    if (!next) return;
    const video = next.type.startsWith("video/");
    setFile({ url: URL.createObjectURL(next), video });
    if (video) setRank("RE");
  }

  function choose(item: Found) {
    setNewsId(item.id);
    setAnime(item.title);
    setTerm("");
    setFound([]);
  }

  const framed = rank !== "RE";
  const nameFit = fontReady ? wrapName(name || "პერსონაჟი", W - 40) : { lines: [name || "პერსონაჟი"], px: 23 * PX };
  const animeFit = fontReady ? fit(anime || "ანიმე", 12, W - 60, 11) : { text: anime || "ანიმე", px: 12 * PX };

  return (
    <form action={action} className="grid gap-6 rounded-2xl bg-[#121214] p-5 lg:grid-cols-[1fr_auto]">
      <input type="hidden" name="news" value={newsId} />
      <input type="hidden" name="anime" value={anime} />
      <input type="hidden" name="rarity" value={rank} />
      <input type="hidden" name="caption" value={caption ? "on" : ""} />
      <div className="grid content-start gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">ახალი ქარდი</h2>
          <p className="mt-1 text-xs text-white/40">ატვირთე სურათი, დაწერე სახელი და აირჩიე რანგი. ჩარჩო, გრადიენტი და სახელები ავტომატურად დაედება.</p>
        </div>
        {added ? <p className="rounded-xl bg-[#22c55e]/10 px-3 py-2 text-sm text-[#4ade80]">ქარდი დაემატა.</p> : null}

        <button type="button" onClick={() => input.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
          event.preventDefault();
          const dropped = event.dataTransfer.files?.[0];
          if (dropped && input.current) {
            const list = new DataTransfer();
            list.items.add(dropped);
            input.current.files = list.files;
            pick(dropped);
          }
        }} className="flex cursor-pointer items-center gap-3 rounded-xl bg-[#18181b] px-4 py-4 text-left transition hover:bg-[#1f1f23]">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#e93748]/15 text-[#ff8a95]"><ImagePlus className="size-5" /></span>
          <span className="min-w-0">
            <span className="block text-sm text-white">{file ? "სურათი არჩეულია — დააჭირე შესაცვლელად" : "აირჩიე ან ჩააგდე სურათი"}</span>
            <span className="block text-[11px] text-white/35">PNG, JPG, WEBP · RE რანგზე ასევე GIF, MP4, WEBM · იდეალური თანაფარდობა 2:3</span>
          </span>
        </button>
        <input ref={input} name="file" type="file" required accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" className="hidden" onChange={(event) => pick(event.target.files?.[0])} />

        <label className="grid gap-1.5">
          <span className="text-[11px] font-semibold text-white/45">პერსონაჟის სახელი</span>
          <input name="name" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="მაგ. ნეზუკო" className="h-11 rounded-xl bg-[#18181b] px-3 text-sm text-white outline-none placeholder:text-white/25 focus:bg-[#1f1f23]" />
        </label>

        <div className="grid gap-1.5">
          <span className="text-[11px] font-semibold text-white/45">ანიმე</span>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/30" />
            <input value={term} onChange={(event) => {
              setTerm(event.target.value);
              if (event.target.value.trim().length < 2) setFound([]);
            }} placeholder={newsId ? "სხვა ანიმეს მოძებნა..." : "მოძებნე ანიმე..."} className="h-11 w-full rounded-xl bg-[#18181b] pr-3 pl-9 text-sm text-white outline-none placeholder:text-white/25 focus:bg-[#1f1f23]" />
            {found.length ? (
              <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl bg-[#18181b] shadow-[0_18px_40px_rgba(0,0,0,0.5)]">
                {found.map((item) => (
                  <button key={item.id} type="button" onClick={() => choose(item)} className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left hover:bg-white/5">
                    {item.poster ? <img src={item.poster} alt="" className="h-10 w-7 shrink-0 rounded object-cover" /> : <span className="h-10 w-7 shrink-0 rounded bg-white/5" />}
                    <span className="min-w-0 flex-1 truncate text-sm text-white">{item.title}</span>
                    <span className="text-[11px] text-white/30">#{item.id}{item.year ? ` · ${item.year}` : ""}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {newsId ? (
            <div className="flex items-center gap-2 rounded-xl bg-[#e93748]/10 px-3 py-2 text-xs text-[#ff8a95]">
              <span className="flex-1">არჩეულია: #{newsId}</span>
              <button type="button" aria-label="მოხსნა" className="cursor-pointer text-white/50 hover:text-white" onClick={() => setNewsId(0)}><X className="size-3.5" /></button>
            </div>
          ) : null}
          <input value={anime} onChange={(event) => setAnime(event.target.value)} maxLength={120} placeholder="ქარდზე დასაწერი ანიმეს სახელი" className="h-10 rounded-xl bg-[#18181b] px-3 text-xs text-white outline-none placeholder:text-white/25 focus:bg-[#1f1f23]" />
        </div>

        <div className="grid gap-1.5">
          <span className="text-[11px] font-semibold text-white/45">რანგი</span>
          <div className="flex flex-wrap gap-1.5">
            {RANKS.map((item) => (
              <button key={item} type="button" onClick={() => setRank(item)} className={`h-9 min-w-11 cursor-pointer rounded-lg px-3 text-sm font-semibold transition ${rank === item ? "bg-[#e93748] text-white" : "bg-[#18181b] text-white/60 hover:bg-[#1f1f23] hover:text-white"}`}>{item}</button>
            ))}
          </div>
          {rank === "RE" ? <p className="text-[11px] text-white/35">RE რანგზე ფაილი ჩარჩოს გარეშე, ისე იტვირთება როგორც არის (ვიდეოც შეიძლება).</p> : null}
        </div>

        {framed ? (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={caption} onChange={(event) => setCaption(event.target.checked)} className="size-4 accent-[#e93748]" />
            სახელების დაწერა ქარდზე
          </label>
        ) : null}

        <div className="grid grid-cols-[1fr_120px] gap-3">
          <label className="grid gap-1.5">
            <span className="text-[11px] font-semibold text-white/45">აღწერა</span>
            <textarea name="text" rows={2} maxLength={2000} placeholder="არასავალდებულო" className="rounded-xl bg-[#18181b] px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:bg-[#1f1f23]" />
          </label>
          <label className="grid content-start gap-1.5">
            <span className="text-[11px] font-semibold text-white/45">ქულა</span>
            <input name="points" type="number" min={0} max={100000} defaultValue={300} className="h-11 rounded-xl bg-[#18181b] px-3 text-sm text-white outline-none focus:bg-[#1f1f23]" />
          </label>
        </div>

        <Submit />
      </div>

      <div className="grid content-start justify-items-center gap-2">
        <span className="text-[11px] font-semibold text-white/35">ლაივ პრევიუ</span>
        <div className="relative overflow-hidden rounded-[14px] bg-[#0f0f11] shadow-[0_20px_50px_rgba(0,0,0,0.5)]" style={{ width: W, height: H }}>
          {file ? (
            file.video ? <video src={file.url} autoPlay muted loop playsInline className="absolute inset-0 size-full object-cover" /> : <img src={file.url} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-xs text-white/20">სურათი</div>
          )}
          {framed ? (
            <>
              {caption ? <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent" style={{ height: nameFit.lines.length > 1 ? 150 : 140 }} /> : null}
              <img src={`/uploads/card_borders/${FRAMES[rank]}.png`} alt="" className="pointer-events-none absolute inset-0 size-full" />
              {caption ? (
                <>
                  <span className="absolute inset-x-5 text-center whitespace-nowrap text-white" style={{ fontFamily: "CardFont", fontSize: nameFit.px, lineHeight: 1.07, bottom: 24 + animeFit.px / 2 + 14 - nameFit.px * 0.12 }}>
                    {nameFit.lines.map((line, index) => <span key={index} className="block">{line}</span>)}
                  </span>
                  <span className="absolute inset-x-0 text-center leading-none whitespace-nowrap text-white" style={{ fontFamily: "CardFont", fontSize: animeFit.px, bottom: 24, transform: "translateY(50%)" }}>{animeFit.text}</span>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </form>
  );
}
