"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnimeDetail, UserAnimeState } from "@/lib/catalog";
import { animeHref, formatCount } from "@/lib/data";
import type { SiteList } from "@/lib/list-model";
import type { SessionUser } from "@/lib/types";
import { type Folder, FolderDialog } from "@/components/folder-dialog";
import { toast } from "@/components/toast";

const tabs = ["მიმოხილვა", "მსახიობები", "რეკომენდაციები"] as const;
const castPage = 18;

function CastBoard({ detail }: { detail: AnimeDetail }) {
  const [shown, setShown] = useState(castPage);
  const [extra, setExtra] = useState<AnimeDetail["cast"]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(Boolean(detail.castQuery));
  const [total, setTotal] = useState(detail.castTotal || detail.cast.length);
  const [loading, setLoading] = useState(false);
  const cast = [...detail.cast, ...extra];
  const visible = cast.slice(0, shown);

  async function reveal() {
    const target = Math.min(shown + castPage, total);
    if (cast.length >= target || !detail.castQuery || !hasNext) {
      setShown(Math.min(target, cast.length));
      return;
    }
    setLoading(true);
    let nextPage = page + 1;
    let accumulated = cast;
    let morePages: boolean = hasNext;
    let nextTotal = total;
    while (accumulated.length < target && morePages && nextPage <= 40) {
      const res = await fetch(`/api/characters?search=${encodeURIComponent(detail.castQuery)}&page=${nextPage}`);
      if (!res.ok) break;
      const data: { cast: AnimeDetail["cast"]; total: number; hasNext: boolean } = await res.json();
      accumulated = [...accumulated, ...data.cast];
      morePages = data.hasNext;
      nextTotal = data.total || nextTotal;
      nextPage += 1;
    }
    setExtra(accumulated.slice(detail.cast.length));
    setPage(nextPage - 1);
    setHasNext(morePages);
    setTotal(nextTotal);
    setShown(Math.min(target, accumulated.length));
    setLoading(false);
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 max-[760px]:grid-cols-1">
        {visible.map((person, index) => (
          <div key={`${person.name}-${index}`} className="flex min-w-0 items-center gap-3 overflow-hidden rounded-[7px] bg-white/4">
            {person.image ? <img src={person.image} alt={person.name} className="h-20 w-14 shrink-0 object-cover" /> : <span className="h-20 w-14 shrink-0 bg-white/5" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{person.name}</p>
              <p className="text-xs text-[#e93748]">{person.role}</p>
            </div>
            {person.actor ? (
              <>
                <div className="min-w-0 flex-1 text-right">
                  <p className="truncate text-sm text-[#d1d5dc]">{person.actor}</p>
                  <p className="text-xs text-[#71717b]">იაპონური</p>
                </div>
                {person.actorImage ? <img src={person.actorImage} alt={person.actor} className="h-20 w-14 shrink-0 object-cover" /> : null}
              </>
            ) : null}
          </div>
        ))}
      </div>
      {total > shown ? (
        <button type="button" className="mt-4 flex w-full cursor-pointer items-center justify-center gap-4 rounded-[10px] border border-white/10 bg-white/4 px-5 py-3.5 text-sm text-white transition hover:border-[#e93748] hover:bg-[#e93748]/10 disabled:cursor-wait" disabled={loading} onClick={reveal}>
          <span className="font-semibold tracking-wide">{loading ? "იტვირთება…" : "მეტის ნახვა"}</span>
          <span className="text-[#9f9fa9]">
            ხილული <span className="font-bold text-white">{formatCount(visible.length)}</span>
            <span className="mx-2 text-white/25">·</span>
            სულ <span className="font-bold text-white">{formatCount(total)}</span>
          </span>
        </button>
      ) : null}
    </div>
  );
}

export async function saveListStatus(postId: number, listId: number | null) {
  const res = await fetch("/api/lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId, listId }) });
  return res.ok;
}

async function saveFavorite(postId: number, on: boolean) {
  const res = await fetch("/api/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId, on }) });
  if (!res.ok) return null;
  const data = (await res.json()) as { favorite?: boolean };
  return Boolean(data.favorite);
}

function Chip({ children, href }: { children: React.ReactNode; href?: string }) {
  const className = "detail-chip inline-flex h-8 items-center gap-1.5 rounded px-3 text-sm text-[#d1d5dc]";
  return href ? <a href={href} className={className}>{children}</a> : <span className={className}>{children}</span>;
}

function Heading({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg leading-7 font-semibold text-white">{children}</h2>
      {aside}
    </div>
  );
}

type AnimeCard = { id: number; name: string; image: string; rarity: string; owned?: number; wished?: boolean };

function HeartIcon({ filled = false, size = 14 }: { filled?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

function AnimeCards({ cards, animeId, signedIn, onAuth }: { cards: AnimeCard[]; animeId: number; signedIn: boolean; onAuth: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef({ on: false, x: 0, left: 0, moved: false, last: 0, time: 0, speed: 0 });
  const settle = useRef(0);
  const [edge, setEdge] = useState({ start: true, end: false });
  const [grabbing, setGrabbing] = useState(false);
  const [all, setAll] = useState(false);
  const [wished, setWished] = useState(() => new Set(cards.filter((card) => card.wished).map((card) => card.id)));
  const [wishing, setWishing] = useState(false);
  const shown = cards.slice(0, 12);
  const owned = cards.filter((card) => (card.owned ?? 0) > 0).length;
  const share = Math.round((owned / cards.length) * 100);
  const missing = cards.filter((card) => !card.owned);
  const left = missing.filter((card) => !wished.has(card.id)).length;
  const allWished = signedIn && missing.length > 0 && left === 0;

  const step = () => {
    const el = track.current;
    const first = el?.firstElementChild as HTMLElement | null;
    return first ? first.offsetWidth + parseFloat(getComputedStyle(el!).columnGap || "0") : 0;
  };

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => { window.removeEventListener("resize", measure); window.clearTimeout(settle.current); };
  }, [measure, all]);

  function glide(target: number) {
    const el = track.current;
    if (!el) return;
    el.style.scrollSnapType = "none";
    el.scrollTo({ left: target, behavior: "smooth" });
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => { el.style.scrollSnapType = ""; }, 450);
  }

  function page(direction: 1 | -1) {
    const el = track.current;
    const size = step();
    if (!el || !size) return;
    const visible = Math.max(1, Math.round(el.clientWidth / size));
    glide(Math.round(el.scrollLeft / size + direction * visible) * size);
  }

  function down(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0 || !track.current) return;
    window.clearTimeout(settle.current);
    drag.current = { on: true, x: event.clientX, left: track.current.scrollLeft, moved: false, last: event.clientX, time: performance.now(), speed: 0 };
    track.current.style.scrollSnapType = "none";
    track.current.style.scrollBehavior = "auto";
  }

  function move(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    const el = track.current;
    if (!state.on || !el) return;
    const dx = event.clientX - state.x;
    if (!state.moved && Math.abs(dx) > 5) {
      state.moved = true;
      setGrabbing(true);
      el.setPointerCapture(event.pointerId);
    }
    if (!state.moved) return;
    const now = performance.now();
    state.speed = (event.clientX - state.last) / Math.max(1, now - state.time);
    state.last = event.clientX;
    state.time = now;
    el.scrollLeft = state.left - dx;
  }

  function up(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    const el = track.current;
    if (!state.on || !el) return;
    state.on = false;
    setGrabbing(false);
    el.style.scrollBehavior = "";
    if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
    if (!state.moved) { el.style.scrollSnapType = ""; return; }
    const size = step();
    const fling = el.scrollLeft - state.speed * 220;
    glide(size ? Math.round(fling / size) * size : fling);
  }

  async function wishMissing() {
    if (!signedIn) { onAuth(); return; }
    if (wishing) return;
    setWishing(true);
    const response = await fetch("/api/cards/wish-anime", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: animeId }) }).catch(() => null);
    const result = response ? await response.json().catch(() => null) as { ids?: number[]; text?: string; error?: string } | null : null;
    setWishing(false);
    if (!result || result.error) { toast(result?.error ?? "კავშირი ვერ დამყარდა."); return; }
    if (result.ids?.length) setWished((value) => new Set([...value, ...result.ids!]));
    else setWished((value) => new Set([...value].filter((id) => !missing.some((card) => card.id === id))));
    if (result.text) toast(result.text);
  }

  const tile = (card: AnimeCard, index: number, slide: boolean) => {
    const moving = /\.(webm|mp4)(\?|$)/i.test(card.image);
    const mine = (card.owned ?? 0) > 0;
    const wish = !mine && wished.has(card.id);
    return (
      <a
        key={card.id}
        href={`/cards/${card.id}`}
        title={card.name}
        draggable={false}
        className={`group block ${slide ? "w-[calc((100%-24px)/3)] shrink-0 snap-start min-[560px]:w-[calc((100%-36px)/4)] min-[900px]:w-[calc((100%-60px)/6)]" : "rise-in"}`}
        style={slide ? undefined : { animationDelay: `${Math.min(index, 18) * 25}ms` }}
      >
        <span className={`relative block aspect-[2/3] overflow-hidden rounded-[12px] bg-[#1a1a1a] shadow-[0_10px_22px_rgba(0,0,0,0.35)] transition duration-300 ${grabbing ? "" : "group-hover:-translate-y-1 group-hover:shadow-[0_16px_30px_rgba(0,0,0,0.5)]"}`}>
          {card.image && moving ? <video src={card.image} autoPlay muted loop playsInline className="pointer-events-none h-full w-full object-cover" /> : null}
          {card.image && !moving ? <img src={card.image} alt={card.name} loading="lazy" decoding="async" draggable={false} className={`pointer-events-none h-full w-full object-cover transition duration-500 ${grabbing ? "" : "group-hover:scale-105"} ${signedIn && !mine ? "opacity-60 grayscale-[0.5] group-hover:opacity-100 group-hover:grayscale-0" : ""}`} /> : null}
          {mine ? <span className="absolute top-1.5 right-1.5 rounded-md bg-[#e93748] px-1.5 py-0.5 text-[10px] font-semibold text-white">{(card.owned ?? 0) > 1 ? `×${card.owned}` : "გაქვს"}</span> : null}
          {wish ? <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-md bg-black/70 text-[#ff8a95]" title="სურვილების სიაშია"><HeartIcon filled size={12} /></span> : null}
        </span>
        <span className="mt-1.5 block truncate text-center text-[11px] text-white/60 transition group-hover:text-white">{card.name}</span>
      </a>
    );
  };

  return (
    <section className="rise-in rounded-[18px] bg-[#121214] p-5" style={{ animationDelay: "500ms" }}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-end gap-3">
          <span className="text-[24px] leading-none font-semibold text-[#e93748]">{String(cards.length).padStart(2, "0")}</span>
          <span><span className="block text-[11px] text-white/40">საკოლექციო ბარათები</span><span className="block text-lg font-semibold">პერსონაჟის ბარათები</span></span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {signedIn ? (
            <a href={`/cards/mine/progress/${animeId}`} className="group flex items-center gap-3 rounded-xl bg-[#18181b] py-1.5 pr-3 pl-2 transition hover:bg-[#1d1d21]">
              <span className="relative grid size-9 place-items-center rounded-full" style={{ background: `conic-gradient(#e93748 ${share * 3.6}deg, rgba(255,255,255,0.06) 0deg)` }}>
                <span className="grid size-7 place-items-center rounded-full bg-[#18181b] text-[10px] font-semibold">{share}%</span>
              </span>
              <span className="text-xs"><span className="block text-white/45">შენი კოლექცია</span><b className="font-semibold text-white">{owned}</b><span className="text-white/45"> / {cards.length}</span></span>
            </a>
          ) : null}
          {!signedIn || missing.length ? (
            <button type="button" disabled={wishing} onClick={wishMissing} title={allWished ? "დარჩენილი ბარათების სურვილებიდან მოხსნა" : "ყველა ბარათი, რომელიც არ გაქვს, სურვილების სიაში დაემატება"} className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3.5 text-xs font-medium transition disabled:cursor-wait disabled:opacity-60 ${allWished ? "bg-[#e93748]/15 text-[#ff8a95] hover:bg-[#e93748]/22" : "bg-[#18181b] text-white/85 hover:bg-[#1d1d21] hover:text-white"}`}>
              <HeartIcon filled={allWished} />
              {allWished ? "სურვილებშია" : "რაც არ მაქვს — სურვილებში"}
              {!allWished && signedIn ? <span className="rounded bg-white/10 px-1.5 text-[10px]">{left}</span> : null}
            </button>
          ) : null}
          {!all && shown.length > 3 ? (
            <span className="flex gap-1.5">
              <button type="button" aria-label="წინა" disabled={edge.start} onClick={() => page(-1)} className="grid size-9 cursor-pointer place-items-center rounded-lg bg-[#18181b] text-white/75 transition hover:bg-[#e93748] hover:text-white disabled:cursor-default disabled:opacity-35 disabled:hover:bg-[#18181b]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="m15 6-6 6 6 6" /></svg>
              </button>
              <button type="button" aria-label="შემდეგი" disabled={edge.end} onClick={() => page(1)} className="grid size-9 cursor-pointer place-items-center rounded-lg bg-[#18181b] text-white/75 transition hover:bg-[#e93748] hover:text-white disabled:cursor-default disabled:opacity-35 disabled:hover:bg-[#18181b]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="m9 6 6 6-6 6" /></svg>
              </button>
            </span>
          ) : null}
        </div>
      </div>

      {all ? (
        <div className="mt-4 grid grid-cols-3 gap-3 min-[560px]:grid-cols-4 min-[900px]:grid-cols-6">
          {cards.map((card, index) => tile(card, index, false))}
        </div>
      ) : (
        <div
          ref={track}
          onScroll={measure}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onClickCapture={(event) => { if (drag.current.moved) { event.preventDefault(); event.stopPropagation(); drag.current.moved = false; } }}
          onDragStart={(event) => event.preventDefault()}
          className={`mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${grabbing ? "cursor-grabbing" : "cursor-grab"}`}
        >
          {shown.map((card, index) => tile(card, index, true))}
        </div>
      )}

      {cards.length > 6 ? (
        <div className="mt-4 flex justify-center">
          <button type="button" onClick={() => setAll((value) => !value)} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-[#18181b] px-4 text-xs font-medium text-white/80 transition hover:bg-[#e93748] hover:text-white">
            {all ? "ჩაკეცვა" : <>ყველა ბარათის ნახვა <span className="rounded-full bg-white/10 px-1.5 text-[10px]">{cards.length}</span></>}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" className={`transition-transform duration-300 ${all ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function AnimeDetailView({ detail, user, state, lists = [], cards = [], onAuth }: { detail: AnimeDetail; user: SessionUser | null; state?: UserAnimeState; lists?: SiteList[]; cards?: AnimeCard[]; onAuth: () => void }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("მიმოხილვა");
  const [switched, setSwitched] = useState<"forward" | "back" | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<number | null>(state?.list ?? null);
  const [listOpen, setListOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const current = lists.find((item) => item.id === status);

  async function pickStatus(next: number | null) {
    setListOpen(false);
    if (!user) return onAuth();
    const previous = status;
    setStatus(next);
    if (!(await saveListStatus(detail.id, next))) setStatus(previous);
  }
  const [folderOpen, setFolderOpen] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const closeFolders = useCallback(() => setFolderOpen(false), []);

  useEffect(() => {
    if (!listOpen) return;
    function onDown(event: MouseEvent) {
      if (!listRef.current?.contains(event.target as Node)) setListOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setListOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [listOpen]);
  const [notify, setNotify] = useState(Boolean(state?.favorite));

  async function toggleNotify() {
    if (!user) return onAuth();
    const next = !notify;
    setNotify(next);
    const saved = await saveFavorite(detail.id, next);
    if (saved == null) setNotify(!next);
    else setNotify(saved);
  }
  const [spoilers, setSpoilers] = useState(false);
  const relatedRef = useRef<HTMLDivElement>(null);

  const spoilerCount = detail.tags.filter((tag) => tag.spoiler).length;
  const tags = detail.tags.filter((tag) => spoilers || !tag.spoiler);
  const chips = [detail.format, detail.episodes ? `${detail.episodes} ეპიზოდი` : null, detail.duration ? `${detail.duration} წთ` : null, detail.status, detail.season].filter(Boolean) as string[];
  const info = [
    ["ფორმატი", detail.format],
    ["ეპიზოდები", detail.episodes],
    ["ხანგრძლივობა", detail.duration ? `${detail.duration} წთ` : null],
    ["სტატუსი", detail.status],
    ["წელი", detail.startDate],
    ["სეზონი", detail.season],
    ["ასაკი", detail.ageRating],
    ["რეჟისორი", detail.director],
    ["გახმოვანება", detail.dubbers.join(", ")],
    ["IMDb", detail.score ? (detail.score / 10).toFixed(1) : null],
  ].filter(([, value]) => value) as [string, string | number][];
  const stats = [
    ["ეპიზოდი", detail.dub ?? "?"],
    ["ხანგრძლივობა", detail.duration ? `${detail.duration}წთ` : "?"],
    ["ნახვა", formatCount(detail.views)],
    ["მოწონება", detail.votes ? `${Math.min(100, Math.max(0, Math.round(((detail.votes + detail.likes) / 2 / detail.votes) * 100)))}%` : "—"],
  ];

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: detail.title, url });
      } catch {}
      return;
    }
    await navigator.clipboard.writeText(url);
    toast("ბმული დაკოპირდა");
  }

  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 h-[340px] overflow-hidden">
        {detail.banner || detail.poster ? <img src={detail.banner || detail.poster} alt="" className="h-full w-full scale-105 object-cover opacity-55 blur-[2px]" /> : null}
        <div className="absolute inset-0 bg-linear-to-b from-[#0a0a0a]/30 via-[#0a0a0a]/70 to-[#0a0a0a]" />
      </div>

      <div className="relative mx-auto flex max-w-[1536px] items-stretch gap-6 px-6 pt-[184px] max-[900px]:flex-col">
        <aside className="rise-in flex w-[250px] shrink-0 flex-col gap-6 max-[900px]:w-full max-[900px]:flex-row" style={{ animationDelay: "100ms" }}>
          <div className="h-[350px] w-[250px] shrink-0 overflow-hidden rounded-[7px] bg-[#1a1a1a] shadow-[0_10px_30px_rgba(0,0,0,0.5)] ring-1 ring-white/8">
            {detail.poster ? <img src={detail.poster} alt={detail.title} className="h-full w-full object-cover" /> : null}
          </div>
          <div className="flex flex-1 flex-col rounded-[7px] border border-white/6 bg-[#141414]/80 p-4">
            <dl className="flex flex-col gap-4">
              {info.map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1">
                  <dt className="text-xs leading-4 font-medium text-[#6a7282]">{label}</dt>
                  <dd className="text-sm leading-5 text-[#d1d5dc]">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-auto flex flex-col gap-3 border-t border-white/8 pt-4 max-[900px]:mt-6">
              {detail.anilistUrl ? (
                <a href={detail.anilistUrl} target="_blank" rel="noreferrer" className="detail-link flex items-center gap-2 text-sm text-[#99a1af]">
                  <img src="/assets/detail/anilist.svg" alt="" width={14} height={14} />
                  AniList
                  <img src="/assets/detail/external.svg" alt="" width={12} height={12} className="ml-auto" />
                </a>
              ) : null}
              {detail.malUrl ? (
                <a href={detail.malUrl} target="_blank" rel="noreferrer" className="detail-link flex items-center gap-2 text-sm text-[#99a1af]">
                  <img src="/assets/detail/mal.svg" alt="" width={14} height={14} />
                  MyAnimeList
                  <img src="/assets/detail/external.svg" alt="" width={12} height={12} className="ml-auto" />
                </a>
              ) : null}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="rise-in relative z-20 flex flex-col gap-4" style={{ animationDelay: "200ms" }}>
            <div className="flex flex-col gap-2">
              <h1 className="font-bog text-2xl leading-8 font-bold text-white">{detail.title}</h1>
              {detail.romaji ? <p className="font-bog text-lg leading-7 font-bold text-[#e93748] italic">{detail.romaji}</p> : null}
            </div>
            {detail.description ? (
              <div>
                <p className={`font-mkhedruli max-w-[900px] text-base leading-6 font-light whitespace-pre-line text-white/90 ${expanded ? "" : "line-clamp-3"}`}>{detail.description}</p>
                {detail.description.length > 240 ? (
                  <button type="button" className="mt-1 cursor-pointer text-sm font-semibold text-[#e93748] hover:underline" onClick={() => setExpanded((value) => !value)}>
                    {expanded ? "ნაკლები" : "მეტის წაკითხვა"}
                  </button>
                ) : null}
              </div>
            ) : null}
            {detail.genres.length ? (
              <div className="flex flex-wrap gap-2">
                {detail.genres.map((genre) => <span key={genre} className="rounded-full bg-[#e93748]/10 px-2 py-1 text-sm leading-5 text-[#e93748]">{genre}</span>)}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <a href={`${animeHref(detail.slug)}/watch?ep=1`} className="detail-watch flex h-9 items-center gap-2 rounded-[5.76px] bg-[#e93748] px-4 text-sm font-medium text-white">
                <img src="/assets/detail/play.svg" alt="" width={16} height={16} />
                ყურება
              </a>
              <div ref={listRef} className="relative">
                <div className="flex h-9 overflow-hidden rounded-[5.76px] border border-white/12">
                  <button type="button" className={`detail-btn flex items-center gap-2 px-3 text-sm font-medium ${current ? "text-[#e93748]" : "text-white"}`} aria-haspopup="menu" aria-expanded={listOpen} onClick={() => setListOpen((value) => !value)}>
                    {current ? <span className="list-icon" style={{ "--icon": `url(${current.icon})` } as React.CSSProperties} /> : <img src="/assets/detail/bookmark.svg" alt="" width={16} height={16} />}
                    {current ? current.label : "სიაში დამატება"}
                    <img src="/assets/detail/chevron-down.svg" alt="" width={12} height={12} className={`transition-transform duration-200 ${listOpen ? "rotate-180" : ""}`} />
                  </button>
                  <button type="button" className={`detail-btn grid w-[41px] place-items-center border-l border-white/12 ${notify ? "bg-[#e93748]" : ""}`} aria-label="რჩეულებში დამატება" aria-pressed={notify} onClick={toggleNotify}>
                    <img src="/assets/detail/bell.svg" alt="" width={16} height={16} />
                  </button>
                </div>
                {listOpen ? (
                  <div className="list-menu absolute top-full left-0 z-40 mt-2 w-[248px] overflow-hidden rounded-[10px] border border-white/8 bg-[#0a0a0a] p-1.5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]" role="menu">
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#e93748] to-transparent" />
                    <div className="flex flex-col gap-0.5">
                      {lists.map((item) => (
                        <button key={item.id} type="button" role="menuitemradio" aria-checked={status === item.id} className={`list-item ${status === item.id ? "is-on" : ""}`} onClick={() => pickStatus(status === item.id ? null : item.id)}>
                          <span className="list-icon" style={{ "--icon": `url(${item.icon})` } as React.CSSProperties} />
                          {item.label}
                          {status === item.id ? <img src="/assets/detail/list/check.svg" alt="" width={16} height={16} className="ml-auto" /> : null}
                        </button>
                      ))}
                    </div>
                    <div className="px-2 pt-1"><div className="h-px bg-white/6" /></div>
                    <button type="button" role="menuitem" className="list-item mt-1" onClick={() => { setListOpen(false); if (!user) return onAuth(); setFolderOpen(true); void fetch(`/api/folders?postId=${detail.id}`).then((res) => res.json()).then((data: { folders?: Folder[] }) => setFolders(data.folders ?? [])); }}>
                      <span className="list-icon" style={{ "--icon": "url(/assets/detail/list/folder.svg)" } as React.CSSProperties} />
                      საქაღალდეში…
                    </button>
                    {status ? (
                      <>
                        <div className="px-2 pt-1"><div className="h-px bg-white/6" /></div>
                        <button type="button" role="menuitem" className="list-item list-remove mt-1" onClick={() => pickStatus(null)}>
                          <img src="/assets/detail/list/remove.svg" alt="" width={16} height={16} />
                          სიიდან ამოღება
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <button type="button" className="detail-btn flex h-9 items-center gap-2 rounded-[5.76px] border border-white/12 px-3 text-sm font-medium text-white" onClick={share}>
                <img src="/assets/detail/share.svg" alt="" width={16} height={16} />
                გაზიარება
              </button>
            </div>
            {chips.length ? (
              <div className="flex flex-wrap gap-2">
                {chips.map((chip) => <span key={chip} className="rounded-[5.76px] border border-white/12 bg-white/4 px-2 py-1 text-xs leading-4 font-medium text-white">{chip}</span>)}
              </div>
            ) : null}
          </div>

          <div className="rise-in relative z-0 rounded-[10px] border border-white/6 bg-[#141414]/80" style={{ animationDelay: "400ms" }}>
            <div className="relative flex border-b border-white/8" role="tablist" aria-label="ანიმეს დეტალები">
              {tabs.map((name) => (
                <button key={name} type="button" role="tab" aria-selected={tab === name} className={`detail-tab flex-1 cursor-pointer py-3 text-sm font-semibold ${tab === name ? "text-[#e93748]" : "text-[#9f9fa9]"}`} onClick={() => { if (name === tab) return; setSwitched(tabs.indexOf(name) > tabs.indexOf(tab) ? "forward" : "back"); setTab(name); }}>
                  {name}
                </button>
              ))}
              <span className="absolute -bottom-px left-0 h-0.5 w-1/3 bg-[#e93748] shadow-[0_0_10px_rgba(233,55,72,0.6)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ transform: `translateX(${tabs.indexOf(tab) * 100}%)` }} />
            </div>

            <div key={tab} className={`relative overflow-hidden rounded-b-[10px] p-4 pt-6 ${switched ? `detail-panel is-switching is-${switched}` : ""}`}>
              {switched ? <span className="detail-sweep" aria-hidden="true" /> : null}
              {tab === "მიმოხილვა" ? (
                <div className="flex flex-col gap-6">
                  {detail.synonyms.length ? (
                    <section>
                      <Heading>სხვა სახელები</Heading>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {detail.synonyms.map((name) => <span key={name} className="rounded bg-white/5 px-2 py-1 text-sm leading-5 text-[#99a1af]">{name}</span>)}
                      </div>
                    </section>
                  ) : null}
                  {detail.studios.length ? (
                    <section>
                      <Heading>სტუდიები</Heading>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {detail.studios.map((name) => <Chip key={name}>{name}</Chip>)}
                      </div>
                    </section>
                  ) : null}
                  {detail.tags.length ? (
                    <section>
                      <Heading aside={spoilerCount ? <button type="button" className="cursor-pointer text-xs font-semibold text-[#71717b] hover:text-[#e93748]" onClick={() => setSpoilers((value) => !value)}>{spoilers ? "სპოილერის დამალვა" : `${spoilerCount} სპოილერი`}</button> : null}>თეგები</Heading>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <Chip key={tag.name}>
                            <span className={tag.spoiler ? "text-[#e93748]" : ""}>{tag.name}</span>
                            {tag.rank < 100 ? <span className="text-[10px] font-semibold text-[#71717b]">{tag.rank}%</span> : null}
                          </Chip>
                        ))}
                      </div>
                    </section>
                  ) : null}
                  <section>
                    <Heading>სტატისტიკა</Heading>
                    <div className="mt-4 grid grid-cols-4 gap-4 max-[700px]:grid-cols-2">
                      {stats.map(([label, value]) => (
                        <div key={label} className="flex min-w-0 flex-col items-center rounded-[7px] bg-white/5 p-3 text-center">
                          <span className="text-xs leading-5 text-[#99a1af]">{label}</span>
                          <span className="text-xl leading-7 font-bold break-words text-white">{value}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                  {detail.related.length > 1 ? (
                    <section className="border-t border-white/8 pt-6">
                      <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-sm leading-5 font-semibold tracking-[0.7px] text-white uppercase">
                          <img src="/assets/detail/related.svg" alt="" width={20} height={20} />
                          დაკავშირებული სეზონები
                        </h3>
                        <span className="text-xs font-semibold text-[#71717b]">{detail.related.length}</span>
                      </div>
                      <div className="relative mt-4">
                        <div ref={relatedRef} className="detail-scroll flex gap-4 overflow-x-auto scroll-smooth pb-1">
                          {detail.related.map((item) => (
                            <a key={item.title + item.relation} href={item.current ? undefined : `${animeHref(item.slug)}/watch?ep=1`} aria-current={item.current ? "page" : undefined} className={`detail-related relative block h-20 w-[170px] shrink-0 overflow-hidden rounded-[10px] ${item.current ? "is-current" : ""}`}>
                              {item.image ? <img src={item.image} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover blur-[2px]" /> : null}
                              <span className="absolute inset-0 bg-[#0a0a0a]/70" />
                              <span className="relative flex h-full flex-col items-center justify-center px-3 text-center">
                                <span className="text-[9px] leading-[13.5px] font-bold tracking-[0.9px] text-[#e93748] uppercase">{item.relation}</span>
                                <span className="font-bog mt-0.5 w-full truncate text-xs leading-4 font-normal tracking-[0.3px] text-[#f4f4f5]">{item.title}</span>
                                <span className="mt-0.5 text-[9px] leading-[13.5px] font-medium text-[#9f9fa9]">{[item.format, item.year].filter(Boolean).join(" • ")}</span>
                              </span>
                            </a>
                          ))}
                        </div>
                        {detail.related.length > 6 ? (
                          <button type="button" className="absolute top-1/2 right-0 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-white/10 bg-[#0a0a0a]/90 text-white hover:border-[#e93748]" aria-label="დაკავშირებულის გადახვევა" onClick={() => relatedRef.current?.scrollBy({ left: 372 })}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="m9 6 6 6-6 6" /></svg>
                          </button>
                        ) : null}
                      </div>
                    </section>
                  ) : null}
                </div>
              ) : null}

              {tab === "მსახიობები" ? (
                detail.cast.length ? <CastBoard key={detail.slug} detail={detail} /> : <p className="py-8 text-center text-sm text-[#71717b]">მსახიობები ჯერ არ არის.</p>
              ) : null}

              {tab === "რეკომენდაციები" ? (
                detail.recommendations.length ? (
                  <div className="grid grid-cols-6 gap-4 max-[1200px]:grid-cols-4 max-[700px]:grid-cols-2">
                    {detail.recommendations.map((item) => (
                      <a key={item.slug} href={`${animeHref(item.slug)}/watch?ep=1`} className="detail-rec group block">
                        <div className="aspect-[2/3] overflow-hidden rounded-[7px] bg-[#1a1a1a]">
                          {item.image ? <img src={item.image} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : null}
                        </div>
                        <p className="font-bog mt-2 line-clamp-2 text-sm font-normal text-white transition-colors group-hover:text-[#e93748]">{item.title}</p>
                        <p className="mt-0.5 text-xs text-[#71717b]">{[item.format, item.score ? `★ ${(item.score / 10).toFixed(1)}` : null].filter(Boolean).join(" · ")}</p>
                      </a>
                    ))}
                  </div>
                ) : <p className="py-8 text-center text-sm text-[#71717b]">რეკომენდაცია ჯერ არ არის.</p>
              ) : null}
            </div>
          </div>

          {cards.length ? <AnimeCards cards={cards} animeId={detail.id} signedIn={Boolean(user)} onAuth={onAuth} /> : null}
        </div>
      </div>
      {folderOpen ? (
        <FolderDialog
          title={detail.title}
          folders={folders}
          onCreate={(name) => { void fetch("/api/folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", name, postId: detail.id }) }).then((res) => res.json()).then((data: { id?: number }) => { if (data.id) setFolders((list) => [...list, { id: data.id as number, name, has: true }]); }); }}
          onToggle={(id) => {
            const previous = folders.find((folder) => folder.id === id)?.has ?? false;
            setFolders((list) => list.map((folder) => (folder.id === id ? { ...folder, has: !folder.has } : folder)));
            void fetch("/api/folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle", id, postId: detail.id }) })
              .then(async (res) => ({ ok: res.ok, data: await res.json().catch(() => ({})) as { ok?: boolean } }))
              .then((result) => { if (!result.ok || result.data.ok === false) setFolders((list) => list.map((folder) => (folder.id === id ? { ...folder, has: previous } : folder))); });
          }}
          onClose={closeFolders}
        />
      ) : null}
    </div>
  );
}
