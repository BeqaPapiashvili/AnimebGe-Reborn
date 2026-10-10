"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import avatars from "@/data/avatars.json";
import { FrameOverlay } from "@/components/avatar";
import { MotionMedia } from "@/components/motion-media";

function fileOf(url?: string) {
  const name = decodeURIComponent(url?.split("?")[0]?.split("/").pop() ?? "");
  return avatars.some((group) => group.items.some((item) => item.file === name)) ? name : "";
}

export function AvatarPicker({ open, avatar, frame, locked = [], onClose, onPick }: { open: boolean; avatar?: string; frame?: string; locked?: string[]; onClose: () => void; onPick: (file: string) => void }) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(fileOf(avatar));
  const equipped = fileOf(avatar);
  const equippedRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    setPicked(fileOf(avatar));
    setQuery("");
  }, [open, avatar]);
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  useEffect(() => {
    if (!open || !equipped) return;
    const frameId = requestAnimationFrame(() => equippedRef.current?.scrollIntoView({ block: "center" }));
    return () => cancelAnimationFrame(frameId);
  }, [open, equipped]);

  const needle = query.trim().toLowerCase();
  const groups = useMemo(() => avatars.map((group) => ({
    ...group,
    items: group.items.filter((item) => !locked.includes(item.file) && (!needle || item.name.toLowerCase().includes(needle))),
  })).filter((group) => group.items.length), [needle, locked]);
  const current = avatars.flatMap((group) => group.items).find((item) => item.file === picked);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-3" onMouseDown={onClose}>
      <div className="flex h-[min(760px,92dvh)] w-full max-w-[660px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111111] text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)]" onMouseDown={(event) => event.stopPropagation()}>
        <div className="px-[22px] pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[20px] leading-[26px] font-bold">ავატარები</h2>
              <p className="text-[13px] leading-[22px] text-white/50">აირჩიე პროფილის სურათი. ანიმაცია მაუსის მიტანაზე ჩანს.</p>
            </div>
            <button type="button" aria-label="დახურვა" className="grid size-[30px] cursor-pointer place-items-center rounded-lg text-white/70 hover:bg-white/8" onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <div className="mt-3 h-0.5 w-[72px] bg-[#e93748]" />
        </div>
        <div className="flex items-center justify-between gap-4 px-[22px] py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative size-16 shrink-0">
              <MotionMedia src={current ? `/assets/avatars/${current.file}` : "/assets/avatar.jpg"} className="size-16 rounded-full" />
              <FrameOverlay src={frame} className="pointer-events-none absolute top-1/2 left-1/2 size-[120%] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] leading-5 font-bold">{current?.name ?? "ავატარი არ არის არჩეული"}</p>
              <p className="mt-0.5 text-[12px] leading-4 text-white/45">{current ? "მაუსი მიიტანე, რომ ანიმაცია დაინახო." : "ქვემოთ აირჩიე ავატარი."}</p>
            </div>
          </div>
          <label className="flex h-10 w-[210px] shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-[#1a1a1a] px-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 text-white/40"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ავატარის ძებნა..." className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/35" />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-[22px] pb-4">
          {groups.map((group, index) => (
            <section key={`${group.title}-${index}`} className="pt-4">
              <h3 className="flex items-center gap-2 text-[15px] leading-5 font-bold">
                {group.title}
                {group.items.some((item) => item.file === equipped) ? <span className="rounded bg-[#e93748] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">დაყენებული</span> : null}
              </h3>
              <div className="mt-2.5 grid grid-cols-4 gap-2 sm:grid-cols-7">
                {group.items.map((item) => {
                  const on = item.file === picked;
                  const worn = item.file === equipped;
                  return (
                    <button ref={worn ? equippedRef : undefined} key={item.file} type="button" title={worn ? `${item.name} · დაყენებული` : item.name} aria-label={item.name} aria-pressed={on} className={`relative grid aspect-square cursor-pointer place-items-center rounded-xl bg-black ${worn ? "ring-2 ring-[#e93748]" : on ? "ring-2 ring-white" : "ring-1 ring-white/10 hover:ring-white/30"}`} onClick={() => setPicked(item.file)}>
                      <MotionMedia src={`/assets/avatars/${item.file}`} alt={item.name} className="size-[78%] rounded-full" />
                      {worn ? <span className="absolute top-1 right-1 size-2.5 rounded-full bg-[#e93748] ring-2 ring-black" /> : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          {!groups.length ? <p className="py-10 text-center text-sm text-white/45">ასეთი ავატარი არ მოიძებნა.</p> : null}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-[22px] py-3.5">
          <button type="button" className="h-9 cursor-pointer rounded-lg bg-[#1c1c1c] px-4 text-[13px] font-semibold text-white/80 hover:bg-white/10" onClick={() => setPicked("")}>ავატარის მოხსნა</button>
          <div className="flex items-center gap-2">
            <button type="button" className="h-9 cursor-pointer rounded-lg px-4 text-[13px] font-semibold text-white/80 hover:bg-white/8" onClick={onClose}>გაუქმება</button>
            <button type="button" className="h-9 cursor-pointer rounded-lg bg-[#e93748] px-5 text-[13px] font-bold text-white" onClick={() => { onPick(picked); onClose(); }}>შენახვა</button>
          </div>
        </div>
      </div>
    </div>
  );
}
