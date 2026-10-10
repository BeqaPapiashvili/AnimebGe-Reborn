"use client";

import { useEffect, useRef, useState } from "react";
import { art } from "@/lib/data";
import type { ContinueItem } from "@/lib/catalog";

const card = 338;

export function ContinueSwiper({ items, onOpen, onRemove }: { items: ContinueItem[]; onOpen: (slug: string, episode: number) => void; onRemove: (id: number) => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useRef({ pending: false, active: false, moved: false, x: 0, y: 0, left: 0, lastX: 0, lastT: 0, vx: 0 });
  const frame = useRef(0);
  const [edges, setEdges] = useState({ start: true, end: true });

  function readEdges() {
    const el = scroller.current;
    if (!el) return;
    const start = el.scrollLeft <= 2;
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    readEdges();
    const observer = new ResizeObserver(() => readEdges());
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, [items.length]);

  function stopMomentum() {
    cancelAnimationFrame(frame.current);
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("[data-nodrag]")) return;
    const el = scroller.current;
    if (!el) return;
    stopMomentum();
    drag.current = { pending: true, active: false, moved: false, x: event.clientX, y: event.clientY, left: el.scrollLeft, lastX: event.clientX, lastT: performance.now(), vx: 0 };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    const el = scroller.current;
    if (!el || (!state.pending && !state.active)) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (state.pending) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        state.pending = false;
        return;
      }
      state.pending = false;
      state.active = true;
      state.moved = true;
      el.setPointerCapture(event.pointerId);
    }
    const now = performance.now();
    const dt = Math.max(now - state.lastT, 1);
    state.vx = (event.clientX - state.lastX) / dt;
    state.lastX = event.clientX;
    state.lastT = now;
    el.scrollLeft = state.left - dx;
  }

  function coast() {
    const el = scroller.current;
    const state = drag.current;
    if (!el) return;
    state.vx *= 0.94;
    if (Math.abs(state.vx) < 0.02) return;
    el.scrollLeft -= state.vx * 16;
    frame.current = requestAnimationFrame(coast);
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    const el = scroller.current;
    if (state.active && el?.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
    const moved = state.moved;
    state.pending = false;
    state.active = false;
    if (moved && Math.abs(state.vx) > 0.04) frame.current = requestAnimationFrame(coast);
    if (moved) window.setTimeout(() => { state.moved = false; }, 0);
  }

  function onClickCapture(event: React.MouseEvent) {
    if (!drag.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current.moved = false;
  }

  function nudge(dir: number) {
    stopMomentum();
    scroller.current?.scrollBy({ left: dir * (card + 16), behavior: "smooth" });
  }

  return (
    <div className="relative mt-5">
      <button type="button" className={`absolute top-[72px] left-0 z-10 grid size-9 -translate-x-1/2 cursor-pointer place-items-center rounded-full border border-white/10 bg-black/80 text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-opacity ${edges.start ? "pointer-events-none opacity-0" : ""}`} aria-label="წინა" onClick={() => nudge(-1)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m15 6-6 6 6 6" /></svg>
      </button>
      <button type="button" className={`absolute top-[72px] right-0 z-10 grid size-9 translate-x-1/2 cursor-pointer place-items-center rounded-full border border-white/10 bg-black/80 text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-opacity ${edges.end ? "pointer-events-none opacity-0" : ""}`} aria-label="შემდეგი" onClick={() => nudge(1)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m9 6 6 6-6 6" /></svg>
      </button>
      <div
        ref={scroller}
        className="flex cursor-grab touch-pan-y gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain select-none active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={readEdges}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
      >
        {items.map((item) => (
          <div key={item.id ?? item.slug} className="cw-card relative w-[338px] shrink-0 max-[640px]:w-[78vw]">
            <div className="relative aspect-video overflow-hidden rounded-lg bg-[#1a1a1a]">
              {item.banner || art(item) ? <img src={item.banner || art(item)} alt={item.title} draggable={false} className="cw-img pointer-events-none h-full w-full object-cover" /> : null}
              <span className="cw-shade pointer-events-none absolute inset-0 bg-black/45" />
              <button type="button" className="absolute inset-0 cursor-pointer" aria-label={`Continue ${item.title}`} onClick={() => onOpen(item.slug, item.episodeNumber)}>
                <span className="cw-play absolute top-1/2 left-1/2 grid size-12 place-items-center rounded-full bg-white text-black shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5"><path d="M8 5v14l11-7z" /></svg>
                </span>
              </button>
              <span className="pointer-events-none absolute top-2 left-2 rounded bg-black/80 px-2 py-1 text-sm font-semibold">{item.episode}</span>
              <button type="button" data-nodrag className="cw-close absolute top-2 right-2 z-10 grid size-8 cursor-pointer place-items-center rounded-md bg-black/70 text-white hover:bg-[#e93748]" aria-label="განაგრძე ყურებიდან ამოღება" onClick={() => { if (item.id) onRemove(item.id); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
              <span className="pointer-events-none absolute right-2 bottom-3 rounded bg-black/75 px-2 py-1 text-sm font-semibold">{item.progress}</span>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-white/15"><span className="block h-full bg-[#e93748]" style={{ width: `${item.progressPct}%` }} /></div>
            </div>
            <h3 className="font-bog mt-2 truncate text-sm font-normal">{item.title}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
