"use client";

import { useState, type ReactNode } from "react";
import { art, hasRating } from "@/lib/data";
import type { SiteList } from "@/lib/list-model";
import type { Anime } from "@/lib/types";
import { Marks } from "./marks";

const statusIcons: Record<number, ReactNode> = {
  1: <path d="M8 5.5v13l11-6.5z" />,
  2: <path d="M5 12.5 9.2 17 19 7" />,
  3: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 2" /></>,
  4: <path d="m7 7 10 10M17 7 7 17" />,
  5: <path d="M9 6v12M15 6v12" />,
};

type CardProps = { item: Anime; lists?: SiteList[]; listId?: number | null; onList?: (listId: number | null) => Promise<boolean>; onOpen: (slug: string) => void; dense?: boolean };

export function AnimeCard({ item, lists = [], listId = null, onList, onOpen, dense = false }: CardProps) {
  const [menu, setMenu] = useState(false);
  const picked = lists.find((status) => status.id === listId)?.label ?? "";
  const cover = art(item);

  return (
    <article
      className="group min-w-0 text-left"
      onMouseLeave={(event) => {
        const active = document.activeElement;
        if (active instanceof HTMLElement && event.currentTarget.contains(active)) active.blur();
      }}
    >
      <div className="relative aspect-3/4 [perspective:1000px]">
        <div
          className="relative size-full transition-transform duration-500 ease-[cubic-bezier(0.45,0.05,0.2,1)] [transform-style:preserve-3d] motion-reduce:transition-none"
          style={{ transform: menu ? "rotateY(180deg)" : "rotateY(0deg)" }}
        >
          <div className={`absolute inset-0 overflow-hidden rounded-[7px] bg-[#1a1a1a] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] [backface-visibility:hidden] ${menu ? "pointer-events-none" : ""}`}>
            {cover ? (
              <img
                src={cover}
                alt=""
                className="h-full w-full object-cover brightness-100 transition duration-500 ease-out group-hover:scale-[1.045] group-hover:brightness-[0.78] motion-reduce:transition-none"
              />
            ) : null}

            <div className="pointer-events-none absolute top-2 left-2 z-20 flex h-5 items-center gap-1.5 rounded-full border border-white/10 bg-black/80 px-1.5 text-[10px] font-medium backdrop-blur-sm">
              <span className="inline-flex items-center gap-1 border-r border-white/10 pr-1.5">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#e93748"><path d="m12 2 2.9 6.6L22 9.2l-5 4.6 1.4 6.9L12 17.8 5.6 20.7 7 13.8 2 9.2l7.1-.6z" /></svg>
                {item.score}
              </span>
              {hasRating(item.rating) ? <span className="text-[#d4d4d8] uppercase">{item.rating}</span> : null}
            </div>

            <div className="pointer-events-none absolute bottom-1.5 left-1.5 z-20 flex h-5 items-center gap-1 rounded border border-white/20 bg-black/90 px-1.5 text-[9px] backdrop-blur-sm">
              <Marks sub={item.sub} dub={item.dub} total={item.total} />
            </div>

            <button
              type="button"
              className="absolute inset-0 z-10"
              aria-label={item.title}
              onClick={() => onOpen(item.slug)}
            >
              <span className="absolute inset-0 bg-black/45 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 motion-reduce:transition-none" />
              <span className="absolute top-1/2 left-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 scale-90 place-items-center rounded-full bg-white opacity-0 shadow-[0_2px_8px_rgba(0,0,0,0.34)] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-100 group-hover:opacity-100 motion-reduce:transition-none">
                <svg width="14" height="16" viewBox="0 0 14 16" className="ml-0.5" aria-hidden="true"><path fill="#111" d="M.6.7 13.1 8 .6 15.3Z" /></svg>
              </span>
            </button>

            <button
              type="button"
              aria-label={picked ? `სიის შეცვლა: ${picked}` : "სიაში დამატება"}
              aria-expanded={menu}
              className={`absolute top-2 right-2 z-30 grid size-8 place-items-center rounded-full border border-white/15 bg-black/70 text-white shadow-sm backdrop-blur-sm transition duration-300 ease-out motion-reduce:transition-none ${menu ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 max-md:translate-y-0 max-md:opacity-100 pointer-coarse:translate-y-0 pointer-coarse:opacity-100"}`}
              onClick={(event) => {
                event.stopPropagation();
                setMenu(true);
              }}
            >
              {picked ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14" /></svg>
              )}
            </button>
          </div>

          <div className={`absolute inset-0 flex flex-col overflow-hidden rounded-[7px] bg-[#181818] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] [backface-visibility:hidden] [transform:rotateY(180deg)] ${dense ? "px-2 py-2" : "px-3.5 pt-3.5"} ${menu ? "" : "pointer-events-none"}`}>
            <div className="flex items-center justify-between gap-1">
              <span className={`font-semibold tracking-[0.14em] text-white/40 ${dense ? "text-[8px]" : "text-[10px] tracking-[0.18em]"}`}>სიაში დამატება</span>
              <button type="button" className={`grid shrink-0 place-items-center rounded-full bg-white/10 leading-none text-white/75 transition-colors hover:bg-white/16 hover:text-white ${dense ? "size-5 text-[12px]" : "size-7 text-[15px]"}`} aria-label="დახურვა" onClick={() => setMenu(false)}>×</button>
            </div>
            <div className={`flex min-h-0 flex-1 flex-col ${dense ? "mt-1 justify-evenly" : "mt-4 gap-1"}`}>
              {lists.map((status) => (
                <button
                  key={status.id}
                  type="button"
                  className={`flex min-w-0 items-center text-left transition-colors duration-200 ${dense ? "gap-1.5 rounded-md px-1.5 py-1 text-[11px] leading-4" : "gap-3 rounded-[10px] px-2.5 py-2 text-[13px]"} ${picked === status.label ? "bg-white/14 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
                  onClick={() => {
                    setMenu(false);
                    onList?.(status.id === listId ? null : status.id);
                  }}
                >
                  <svg width={dense ? 12 : 15} height={dense ? 12 : 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="shrink-0">{statusIcons[status.id] ?? statusIcons[1]}</svg>
                  <span className="truncate">{status.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <h3 className="font-bog mt-3 flex items-center gap-2 px-0.5 text-[13px] leading-[19.5px] font-normal">
        <b className={`size-1.5 shrink-0 rounded-full ${picked ? "bg-[#e93748]" : "bg-[#71717b]"}`} />
        <span className="truncate">{item.title}</span>
      </h3>
      <p className="mt-0.5 px-0.5 text-[11px] leading-[16.5px] text-[#a1a1aa]">{item.meta}</p>
    </article>
  );
}
