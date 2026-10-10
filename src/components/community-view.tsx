"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { animeHref } from "@/lib/data";
import { communityCategories, type CommunityAnimeTag, type CommunityCategory, type CommunityPageData, type CommunityPoll, type CommunityPost } from "@/lib/community-types";
import { visibleBody } from "@/lib/community-body";

export function ago(value: string) {
  const then = new Date(value.replace(" ", "T"));
  const minutes = Math.max(0, Math.round((Date.now() - then.getTime()) / 60000));
  if (!Number.isFinite(minutes) || minutes < 1) return "ახლახან";
  if (minutes < 60) return `${minutes} წთ`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} სთ`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} დღე`;
  return value.slice(0, 10);
}

function compact(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 10000) return `${sign}${Math.round(abs / 1000)}k`;
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}k`;
  return String(value);
}

const labelOf = (id: string) => communityCategories.find((item) => item.id === id)?.label ?? id;

type Sort = "hot" | "new" | "top" | "old";

export function CommunityView({ page, topic = "all", onAuth }: { page: CommunityPageData; topic?: CommunityCategory | "all"; onAuth: () => void }) {
  const router = useRouter();
  const [rows, setRows] = useState(page.posts);
  useEffect(() => { setRows(page.posts); }, [page.posts]);
  const [filter, setFilter] = useState<CommunityCategory | "all">(topic);
  useEffect(() => { setFilter(topic); }, [topic]);
  const [sort, setSort] = useState<Sort>("new");
  const [composing, setComposing] = useState(false);
  const [panelHeight, setPanelHeight] = useState(74);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState("");
  const [poll, setPoll] = useState<{ options: string[]; multi: boolean; days: 1 | 3 | 7 | 30 } | null>(null);
  const [tags, setTags] = useState<CommunityAnimeTag[]>([]);
  const [tagOpen, setTagOpen] = useState(false);
  const [tagQuery, setTagQuery] = useState("");
  const [tagHits, setTagHits] = useState<CommunityAnimeTag[]>([]);
  const [tagBusy, setTagBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  const [category, setCategory] = useState<CommunityCategory>("general");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const pinRow = useRef<HTMLDivElement>(null);
  const pinDrag = useRef({ pending: false, active: false, moved: false, blockClick: false, x: 0, y: 0, left: 0, lastX: 0, lastT: 0, vx: 0, link: null as HTMLAnchorElement | null });
  const pinFrame = useRef(0);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [visibleCount, setVisibleCount] = useState(10);
  const feedEnd = useRef<HTMLDivElement>(null);
  const pinned = useMemo(() => rows.filter((item) => item.pinned), [rows]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? rows.filter((item) => `${item.title} ${visibleBody(item.body)} ${item.name}`.toLowerCase().includes(q))
      : filter === "all" ? rows : rows.filter((item) => item.category === filter);
    const copy = [...list];
    if (sort === "new") copy.sort((a, b) => b.id - a.id);
    else if (sort === "old") copy.sort((a, b) => a.id - b.id);
    else if (sort === "top") copy.sort((a, b) => b.votes - a.votes || b.id - a.id);
    else copy.sort((a, b) => b.votes * 2 + b.replies.length - (a.votes * 2 + a.replies.length) || b.id - a.id);
    return copy;
  }, [rows, filter, sort, query]);
  const feed = shown.slice(0, visibleCount);

  useEffect(() => { setVisibleCount(10); }, [filter, sort, query]);

  useEffect(() => {
    const node = feedEnd.current;
    if (!node || visibleCount >= shown.length) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setVisibleCount((count) => count + 5);
    }, { rootMargin: "240px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, shown.length]);

  async function send(payload: Record<string, unknown>) {
    if (!page.signedIn) {
      onAuth();
      return false;
    }
    setSending(true);
    setError("");
    const response = await fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setSending(false);
    if (!response.ok) {
      setError(data.error || "ვერ შეინახა.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function create() {
    const filled = poll?.options.map((item) => item.trim()).filter(Boolean) ?? [];
    if (poll && filled.length > 0 && filled.length < 2) {
      setError("გამოკითხვას სჭირდება მინიმუმ 2 ვარიანტი.");
      return;
    }
    const ok = await send({
      category,
      title,
      body: body.trim(),
      images: photos,
      poll: filled.length >= 2 && poll ? { options: filled, multi: poll.multi, days: poll.days } : undefined,
      anime: tags.map((item) => item.slug),
    });
    if (!ok) return;
    setTitle("");
    setBody("");
    setPhotos([]);
    setPoll(null);
    setTags([]);
    closeComposer();
  }

  async function removePost(postId: number) {
    if (!window.confirm("წაიშალოს ეს პოსტი?")) return;
    const ok = await send({ action: "delete", postId });
    if (ok) setRows((list) => list.filter((item) => item.id !== postId));
  }

  useLayoutEffect(() => {
    if (!composing || closingRef.current) return;
    const next = panelRef.current?.scrollHeight ?? 74;
    setPanelHeight(next);
  }, [composing, categoryOpen, preview, error, photos, poll, tags, imageOpen]);

  function stopPinCoast() {
    cancelAnimationFrame(pinFrame.current);
  }

  useEffect(() => () => stopPinCoast(), []);

  function onPinPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if ((event.target as HTMLElement).closest("[data-nodrag]")) return;
    const el = pinRow.current;
    if (!el) return;
    stopPinCoast();
    const mouse = event.pointerType === "mouse";
    if (mouse) event.preventDefault();
    const link = (event.target as HTMLElement).closest("a[href]");
    pinDrag.current = { pending: true, active: false, moved: false, blockClick: mouse, x: event.clientX, y: event.clientY, left: el.scrollLeft, lastX: event.clientX, lastT: performance.now(), vx: 0, link: link instanceof HTMLAnchorElement ? link : null };
    if (mouse) el.setPointerCapture(event.pointerId);
  }

  function onPinPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = pinDrag.current;
    const el = pinRow.current;
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

  function pinCoast() {
    const el = pinRow.current;
    const state = pinDrag.current;
    if (!el) return;
    state.vx *= 0.94;
    if (Math.abs(state.vx) < 0.02) return;
    el.scrollLeft -= state.vx * 16;
    pinFrame.current = requestAnimationFrame(pinCoast);
  }

  function onPinPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const state = pinDrag.current;
    const el = pinRow.current;
    if (el?.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
    const moved = state.moved;
    const openClick = state.blockClick && !moved;
    state.pending = false;
    state.active = false;
    if (moved && Math.abs(state.vx) > 0.04) pinFrame.current = requestAnimationFrame(pinCoast);
    if (openClick) {
      const href = state.link?.getAttribute("href");
      if (href && el?.contains(state.link)) router.push(href);
    }
    window.setTimeout(() => {
      state.moved = false;
      state.blockClick = false;
    }, 0);
  }

  function onPinClickCapture(event: React.MouseEvent) {
    if (!pinDrag.current.blockClick && !pinDrag.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function scrollPins(dir: number) {
    stopPinCoast();
    pinRow.current?.scrollBy({ left: dir * 505, behavior: "smooth" });
  }

  function openComposer() {
    if (!page.signedIn) {
      onAuth();
      return;
    }
    setSearching(false);
    closingRef.current = false;
    setComposing(true);
    window.setTimeout(() => titleRef.current?.focus(), 280);
  }

  function closeComposer() {
    closingRef.current = true;
    setCategoryOpen(false);
    setPreview(false);
    setPanelHeight(74);
  }

  function onPanelTransition(event: React.TransitionEvent<HTMLElement>) {
    if (event.propertyName !== "height" || event.target !== event.currentTarget || !closingRef.current) return;
    closingRef.current = false;
    setComposing(false);
  }

  function applyBody(next: string, start: number, end: number) {
    setBody(next.slice(0, 4000));
    window.setTimeout(() => {
      const field = bodyRef.current;
      if (!field) return;
      field.focus();
      field.selectionStart = start;
      field.selectionEnd = end;
    }, 0);
  }

  function wrapSelection(before: string, after = before) {
    const field = bodyRef.current;
    const start = field?.selectionStart ?? body.length;
    const end = field?.selectionEnd ?? body.length;
    const selected = body.slice(start, end);
    const next = body.slice(0, start) + before + selected + after + body.slice(end);
    applyBody(next, start + before.length, start + before.length + selected.length);
  }

  function insertSnippet(snippet: string) {
    const field = bodyRef.current;
    const start = field?.selectionStart ?? body.length;
    const end = field?.selectionEnd ?? body.length;
    const next = body.slice(0, start) + snippet + body.slice(end);
    applyBody(next, start + snippet.length, start + snippet.length);
  }

  function openImage() {
    if (!page.signedIn) {
      onAuth();
      return;
    }
    setSearching(false);
    closingRef.current = false;
    setComposing(true);
    setImageError("");
    setImageUrl("");
    setImageOpen(true);
  }

  function commitImage() {
    let url = "";
    try {
      const parsed = new URL(imageUrl.trim());
      if ((parsed.protocol === "https:" || parsed.protocol === "http:") && /\.(png|jpe?g|gif|webp)$/i.test(parsed.pathname)) url = parsed.toString();
    } catch {
      url = "";
    }
    if (!url) {
      setImageError("მხოლოდ PNG, JPG, GIF ან WEBP ბმული.");
      return;
    }
    setPhotos((current) => current.includes(url) || current.length >= 4 ? current : [...current, url]);
    setImageOpen(false);
    setImageUrl("");
    setImageError("");
  }

  function openPoll() {
    setPoll((current) => current ?? { options: ["", ""], multi: false, days: 3 });
  }

  function openTags() {
    if (!page.signedIn) {
      onAuth();
      return;
    }
    setSearching(false);
    closingRef.current = false;
    setComposing(true);
    setTagQuery("");
    setTagHits([]);
    setTagOpen(true);
  }

  useEffect(() => {
    const term = tagQuery.trim();
    if (!tagOpen || term.length < 2) {
      setTagHits([]);
      setTagBusy(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setTagBusy(true);
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then((response) => response.json())
        .then((data: { results?: CommunityAnimeTag[] }) => {
          const hits = Array.isArray(data.results) ? data.results : [];
          setTagHits(hits.map((item) => ({ slug: item.slug, title: item.title, poster: item.poster, type: item.type, year: item.year, episodes: item.episodes || (item as { total?: string }).total, score: item.score })));
        })
        .catch(() => undefined)
        .finally(() => { if (!controller.signal.aborted) setTagBusy(false); });
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [tagOpen, tagQuery]);

  function toggleTag(item: CommunityAnimeTag) {
    setTags((current) => {
      if (current.some((tag) => tag.slug === item.slug)) return current.filter((tag) => tag.slug !== item.slug);
      if (current.length >= 2) return current;
      return [...current, item];
    });
  }

  function toggleSearch() {
    setSearching((on) => {
      if (on) setQuery("");
      return !on;
    });
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 pt-28 pb-16 text-white">
      <div className="rise mx-auto w-full max-w-[1180px]">
      <header className="mx-auto flex max-w-[560px] flex-col items-center text-center">
        <div className="grid h-[74px] w-[74px] place-items-center rounded-[13px] bg-[#e93748]/10">
          <img src="/assets/community/hub.svg" alt="" width={40} height={40} />
        </div>
        <h1 className="mt-5 text-[40px] font-black leading-none sm:text-[48px]">
          ანიმეს <span className="text-[#e93748]">საზოგადოება</span>
        </h1>
        <p className="mt-3 max-w-[512px] text-[16px] leading-7 text-[#a1a1aa] sm:text-[18px]">
          ისაუბრე იმაზე, რასაც უყურებ, ჰკითხე რჩევა და გაუზიარე სხვებს, რაც იპოვე.
        </p>
      </header>

      {pinned.length > 0 && (
        <section className="relative mt-8">
          <div className="mb-4 flex items-center gap-2 px-1 text-[14px] font-black text-[#a1a1aa]">
            <img src="/assets/community/pin.svg" alt="" width={20} height={20} />
            ჩამაგრებული პოსტები
          </div>
          <div className="relative">
            <div
              ref={pinRow}
              className="flex cursor-grab touch-pan-y gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain select-none active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onPointerDown={onPinPointerDown}
              onPointerMove={onPinPointerMove}
              onPointerUp={onPinPointerUp}
              onPointerCancel={onPinPointerUp}
              onClickCapture={onPinClickCapture}
              onDragStart={(event) => event.preventDefault()}
            >
              {pinned.map((post) => {
                const image = postParts(post.body).images[0];
                return (
                  <a key={post.id} href={`/community/${post.id}`} draggable={false} onDragStart={(event) => event.preventDefault()} className="relative h-[192px] w-[min(100%,489px)] shrink-0 overflow-hidden rounded-[10px] border border-white/[0.04] bg-[#141414]/50 shadow-[0_1px_3px_rgba(0,0,0,0.1)] [-webkit-user-drag:none]">
                    {image && <img src={image} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="inline-flex h-5 items-center rounded-full border border-[#27272a] bg-[#09090b] px-2 text-[10px] font-bold text-[#f4f4f5]">{labelOf(post.category)}</span>
                        <span className="inline-flex h-5 items-center gap-1 rounded-full bg-[#e93748] px-2 text-[10px] font-bold text-white">
                          <img src="/assets/community/pin-badge.svg" alt="" width={12} height={12} />
                          ჩამაგრებული
                        </span>
                      </div>
                      <h3 className="truncate text-[16px] font-black leading-5 text-white">{post.title}</h3>
                      <p className="mt-1 text-[10px] font-bold text-[#d4d4d8]">
                        ავტორი <span className="text-white">{post.name}</span>
                      </p>
                    </div>
                    {page.admin && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void send({ action: "pin", postId: post.id });
                        }}
                        data-nodrag
                        className="absolute top-3 right-3 cursor-pointer rounded-full bg-black/50 px-2 py-1 text-[11px] font-medium text-white"
                      >
                        მოხსნა
                      </button>
                    )}
                  </a>
                );
              })}
            </div>
            {pinned.length > 1 && (
              <>
                <button type="button" onClick={() => scrollPins(-1)} aria-label="წინა" className="absolute top-1/2 left-0 z-10 grid size-7 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-white/[0.04]">
                  <img src="/assets/community/chevron-left.svg" alt="" width={16} height={16} />
                </button>
                <button type="button" onClick={() => scrollPins(1)} aria-label="შემდეგი" className="absolute top-1/2 right-0 z-10 grid size-7 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-white/[0.04]">
                  <img src="/assets/community/chevron-right.svg" alt="" width={16} height={16} />
                </button>
              </>
            )}
          </div>
        </section>
      )}

      <section
        onTransitionEnd={onPanelTransition}
        style={{ height: panelHeight }}
        className={`mt-6 overflow-hidden rounded-[10px] border bg-[#0a0a0a] transition-[height,border-color,box-shadow] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          composing
            ? "border-[rgba(233,55,72,0.35)] shadow-[0_10px_15px_-3px_rgba(233,55,72,0.08),0_4px_6px_-4px_rgba(233,55,72,0.08)]"
            : "border-white/[0.06] bg-[#141414]"
        }`}
      >
        <div ref={panelRef}>
          {composing ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void create();
              }}
            >
              <div className="p-6">
                <div className="flex items-center gap-3">
                  <Face name={page.viewer?.name} avatar={page.viewer?.avatar} frame={page.viewer?.frame} size={32} />
                  <span className="text-[14px] font-bold text-[#a1a1aa]">სად აქვეყნებ</span>
                  <button type="button" onClick={() => setCategoryOpen((open) => !open)} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-dashed border-white/15 bg-white/[0.04] px-3 text-[12.8px] font-bold text-white">
                    {labelOf(category)}
                    <img src="/assets/community/chevron-down.svg" alt="" width={14} height={14} className={`transition-transform duration-300 ${categoryOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>
                <div className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${categoryOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <div className="min-h-0 overflow-hidden">
                    <div className="flex flex-wrap gap-1 pt-3">
                      {communityCategories.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setCategory(item.id);
                            setCategoryOpen(false);
                          }}
                          className={`h-7 rounded-full px-3 text-[12px] font-bold ${category === item.id ? "bg-[#e93748] text-white" : "bg-white/[0.04] text-zinc-300"}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="pt-6">
                  <input
                    ref={titleRef}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={160}
                    placeholder="მიეცი პოსტს სათაური..."
                    className="h-9 w-full rounded-[6px] bg-white/[0.04] px-3 text-[14px] font-black tracking-[-0.35px] text-white outline-none placeholder:font-black placeholder:text-[#6b7280]"
                  />
                  {preview ? (
                    <div className="font-mkhedruli mt-3 min-h-[160px] rounded-[6px] bg-white/[0.04] px-3 py-2 text-[16px] leading-6 font-light text-zinc-200">
                      {body.trim() ? <RichText text={body} /> : <span className="text-[#a1a1aa]">ჯერ არაფერია სანახავი.</span>}
                    </div>
                  ) : (
                    <textarea
                      ref={bodyRef}
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      maxLength={4000}
                      placeholder="დაწერე აზრი, თეორია ან კითხვა..."
                      className="font-mkhedruli mt-3 h-40 min-h-40 w-full resize-none rounded-[6px] bg-white/[0.04] px-3 py-2 text-[16px] leading-6 font-light text-white outline-none placeholder:text-[#a1a1aa]"
                    />
                  )}
                  {photos.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {photos.map((url) => (
                        <div key={url} className="relative">
                          <img src={url} alt="" className="h-24 w-24 rounded-[6px] object-cover" />
                          <button type="button" aria-label="სურათის წაშლა" onClick={() => setPhotos((current) => current.filter((item) => item !== url))} className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-black/70 text-[12px] text-white">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {poll && (
                    <div className="mt-3 rounded-[10px] border border-white/10 p-3">
                      <div className="flex items-center gap-2">
                        <img src="/assets/community/fmt-list.svg" alt="" width={16} height={16} />
                        <span className="text-[14px] font-bold">გამოკითხვა</span>
                        <span className="text-[13px] text-zinc-500">სათაური კითხვაა.</span>
                        <button type="button" aria-label="გამოკითხვის წაშლა" onClick={() => setPoll(null)} className="ml-auto grid size-7 place-items-center rounded text-zinc-400 hover:text-white">×</button>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {poll.options.map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              value={option}
                              maxLength={80}
                              placeholder="ვარიანტი"
                              onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }}
                              onChange={(event) => setPoll((current) => current && { ...current, options: current.options.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })}
                              className="h-10 min-w-0 flex-1 rounded-[8px] border border-white/10 bg-white/[0.03] px-3 text-[14px] outline-none"
                            />
                            <button type="button" aria-label="ვარიანტის წაშლა" disabled={poll.options.length <= 2} onClick={() => setPoll((current) => current && { ...current, options: current.options.filter((_, itemIndex) => itemIndex !== index) })} className="grid size-8 place-items-center text-zinc-500 disabled:opacity-30">×</button>
                          </div>
                        ))}
                      </div>
                      <button type="button" disabled={poll.options.length >= 6} onClick={() => setPoll((current) => current && current.options.length < 6 ? { ...current, options: [...current.options, ""] } : current)} className="mt-3 h-8 rounded-[8px] border border-dashed border-white/15 px-3 text-[13px] text-zinc-300 disabled:opacity-40">
                        + ვარიანტის დამატება {poll.options.length}/6
                      </button>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
                        <label className="flex items-center gap-2 text-[13px] text-zinc-300">
                          <input type="checkbox" checked={poll.multi} onChange={(event) => setPoll((current) => current && { ...current, multi: event.target.checked })} className="accent-[#e93748]" />
                          რამდენიმე პასუხი
                        </label>
                        <div className="flex items-center gap-2 text-[13px] text-zinc-400">
                          გრძელდება
                          <div className="flex rounded-full bg-black/40 p-0.5">
                            {([[1, "1 დღე"], [3, "3 დღე"], [7, "1 კვირა"], [30, "1 თვე"]] as const).map(([days, label]) => (
                              <button key={days} type="button" onClick={() => setPoll((current) => current && { ...current, days })} className={`h-7 rounded-full px-2.5 ${poll.days === days ? "bg-[#e93748] font-bold text-white" : "text-zinc-400"}`}>{label}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tags.map((item) => (
                        <div key={item.slug} className="relative flex max-w-full items-center gap-3 rounded-[10px] border border-white/10 bg-[#101010] py-2 pr-8 pl-2">
                          {item.poster ? <img src={item.poster} alt="" className="h-14 w-10 shrink-0 rounded object-cover" /> : <span className="h-14 w-10 shrink-0 rounded bg-white/5" />}
                          <span className="min-w-0">
                            <span className="block truncate text-[14px] font-bold">{item.title}</span>
                            <span className="mt-0.5 block truncate text-[12px] text-zinc-400">
                              {[item.type, item.year, item.episodes ? `${item.episodes} ეპ` : ""].filter(Boolean).join(" · ")}
                              {item.score ? <span className="text-[#f5a21a]"> ★ {item.score}</span> : null}
                            </span>
                          </span>
                          <button type="button" aria-label="თეგის მოხსნა" onClick={() => setTags((current) => current.filter((tag) => tag.slug !== item.slug))} className="absolute top-1 right-1 grid size-5 place-items-center rounded text-[16px] leading-none text-zinc-500 hover:text-white">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {error && <p className="mt-3 text-[13px] text-[#e93748]">{error}</p>}
              </div>
              <div className="flex items-center gap-2 border-t border-white/[0.04] bg-[rgba(20,20,20,0.3)] px-3 py-2">
                <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                  <Tool icon="/assets/community/fmt-bold.svg" label="მუქი" onClick={() => wrapSelection("**")} />
                  <Tool icon="/assets/community/fmt-italic.svg" label="დახრილი" onClick={() => wrapSelection("*")} />
                  <Tool icon="/assets/community/fmt-strike.svg" label="გადახაზული" onClick={() => wrapSelection("~~")} />
                  <Tool icon="/assets/community/fmt-image.svg" label="სურათი" onClick={openImage} />
                  <Tool icon="/assets/community/fmt-list.svg" label="გამოკითხვა" active={!!poll} onClick={openPoll} />
                  <Tool icon="/assets/community/fmt-video.svg" label="ანიმე" active={tags.length > 0} onClick={openTags} />
                  <Tool icon="/assets/community/fmt-lock.svg" label="სპოილერი" onClick={() => wrapSelection("||")} />
                  <Tool icon="/assets/community/fmt-eye.svg" label="ნახვა" onClick={() => setPreview((on) => !on)} />
                </div>
                <button type="button" onClick={closeComposer} className="h-9 shrink-0 rounded-full px-5 text-[12.8px] font-medium text-[#a1a1aa]">გაუქმება</button>
                <button type="submit" disabled={sending || title.trim().length < 2 || (body.trim().length < 2 && photos.length === 0 && tags.length === 0 && (poll?.options.map((item) => item.trim()).filter(Boolean).length ?? 0) < 2)} className="h-9 shrink-0 rounded-full bg-[#e93748] px-6 text-[12.8px] font-bold text-white shadow-[0_4px_3px_rgba(0,0,0,0.1),0_2px_2px_rgba(0,0,0,0.1)] disabled:opacity-50">გამოქვეყნება</button>
              </div>
            </form>
          ) : (
            <div className="flex h-[74px] items-center gap-2 px-4">
              {searching ? (
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Escape") toggleSearch(); }}
                  placeholder="მოძებნე პოსტი ან ავტორი..."
                  className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-zinc-500"
                />
              ) : (
                <button type="button" onClick={openComposer} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <Face name={page.viewer?.name} avatar={page.viewer?.avatar} frame={page.viewer?.frame} size={36} />
                  <span className="text-[15px] text-zinc-500">დაწერე პოსტი...</span>
                </button>
              )}
              <button type="button" aria-label="სურათი" onClick={openImage} className="grid size-8 place-items-center rounded hover:bg-white/5">
                <img src="/assets/community/fmt-image.svg" alt="" width={16} height={16} />
              </button>
              <button type="button" aria-label="ძებნა" aria-pressed={searching} onClick={toggleSearch} className={`grid size-8 place-items-center rounded text-zinc-400 hover:bg-white/5 ${searching ? "bg-[#e93748] text-white" : ""}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              </button>
            </div>
          )}
        </div>
      </section>
      {searching && <p className="mt-2 text-[12px] text-zinc-500">{shown.length} პოსტი</p>}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Chip active={filter === "all"} onClick={() => setFilter("all")} label="ყველა" count={page.stats.posts} />
        {communityCategories.map((item) => (
          <Chip key={item.id} active={filter === item.id} onClick={() => setFilter(item.id)} label={item.label} count={page.counts[item.id] ?? 0} />
        ))}
      </div>

      <div className="mt-4 flex gap-1 border-b border-white/10">
        {(["hot", "new", "top", "old"] as const).map((id) => (
          <button key={id} type="button" onClick={() => setSort(id)} className={`h-10 px-4 text-[14px] font-bold ${sort === id ? "border-b-2 border-[#e93748] text-white" : "text-zinc-500"}`}>
            {{ hot: "ცხელი", new: "ახალი", top: "ტოპი", old: "ძველი" }[id]}
          </button>
        ))}
      </div>

      <div className="mt-2 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          {shown.length === 0 && (
            <p className="border-b border-white/10 px-2 py-10 text-center text-[14px] text-zinc-500">{query.trim() ? "ამ ძებნაზე არაფერი მოიძებნა." : "ჯერ პოსტი არ არის. იყავი პირველი."}</p>
          )}
          {feed.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              open={open === post.id}
              draft={drafts[post.id] ?? ""}
              sending={sending}
              onToggle={() => setOpen((current) => (current === post.id ? null : post.id))}
              onDraft={(value) => setDrafts((current) => ({ ...current, [post.id]: value }))}
              onVote={(value) => void send({ action: "vote", postId: post.id, value })}
              onPin={page.admin ? () => void send({ action: "pin", postId: post.id }) : undefined}
              onDelete={page.admin ? () => void removePost(post.id) : undefined}
              onPoll={(option) => void send({ action: "poll", postId: post.id, option })}
              onReply={async () => {
                const text = (drafts[post.id] ?? "").trim();
                if (!text) return;
                const ok = await send({ action: "reply", postId: post.id, body: text });
                if (ok) setDrafts((current) => ({ ...current, [post.id]: "" }));
              }}
            />
          ))}
          <div ref={feedEnd} className="h-px" />
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-24">
          <div className="rounded-[10px] p-px" style={{ background: "linear-gradient(180deg, rgba(233,55,72,0.45), rgba(255,255,255,0.04))" }}>
            <div className="rounded-[9px] bg-[#101010] p-5">
              <span className="inline-flex rounded-full bg-[#e93748] px-2 py-0.5 text-[10px] font-bold text-white">საზოგადოება</span>
              <p className="mt-3 text-[24px] font-black leading-none">
                ანიმეს <span className="text-[#e93748]">სივრცე</span>
              </p>
              <p className="mt-2 text-[13px] leading-5 text-zinc-400">რეალური წევრები და პოსტები ამ საიტიდან.</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stat label="წევრები" value={compact(page.stats.users)} />
                <Stat label="პოსტები" value={compact(page.stats.posts)} />
              </div>
            </div>
          </div>

          <Ranked title="წევრები" people={page.members} />
          <Ranked title="აქტიურები" people={page.contributors} />
        </aside>
      </div>
      </div>
      {imageOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4" onMouseDown={() => setImageOpen(false)}>
          <div className="w-full max-w-[460px] rounded-[12px] border border-white/10 bg-[#141414] p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <h2 className="text-[18px] font-black">სურათის ჩასმა</h2>
            <p className="mt-2 text-[14px] leading-6 text-zinc-400">ჩასვი სურათის ბმული, რომელიც პოსტში უნდა გამოჩნდეს.</p>
            <input
              autoFocus
              value={imageUrl}
              onChange={(event) => { setImageUrl(event.target.value); setImageError(""); }}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commitImage(); } if (event.key === "Escape") setImageOpen(false); }}
              placeholder="https://example.com/image.png"
              className="mt-4 h-11 w-full rounded-[8px] border border-white/10 bg-black/40 px-3 text-[14px] outline-none"
            />
            <p className="mt-3 text-[11px] tracking-wide text-zinc-500">მხარდაჭერილია PNG, JPG, GIF, WEBP</p>
            {imageError && <p className="mt-2 text-[13px] text-[#e93748]">{imageError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setImageOpen(false)} className="h-9 rounded-[8px] bg-white/10 px-4 text-[13px] font-bold text-zinc-200">გაუქმება</button>
              <button type="button" onClick={commitImage} className="h-9 rounded-[8px] bg-[#e93748] px-4 text-[13px] font-bold text-white">ჩასმა</button>
            </div>
          </div>
        </div>
      )}
      {tagOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4" onMouseDown={() => setTagOpen(false)}>
          <div className="flex max-h-[min(640px,90vh)] w-full max-w-[520px] flex-col rounded-[12px] border border-white/10 bg-[#141414] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 p-5 pb-0">
              <div>
                <h2 className="text-[18px] font-black">ანიმეს მონიშვნა</h2>
                <p className="mt-2 text-[14px] leading-6 text-zinc-400">მოძებნე ანიმე, რომელზეც წერ. მაქსიმუმ 2.</p>
              </div>
              <button type="button" aria-label="დახურვა" onClick={() => setTagOpen(false)} className="grid size-8 place-items-center text-zinc-400">×</button>
            </div>
            <div className="px-5 pt-4">
              <div className="flex h-11 items-center gap-2 rounded-[8px] border border-white/10 bg-black/40 px-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-zinc-500"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
                <input autoFocus value={tagQuery} onChange={(event) => setTagQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setTagOpen(false); }} placeholder="ანიმეს სახელი..." className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-zinc-500" />
              </div>
            </div>
            <div className="mt-3 min-h-[180px] flex-1 overflow-y-auto px-2">
              {tagQuery.trim().length < 2 ? (
                <p className="px-3 py-12 text-center text-[14px] text-zinc-500">ძებნისთვის ჩაწერე მინიმუმ 2 სიმბოლო.</p>
              ) : tagBusy && tagHits.length === 0 ? (
                <p className="px-3 py-12 text-center text-[14px] text-zinc-500">იძებნება...</p>
              ) : tagHits.length === 0 ? (
                <p className="px-3 py-12 text-center text-[14px] text-zinc-500">არაფერი მოიძებნა.</p>
              ) : tagHits.map((item) => {
                const picked = tags.some((tag) => tag.slug === item.slug);
                return (
                  <button key={item.slug} type="button" onClick={() => toggleTag(item)} className={`flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-left hover:bg-white/5 ${picked ? "bg-[#e93748]/10" : ""}`}>
                    {item.poster ? <img src={item.poster} alt="" className="h-12 w-9 rounded object-cover" /> : <span className="h-12 w-9 rounded bg-white/5" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-bold">{item.title}</span>
                      <span className="block text-[12px] text-zinc-500">{[item.type, item.year, item.episodes ? `${item.episodes} ეპ` : ""].filter(Boolean).join(" · ")}</span>
                    </span>
                    {picked && <span className="text-[12px] font-bold text-[#e93748]">მონიშნულია</span>}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between border-t border-white/10 px-5 py-3">
              <span className="text-[13px] text-zinc-400">{tags.length}/2 მონიშნული</span>
              <button type="button" onClick={() => setTagOpen(false)} className="h-9 rounded-[8px] bg-[#e93748] px-4 text-[13px] font-bold text-white">მზადაა</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex h-8 items-center gap-2 rounded-full px-3 text-[13px] font-medium ${active ? "bg-[#e93748] text-white" : "border border-white/10 bg-white/[0.03] text-zinc-300"}`}>
      {label}
      <span className={`text-[11px] ${active ? "text-white/80" : "text-zinc-500"}`}>{count}</span>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[22px] font-black leading-none">{value}</div>
      <div className="mt-1 text-[11px] text-zinc-500">{label}</div>
    </div>
  );
}

function Ranked({ title, people }: { title: string; people: CommunityPageData["members"] }) {
  if (people.length === 0) return null;
  return (
    <section className="rounded-[10px] border border-white/[0.06] bg-[#141414] p-4">
      <h2 className="text-[12px] font-bold text-zinc-500">{title}</h2>
      <ol className="mt-3 grid gap-2">
        {people.map((person, index) => (
          <li key={person.name}>
            <a href={`/@${encodeURIComponent(person.name)}`} className="flex items-center gap-2">
              <span className="w-4 text-[12px] text-zinc-500">{index + 1}</span>
              <Face name={person.name} avatar={person.avatar} frame={person.frame} size={28} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-white">{person.name}</span>
              <span className="text-[11px] text-zinc-500">{person.value} {person.unit}</span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Tool({ icon, label, onClick, active }: { icon: string; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={`grid size-7 shrink-0 place-items-center rounded hover:bg-white/5 ${active ? "bg-[#e93748]/20" : ""}`}>
      <img src={icon} alt="" width={16} height={16} />
    </button>
  );
}

export function RichText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`whitespace-pre-wrap break-words ${className}`}>
      {text.split("\n").map((line, index) => (
        <span key={index}>
          {index > 0 ? "\n" : null}
          {line.startsWith("- ") ? <span>{"• "}{renderInline(line.slice(2))}</span> : renderInline(line)}
        </span>
      ))}
    </div>
  );
}

function renderInline(line: string) {
  const src = "(?:https?:\\/\\/[^\\s)]+|\\/uploads\\/community\\/[\\w.-]+)";
  const token = new RegExp(`(\\*\\*[^*\\n]+\\*\\*|\\*[^*\\n]+\\*|~~[^~\\n]+~~|\\|\\|[^|\\n]+\\|\\||!\\[[^\\]]*\\]\\(${src}\\)|\\[[^\\]]+\\]\\(https?:\\/\\/[^\\s)]+\\))`, "g");
  const parts = line.split(token);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index} className="font-bold text-white">{part.slice(2, -2)}</strong>;
    if (part.startsWith("~~") && part.endsWith("~~")) return <s key={index}>{part.slice(2, -2)}</s>;
    if (part.startsWith("||") && part.endsWith("||")) return <Spoiler key={index} text={part.slice(2, -2)} />;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={index}>{part.slice(1, -1)}</em>;
    const image = part.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/uploads\/community\/[\w.-]+)\)$/);
    if (image) return <img key={index} src={image[2]} alt={image[1] || ""} className="my-3 block max-h-[560px] max-w-full rounded-[10px]" />;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer" className="text-[#e93748] underline">{link[1]}</a>;
    return <span key={index}>{part}</span>;
  });
}

function Spoiler({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button type="button" onClick={() => setOpen(true)} className={`rounded px-1 ${open ? "bg-white/5 text-inherit" : "bg-zinc-700 text-transparent select-none"}`}>
      {text}
    </button>
  );
}

export function Face({ name, avatar, frame, size }: { name?: string; avatar?: string; frame?: string; size: number }) {
  return <Avatar src={avatar} frame={frame} alt={name || ""} size={size} />;
}

function postParts(body: string) {
  const images: string[] = [];
  const text = visibleBody(body).replace(/!\[[^\]]*\]\((https?:\/\/[^\s)]+|\/uploads\/community\/[\w.-]+)\)/g, (_match, src: string) => {
    images.push(src);
    return "";
  }).trim();
  return { text, images };
}

export function PollBox({ poll, onVote }: { poll: CommunityPoll; onVote: (index: number) => void }) {
  const total = poll.counts.reduce((sum, count) => sum + count, 0);
  const ended = new Date(poll.ends).getTime() <= Date.now();
  return (
    <div className="grid gap-2 rounded-[10px] border border-white/10 bg-white/[0.03] p-3">
      {poll.options.map((option, index) => {
        const count = poll.counts[index] ?? 0;
        const picked = poll.mine.includes(index);
        const width = total ? Math.round((count / total) * 100) : 0;
        return (
          <button key={option + index} type="button" disabled={ended} onClick={() => onVote(index)} className={`relative overflow-hidden rounded-[8px] border px-3 py-2 text-left text-[14px] disabled:cursor-default ${picked ? "border-[#e93748]" : "border-white/10"}`}>
            <span className="absolute inset-y-0 left-0 bg-[#e93748]/25" style={{ width: `${width}%` }} />
            <span className="relative flex items-center justify-between gap-3">
              <span>{option}</span>
              <span className="text-[12px] text-zinc-400">{count}</span>
            </span>
          </button>
        );
      })}
      <p className="text-[12px] text-zinc-500">{ended ? "გამოკითხვა დასრულდა" : `${total} ხმა`}{poll.multi ? " · რამდენიმე პასუხი" : ""}</p>
    </div>
  );
}

export function AnimeTags({ items }: { items: CommunityAnimeTag[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <a key={item.slug} href={animeHref(item.slug)} className="flex max-w-full items-center gap-3 rounded-[10px] border border-white/10 bg-[#101010] py-2 pr-4 pl-2">
          {item.poster ? <img src={item.poster} alt="" className="h-14 w-10 shrink-0 rounded object-cover" /> : <span className="h-14 w-10 shrink-0 rounded bg-white/5" />}
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-bold">{item.title}</span>
            <span className="mt-0.5 block text-[12px] text-zinc-400">
              {[item.type, item.year, item.episodes ? `${item.episodes} ეპ` : ""].filter(Boolean).join(" · ")}
              {item.score ? <span className="text-[#f5a21a]"> ★ {item.score}</span> : null}
            </span>
          </span>
        </a>
      ))}
    </div>
  );
}

function PostImage({ src }: { src: string }) {
  return (
    <div className="relative flex h-[336px] items-center justify-center overflow-hidden rounded-[12px] bg-[#0a0a0a]">
      <img src={src} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />
      <img src={src} alt="" className="relative z-10 max-h-full max-w-full object-contain" />
    </div>
  );
}

function PostBody({ post, onPoll, compact }: { post: CommunityPost; onPoll: (index: number) => void; compact?: boolean }) {
  const { text, images } = postParts(post.body);
  const long = !!compact && (text.length > 90 || text.split("\n").length > 2);
  return (
    <div className="mt-2 grid gap-3">
      {text && <RichText text={text} className={`font-mkhedruli text-base leading-6 font-light text-white/90 ${long ? "line-clamp-2" : ""}`} />}
      {(compact ? images.slice(0, 1) : images).map((src) => <PostImage key={src} src={src} />)}
      {post.anime && post.anime.length > 0 && <AnimeTags items={post.anime} />}
      {post.poll && <PollBox poll={post.poll} onVote={onPoll} />}
    </div>
  );
}

function PostCard({
  post,
  open,
  draft,
  sending,
  onToggle,
  onDraft,
  onVote,
  onPin,
  onDelete,
  onPoll,
  onReply,
}: {
  post: CommunityPost;
  open: boolean;
  draft: string;
  sending: boolean;
  onToggle: () => void;
  onDraft: (value: string) => void;
  onVote: (value: 1 | -1) => void;
  onPin?: () => void;
  onDelete?: () => void;
  onPoll: (index: number) => void;
  onReply: () => void;
}) {
  return (
    <article className="border-b border-white/10 px-2 py-5 sm:px-4">
      <div className="flex items-center gap-2">
        <Face name={post.name} avatar={post.avatar} frame={post.frame} size={32} />
        <a href={`/@${encodeURIComponent(post.name)}`} className="text-[14px] font-black text-white">{post.name}</a>
        <span className="rounded-md border border-[#27272a] bg-[#18181b] px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">{labelOf(post.category)}</span>
        <span className="text-[10px] text-zinc-500">{ago(post.at)}</span>
        <span className="ml-auto flex items-center gap-3">
          {onPin && (
            <button type="button" onClick={onPin} className="text-[11px] font-medium text-zinc-500 hover:text-[#e93748]">
              {post.pinned ? "მოხსნა" : "ჩამაგრება"}
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={onDelete} className="text-[11px] font-medium text-zinc-500 hover:text-[#e93748]">წაშლა</button>
          )}
        </span>
      </div>
      <h3 className="mt-3 text-[20px] font-bold leading-snug"><a href={`/community/${post.id}`}>{post.title}</a></h3>
      <PostBody post={post} onPoll={onPoll} compact />
      <div className="mt-4 flex items-center gap-2">
        <div className="inline-flex items-center gap-1 rounded-full bg-black/40 px-1">
          <button type="button" onClick={() => onVote(1)} className={`grid h-8 w-8 place-items-center rounded-full ${post.vote === 1 ? "bg-[#e93748]/20" : ""}`} aria-label="მოწონება">
            <img src="/assets/community/up.svg" alt="" width={18} height={18} />
          </button>
          <span className="min-w-6 text-center text-[13px] font-bold">{post.votes}</span>
          <button type="button" onClick={() => onVote(-1)} className={`grid h-8 w-8 place-items-center rounded-full ${post.vote === -1 ? "bg-white/10" : ""}`} aria-label="არმოწონება">
            <img src="/assets/community/down.svg" alt="" width={18} height={18} />
          </button>
        </div>
        <a href={`/community/${post.id}#comments`} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-black/40 px-3 text-[13px] text-zinc-300">
          <img src="/assets/community/comment.svg" alt="" width={16} height={16} />
          {post.replies.length}
        </a>
      </div>
      {open && (
        <div className="mt-4 grid gap-3 pl-2">
          {post.replies.map((reply) => (
            <div key={reply.id} className="rounded-[10px] bg-white/[0.03] px-3 py-2">
              <div className="flex items-center gap-2">
                <Face name={reply.name} avatar={reply.avatar} frame={reply.frame} size={22} />
                <span className="text-[13px] font-bold text-white">{reply.name}</span>
                <span className="text-[10px] text-zinc-500">{ago(reply.at)}</span>
              </div>
              <div className="site-comment mt-1 text-[14px] text-zinc-300"><RichText text={reply.body} /></div>
            </div>
          ))}
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              onReply();
            }}
          >
            <input value={draft} onChange={(event) => onDraft(event.target.value)} maxLength={2000} placeholder="დაწერე პასუხი" className="h-10 min-w-0 flex-1 rounded-full border border-white/10 bg-black/40 px-4 text-[14px] outline-none placeholder:text-zinc-600" />
            <button type="submit" disabled={sending} className="h-10 rounded-full bg-[#e93748] px-4 text-[13px] font-bold text-white disabled:opacity-50">პასუხი</button>
          </form>
        </div>
      )}
    </article>
  );
}
