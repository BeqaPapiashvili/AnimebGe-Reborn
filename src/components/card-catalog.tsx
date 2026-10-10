"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowUpDown, ArrowUpRight, ChevronRight, Heart, Info, Search, Share2, SlidersHorizontal, X } from "lucide-react";
import { Pager } from "@/components/pager";
import { likeCard } from "@/lib/play-actions";
import type { CardFace, PlayData } from "@/lib/play";

const ranks = ["E", "D", "C", "B", "A", "S", "S+", "RE"];
const rankTone: Record<string, string> = { E: "#94a3b8", D: "#22c55e", C: "#3b82f6", B: "#a855f7", A: "#f59e0b", S: "#e93748", "S+": "#fb7185", RE: "#fbbf24" };
const sorts = [
  ["new", "ახლით"],
  ["name", "სახელით"],
  ["rank", "რანგით"],
  ["likes", "მოწონებით"],
  ["author", "ავტორით"],
] as const;

type Pane = "" | "name" | "title" | "author" | "rank" | "exclude";

function splitRanks(value: string) {
  return value.split(",").map((item) => item.trim().toUpperCase()).filter((item) => ranks.includes(item));
}

function picture(src: string, name: string, className: string) {
  if (!src) return null;
  if (/\.(webm|mp4)(\?|$)/i.test(src)) return <video src={src} autoPlay muted loop playsInline className={className} />;
  return <img src={src} alt={name} loading="lazy" decoding="async" className={className} />;
}

export function CardPreview({ card, onClose, onChange }: { card: CardFace; onClose: () => void; onChange?: (card: CardFace) => void }) {
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState("");
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    setCopied(false);
    setNote("");
  }, [card.id]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button type="button" className="card-dim absolute inset-0 cursor-default bg-black/80" aria-label="დახურვა" onClick={onClose} />
      <div className="card-dialog relative w-[min(420px,100%)]">
        <div className="card-stage relative z-10 mx-auto w-[210px]">
          <a href={`/cards/${card.id}`} className="card-live relative block overflow-hidden rounded-[12px] bg-[#101013] shadow-[0_22px_40px_rgba(0,0,0,0.55)]">
            <span className="block aspect-[2/3]">{picture(card.image, card.name, "h-full w-full object-cover")}</span>
          </a>
        </div>
        <div className="relative -mt-14 rounded-[22px] border border-[#27272a] bg-[#131416] px-6 pt-[76px] pb-6 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
          <button type="button" className="absolute top-3 right-3 grid size-9 cursor-pointer place-items-center rounded-full bg-[#18191b] text-white/80" aria-label="დახურვა" onClick={onClose}>
            <X className="size-4" />
          </button>
          <div className="flex flex-col items-center">
            {card.slug ? <a href={`/anime/${card.slug}`} className="inline-flex max-w-full items-center justify-center gap-1 text-center text-base text-[#fafafa]"><span className="truncate">{card.anime || "ანიმე"}</span> <ArrowUpRight className="size-4 shrink-0" strokeWidth={2.25} /></a> : null}
            <a href={`/cards/${card.id}`} className="mt-1 inline-flex max-w-full items-center justify-center gap-1 text-center text-lg font-semibold text-[#fafafa]"><span className="truncate">{card.name}</span> <ArrowUpRight className="size-4 shrink-0" strokeWidth={2.25} /></a>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button type="button" disabled={liking} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-[#18191b] px-4 text-sm font-semibold disabled:opacity-60" aria-label="მოწონება" onClick={() => {
                setLiking(true);
                void likeCard(card.id).then((result) => {
                  setLiking(false);
                  if (!result.ok) { setNote(result.error); return; }
                  setNote("");
                  onChange?.({ ...card, likes: result.likes, liked: result.liked });
                });
              }}>
                <Heart className={`size-5 ${card.liked ? "fill-[#e93748] text-[#e93748]" : ""}`} /> {card.likes}
              </button>
              <button type="button" className="grid h-9 min-w-9 cursor-pointer place-items-center rounded-full bg-[#18191b] px-4" aria-label="ბმულის კოპირება" onClick={() => { void navigator.clipboard.writeText(`${location.origin}/cards/${card.id}`); setCopied(true); }}>
                <Share2 className="size-5" />
              </button>
            </div>
            {note ? <p className="mt-2 text-xs text-[#e93748]">{note}</p> : null}
            {copied ? <p className="mt-2 text-xs text-white/45">ბმული დაკოპირდა</p> : null}
            <div className="mt-5 flex w-full max-w-[280px] flex-col items-stretch gap-2">
              <span className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#18191b] px-5 text-sm">მფლობელი <span className="text-white/75">{card.holders}</span></span>
              {card.drops ? <a href="/packs" className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#18191b] px-5 py-2 text-center text-sm">პაკი: <span className="ml-2 text-white/75">{card.drops}</span></a> : null}
              {card.author ? <span className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[#18191b] px-4 text-sm">ავტორი: <span className="truncate">{card.author}</span></span> : null}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const CardTile = memo(function CardTile({ card, onOpen }: { card: CardFace; onOpen: (card: CardFace) => void }) {
  return (
    <button type="button" className="block w-full cursor-pointer border-0 bg-transparent p-0" onClick={() => onOpen(card)}>
      <span className="relative block aspect-[2/3] overflow-hidden rounded-[10px] bg-[#101013]">
        {picture(card.image, card.name, "h-full w-full object-cover")}
      </span>
    </button>
  );
});

export function CardCatalog({ data }: { data: PlayData }) {
  const [view, setView] = useState(data);
  const [busy, setBusy] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filters, setFilters] = useState(false);
  const [pane, setPane] = useState<Pane>("");
  const [draft, setDraft] = useState("");
  const [hints, setHints] = useState<string[]>([]);
  const [info, setInfo] = useState(false);
  const [preview, setPreview] = useState<CardFace | null>(null);
  const likedCards = useRef<Record<number, { likes: number; liked: boolean }>>({});
  const ticket = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const chosen = splitRanks(view.rarity);
  const blocked = splitRanks(view.exclude);
  const filterCount = [view.q, view.title, view.author, view.rarity, view.exclude].filter(Boolean).length;
  const sortLabel = sorts.find(([key]) => key === view.sort)?.[1] ?? "სახელით";

  const loadCards = useCallback(async (state: Pick<PlayData, "q" | "title" | "author" | "rarity" | "exclude" | "sort" | "dir" | "page">, push: boolean) => {
    const params = new URLSearchParams();
    if (state.q) params.set("q", state.q);
    if (state.title) params.set("title", state.title);
    if (state.author) params.set("author", state.author);
    if (state.rarity) params.set("rarity", state.rarity);
    if (state.exclude) params.set("exclude", state.exclude);
    if (state.sort && state.sort !== "new") params.set("sort", state.sort);
    if (state.dir !== (state.sort === "new" ? "desc" : "asc")) params.set("dir", state.dir);
    if (state.page > 1) params.set("page", String(state.page));
    const query = params.toString();
    if (push) window.history.pushState(null, "", query ? `/cards?${query}` : "/cards");
    params.set("sort", state.sort);
    params.set("dir", state.dir);
    params.set("page", String(state.page));
    const id = ++ticket.current;
    setBusy(true);
    try {
      const res = await fetch(`/api/cards?${params}`);
      const body = await res.json() as { cards: CardFace[]; page: number; pages: number };
      if (id !== ticket.current) return;
      setView((current) => ({ ...current, ...state, cards: body.cards ?? [], page: body.page || state.page, pages: body.pages || 1 }));
      const node = document.getElementById("cards-top") ?? head.current;
      if (node) {
        const top = node.getBoundingClientRect().top + window.scrollY - 88;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      }
    } finally {
      if (id === ticket.current) setBusy(false);
    }
  }, []);

  function go(next: Partial<Pick<PlayData, "q" | "title" | "author" | "rarity" | "exclude" | "sort" | "dir" | "page">>) {
    const state = {
      q: view.q, title: view.title, author: view.author, rarity: view.rarity, exclude: view.exclude,
      sort: view.sort, dir: view.dir, page: 1, ...next,
    };
    setView((current) => ({ ...current, ...state }));
    void loadCards(state, true);
  }

  useEffect(() => {
    function onPop() {
      const params = new URLSearchParams(window.location.search);
      const sort = params.get("sort") || "new";
      const dir = params.get("dir") === "asc" || params.get("dir") === "desc" ? params.get("dir")! : sort === "new" ? "desc" : "asc";
      void loadCards({
        q: params.get("q") || "",
        title: params.get("title") || "",
        author: params.get("author") || "",
        rarity: params.get("rarity") || "",
        exclude: params.get("exclude") || "",
        sort,
        dir,
        page: Math.max(1, Number(params.get("page")) || 1),
      }, false);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [loadCards]);

  function toggleRank(rank: string, exclude = false) {
    const current = new Set(exclude ? blocked : chosen);
    if (current.has(rank)) current.delete(rank);
    else current.add(rank);
    const value = [...current].join(",");
    if (exclude) go({ exclude: value });
    else go({ rarity: value, exclude: blocked.filter((item) => item !== rank).join(",") });
  }

  const showCard = useCallback((card: CardFace) => {
    const saved = likedCards.current[card.id];
    setPreview(saved ? { ...card, ...saved } : card);
  }, []);

  useEffect(() => {
    if (!preview && !info) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setPreview(null);
      setInfo(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [preview, info]);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setSortOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (pane !== "name" && pane !== "title" && pane !== "author") return;
    const text = draft.trim();
    if (text.length < 1) return;
    const handle = window.setTimeout(() => {
      void fetch(`/api/cards/suggest?kind=${pane}&q=${encodeURIComponent(text)}`).then((res) => res.json()).then((body: { items?: string[] }) => setHints(body.items ?? [])).catch(() => setHints([]));
    }, 160);
    return () => window.clearTimeout(handle);
  }, [draft, pane]);

  return (
    <div ref={head}>
      <h1 className="mb-6 flex items-center justify-center gap-2 text-[22px] font-medium tracking-tight">
        ქარდების კატალოგი
        <button type="button" className="grid size-7 cursor-pointer place-items-center rounded-full bg-[#1a1b1f] text-white/70 transition hover:bg-[#2a2b31] hover:text-white" onClick={() => { setInfo(true); setSortOpen(false); }} aria-label="ქარდების ახსნა">
          <Info className="size-4" strokeWidth={2.25} />
        </button>
      </h1>
      <div ref={box} className="relative mb-7 flex flex-wrap items-center justify-center gap-2 max-md:mb-5">
        <div className="relative max-md:flex-1">
        <button type="button" className={`filter-trigger inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3.5 text-sm max-md:w-full max-md:justify-center ${sortOpen ? "is-on" : "bg-[#1a1a1a] text-[#d1d5dc] hover:text-white"}`} onClick={() => { setSortOpen((value) => !value); setFilters(false); }}>
          {sortLabel}
          <ArrowUpDown className="size-3.5 text-white/55" />
        </button>
        {sortOpen ? (
          <div className="list-menu absolute top-full left-0 z-40 mt-2 w-[248px] overflow-hidden rounded-[10px] bg-[#0a0a0a] p-1.5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]" role="menu">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#e93748] to-transparent" />
            <div className="flex flex-col gap-0.5">
              {sorts.map(([key, label]) => (
                <button key={key} type="button" role="menuitemradio" aria-checked={view.sort === key} className={`list-item ${view.sort === key ? "is-on" : ""}`} onClick={() => { setSortOpen(false); go({ sort: key, dir: key === "new" || key === "likes" ? "desc" : "asc" }); }}>{label}</button>
              ))}
            </div>
            <p className="px-3 pt-2.5 pb-1 text-xs text-white/35">სორტირება</p>
            <div className="flex flex-col gap-0.5">
              <button type="button" role="menuitemradio" aria-checked={view.dir === "desc"} className={`list-item ${view.dir === "desc" ? "is-on" : ""}`} onClick={() => { setSortOpen(false); go({ dir: "desc" }); }}>კლებადობით</button>
              <button type="button" role="menuitemradio" aria-checked={view.dir === "asc"} className={`list-item ${view.dir === "asc" ? "is-on" : ""}`} onClick={() => { setSortOpen(false); go({ dir: "asc" }); }}>ზრდადობით</button>
            </div>
          </div>
        ) : null}
        </div>
        <div className="contents max-md:order-3 max-md:-mx-6 max-md:flex max-md:w-[calc(100%+48px)] max-md:gap-2 max-md:overflow-x-auto max-md:px-6 max-md:[scrollbar-width:none]">
        {ranks.map((rank) => (
          <button key={rank} type="button" className={`filter-trigger inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3.5 text-sm max-md:h-9 max-md:shrink-0 max-md:rounded-full max-md:px-3.5 max-md:text-[13px] ${chosen.includes(rank) ? "is-on" : "bg-[#1a1a1a] text-[#d1d5dc] hover:text-white"}`} onClick={() => toggleRank(rank)}>            რანგი {rank}
          </button>
        ))}
        </div>
        <button type="button" className={`filter-trigger relative inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3.5 text-sm max-md:order-2 max-md:flex-1 max-md:justify-center ${filters ? "is-on" : "bg-[#1a1a1a] text-[#d1d5dc] hover:text-white"}`} onClick={() => { setFilters((value) => !value); setPane(""); setSortOpen(false); }}>
          <SlidersHorizontal className="size-4" />
          ფილტრი
          {filterCount ? <span className={`grid size-4 place-items-center rounded-full text-[10px] ${filters ? "bg-white text-[#e93748]" : "bg-[#e93748] text-white"}`}>{filterCount}</span> : null}
        </button>
      </div>
      <div className={`flex items-start gap-4 ${filters ? "max-[860px]:flex-col" : ""}`}>
        <div className="relative min-w-0 flex-1">
          <span className="card-load-track">{busy ? <span className="card-load" /> : null}</span>
          {view.cards.length ? (
            <div key={`${view.cards[0]?.id ?? 0}-${view.cards.at(-1)?.id ?? 0}`} className={`card-grid grid grid-cols-2 gap-3 min-[680px]:grid-cols-4 min-[1024px]:grid-cols-6 ${busy ? "is-dim" : ""} ${filters ? "min-[1280px]:grid-cols-5" : "min-[1280px]:grid-cols-7"}`}>
              {view.cards.map((card) => <CardTile key={card.id} card={card} onOpen={showCard} />)}
            </div>
          ) : <p className="text-center text-sm text-white/45">არაფერი მოიძებნა.</p>}
        </div>
        <aside className={`shrink-0 overflow-hidden max-md:order-first transition-[width,opacity,max-height] duration-300 ease-[cubic-bezier(0.19,1,0.22,1)] ${filters ? "w-full max-w-full opacity-100 min-[861px]:w-[250px]" : "pointer-events-none w-0 max-h-0 opacity-0 max-md:hidden min-[861px]:max-h-[640px]"}`}>
          <div className="w-full min-[861px]:w-[250px]">
            {pane ? (
              <div className="card-menu">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <button type="button" className="inline-flex cursor-pointer items-center gap-1 text-white/80" onClick={() => { setPane(""); setDraft(""); setHints([]); }}>
                    <ArrowLeft className="size-4" />
                    {pane === "name" ? "პერსონაჟი" : pane === "title" ? "სათაური" : pane === "author" ? "ავტორი" : pane === "exclude" ? "გამორიცხვა" : "რანგი"}
                  </button>
                  <button type="button" className="cursor-pointer text-white/45" onClick={() => go(pane === "name" ? { q: "" } : pane === "title" ? { title: "" } : pane === "author" ? { author: "" } : pane === "exclude" ? { exclude: "" } : { rarity: "" })}>გასუფთავება</button>
                </div>
                {pane === "rank" || pane === "exclude" ? (
                  <div className="grid gap-1">
                    {ranks.map((rank) => {
                      const on = (pane === "exclude" ? blocked : chosen).includes(rank);
                      return <button key={rank} type="button" className={`cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition ${on ? "bg-[#e93748] text-white" : "text-white/75 hover:bg-white/8"}`} onClick={() => toggleRank(rank, pane === "exclude")}>რანგი {rank}</button>;
                    })}
                  </div>
                ) : (
                  <div>
                    <label className="flex h-10 items-center gap-2 rounded-full bg-white/6 px-3">
                      <Search className="size-4 text-white/40" />
                      <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="ძებნა" className="w-full bg-transparent text-sm outline-none" />
                    </label>
                    <div className="mt-2 grid">
                      {hints.map((item) => (
                        <button key={item} type="button" className="cursor-pointer rounded-lg px-2 py-2 text-left text-sm text-white/80 transition hover:bg-white/8" onClick={() => go(pane === "name" ? { q: item } : pane === "title" ? { title: item } : { author: item })}>{item}</button>
                      ))}
                    </div>
                    {(pane === "name" ? view.q : pane === "title" ? view.title : view.author) ? (
                      <button type="button" className="mt-2 cursor-pointer text-sm text-[#e93748]" onClick={() => go(pane === "name" ? { q: "" } : pane === "title" ? { title: "" } : { author: "" })}>
                        მოხსნა: {pane === "name" ? view.q : pane === "title" ? view.title : view.author}
                      </button>
                    ) : <p className="mt-3 text-xs text-white/35">სახელი ძებნით დაემატება.</p>}
                  </div>
                )}
              </div>
            ) : (
              <div className="card-menu">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>ფილტრი</span>
                  <button type="button" className="cursor-pointer text-white/45" onClick={() => go({ q: "", title: "", author: "", rarity: "", exclude: "" })}>გასუფთავება</button>
                </div>
                {([
                  ["name", "პერსონაჟი", view.q],
                  ["title", "სათაური", view.title],
                  ["author", "ავტორი", view.author],
                  ["rank", "რანგი", chosen.join(", ")],
                  ["exclude", "გამორიცხვა", blocked.join(", ")],
                ] as const).map(([key, label, value]) => (
                  <button key={key} type="button" className="flex w-full cursor-pointer items-center justify-between rounded-xl px-2 py-2.5 text-left text-sm text-white/85 transition hover:bg-white/6 hover:text-white" onClick={() => { setPane(key); setDraft(""); setHints([]); }}>
                    <span>
                      {label}
                      {value ? <span className="mt-0.5 block truncate text-xs text-white/40">{value}</span> : null}
                    </span>
                    <ChevronRight className="size-4 text-white/35" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
      <Pager page={view.page} pages={view.pages} onPick={(page) => go({ page })} />
      {info && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <button type="button" className="card-dim absolute inset-0 cursor-default bg-black/80" aria-label="დახურვა" onClick={() => setInfo(false)} />
          <div className="relative w-[min(750px,100%)]">
            <button type="button" className="absolute -top-3 -right-3 z-10 grid size-9 cursor-pointer place-items-center rounded-full bg-[#18191b] text-white/80" aria-label="დახურვა" onClick={() => setInfo(false)}>
              <X className="size-4" />
            </button>
            <div className="max-h-[min(760px,calc(100vh-64px))] overflow-y-auto rounded-[22px] bg-[#131416] px-7 pt-7 pb-10 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
              <h2 className="text-[24px] leading-[1.35] font-semibold tracking-tight text-[#fafafa]">ქარდები: ზოგადი ინფორმაცია</h2>
              <div className="mt-8 space-y-9">
                <section className="space-y-2.5">
                  <h3 className="text-[16px] font-bold text-[#fafafa]">რა არის ქარდები?</h3>
                  <p className="text-[15px] leading-7 text-white/75">ქარდები საკოლექციო ბარათებია და კონკრეტულ ანიმეს უკავშირდება. კატალოგში ჩანს პერსონაჟი, ანიმე, რანგი, ავტორი, მოწონება და ის მომხმარებლები, ვისაც ეს ქარდი აქვს.</p>
                  <p className="text-[15px] leading-7 text-white/75">ყველა ქარდი პაკიდან არ ცვივა. თუ ცვივა, ბარათის გვერდზე „პაკიდან“ ჩანს.</p>
                </section>
                <section className="space-y-2.5">
                  <h3 className="text-[16px] font-bold text-[#fafafa]">რისთვისაა ქარდები?</h3>
                  <p className="text-[15px] leading-7 text-white/75">ქარდის შეგროვება, ვარსკვლავამდე აწევა, გაუმჯობესება, ვიტრინაზე გამოტანა, მარკეტზე გაყიდვა და სხვა მომხმარებელთან გაცვლა შეგიძლია.</p>
                </section>
                <section className="space-y-3">
                  <h3 className="text-[16px] font-bold text-[#fafafa]">როგორ მივიღო ქარდი?</h3>
                  <div className="grid gap-2">
                    {[
                      ["/packs", "პაკი", "სამი ქარდი ჩნდება და ერთს ირჩევ."],
                      ["/craft", "გადადნობა", "სამი ერთი რანგის თავისუფალი ქარდი, E-დან A-მდე."],
                      ["/upgrade", "აპგრეიდი", "ასლებს წვავ კონკრეტული ქარდის შანსისთვის."],
                      ["/awaken", "გამოღვიძება", "სამი S ან სამი S+ და 1000 ენერგია."],
                      ["/market", "მარკეტი", "სხვისი ლოტის ყიდვა 24 საათის განმავლობაში."],
                      ["/trades", "გაცვლა", "შეთავაზება პირდაპირ სხვა მომხმარებელს."],
                      ["/labyrinth", "ლაბირინთი", "დღეში 20 სვლაა. ქარდის ოთახი E, D ან C რანგს გაძლევს."],
                    ].map(([href, title, text]) => (
                      <a key={href} href={href} className="rounded-2xl bg-white/4 px-4 py-3 transition hover:bg-white/7">
                        <span className="block text-[15px] font-semibold text-[#fafafa]">{title}</span>
                        <span className="mt-0.5 block text-[13px] leading-5 text-white/55">{text}</span>
                      </a>
                    ))}
                  </div>
                </section>
                <section className="space-y-3">
                  <h3 className="text-[16px] font-bold text-[#fafafa]">პაკები</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      ["Starter", "150 მონეტა", "ზოგჯერ 20–120 მონეტა ბრუნდება"],
                      ["Blood", "400 მონეტა", ""],
                      ["Solo", "400 მონეტა", ""],
                      ["S ქარდები", "1800 მონეტა", ""],
                    ].map(([name, price, note]) => (
                      <div key={name} className="rounded-2xl bg-white/4 px-4 py-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-[15px] font-semibold">{name}</span>
                          <span className="text-[13px] text-[#e93748]">{price}</span>
                        </div>
                        {note ? <p className="mt-1 text-[13px] leading-5 text-white/45">{note}</p> : null}
                      </div>
                    ))}
                  </div>
                  <p className="text-[13px] leading-5 text-white/45">თუ მონეტა არ გყოფნის, პაკი არ იხსნება. ცარიელი პაკის ფასი ბრუნდება.</p>
                </section>
                <section className="space-y-3">
                  <h3 className="text-[16px] font-bold text-[#fafafa]">რანგები</h3>
                  <p className="text-[15px] leading-7 text-white/75">რანგი იზრდება E-დან RE-მდე. რაც მაღალია რანგი, მით იშვიათია ქარდი. ერთ პერსონაჟს რამდენიმე რანგის ქარდი შეიძლება ჰქონდეს.</p>
                  <div className="grid gap-2">
                    {[
                      ["E–A", "ჩვეულებრივი ქარდები. გადადნობა სწორედ ამ რანგებში მუშაობს.", "#94a3b8"],
                      ["S", "გადადნობით აღარ იცვლება. სამი S გამოღვიძებით S+ ხდება.", rankTone.S],
                      ["S+", "სამი S-ის გამოღვიძებით მოდის. სამი S+ კი RE ხდება.", rankTone["S+"]],
                      ["RE", "უმაღლესი რანგი. გამოღვიძებით მოდის და გადადნობას აღარ ექვემდებარება.", rankTone.RE],
                    ].map(([name, text, color]) => (
                      <div key={name} className="flex items-start gap-3 rounded-2xl bg-white/4 px-4 py-3">
                        <span className="mt-0.5 grid h-7 min-w-10 place-items-center rounded-full px-2 text-[12px] font-semibold" style={{ color, background: `${color}22` }}>{name}</span>
                        <p className="text-[14px] leading-6 text-white/75">{text}</p>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="space-y-3">
                  <h3 className="text-[16px] font-bold text-[#fafafa]">გადადნობა, აპგრეიდი და გამოღვიძება</h3>
                  {[
                    ["გადადნობა", "სამივე ქარდი იწვება. 80% შანსით შემდეგი რანგის შემთხვევითი ქარდი მოდის, დანარჩენ შემთხვევაში კი იგივე რანგის."],
                    ["აპგრეიდი", "ჯერ მიზანს ირჩევ, მერე დასაწვავ ასლებს. შანსი 95%-ს არ სცდება. წაგებისასაც ასლები იწვება."],
                    ["ენერგია", "დაწვა ენერგიას გაძლევს: E, D და C — 1, B — 2, A — 3, S — 8, S+ — 15, RE — 25. ჭერი 1000-ია."],
                    ["გამოღვიძება", "1000 ენერგია და ზუსტად სამი ერთნაირი S ან S+. შანსი 95%-ია. წარმატება 200 მონეტასაც გაძლევს, წაგება კი 40-ს."],
                  ].map(([title, text]) => (
                    <div key={title} className="rounded-2xl bg-white/4 px-4 py-3">
                      <p className="text-[15px] font-semibold">{title}</p>
                      <p className="mt-1 text-[14px] leading-6 text-white/60">{text}</p>
                    </div>
                  ))}
                </section>
                <section className="space-y-3">
                  <h3 className="text-[16px] font-bold text-[#fafafa]">ასლები, ვარსკვლავი და ვიტრინა</h3>
                  {[
                    ["ვარსკვლავი", "ორი თავისუფალი ასლი ერთდება. მეორე იწვება და პირველს ერთი ვარსკვლავი ემატება. ჭერი 5-ია."],
                    ["ვიტრინა", "პროფილზე გამოსაჩენად 6 ქარდი ჭერია."],
                    ["სურვილები", "ქარდის გვერდიდან სურვილებში ამატებ. იქ ჩანან ისინი, ვისაც ეს ქარდი უნდა."],
                  ].map(([title, text]) => (
                    <div key={title}>
                      <p className="text-[15px] font-semibold">{title}</p>
                      <p className="mt-1 text-[14px] leading-6 text-white/60">{text}</p>
                    </div>
                  ))}
                </section>
                <section className="space-y-3">
                  <h3 className="text-[16px] font-bold text-[#fafafa]">გაყიდვა და მარკეტი</h3>
                  <p className="text-[15px] leading-7 text-white/75">სწრაფი გაყიდვა ქარდს შლის და მონეტას გაძლევს.</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[["E", "8"], ["D", "15"], ["C", "30"], ["B", "70"], ["A", "160"], ["S", "350"], ["S+", "700"], ["RE", "1200"]].map(([rank, price]) => (
                      <div key={rank} className="rounded-2xl bg-white/4 px-3 py-2.5 text-center">
                        <p className="text-[13px] font-semibold" style={{ color: rankTone[rank] }}>{rank}</p>
                        <p className="mt-0.5 text-[12px] text-white/55">{price}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[14px] leading-6 text-white/60">მარკეტის ლოტი 24 საათით დგება. საწყისი ფასი მინიმუმ 10 მონეტაა, ყოველი ახალი ბიჯი წინაზე სულ ცოტა 10-ით მეტი უნდა იყოს.</p>
                  <p className="text-[13px] text-white/40">ქარდის ყიდვა-გაყიდვა საიტის მარკეტზე ხდება.</p>
                </section>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
      {preview ? <CardPreview card={preview} onClose={() => setPreview(null)} onChange={(next) => { likedCards.current[next.id] = { likes: next.likes, liked: next.liked }; setPreview(next); }} /> : null}
    </div>
  );
}
