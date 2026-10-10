"use client";

import { useEffect, useRef, useState } from "react";

export type MenuOption = { value: string; label: string };

function Chevron({ open }: { open: boolean }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`filter-chevron shrink-0 text-[#9ca3af] ${open ? "is-open" : ""}`}><path d="m6 9 6 6 6-6" /></svg>;
}

function useClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) close();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

export function AdminSelect({ name, value, options, placeholder = "აირჩიე", onChange }: { name?: string; value: string; options: MenuOption[]; placeholder?: string; onChange?: (value: string) => void }) {
  const [inner, setInner] = useState(value);
  const current = onChange ? value : inner;
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const ref = useClose(open, close);
  const label = options.find((option) => option.value === current)?.label;
  return (
    <div ref={ref} className="relative">
      {name ? <input type="hidden" name={name} value={current} /> : null}
      <button type="button" className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-left text-sm text-white" aria-expanded={open} onClick={() => setOpen((on) => !on)}>
        <span className={`truncate ${label ? "" : "text-white/30"}`}>{label || placeholder}</span>
        <Chevron open={open} />
      </button>
      {open ? (
        <div className="absolute top-full right-0 left-0 z-50 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0a0a] p-1 shadow-2xl">
          {options.map((option) => {
            const on = option.value === current;
            return (
              <button key={option.value} type="button" className={`flex w-full cursor-pointer items-center rounded-xl px-4 py-3 text-left text-xs tracking-widest uppercase ${on ? "bg-primary/5 text-primary" : "text-white/40 hover:bg-white/5"}`} onClick={() => { if (onChange) onChange(option.value); else setInner(option.value); setOpen(false); }}>
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function AdminMulti({ name, values, options, placeholder = "აირჩიე" }: { name: string; values: string[]; options: MenuOption[]; placeholder?: string }) {
  const [picked, setPicked] = useState(values);
  const [open, setOpen] = useState(false);
  const [needle, setNeedle] = useState("");
  const close = () => setOpen(false);
  const ref = useClose(open, close);
  const labels = options.filter((option) => picked.includes(option.value));
  const shown = options.filter((option) => option.label.toLowerCase().includes(needle.trim().toLowerCase()));
  function toggle(value: string) {
    setPicked((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }
  return (
    <div ref={ref} className="relative">
      {picked.map((value) => <input key={value} type="hidden" name={name} value={value} />)}
      <button type="button" className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-left text-sm text-white" aria-expanded={open} onClick={() => setOpen((on) => !on)}>
        <span className="truncate text-white/40">{labels.length ? `${labels.length} არჩეული` : placeholder}</span>
        <Chevron open={open} />
      </button>
      {labels.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {labels.map((option) => (
            <button key={option.value} type="button" className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] tracking-widest text-primary uppercase" onClick={() => toggle(option.value)}>
              {option.label}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          ))}
        </div>
      ) : null}
      {open ? (
        <div className="absolute top-full right-0 left-0 z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0a0a] p-2 shadow-2xl">
          <input value={needle} onChange={(event) => setNeedle(event.target.value)} placeholder="ძებნა სიაში" aria-label="ჟანრის ძებნა" className="mb-1 h-10 w-full rounded-xl bg-white/5 px-3 text-sm text-white outline-none placeholder:text-white/30" />
          {shown.map((option) => {
            const on = picked.includes(option.value);
            return (
              <button key={option.value} type="button" className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-left text-sm ${on ? "bg-primary/5 text-primary" : "text-white/50 hover:bg-white/5"}`} onClick={() => toggle(option.value)}>
                {option.label}
                {on ? <span className="text-xs">✓</span> : null}
              </button>
            );
          })}
          {!shown.length ? <p className="px-2.5 py-2 text-sm text-[#6a7282]">ვერ მოიძებნა</p> : null}
        </div>
      ) : null}
    </div>
  );
}
