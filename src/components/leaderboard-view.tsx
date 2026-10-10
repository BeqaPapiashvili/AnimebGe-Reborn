"use client";

import { useEffect, useRef, useState } from "react";
import { FrameOverlay } from "@/components/avatar";
import type { LeaderAnime, LeaderComment, LeaderboardPage, LeaderSpan, RankRow } from "@/lib/hub";

const colors = ["#eab308", "#fb7185", "#f8fafc", "#4ade80", "#60a5fa", "#c084fc", "#f472b6", "#34d399", "#fbbf24", "#22d3ee"];

function ago(value: string) {
  const then = new Date(value.replace(" ", "T"));
  const minutes = Math.max(0, Math.round((Date.now() - then.getTime()) / 60000));
  if (!Number.isFinite(minutes) || minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}

function compact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(value);
}

function commas(value: number) {
  return value.toLocaleString("en-US");
}

function Menu({ label, options, value, onChange }: { label: string; options: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  const current = options.find((item) => item.id === value) ?? options[0];
  return (
    <div ref={box} className="relative">
      <button type="button" className="flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.8px] text-[#9ca3af] uppercase" onClick={() => setOpen((item) => !item)}>
        {label || current.label}
        <img src="/assets/watch2gether/chevron.svg" alt="" width={16} height={16} className={open ? "rotate-180" : ""} />
      </button>
      {open ? (
        <div className="absolute top-full left-1/2 z-20 mt-1 min-w-[140px] -translate-x-1/2 border border-white/10 bg-[#0c0c0f] py-1 shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
          {options.map((item) => (
            <button key={item.id} type="button" className={`block w-full cursor-pointer px-3 py-2 text-left text-[12px] ${item.id === value ? "text-[#eab308]" : "text-[#e5e7eb]"}`} onClick={() => { onChange(item.id); setOpen(false); }}>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Face({ name, avatar, frame, size }: { name: string; avatar?: string; frame?: string; size: number }) {
  const ring = Math.round(size * 1.32);
  return (
    <span className="relative z-10 grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <span className="size-full overflow-hidden rounded-full border border-white/10 bg-white/10">
        <img src={avatar || "/assets/avatar.jpg"} alt={name} className="h-full w-full object-cover" />
      </span>
      <FrameOverlay src={frame} className="pointer-events-none absolute top-1/2 left-1/2 max-w-none -translate-x-1/2 -translate-y-1/2" style={{ width: ring, height: ring }} />
    </span>
  );
}

function CommentCard({ item, index }: { item: LeaderComment; index: number }) {
  return (
    <a href={item.slug ? `/anime/${item.slug}` : `/@${encodeURIComponent(item.name)}`} className="relative flex gap-3 rounded-[10px] border border-white/[0.07] bg-[rgba(10,10,13,0.78)] p-4 shadow-[0_12px_32px_rgba(0,0,0,0.6)] transition duration-200 hover:-translate-y-0.5 hover:border-white/15">
      <span className="pointer-events-none absolute inset-x-3.5 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <span className="flex w-8 shrink-0 flex-col items-center gap-2">
        <span className="text-[24px] leading-[22px] font-black tracking-[-1.4px]" style={{ color: colors[index] ?? "#9ca3af" }}>{index + 1}</span>
        <Face name={item.name} avatar={item.avatar} frame={item.frame} size={32} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[11px] leading-4 font-bold tracking-[0.55px] uppercase" style={{ color: colors[index] ?? "#10b981" }}>{item.name}</span>
          <span className="shrink-0 text-[10px] text-[#6b7280]">• {ago(item.at)}</span>
        </span>
        <span className="mt-1 block line-clamp-2 text-[14px] leading-[22px] font-medium text-[#e5e7eb]">{item.text || "…"}</span>
        {item.anime ? <span className="mt-1 block truncate text-[11px] text-[#6b7280]">Anime: {item.anime}</span> : null}
        <span className="mt-3 flex items-center gap-6 text-[12px] font-semibold text-[#9ca3af]">
          <span className="flex items-center gap-1.5"><img src="/assets/leaderboard/like.svg" alt="" width={16} height={16} />{item.likes}</span>
          <span className="flex items-center gap-1.5"><img src="/assets/leaderboard/dislike.svg" alt="" width={16} height={16} />{item.dislikes}</span>
          <span className="ml-auto flex items-center gap-1.5"><img src="/assets/leaderboard/replies.svg" alt="" width={16} height={16} />{item.replies}</span>
        </span>
      </span>
    </a>
  );
}

function Podium({ row, place, label }: { row: RankRow; place: 1 | 2 | 3; label: string }) {
  const tone = place === 1 ? "#eab308" : place === 2 ? "#cad5e2" : "#f59e0b";
  const shell = place === 1
    ? "h-[352px] border-[#eab308] shadow-[0_0_36px_rgba(234,179,8,0.35)]"
    : place === 2
      ? "mt-8 h-[304px] border-[#cad5e2] shadow-[0_0_28px_rgba(148,163,184,0.18)]"
      : "mt-16 h-[256px] border-[#f59e0b] shadow-[0_0_24px_rgba(245,158,11,0.24)]";
  const face = place === 1 ? 106 : place === 2 ? 91 : 77;
  return (
    <a href={`/@${encodeURIComponent(row.name)}`} className={`group relative flex w-full flex-col items-center overflow-hidden rounded-[12px] border-[3px] bg-[linear-gradient(180deg,#151515_0%,rgba(27,31,36,0.7)_55%,rgba(49,65,88,0.3)_100%)] px-3 pt-8 transition duration-300 hover:-translate-y-2 ${shell}`}>
      <span className="pointer-events-none absolute top-1 text-[150px] leading-none font-black text-white/[0.04] transition duration-300 group-hover:text-white/[0.07]">{place}</span>
      <span className="relative rounded-full border-[4.5px] shadow-[0_0_18px_rgba(234,179,8,0.25)]" style={{ borderColor: tone }}>
        <Face name={row.name} avatar={row.avatar} frame={row.frame} size={face} />
      </span>
      <span className="relative mt-4 max-w-full truncate text-center text-[20px] leading-6 font-black tracking-[0.8px] uppercase" style={{ color: colors[place - 1] }}>{row.name}</span>
      <span className="relative mt-auto mb-4 w-full rounded-[10px] border border-white/10 bg-black/60 px-3 py-2 text-center backdrop-blur">
        <span className="block text-[10px] font-black tracking-[0.95px] text-white/40 uppercase">{label}</span>
        <span className={`block font-black tracking-[-1.2px] text-white ${place === 1 ? "text-[34px] leading-10" : "text-[28px] leading-8"}`}>{commas(row.minutes)}</span>
      </span>
    </a>
  );
}

function Contender({ row, index }: { row: RankRow; index: number }) {
  return (
    <a href={`/@${encodeURIComponent(row.name)}`} className="group relative grid h-16 grid-cols-[64px_minmax(0,1fr)_150px_72px] items-center">
      <span className="pointer-events-none absolute inset-y-1 right-2 left-12 -skew-x-12 bg-[#121216] transition duration-200 group-hover:bg-[#1c1c22]" />
      <span className="relative text-center text-[30px] leading-9 font-black text-white/85">{index + 1}</span>
      <span className="relative flex min-w-0 items-center gap-3 pl-2">
        <Face name={row.name} avatar={row.avatar} frame={row.frame} size={40} />
        <span className="truncate text-[18px] font-black tracking-[0.4px] uppercase italic" style={{ color: colors[index] ?? "#e5e7eb" }}>{row.name}</span>
      </span>
      <span className="relative -skew-x-12 bg-white px-3 py-1.5 text-center text-[22px] leading-7 font-black text-black transition duration-200 group-hover:scale-105">{commas(row.minutes)}</span>
      <span className="relative text-center text-[20px] font-bold text-[#9ca3af]">{row.anime}</span>
    </a>
  );
}

function AnimeCard({ item, index }: { item: LeaderAnime; index: number }) {
  return (
    <a href={`/anime/${item.slug}`} className="relative flex gap-3.5 rounded-[10px] border border-white/[0.07] bg-[rgba(10,10,13,0.78)] p-4 shadow-[0_12px_32px_rgba(0,0,0,0.6)] transition duration-200 hover:-translate-y-0.5 hover:border-white/20">
      <span className="pointer-events-none absolute inset-x-3.5 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <span className="relative h-[120px] w-20 shrink-0 overflow-hidden rounded-[7px] border border-white/10 bg-white/[0.03]">
        {item.poster ? <img src={item.poster} alt="" className="h-full w-full object-cover" /> : null}
        <span className="absolute top-0 left-0 rounded-br-[6px] border-r border-b border-white/10 bg-black/90 px-2.5 py-1 text-[12px] leading-4 font-black">#{index + 1}</span>
        {item.score ? (
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-6 pb-1.5 text-[11px] font-black text-white">
            <img src="/assets/leaderboard/star.svg" alt="" width={12} height={12} />
            {item.score}
          </span>
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col py-0.5">
        <span className="truncate text-[15.2px] leading-[23px] font-black tracking-[0.38px] uppercase">{item.title}</span>
        <span className="mt-1 line-clamp-2 text-[11.5px] leading-[19px] font-medium text-[#9ca3af]">{item.desc}</span>
        <span className="mt-auto flex items-center gap-4 border-t border-white/5 pt-2.5 text-[10.9px] font-bold text-[#9ca3af]">
          <span className="flex items-center gap-1.5"><img src="/assets/leaderboard/eye.svg" alt="" width={14} height={14} />{compact(item.views)}</span>
          <span className="flex items-center gap-1.5"><img src="/assets/leaderboard/comments.svg" alt="" width={14} height={14} />{compact(item.comments)}</span>
          {item.episodes ? <span className="ml-auto bg-white/5 px-2 py-1 text-[9.6px] tracking-[0.96px] uppercase">{item.episodes} EPS</span> : null}
        </span>
      </span>
    </a>
  );
}

function More({ shown, total, onClick }: { shown: boolean; total: number; onClick: () => void }) {
  if (total <= 5 || shown) return null;
  return (
    <button type="button" className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.03] py-2.5 text-[12px] font-bold tracking-[1px] text-[#9ca3af] uppercase" onClick={onClick}>
      View all {Math.min(total, 20)}
      <img src="/assets/watch2gether/chevron.svg" alt="" width={16} height={16} />
    </button>
  );
}

export function LeaderboardView({ page }: { page: LeaderboardPage }) {
  const [commentsPeriod, setCommentsPeriod] = useState<LeaderSpan>("all");
  const [usersPeriod, setUsersPeriod] = useState<LeaderSpan>("all");
  const [animePeriod, setAnimePeriod] = useState<LeaderSpan>("all");
  const [moreComments, setMoreComments] = useState(false);
  const [moreAnime, setMoreAnime] = useState(false);
  const comments = page.comments[commentsPeriod];
  const users = page.users[usersPeriod];
  const anime = page.anime[animePeriod];
  const podium = [users[1], users[0], users[2]];
  const places: Array<1 | 2 | 3> = [2, 1, 3];
  const commentList = comments.slice(0, moreComments ? 20 : 6);
  const animeList = anime.slice(0, moreAnime ? 20 : 5);
  const userList = users.slice(3, 10);
  const periods = [{ id: "all", label: "All Time" }, { id: "week", label: "This Week" }, { id: "month", label: "This Month" }];
  const periodLabel = (id: LeaderSpan) => periods.find((item) => item.id === id)?.label ?? "All Time";

  return (
    <div className="relative overflow-hidden bg-black pt-20 text-white">
      <p className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 text-[18vw] leading-none font-black tracking-[-0.06em] whitespace-nowrap text-white/[0.035] select-none">HALL OF FAME</p>
      <div className="rise relative mx-auto grid w-full max-w-[1800px] gap-8 px-4 py-10 min-[1100px]:grid-cols-[420px_minmax(0,1fr)_420px] min-[1100px]:px-8">
        <section>
          <h2 className="text-center text-[22px] leading-8 font-black tracking-[1.2px] uppercase">Top Comments</h2>
          <div className="mt-1 flex justify-center">
            <Menu label="" options={periods} value={commentsPeriod} onChange={(id) => { setCommentsPeriod(id as LeaderSpan); setMoreComments(false); }} />
          </div>
          <div className="mt-6 flex flex-col gap-4">
            {commentList.length ? commentList.map((item, index) => <CommentCard key={item.id} item={item} index={index} />) : <p className="py-10 text-center text-sm text-[#6b7280]">ამ პერიოდში კომენტარი არ არის.</p>}
          </div>
          <More shown={moreComments} total={comments.length} onClick={() => setMoreComments(true)} />
        </section>
        <section>
          <h1 className="text-center text-[34px] leading-[48px] font-black tracking-[-0.6px] uppercase min-[1100px]:text-[42px]">Global Ranking</h1>
          <div className="mt-1 flex justify-center">
            <Menu label={`${periodLabel(usersPeriod)} • Top 10`} options={periods} value={usersPeriod} onChange={(id) => setUsersPeriod(id as LeaderSpan)} />
          </div>
          {users.length ? (
            <>
              <div className="mt-8 grid grid-cols-3 items-end gap-4">
                {podium.map((row, index) => row ? <Podium key={row.name} row={row} place={places[index]} label={usersPeriod === "week" ? "Week XP" : usersPeriod === "month" ? "Month XP" : "Total XP"} /> : <span key={index} />)}
              </div>
              {userList.length ? (
                <div className="relative mt-8">
                  <p className="mb-3 text-center text-[11px] font-bold tracking-[2px] text-[#6b7280] uppercase">The Contenders</p>
                  <div className="mb-1 grid grid-cols-[64px_minmax(0,1fr)_150px_72px] text-[13px] font-bold tracking-[1px] text-[#6b7280]">
                    <span />
                    <span />
                    <span className="text-center">XP</span>
                    <span className="text-center">LVL</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {userList.map((row, index) => <Contender key={row.name} row={row} index={index + 3} />)}
                  </div>
                </div>
              ) : null}
            </>
          ) : <p className="py-16 text-center text-sm text-[#6b7280]">ამ პერიოდში ყურების ისტორია არ არის.</p>}
        </section>
        <section>
          <h2 className="text-center text-[22px] leading-8 font-black tracking-[1.2px] uppercase">Top Anime</h2>
          <div className="mt-1 flex justify-center">
            <Menu label="" options={periods} value={animePeriod} onChange={(id) => { setAnimePeriod(id as LeaderSpan); setMoreAnime(false); }} />
          </div>
          <div className="mt-6 flex flex-col gap-4">
            {animeList.length ? animeList.map((item, index) => <AnimeCard key={item.slug} item={item} index={index} />) : <p className="py-10 text-center text-sm text-[#6b7280]">ანიმე ვერ მოიძებნა.</p>}
          </div>
          <More shown={moreAnime} total={anime.length} onClick={() => setMoreAnime(true)} />
        </section>
      </div>
    </div>
  );
}
