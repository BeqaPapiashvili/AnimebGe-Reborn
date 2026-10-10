"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowUpDown, ArrowUpRight, Check, ChevronRight, ChevronDown, CircleHelp, Crown, Eye, Gem, Layers, List as ListIcon, Lock, Plus, Leaf, Palette, RefreshCw, Shield, Trophy, Users, Flame, Heart, LayoutGrid, Map as MapIcon, Package, Search, Share2, SlidersHorizontal, Sparkles, User, X, Zap } from "lucide-react";
import { CardCatalog, CardPreview } from "@/components/card-catalog";
import { Pager } from "@/components/pager";
import { PackShop } from "@/components/pack-shop";
import { awakenCards, burnCards, castVote, craftCards, enterGiveaway, featureCard, likeCard, offerTrade, placeBid, resolveTrade, scoreDubber, sellCard, sellListing, solveLabyrinth, starCard, stepLabyrinth, touchPet, upgradeCards, wishCard } from "@/lib/play-actions";
import type { CardFace, ClubPage, PlayData } from "@/lib/play";

const tone: Record<string, string> = {
  E: "#94a3b8", D: "#22c55e", C: "#3b82f6", B: "#a855f7", A: "#f59e0b", S: "#e93748", "S+": "#fb7185", RE: "#fbbf24",
};

const catalogNav = [
  ["/cards", "ქარდები", "catalog", LayoutGrid],
  ["/cards/mine", "ჩემი", "mine", User],
  ["/packs", "პაკები", "cases", Package],
  ["/clubs", "კლუბები", "clubs", Shield],
  ["/collectors", "საუკეთესო კოლექციონერები", "collectors", Trophy],
  ["/decks", "კოლექციები", "decks", Layers],
  ["/cards/faq", "ხშირად დასმული კითხვები", "faq", CircleHelp],
  ["/labyrinth", "ლაბირინთი", "labyrinth", MapIcon],
] as const;

const mineNav = [
  ["/cards/mine", "ჩემი ქარდები", "mine", User],
  ["/cards/mine/progress", "კოლექციების პროგრესი", "progress", Trophy],
  ["/cards/mine/decks", "კოლექციები", "mydecks", Layers],
  ["/cards/mine/wishlist", "სურვილების სია", "wishlist", Leaf],
  ["/cards/mine/liked", "რჩეულები", "liked", Heart],
  ["/cards/mine/created", "შექმნილი", "created", Palette],
  ["/cards/mine/trades", "გაცვლები", "trades", RefreshCw],
  ["/cards/mine/skybrick", "ციური აგური", "skybrick", Gem],
] as const;

const brickNav = [
  ["/cards/mine", "ჩემი ბარათები", "mine", User],
  ["/cards/mine/skybrick", "ციური აგური", "skybrick", Gem],
  ["/awaken", "გამოღვიძება", "awaken", Zap],
] as const;

const mineSections = new Set<string>([...mineNav.map(([, , key]) => key), "animeprogress", "newdeck"]);

function PlayNav({ current }: { current: string }) {
  const mine = mineSections.has(current);
  const items = current === "skybrick" || current === "awaken" ? brickNav : mine ? mineNav : catalogNav;
  return (
    <>
    {mine ? (
      <a href="/cards" className="mx-auto mb-3 flex w-fit items-center gap-1.5 text-xs text-white/40 transition hover:text-white/75">
        <ArrowLeft className="size-3.5" /> ქარდების კატალოგი
      </a>
    ) : null}
    <nav className="mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-[18px] border border-white/10 bg-[#121214] p-1.5" aria-label="ქარდების განყოფილებები">
      {items.map(([href, label, key, Icon]) => (
        <a key={href} href={href} className={`inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm transition ${key === current || (key === "progress" && current === "animeprogress") || (key === "mydecks" && current === "newdeck") || (key === "clubs" && current === "club") ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/6 hover:text-white"}`}>
          <Icon className="size-4 shrink-0" strokeWidth={1.75} />
          {label}
        </a>
      ))}
    </nav>
    </>
  );
}

function firstLetter(name: string) {
  return (Array.from(name.trim())[0] ?? "").toUpperCase();
}

function art(src: string, name: string, rarity: string) {
  const video = /\.(webm|mp4)(\?|$)/i.test(src);
  return (
    <span className="relative block aspect-[3/4] overflow-hidden rounded-xl bg-[#101013]">
      {src && video ? <video src={src} autoPlay muted loop playsInline className="h-full w-full object-cover" /> : null}
      {src && !video ? <img src={src} alt={name} className="h-full w-full object-cover" /> : null}
      <span className="absolute top-1.5 left-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-black" style={{ background: tone[rarity] ?? "#fff" }}>{rarity}</span>
    </span>
  );
}

export function PlayView({ data }: { data: PlayData }) {
  if (data.section === "card" && data.card) {
    return (
      <div className="mx-auto w-full max-w-[1320px] px-6 py-8">
        <a href="/cards" className="mb-4 inline-flex text-xs text-white/35 transition hover:text-white/70">კატალოგი</a>
        {data.note ? <p className="mb-4 rounded-xl bg-[#141417] px-4 py-3 text-sm">{data.note}</p> : null}
        <CardPage data={data} />
      </div>
    );
  }
  if (data.section === "catalog" || data.section === "mine") {
    return (
      <div id="cards-top" className="mx-auto w-full max-w-[1400px] px-6 py-8">
        {data.note ? <p className="mb-4 rounded-xl bg-[#141417] px-4 py-3 text-sm">{data.note}</p> : null}
        <PlayNav current={data.section} />
        <div className="mt-8">
          {data.section === "catalog" ? <CardCatalog data={data} /> : <Mine data={data} />}
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-8">
      {data.note ? <p className="mb-4 rounded-xl bg-[#141417] px-4 py-3 text-sm">{data.note}</p> : null}
      {data.section === "club" ? null : <PlayNav current={data.section} />}
      {data.me && !["skybrick", "awaken", "clubs", "club", "faq"].includes(data.section) ? <p className="mt-4 text-center text-sm text-white/45">{data.coins} მონეტა · {data.energy} ენერგია</p> : null}
      <div className={data.section === "club" ? "" : "mt-8"}>
        {data.section === "card" && data.card ? <CardPage data={data} /> : null}
        {data.section === "cases" ? <PackShop data={data} /> : null}
        {data.section === "clubs" ? <Clubs data={data} /> : null}
        {data.section === "club" ? (data.club ? <ClubView data={data} /> : <p className="text-center text-sm text-white/45">კლუბი ვერ მოიძებნა.</p>) : null}
        {data.section === "collectors" ? <Collectors data={data} /> : null}
        {data.section === "faq" ? <Faq /> : null}
        {data.section === "market" ? <Market data={data} /> : null}
        {data.section === "craft" ? <Picker data={data} action={craftCards} label="გადადნობა" hint="სამი ერთი რანგის ბარათი. 80% შანსით შემდეგი რანგი მოდის, E-დან A-მდე." /> : null}
        {data.section === "upgrade" ? <Upgrade data={data} /> : null}
        {data.section === "awaken" ? <Awaken data={data} /> : null}
        {data.section === "decks" ? <MyDecks data={data} all /> : null}
        {data.section === "deck" && data.deck ? <Deck data={data} /> : null}
        {data.section === "trades" ? <Trades data={data} /> : null}
        {data.section === "wishlist" && data.me ? <Wishlist data={data} /> : null}
        {data.section === "liked" ? <MineCards title="რჩეულები" empty="ჯერ არცერთი ქარდი არ მოგიწონებია." cards={data.wishes} /> : null}
        {data.section === "created" ? <MineCards title="შექმნილი ქარდები" empty="შენ მიერ შექმნილი ქარდი ჯერ არ არის." cards={data.wishes} /> : null}
        {data.section === "progress" ? <Progress data={data} /> : null}
        {data.section === "animeprogress" && data.me ? (data.anime ? <AnimeProgress anime={data.anime} /> : <p className="text-center text-sm text-white/45">ანიმე ვერ მოიძებნა.</p>) : null}
        {data.section === "mydecks" && data.me ? <MyDecks data={data} /> : null}
        {data.section === "newdeck" && data.me ? <DeckBuilder data={data} /> : null}
        {data.section === "skybrick" ? <SkyBrick data={data} /> : null}
        {data.section === "giveaways" ? <Giveaways data={data} /> : null}
        {data.section === "battle" && data.battle ? <Battle data={data} /> : null}
        {data.section === "dubbers" ? <Dubbers data={data} /> : null}
        {data.section === "dubber" && data.dubber ? <Dubber data={data} /> : null}
        {data.section === "pet" && data.pet ? <Pet data={data} /> : null}
        {data.section === "labyrinth" && data.labyrinth ? <Maze data={data} /> : null}
        {data.section === "taste" && data.taste ? <Taste data={data} /> : null}
        {data.section === "showcase" && data.showcase ? <Showcase data={data} /> : null}
        {data.me || !["craft", "upgrade", "awaken", "trades", "wishlist", "pet", "labyrinth", "taste", "progress", "animeprogress", "mydecks", "newdeck", "liked", "created", "skybrick"].includes(data.section) ? null : <p className="text-center text-sm text-white/45">ამ გვერდისთვის შედი ანგარიშზე.</p>}
      </div>
    </div>
  );
}

function Grid({ cards }: { cards: PlayData["cards"] }) {
  if (!cards.length) return <p className="text-sm text-white/45">არაფერი მოიძებნა.</p>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {cards.map((card) => (
        <a key={card.id} href={`/cards/${card.id}`} className="cursor-pointer rounded-2xl bg-[#141417] p-2">
          {art(card.image, card.name, card.rarity)}
          <p className="mt-2 truncate text-sm">{card.name}</p>
          {card.anime ? <p className="truncate text-xs text-white/40">{card.anime}</p> : null}
        </a>
      ))}
    </div>
  );
}


function CardPage({ data }: { data: PlayData }) {
  const card = data.card!;
  const [tab, setTab] = useState<"people" | "wishes" | "traders">("people");
  const [likes, setLikes] = useState(card.likes);
  const [liked, setLiked] = useState(card.liked);
  const [liking, setLiking] = useState(false);
  const [copied, setCopied] = useState(false);
  const video = /\.(webm|mp4)(\?|$)/i.test(card.image);
  const list = tab === "wishes" ? card.wishes : tab === "traders" ? card.traders : card.people;
  const tabs = [
    ["people", `მფლობელები ${card.holderCount}`],
    ["wishes", `უნდათ ${card.wishCount}`],
    ["traders", `გაცვლიან ${card.tradeCount}`],
  ] as const;
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="rounded-[28px] bg-[#1a1b1f] p-3 pb-6 lg:sticky lg:top-24">
        <div className="overflow-hidden rounded-[20px] bg-black/20">
          {card.image && video ? <video src={card.image} autoPlay muted loop playsInline className="aspect-[2/3] w-full object-cover" /> : null}
          {card.image && !video ? <img src={card.image} alt={card.name} className="aspect-[2/3] w-full object-cover" /> : null}
        </div>
        <div className="mt-5 flex flex-col items-center gap-1.5 px-3 text-center">
          <h2 className="max-w-full text-[26px] leading-tight font-semibold tracking-tight">{card.name}</h2>
          {card.anime || card.slug ? (
            card.slug ? (
              <a href={`/anime/${card.slug}`} className="inline-flex max-w-full items-center gap-1 text-[15px] text-white/55 transition hover:text-white">
                <span className="truncate">{card.anime || "ანიმე"}</span>
                <ArrowUpRight className="size-4 shrink-0" strokeWidth={2.25} />
              </a>
            ) : <p className="max-w-full truncate text-[15px] text-white/55">{card.anime}</p>
          ) : null}
        </div>
        <div className="mt-5 flex items-center justify-center gap-2 text-sm text-white/80">
          <button type="button" disabled={liking} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-white/8 px-3.5 transition hover:bg-white/14 disabled:opacity-60" onClick={() => {
            setLiking(true);
            void likeCard(card.id).then((result) => {
              setLiking(false);
              if (!result.ok) return;
              setLikes(result.likes);
              setLiked(result.liked);
            });
          }}>
            <Heart className={`size-[18px] ${liked ? "fill-[#e93748] text-[#e93748]" : ""}`} strokeWidth={1.75} /> {likes}
          </button>
          <button type="button" className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/8 text-white/80 transition hover:bg-white/14 hover:text-white" aria-label="ბმულის კოპირება" onClick={() => { void navigator.clipboard.writeText(`${location.origin}/cards/${card.id}`); setCopied(true); }}>
            <Share2 className="size-[18px]" strokeWidth={1.75} />
          </button>
          {card.drops ? <a href="/packs" className="inline-flex h-9 items-center rounded-full bg-white/8 px-3.5 text-white/70 transition hover:bg-white/14 hover:text-white">პაკიდან</a> : null}
        </div>
        {copied ? <p className="mt-2 text-center text-xs text-white/35">ბმული დაკოპირდა</p> : null}
        {card.author ? <p className="mt-4 text-center text-xs text-white/35">ავტორი {card.author}</p> : null}
        <form action={wishCard} className="mt-3 text-center"><input type="hidden" name="id" value={card.id} /><button className={`inline-flex h-9 cursor-pointer items-center rounded-full px-4 text-xs transition ${card.wished ? "bg-white/10 text-white/70 hover:bg-white/14" : "bg-[#e93748] text-white hover:bg-[#f04656]"}`}>{card.wished ? "სურვილიდან მოხსნა" : "სურვილებში დამატება"}</button></form>
      </aside>
      <section className="grid gap-4">
        <div className="flex w-fit items-center gap-1 rounded-full bg-[#1a1b1f] p-1">
          {tabs.map(([key, label]) => (
            <button key={key} type="button" className={`inline-flex h-9 cursor-pointer items-center rounded-full px-4 text-sm transition ${tab === key ? "bg-[#e93748] font-medium text-white" : "text-white/60 hover:bg-white/8 hover:text-white"}`} onClick={() => setTab(key)}>{label}</button>
          ))}
        </div>
        <div className="rounded-[28px] bg-[#1a1b1f] px-5 py-6">
          {list.length ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {list.map((person) => (
                <a key={`${tab}-${person.id}`} href={`/profile/${encodeURIComponent(person.name)}`} className="group min-w-0 text-center">
                  {person.avatar ? <img src={person.avatar} alt="" className="aspect-square w-full rounded-[20px] object-cover transition duration-200 group-hover:brightness-110" /> : <span className="grid aspect-square w-full place-items-center rounded-[20px] bg-white/8 text-base text-white/60">{firstLetter(person.name)}</span>}
                  <p className="mt-2 truncate text-[13px] leading-tight text-white/90">{person.name}</p>
                  <p className="truncate text-[12px] leading-tight text-white/40">{person.text}</p>
                </a>
              ))}
            </div>
          ) : <p className="py-16 text-center text-sm text-white/30">ჯერ არავინ არის.</p>}
        </div>
      </section>
    </div>
  );
}

const mineRanks = ["E", "D", "C", "B", "A", "S", "S+", "RE"];
const mineSorts = [
  ["new", "ახლით"],
  ["name", "სახელით"],
  ["rank", "რანგით"],
  ["likes", "მოწონებით"],
  ["author", "ავტორით"],
] as const;
type MineFilter = { q: string; title: string; author: string; rarity: string; exclude: string; sort: string; dir: string; page: number };
type MinePane = "" | "name" | "title" | "author" | "rank" | "exclude";

function mineSplit(value: string) {
  return value.split(",").map((item) => item.trim().toUpperCase()).filter((item) => mineRanks.includes(item));
}

function Mine({ data }: { data: PlayData }) {
  const [open, setOpen] = useState<PlayData["copies"][number] | null>(null);
  const [view, setView] = useState({ copies: data.copies, pages: data.pages, total: data.total });
  const [state, setState] = useState<MineFilter>({ q: data.q, title: data.title, author: data.author, rarity: data.rarity, exclude: data.exclude, sort: data.sort, dir: data.dir, page: data.page });
  const [loading, setLoading] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filters, setFilters] = useState(false);
  const [pane, setPane] = useState<MinePane>("");
  const [draft, setDraft] = useState("");
  const [hints, setHints] = useState<string[]>([]);
  const ticket = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  const chosen = mineSplit(state.rarity);
  const blocked = mineSplit(state.exclude);
  const filterCount = [state.q, state.title, state.author, state.rarity, state.exclude].filter(Boolean).length;
  const sortLabel = mineSorts.find(([key]) => key === state.sort)?.[1] ?? "ახლით";
  const filtered = filterCount > 0;

  async function load(next: MineFilter) {
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.title) params.set("title", next.title);
    if (next.author) params.set("author", next.author);
    if (next.rarity) params.set("rarity", next.rarity);
    if (next.exclude) params.set("exclude", next.exclude);
    if (next.sort !== "new") params.set("sort", next.sort);
    if (next.dir !== (next.sort === "new" ? "desc" : "asc")) params.set("dir", next.dir);
    if (next.page > 1) params.set("page", String(next.page));
    const query = params.toString();
    window.history.replaceState(null, "", query ? `/cards/mine?${query}` : "/cards/mine");
    params.set("sort", next.sort);
    params.set("dir", next.dir);
    const id = ++ticket.current;
    setLoading(true);
    try {
      const response = await fetch(`/api/cards/mine?${params}`);
      const body = await response.json();
      if (id !== ticket.current || !body?.copies) return;
      setView({ copies: body.copies, pages: body.pages || 1, total: body.total || 0 });
      setState((current) => ({ ...current, page: body.page || next.page }));
      const node = document.getElementById("cards-top");
      if (node) window.scrollTo({ top: Math.max(0, node.getBoundingClientRect().top + window.scrollY - 88), behavior: "smooth" });
    } catch {
    } finally {
      if (id === ticket.current) setLoading(false);
    }
  }

  function go(next: Partial<MineFilter>) {
    const merged = { ...state, page: 1, ...next };
    setState(merged);
    void load(merged);
  }

  function toggleRank(rank: string, exclude = false) {
    const current = new Set(exclude ? blocked : chosen);
    if (current.has(rank)) current.delete(rank);
    else current.add(rank);
    const value = [...current].join(",");
    if (exclude) go({ exclude: value });
    else go({ rarity: value, exclude: blocked.filter((item) => item !== rank).join(",") });
  }

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
      void fetch(`/api/cards/suggest?mine=1&kind=${pane}&q=${encodeURIComponent(text)}`).then((res) => res.json()).then((body: { items?: string[] }) => setHints(body.items ?? [])).catch(() => setHints([]));
    }, 160);
    return () => window.clearTimeout(handle);
  }, [draft, pane]);
  const groups = new Map<number, number>();
  for (const copy of view.copies) if (!copy.sale) groups.set(copy.cardId, (groups.get(copy.cardId) ?? 0) + 1);
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") setOpen(null); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const video = open ? /\.(webm|mp4)(\?|$)/i.test(open.image) : false;
  return (
    <div>
      <h1 className="mb-6 text-center text-[22px] font-medium tracking-tight">ჩემი ქარდები</h1>
      {data.me ? (
        <div ref={box} className="relative mb-7 flex flex-wrap items-center justify-center gap-2">
          <div className="relative">
            <button type="button" className={`filter-trigger inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3.5 text-sm ${sortOpen ? "is-on" : "bg-[#1a1a1a] text-[#d1d5dc] hover:text-white"}`} onClick={() => { setSortOpen((value) => !value); setFilters(false); }}>
              {sortLabel}
              <ArrowUpDown className="size-3.5 text-white/55" />
            </button>
            {sortOpen ? (
              <div className="list-menu absolute top-full left-0 z-40 mt-2 w-[248px] overflow-hidden rounded-[10px] bg-[#0a0a0a] p-1.5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]" role="menu">
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#e93748] to-transparent" />
                <div className="flex flex-col gap-0.5">
                  {mineSorts.map(([key, label]) => (
                    <button key={key} type="button" role="menuitemradio" aria-checked={state.sort === key} className={`list-item ${state.sort === key ? "is-on" : ""}`} onClick={() => { setSortOpen(false); go({ sort: key, dir: key === "new" || key === "likes" ? "desc" : "asc" }); }}>{label}</button>
                  ))}
                </div>
                <p className="px-3 pt-2.5 pb-1 text-xs text-white/35">სორტირება</p>
                <div className="flex flex-col gap-0.5">
                  <button type="button" role="menuitemradio" aria-checked={state.dir === "desc"} className={`list-item ${state.dir === "desc" ? "is-on" : ""}`} onClick={() => { setSortOpen(false); go({ dir: "desc" }); }}>კლებადობით</button>
                  <button type="button" role="menuitemradio" aria-checked={state.dir === "asc"} className={`list-item ${state.dir === "asc" ? "is-on" : ""}`} onClick={() => { setSortOpen(false); go({ dir: "asc" }); }}>ზრდადობით</button>
                </div>
              </div>
            ) : null}
          </div>
          {mineRanks.map((rank) => (
            <button key={rank} type="button" className={`filter-trigger inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3.5 text-sm ${chosen.includes(rank) ? "is-on" : "bg-[#1a1a1a] text-[#d1d5dc] hover:text-white"}`} onClick={() => toggleRank(rank)}>              რანგი {rank}
            </button>
          ))}
          <button type="button" className={`filter-trigger relative inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3.5 text-sm ${filters ? "is-on" : "bg-[#1a1a1a] text-[#d1d5dc] hover:text-white"}`} onClick={() => { setFilters((value) => !value); setPane(""); setSortOpen(false); }}>
            <SlidersHorizontal className="size-4" />
            ფილტრი
            {filterCount ? <span className={`grid size-4 place-items-center rounded-full text-[10px] ${filters ? "bg-white text-[#e93748]" : "bg-[#e93748] text-white"}`}>{filterCount}</span> : null}
          </button>
        </div>
      ) : null}
      {!data.me ? <p className="text-center text-sm text-white/45">ამ გვერდისთვის შედი ანგარიშზე.</p> : (
      <div className={`flex items-start gap-4 ${filters ? "max-[860px]:flex-col" : ""}`}>
        <div className="relative min-w-0 flex-1">
          <span className="card-load-track">{loading ? <span className="card-load" /> : null}</span>
      {view.copies.length ? (
        <div key={`${view.copies[0]?.id ?? 0}-${view.copies.at(-1)?.id ?? 0}`} className={`card-grid grid grid-cols-2 gap-3 min-[680px]:grid-cols-4 min-[1024px]:grid-cols-6 ${loading ? "is-dim" : ""} ${filters ? "min-[1280px]:grid-cols-5" : "min-[1280px]:grid-cols-7"}`}>
          {view.copies.map((copy) => {
            const moving = /\.(webm|mp4)(\?|$)/i.test(copy.image);
            return (
              <button key={copy.id} type="button" className="block w-full cursor-pointer border-0 bg-transparent p-0" onClick={() => setOpen(copy)}>
                <span className="relative block aspect-[2/3] overflow-hidden rounded-[10px] bg-[#101013]">
                  {copy.image && moving ? <video src={copy.image} autoPlay muted loop playsInline className="h-full w-full object-cover" /> : null}
                  {copy.image && !moving ? <img src={copy.image} alt={copy.name} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : <p className="text-center text-sm text-white/45">{filtered ? "არაფერი მოიძებნა." : "ჯერ ქარდი არ გაქვს."}</p>}
        </div>
        <aside className={`shrink-0 overflow-hidden transition-[width,opacity,max-height] duration-300 ease-[cubic-bezier(0.19,1,0.22,1)] ${filters ? "w-full max-w-full opacity-100 min-[861px]:w-[250px]" : "pointer-events-none w-0 max-h-0 opacity-0 min-[861px]:max-h-[640px]"}`}>
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
                    {mineRanks.map((rank) => {
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
                    {(pane === "name" ? state.q : pane === "title" ? state.title : state.author) ? (
                      <button type="button" className="mt-2 cursor-pointer text-sm text-[#e93748]" onClick={() => go(pane === "name" ? { q: "" } : pane === "title" ? { title: "" } : { author: "" })}>
                        მოხსნა: {pane === "name" ? state.q : pane === "title" ? state.title : state.author}
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
                  ["name", "პერსონაჟი", state.q],
                  ["title", "სათაური", state.title],
                  ["author", "ავტორი", state.author],
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
      )}
      {data.me ? <Pager page={state.page} pages={view.pages} onPick={(page) => go({ page })} /> : null}
      {open && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <button type="button" className="card-dim absolute inset-0 cursor-default bg-black/80" aria-label="დახურვა" onClick={() => setOpen(null)} />
          <div className="card-dialog relative w-[min(420px,100%)]">
            <div className="card-stage relative z-10 mx-auto w-[210px]">
              <a href={`/cards/${open.cardId}`} className="card-live relative block overflow-hidden rounded-[12px] bg-[#101013] shadow-[0_22px_40px_rgba(0,0,0,0.55)]">
                <span className="block aspect-[2/3]">
                  {open.image && video ? <video src={open.image} autoPlay muted loop playsInline className="h-full w-full object-cover" /> : null}
                  {open.image && !video ? <img src={open.image} alt={open.name} className="h-full w-full object-cover" /> : null}
                </span>
              </a>
            </div>
            <div className="relative -mt-14 rounded-[22px] border border-[#27272a] bg-[#131416] px-6 pt-[76px] pb-6 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
              <button type="button" className="absolute top-3 right-3 grid size-9 cursor-pointer place-items-center rounded-full bg-[#18191b] text-white/80" aria-label="დახურვა" onClick={() => setOpen(null)}>
                <X className="size-4" />
              </button>
              <div className="flex flex-col items-center">
                <a href={`/cards/${open.cardId}`} className="inline-flex max-w-full items-center justify-center gap-1 text-center text-lg font-semibold text-[#fafafa]">
                  <span className="truncate">{open.name}</span>
                  <ArrowUpRight className="size-4 shrink-0" strokeWidth={2.25} />
                </a>
                <p className="mt-1 text-sm text-white/55">{open.rarity}{open.stars ? ` · ${open.stars}★` : ""}</p>
                {open.sale ? <p className="mt-5 text-sm text-white/45">მარკეტზეა</p> : (
                  <div className="mt-5 flex w-full max-w-[280px] flex-col items-stretch gap-2">
                    <form action={sellCard}><input type="hidden" name="id" value={open.id} /><button className="h-10 w-full cursor-pointer rounded-full bg-[#18191b] text-sm">გაყიდვა</button></form>
                    <form action={featureCard}><input type="hidden" name="id" value={open.id} /><button className="h-10 w-full cursor-pointer rounded-full bg-[#18191b] text-sm">{open.featured ? "ვიტრინიდან მოხსნა" : "ვიტრინაზე"}</button></form>
                    {(groups.get(open.cardId) ?? 0) > 1 ? <form action={starCard}><input type="hidden" name="card" value={open.cardId} /><button className="h-10 w-full cursor-pointer rounded-full bg-[#18191b] text-sm">ვარსკვლავი</button></form> : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

function Market({ data }: { data: PlayData }) {
  return (
    <div className="grid gap-6">
      {data.copies.length ? (
        <form action={sellListing} className="flex flex-wrap items-center gap-2 rounded-2xl bg-[#141417] p-3">
          <select name="id" className="h-10 rounded-xl border border-white/10 bg-black/40 px-2 text-sm">
            {data.copies.map((copy) => <option key={copy.id} value={copy.id}>{copy.name}</option>)}
          </select>
          <input name="price" type="number" min={10} required placeholder="საწყისი" className="h-10 w-28 rounded-xl border border-white/10 bg-black/40 px-3 text-sm" />
          <input name="buy" type="number" min={0} placeholder="ახლავე" className="h-10 w-28 rounded-xl border border-white/10 bg-black/40 px-3 text-sm" />
          <button className="h-10 cursor-pointer rounded-xl bg-[#e93748] px-4 text-sm">დადება</button>
        </form>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {data.market.map((item) => (
          <article key={item.id} className="flex gap-3 rounded-2xl bg-[#141417] p-3">
            {art(item.image, item.name, item.rarity)}
            <div className="min-w-0 flex-1">
              <p className="truncate">{item.name}</p>
              <p className="text-sm text-white/45">{item.seller}</p>
              <p className="text-sm">ბიჯი {item.bid || item.price}{item.buy ? ` · ახლავე ${item.buy}` : ""}</p>
              {item.mine ? null : (
                <form action={placeBid} className="mt-2 flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={item.id} />
                  <input name="amount" type="number" min={10} className="h-10 w-24 rounded-xl border border-white/10 bg-black/40 px-2 text-sm" />
                  <button className="h-10 cursor-pointer rounded-xl bg-[#e93748] px-3 text-sm">ბიჯი</button>
                  {item.buy ? <button name="buy" value="1" className="h-10 cursor-pointer rounded-xl bg-white/10 px-3 text-sm">ახლავე</button> : null}
                </form>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Picker({ data, action, label, hint }: { data: PlayData; action: (formData: FormData) => void; label: string; hint: string }) {
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="back" value={`/${data.section}`} />
      <p className="text-sm text-white/50">{hint}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {data.copies.map((copy) => (
          <label key={copy.id} className="cursor-pointer rounded-2xl bg-[#141417] p-2">
            <input type="checkbox" name="id" value={copy.id} className="mb-2" />
            {art(copy.image, copy.name, copy.rarity)}
            <p className="mt-2 truncate text-sm">{copy.name}</p>
          </label>
        ))}
      </div>
      <button className="h-10 w-fit cursor-pointer rounded-xl bg-[#e93748] px-4 text-sm">{label}</button>
    </form>
  );
}

function Upgrade({ data }: { data: PlayData }) {
  return (
    <form action={upgradeCards} className="grid gap-4">
      <p className="text-sm text-white/50">დასაწვავი ბარათები შანსს ზრდის. მაქსიმუმ 95%. წაგებისასაც იწვება.</p>
      <div className="flex gap-2">
        <input name="q" defaultValue={data.q} placeholder="მიზნის ძებნა" className="h-10 flex-1 rounded-xl border border-white/10 bg-[#141417] px-3 text-sm" />
        <button formAction="/upgrade" formMethod="get" className="h-10 cursor-pointer rounded-xl bg-white/10 px-4 text-sm">ძებნა</button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {data.cards.map((card) => (
          <label key={card.id} className="cursor-pointer rounded-2xl bg-[#141417] p-2">
            <input type="radio" name="target" value={card.id} required />
            {art(card.image, card.name, card.rarity)}
            <p className="mt-2 truncate text-sm">{card.name}</p>
          </label>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {data.copies.map((copy) => (
          <label key={copy.id} className="cursor-pointer rounded-2xl bg-[#141417] p-2">
            <input type="checkbox" name="id" value={copy.id} className="mb-2" />
            {art(copy.image, copy.name, copy.rarity)}
          </label>
        ))}
      </div>
      <button className="h-10 w-fit cursor-pointer rounded-xl bg-[#e93748] px-4 text-sm">აპგრეიდი</button>
    </form>
  );
}

const awakenTarget: Record<string, string> = { S: "S+", "S+": "RE" };
const awakenPerPage = 36;
const awakenSparks = Array.from({ length: 14 }, (_, index) => {
  const angle = (index / 14) * Math.PI * 2;
  const reach = 120 + (index % 3) * 40;
  return { x: Math.round(Math.cos(angle) * reach), y: Math.round(Math.sin(angle) * reach), delay: (index % 4) * 40 };
});

type AwakenResult = { ok: true; success: boolean; target: string; card: { id: number; copy: number; name: string; image: string; rarity: string } | null; reward: number; used: number[]; energy: number; coins: number };

function AwakenShow({ show, energy, onClose }: { show: { cards: PlayData["copies"]; from: string; target: string; result: AwakenResult | null }; energy: number; onClose: () => void }) {
  const result = show.result;
  const color = tone[show.target] ?? "#e93748";

  useEffect(() => {
    if (!result) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [result, onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center overflow-hidden p-6">
      <div className="card-dim absolute inset-0 bg-black/85 backdrop-blur-[2px]" onClick={result ? onClose : undefined} />

      {!result ? (
        <div className="relative grid place-items-center">
          <span className="awake-core absolute size-56 rounded-full blur-[60px]" style={{ background: color }} />
          {[0, 370, 740].map((delay) => <span key={delay} className="awake-ring absolute size-64 rounded-full border-2" style={{ borderColor: `${color}66`, "--delay": `${delay}ms` } as React.CSSProperties} />)}
          <div className="relative h-[210px] w-[140px]">
            {show.cards.map((copy, index) => {
              const offset = (index - 1) * 150;
              return (
                <span key={copy.id} className="awake-converge absolute inset-0" style={{ "--x": `${offset}px`, "--r": `${(index - 1) * 10}deg`, "--delay": `${index * 90}ms` } as React.CSSProperties}>
                  <img src={copy.image} alt={copy.name} className="h-full w-full rounded-[14px] object-cover shadow-[0_18px_40px_rgba(0,0,0,0.6)]" />
                </span>
              );
            })}
          </div>
          <div className="absolute top-[calc(100%+60px)] w-[260px] text-center">
            <p className="text-sm font-medium text-white">იღვიძებს...</p>
            <p className="mt-1 text-xs text-white/45">სამი {show.from} → {show.target}</p>
            <span className="mt-3 block h-1 overflow-hidden rounded-full bg-white/10"><span className="awake-bar block h-full rounded-full" style={{ background: color }} /></span>
          </div>
        </div>
      ) : (
        <div className="relative flex w-[min(380px,100%)] flex-col items-center text-center">
          <span className="awake-flash pointer-events-none fixed inset-0" style={{ background: `radial-gradient(circle at center, ${result.success ? color : "#ffffff"}55, transparent 60%)` }} />
          {result.success && result.card ? (
            <>
              <span className="brick-glow absolute top-10 size-64 rounded-full blur-[70px]" style={{ background: `${color}55` }} />
              {awakenSparks.map((spark, index) => (
                <span key={index} className="awake-spark absolute top-[150px] size-2 rounded-full" style={{ background: color, "--sx": `${spark.x}px`, "--sy": `${spark.y}px`, "--delay": `${spark.delay}ms` } as React.CSSProperties} />
              ))}
              <p className="awake-up relative text-xs font-medium tracking-wide" style={{ color }}>გამოღვიძება წარმატებულია</p>
              <div className="awake-reveal card-stage relative mt-4 w-[200px]">
                <a href={`/cards/${result.card.id}`} className="card-live relative block overflow-hidden rounded-[14px] bg-[#101013] shadow-[0_24px_50px_rgba(0,0,0,0.6)]">
                  <span className="block aspect-[2/3]">
                    {/\.(webm|mp4)(\?|$)/i.test(result.card.image) ? <video src={result.card.image} autoPlay muted loop playsInline className="h-full w-full object-cover" /> : <img src={result.card.image} alt={result.card.name} className="h-full w-full object-cover" />}
                  </span>
                  <span className="absolute top-2 left-2 rounded-md bg-black/75 px-2 py-0.5 text-xs font-bold" style={{ color }}>{result.card.rarity}</span>
                </a>
              </div>
              <h3 className="awake-up relative mt-5 text-xl font-semibold" style={{ "--delay": "500ms" } as React.CSSProperties}>{result.card.name}</h3>
              <p className="awake-up relative mt-1 text-sm text-white/55" style={{ "--delay": "600ms" } as React.CSSProperties}>ახალი <b style={{ color }}>{result.card.rarity}</b> ქარდი · +{result.reward} მონეტა</p>
            </>
          ) : (
            <>
              <div className="awake-shake relative grid size-24 place-items-center rounded-full bg-white/[0.05] text-white/60"><X className="size-10" /></div>
              <h3 className="awake-up relative mt-5 text-xl font-semibold">{result.success ? "ქარდი ვერ მოიძებნა" : "გამოღვიძება ჩავარდა"}</h3>
              <p className="awake-up relative mt-1 text-sm text-white/55" style={{ "--delay": "120ms" } as React.CSSProperties}>ქარდები დაიწვა. სანაცვლოდ მიიღე +{result.reward} მონეტა.</p>
            </>
          )}
          <p className="awake-up relative mt-2 text-xs text-white/35" style={{ "--delay": "700ms" } as React.CSSProperties}>დარჩენილი ენერგია: {energy}</p>
          <div className="awake-up relative mt-5 flex flex-wrap justify-center gap-2" style={{ "--delay": "800ms" } as React.CSSProperties}>
            {result.card ? <a href={`/cards/${result.card.id}`} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white/[0.07] px-4 text-sm text-white/85 transition hover:bg-white/12 hover:text-white">ქარდის გვერდი <ArrowUpRight className="size-4" /></a> : null}
            <button type="button" onClick={onClose} className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-[#e93748] px-5 text-sm font-medium text-white transition hover:bg-[#f04656]">{energy >= brickCap ? "კიდევ გამოღვიძება" : "დახურვა"}</button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

function Awaken({ data }: { data: PlayData }) {
  const [rank, setRank] = useState("");
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [copies, setCopies] = useState(data.copies);
  const [energy, setEnergy] = useState(data.energy);
  const [show, setShow] = useState<{ cards: PlayData["copies"]; from: string; target: string; result: AwakenResult | null } | null>(null);
  const [error, setError] = useState("");
  const ready = energy >= brickCap;
  const pool = copies.filter((copy) => awakenTarget[copy.rarity.toUpperCase()]);
  const text = search.trim().toLowerCase();
  const list = pool
    .filter((copy) => !rank || copy.rarity.toUpperCase() === rank)
    .filter((copy) => !text || copy.name.toLowerCase().includes(text))
    .sort((a, b) => Number(a.featured) - Number(b.featured) || b.id - a.id);
  const pages = Math.max(1, Math.ceil(list.length / awakenPerPage));
  const current = Math.min(page, pages);
  const visible = list.slice((current - 1) * awakenPerPage, current * awakenPerPage);
  const chosen = picked.map((id) => pool.find((copy) => copy.id === id)).filter((copy): copy is PlayData["copies"][number] => Boolean(copy));
  const from = chosen[0]?.rarity.toUpperCase() ?? "";
  const target = awakenTarget[from] ?? "";
  const full = chosen.length === 3;
  const canStart = full && ready && !busy;
  const counts = { S: pool.filter((copy) => copy.rarity.toUpperCase() === "S").length, "S+": pool.filter((copy) => copy.rarity.toUpperCase() === "S+").length };
  const chip = "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition";
  const reason = error || (!ready ? `ენერგია არ ყოფნის — აკლია ${brickCap - energy}.` : !chosen.length ? "აირჩიე ერთი რანგის სამი ქარდი." : !full ? `კიდევ ${3 - chosen.length} ${from} ქარდი აირჩიე.` : `მზადაა: სამი ${from} → ${target}.`);

  async function start() {
    if (!canStart) return;
    const cards = chosen;
    setBusy(true);
    setError("");
    setShow({ cards, from, target, result: null });
    const wait = new Promise((resolve) => window.setTimeout(resolve, 3400));
    const request = fetch("/api/awaken", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: cards.map((copy) => copy.id) }) })
      .then((response) => response.json() as Promise<AwakenResult | { ok: false; error: string }>)
      .catch(() => ({ ok: false as const, error: "კავშირი ვერ დამყარდა." }));
    const [result] = await Promise.all([request, wait]);
    setBusy(false);
    if (!result.ok) {
      setShow(null);
      setError(result.error);
      return;
    }
    const used = new Set(result.used);
    setCopies((items) => {
      const left = items.filter((item) => !used.has(item.id));
      return result.card ? [{ id: result.card.copy, cardId: result.card.id, name: result.card.name, image: result.card.image, rarity: result.card.rarity, stars: 0, sale: false, featured: false }, ...left] : left;
    });
    setEnergy(result.energy);
    setPicked([]);
    setShow({ cards, from, target, result });
  }

  function toggle(copy: PlayData["copies"][number]) {
    const key = copy.rarity.toUpperCase();
    setPicked((items) => {
      if (items.includes(copy.id)) return items.filter((id) => id !== copy.id);
      const same = items.filter((id) => pool.find((item) => item.id === id)?.rarity.toUpperCase() === key);
      return same.length >= 3 ? same : [...same, copy.id];
    });
  }

  function go(next: number) {
    setPage(next);
    const node = document.getElementById("awaken-cards");
    if (node) window.scrollTo({ top: Math.max(0, node.getBoundingClientRect().top + window.scrollY - 88), behavior: "smooth" });
  }

  const recipe = [
    ["3", "სამი S ქარდი", "იძლევა შემთხვევით S+ ქარდს", tone.S],
    ["3", "სამი S+ ქარდი", "იძლევა შემთხვევით RE ქარდს", tone["S+"]],
    ["95%", "წარმატების შანსი", "წარმატებისას +200 მონეტა", "#ff8a95"],
    ["1000", "ენერგია ერთ ცდაზე", "წარუმატებლობისას +40 მონეტა", "#ff8a95"],
  ] as const;

  return (
    <div className="grid gap-5">
      <div className="album-rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-[#ff8a95]"><Sparkles className="size-3.5" /> ძალის შემდეგი საფეხური</p>
          <h1 className="mt-2 text-[26px] leading-tight font-semibold tracking-tight sm:text-[32px]">ქარდის გამოღვიძება</h1>
          <p className="mt-1 max-w-[560px] text-sm text-white/45">ერთი რანგის სამი ქარდი გადააქციე უფრო მაღალი რანგის ქარდად. ყოველ ცდას ციური აგურის 1000 ენერგია სჭირდება.</p>
        </div>
        <a href="/cards/mine/skybrick" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#121214] px-3.5 text-xs text-white/75 transition hover:bg-white/[0.06] hover:text-white"><Gem className="size-4 text-[#ff8a95]" /> ენერგიის შევსება</a>
      </div>

      <section className="album-rise relative overflow-hidden rounded-[20px] bg-linear-to-br from-[#1b1418] via-[#141215] to-[#121214] p-5 sm:p-7" style={{ "--delay": "60ms" } as React.CSSProperties}>
        <span className="album-ring pointer-events-none absolute top-1/2 -left-40 size-[520px] -translate-y-1/2 rounded-full border-[46px] border-white/[0.025]" />
        <span className="album-ring pointer-events-none absolute top-1/2 -left-16 size-[300px] -translate-y-1/2 rounded-full border-[28px] border-white/[0.02]" />
        <span className="pointer-events-none absolute -top-24 right-1/4 size-72 rounded-full bg-[#e93748]/8 blur-[90px]" />

        <div className="relative flex flex-wrap items-center gap-8">
          <div className="relative grid h-[220px] w-[200px] shrink-0 place-items-center max-sm:mx-auto">
            {full ? <span className="brick-glow absolute size-40 rounded-full bg-[#e93748]/30 blur-[50px]" /> : null}
            {chosen.length ? (
              <span className="relative block h-[200px] w-[140px]">
                {chosen.map((copy, index) => {
                  const angle = (index - (chosen.length - 1) / 2) * 9;
                  return (
                    <span key={copy.id} className="brick-pop absolute inset-0" style={{ zIndex: index }}>
                      <img src={copy.image} alt={copy.name} className="absolute inset-0 h-full w-full rounded-[14px] object-cover shadow-[0_16px_32px_rgba(0,0,0,0.5)] transition-transform duration-300" style={{ transform: `translateX(${angle * 2.2}px) rotate(${angle}deg)` }} />
                    </span>
                  );
                })}
                {full ? <span className="brick-pop absolute -right-3 -bottom-3 z-10 grid size-14 place-items-center rounded-2xl bg-[#e93748] text-lg font-bold text-white shadow-[0_10px_24px_rgba(233,55,72,0.4)]">{target}</span> : null}
              </span>
            ) : (
              <span className="brick-float relative grid h-[200px] w-[140px] place-items-center rounded-[16px] bg-[#1a1a1a] shadow-[0_16px_32px_rgba(0,0,0,0.5)]">
                <span className="text-[64px] leading-none font-light text-white/80">?</span>
                <span className="absolute top-3 right-3 size-1.5 rounded-full bg-white/25" />
                <span className="absolute bottom-3 left-3 size-1.5 rounded-full bg-white/25" />
              </span>
            )}
          </div>

          <div className="min-w-[260px] flex-1">
            <p className="text-[11px] font-medium tracking-wide text-[#ff8a95]">ქარდები გამოღვიძებისთვის</p>
            <h2 className="mt-1.5 text-[22px] font-semibold tracking-tight">{full ? `სამი ${from} → ${target}` : chosen.length ? `არჩეულია ${chosen.length} / 3` : "აირჩიე შენი ქარდები"}</h2>
            <p className="mt-1 text-sm text-white/45">{chosen.length ? chosen.map((copy) => copy.name).join(" · ") : "ხელმისაწვდომი S და S+ ქარდები ქვემოთ სიაშია."}</p>

            <div className="mt-5 flex items-center gap-4">
              <span className="relative grid size-16 shrink-0 place-items-center">
                <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
                  <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2.5" />
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#e93748" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="100.5" strokeDashoffset={full ? 100.5 * 0.05 : 100.5} className="transition-[stroke-dashoffset] duration-700 ease-out" />
                </svg>
                <span className="text-sm font-semibold">{full ? "95%" : "—"}</span>
              </span>
              <span>
                <span className="block text-sm font-medium">გამოღვიძების შანსი</span>
                <span className="block text-xs text-white/40">{full ? "ქარდები იწვება ნებისმიერ შემთხვევაში." : "გამოჩნდება სამი ქარდის არჩევის შემდეგ."}</span>
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" disabled={!canStart} onClick={start} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#e93748] px-4 text-sm font-medium text-white transition hover:bg-[#f04656] disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-white/40">
                <Zap className="size-4" /> {busy ? "იღვიძებს..." : "გამოღვიძების დაწყება"}
              </button>
              <span className={`text-xs ${error ? "text-[#ff8a95]" : "text-white/40"}`}>{reason}</span>
            </div>
          </div>

          <div className="w-full rounded-[16px] bg-white/[0.035] p-4 lg:w-[280px]">
            <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-1.5 text-white/55"><Gem className="size-3.5 text-[#ff8a95]" /> ენერგიის მარაგი</span><b className="font-semibold">{energy}</b></div>
            <div className="mt-2.5 flex items-center justify-between text-sm"><span className="text-white/55">ერთ ცდაზე</span><b className="font-semibold">{brickCap}</b></div>
            <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <span className="album-fill absolute inset-y-0 left-0 rounded-full bg-[#e93748]" style={{ width: `${Math.min(100, (energy / brickCap) * 100)}%`, "--delay": "250ms" } as React.CSSProperties} />
            </div>
            <p className={`mt-2.5 text-xs ${ready ? "text-white/45" : "text-[#ff8a95]"}`}>{ready ? "ენერგია საკმარისია ერთი ცდისთვის." : `აკლია ${brickCap - energy} ენერგია.`}</p>
            {ready ? null : <a href="/cards/mine/skybrick" className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#e93748]/12 px-3 text-xs text-[#ff8a95] transition hover:bg-[#e93748]/20">აგურის დატენვა <ArrowUpRight className="size-3.5" /></a>}
          </div>
        </div>
      </section>

      <div className="grid gap-2.5 min-[560px]:grid-cols-2 min-[1024px]:grid-cols-4">
        {recipe.map(([value, label, hint, color], index) => (
          <div key={label} className="album-rise flex items-center gap-3 rounded-[14px] bg-[#121214] px-4 py-3" style={{ "--delay": `${120 + index * 60}ms` } as React.CSSProperties}>
            <span className="grid h-9 min-w-9 shrink-0 place-items-center rounded-lg bg-white/[0.05] px-2 text-xs font-bold" style={{ color }}>{value}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{label}</span>
              <span className="block truncate text-[11px] text-white/40">{hint}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section id="awaken-cards" className="album-rise rounded-[20px] bg-[#121214] p-4 sm:p-5" style={{ "--delay": "180ms" } as React.CSSProperties}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2.5 text-base font-semibold"><span className="grid size-7 place-items-center rounded-lg bg-white/[0.05] text-xs text-white/55">01</span> ქარდები გამოღვიძებისთვის</h2>
            <span className="text-xs text-white/35">აირჩიე ერთი რანგის სამი</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex gap-1 rounded-xl bg-[#0f0f11] p-1">
              <button type="button" onClick={() => { setRank(""); setPage(1); }} className={`${chip} ${rank ? "text-white/60 hover:bg-white/[0.06] hover:text-white" : "bg-[#e93748] text-white"}`}>ყველა <span className={`text-[10px] ${rank ? "text-white/35" : "text-white/75"}`}>{pool.length}</span></button>
              {(["S", "S+"] as const).map((key) => (
                <button key={key} type="button" onClick={() => { setRank(rank === key ? "" : key); setPage(1); }} className={`${chip} ${rank === key ? "bg-[#e93748] text-white" : "text-white/60 hover:bg-white/[0.06] hover:text-white"}`}>
                  <span style={{ color: rank === key ? undefined : tone[key] }}>{key}</span><span className={`text-[10px] ${rank === key ? "text-white/75" : "text-white/35"}`}>{counts[key]}</span>
                </button>
              ))}
            </span>
            <form className="flex min-w-[220px] flex-1 gap-2" onSubmit={(event) => { event.preventDefault(); setSearch(draft); setPage(1); }}>
              <label className="flex h-9 flex-1 items-center gap-2 rounded-lg bg-[#1a1a1a] px-3">
                <Search className="size-4 text-white/40" />
                <input value={draft} onChange={(event) => { setDraft(event.target.value); if (!event.target.value) setSearch(""); }} placeholder="პერსონაჟის სახელი" className="w-full bg-transparent text-xs outline-none placeholder:text-white/30" />
              </label>
              <button className="h-9 cursor-pointer rounded-lg bg-[#e93748] px-4 text-xs font-medium text-white transition hover:bg-[#f04656]">ძებნა</button>
            </form>
          </div>

          {visible.length ? (
            <div key={`${current}-${rank}-${text}`} className="card-grid mt-4 grid grid-cols-3 gap-2.5 min-[560px]:grid-cols-4 min-[900px]:grid-cols-6">
              {visible.map((copy) => {
                const on = picked.includes(copy.id);
                const key = copy.rarity.toUpperCase();
                const moving = /\.(webm|mp4)(\?|$)/i.test(copy.image);
                const other = Boolean(from) && from !== key && !on;
                return (
                  <button key={copy.id} type="button" disabled={copy.featured} title={copy.featured ? `${copy.name} — ვიტრინაშია` : copy.name} onClick={() => toggle(copy)} className="group relative block cursor-pointer text-left disabled:cursor-not-allowed">
                    <span className={`relative block aspect-[2/3] overflow-hidden rounded-[10px] bg-[#1a1a1a] shadow-[0_10px_22px_rgba(0,0,0,0.35)] transition duration-300 ${copy.featured ? "opacity-40" : other ? "opacity-55 group-hover:opacity-100" : "group-hover:-translate-y-1"} ${on ? "ring-2 ring-[#e93748] ring-offset-2 ring-offset-[#121214]" : ""}`}>
                      {copy.image && moving ? <video src={copy.image} autoPlay muted loop playsInline className="h-full w-full object-cover" /> : null}
                      {copy.image && !moving ? <img src={copy.image} alt={copy.name} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : null}
                      <span className="absolute top-1.5 left-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold" style={{ color: tone[key] ?? "#fff" }}>{key}</span>
                      {on ? <span className="absolute inset-0 bg-[#e93748]/15" /> : null}
                      {on ? <span className="brick-pop absolute bottom-1.5 left-1/2 grid size-6 -translate-x-1/2 place-items-center rounded-full bg-[#e93748] text-[11px] font-bold text-white">{picked.indexOf(copy.id) + 1}</span> : null}
                      {copy.featured ? <span className="absolute inset-0 grid place-items-center"><Shield className="size-5 text-white/80" /></span> : null}
                    </span>
                    <span className="mt-1.5 block truncate text-center text-[11px] text-white/60">{copy.name}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-[16px] bg-[#0f0f11] py-12 text-center">
              <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-[#e93748]/12 text-[#ff8a95]"><Layers className="size-5" /></span>
              <p className="mt-3 text-sm text-white/50">{pool.length ? "ასეთი ქარდი ვერ მოიძებნა." : "S ან S+ ქარდი ჯერ არ გაქვს."}</p>
              {pool.length ? null : <a href="/packs" className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#e93748] px-4 text-sm font-medium text-white transition hover:bg-[#f04656]"><Package className="size-4" /> პაკების გახსნა</a>}
            </div>
          )}
          <Pager page={current} pages={pages} onPick={go} />
          <p className="mt-3 text-[11px] text-white/35">სხვა რანგის ქარდის არჩევისას წინა არჩევანი იცვლება. ვიტრინის ქარდები დაბლოკილია.</p>
        </section>

        <aside className="album-rise rounded-[20px] bg-[#121214] p-4 sm:p-5 lg:sticky lg:top-24" style={{ "--delay": "240ms" } as React.CSSProperties}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2.5 text-base font-semibold"><span className="grid size-7 place-items-center rounded-lg bg-white/[0.05] text-xs text-white/55">02</span> მასალები</h2>
            {chosen.length ? <button type="button" aria-label="გასუფთავება" onClick={() => setPicked([])} className="grid size-8 cursor-pointer place-items-center rounded-lg bg-white/[0.05] text-white/60 transition hover:bg-[#e93748] hover:text-white"><X className="size-4" /></button> : null}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((slot) => {
              const copy = chosen[slot];
              return copy ? (
                <button key={copy.id} type="button" title={copy.name} onClick={() => toggle(copy)} className="brick-pop group relative block cursor-pointer overflow-hidden rounded-[10px]">
                  <span className="block aspect-[2/3] bg-[#1a1a1a]">{copy.image && !/\.(webm|mp4)(\?|$)/i.test(copy.image) ? <img src={copy.image} alt={copy.name} className="h-full w-full object-cover" /> : null}</span>
                  <span className="absolute inset-0 grid place-items-center bg-black/0 text-transparent transition group-hover:bg-black/55 group-hover:text-white"><X className="size-4" /></span>
                </button>
              ) : (
                <span key={`slot-${slot}`} className="grid aspect-[2/3] place-items-center rounded-[10px] bg-[#0f0f11] text-white/20"><Plus className="size-5" /></span>
              );
            })}
          </div>

          <div className="mt-4 grid gap-2 rounded-[14px] bg-[#0f0f11] p-3.5 text-xs">
            <div className="flex items-center justify-between"><span className="text-white/45">არჩეულია</span><b className="font-semibold">{chosen.length} / 3</b></div>
            <div className="flex items-center justify-between"><span className="text-white/45">მიიღებ</span><b className="font-semibold" style={{ color: target ? tone[target] : undefined }}>{target ? `შემთხვევით ${target} ქარდს` : "—"}</b></div>
            <div className="flex items-center justify-between"><span className="text-white/45">ჯილდო</span><b className="font-semibold">+200 / +40 მონეტა</b></div>
            <div className="flex items-center justify-between"><span className="text-white/45">ენერგია</span><b className={`font-semibold ${ready ? "" : "text-[#ff8a95]"}`}>{energy} / {brickCap}</b></div>
          </div>

          <p className="mt-3 flex gap-2 rounded-[12px] bg-white/[0.04] px-3 py-2.5 text-[11px] leading-5 text-white/55"><CircleHelp className="mt-0.5 size-3.5 shrink-0" /> არჩეული ქარდები ნებისმიერ შემთხვევაში იწვება.</p>

          <button type="button" disabled={!canStart} onClick={start} className="mt-4 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#e93748] text-sm font-medium text-white transition hover:bg-[#f04656] disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-white/40">
            <Zap className="size-4" /> {busy ? "იღვიძებს..." : "გამოღვიძების დაწყება"}
          </button>
        </aside>
        {show ? <AwakenShow show={show} energy={energy} onClose={() => setShow(null)} /> : null}
      </div>

      <section className="album-rise rounded-[16px] bg-[#121214]" style={{ "--delay": "300ms" } as React.CSSProperties}>
        <button type="button" onClick={() => setRulesOpen((value) => !value)} className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left text-sm font-medium">
          წესები და ჯილდოები
          <ChevronDown className={`size-4 text-white/50 transition ${rulesOpen ? "rotate-180" : ""}`} />
        </button>
        {rulesOpen ? (
          <div className="grid gap-2 px-5 pb-5 text-sm text-white/60">
            <p>• სამი S ქარდი იძლევა შემთხვევით S+ ქარდს, სამი S+ ქარდი — შემთხვევით RE ქარდს.</p>
            <p>• შანსი 95%-ია. წარმატებისას იღებ ახალ ქარდს და 200 მონეტას, წარუმატებლობისას — 40 მონეტას.</p>
            <p>• ყოველი ცდა ციური აგურის 1000 ენერგიას ხარჯავს. არჩეული ქარდები ორივე შემთხვევაში იწვება.</p>
            <p>• RE ქარდის გამოღვიძება შეუძლებელია. ვიტრინაში და მარკეტზე დადებული ქარდები ვერ გამოიყენება.</p>
          </div>
        ) : null}
      </section>

      <a href="/cards/mine/skybrick" className="mx-auto inline-flex items-center gap-1 text-xs text-white/45 transition hover:text-white">ციური აგურის ენერგიის შევსება <ArrowUpRight className="size-3.5" /></a>
    </div>
  );
}

const brickRate: Record<string, number> = { E: 1, D: 1, C: 1, B: 2, A: 3, S: 8, "S+": 15, RE: 25 };
const brickRanks = ["E", "D", "C", "B", "A", "S", "S+", "RE"];
const brickCap = 1000;
const brickPick = 70;
const brickPerPage = 48;
const brickSorts = [
  ["new", "ახალი მიღებული"],
  ["old", "ძველი მიღებული"],
  ["rank", "რანგით"],
  ["energy", "ენერგიით"],
  ["name", "სახელით"],
] as const;

const crystalFaces = {
  body: "[clip-path:polygon(50%_0,100%_22%,100%_78%,50%_100%,0_78%,0_22%)]",
  left: "[clip-path:polygon(50%_0,50%_100%,0_78%,0_22%)]",
  right: "[clip-path:polygon(50%_0,100%_22%,100%_78%,50%_100%)]",
  base: "[clip-path:polygon(0_78%,50%_62%,100%_78%,50%_100%)]",
  top: "[clip-path:polygon(50%_0,100%_22%,50%_38%,0_22%)]",
};

function Crystal({ tint }: { tint: "glass" | "red" }) {
  const red = tint === "red";
  return (
    <>
      <span className={`absolute inset-0 bg-linear-to-b ${red ? "from-[#ff8a95] via-[#e93748] to-[#8f1d2a]" : "from-white/[0.16] via-white/[0.09] to-white/[0.04]"} ${crystalFaces.body}`} />
      <span className={`absolute inset-0 bg-linear-to-br ${red ? "from-white/45 to-white/5" : "from-white/[0.14] to-white/[0.02]"} ${crystalFaces.left}`} />
      <span className={`absolute inset-0 ${red ? "bg-[#5c0f19]/25" : "bg-black/[0.12]"} ${crystalFaces.right}`} />
      <span className={`absolute inset-0 ${red ? "bg-black/20" : "bg-black/[0.18]"} ${crystalFaces.base}`} />
      <span className={`absolute inset-0 ${red ? "bg-white/35" : "bg-white/[0.12]"} ${crystalFaces.top}`} />
    </>
  );
}

function SkyBrick({ data }: { data: PlayData }) {
  const [rank, setRank] = useState("");
  const [sort, setSort] = useState<string>("new");
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [hideLocked, setHideLocked] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const energy = Math.min(brickCap, data.energy);
  const [filled, setFilled] = useState(0);
  const rate = (rarity: string) => brickRate[rarity.toUpperCase()] ?? 1;
  const text = search.trim().toLowerCase();
  const list = data.copies
    .filter((copy) => !rank || copy.rarity.toUpperCase() === rank)
    .filter((copy) => !hideLocked || !copy.featured)
    .filter((copy) => !text || copy.name.toLowerCase().includes(text))
    .sort((a, b) => {
      if (sort === "old") return a.id - b.id;
      if (sort === "rank") return brickRanks.indexOf(b.rarity.toUpperCase()) - brickRanks.indexOf(a.rarity.toUpperCase()) || b.id - a.id;
      if (sort === "energy") return rate(b.rarity) - rate(a.rarity) || b.id - a.id;
      if (sort === "name") return a.name.localeCompare(b.name, "ka");
      return b.id - a.id;
    });
  const pages = Math.max(1, Math.ceil(list.length / brickPerPage));
  const current = Math.min(page, pages);
  const visible = list.slice((current - 1) * brickPerPage, current * brickPerPage);
  const chosen = picked.map((id) => data.copies.find((copy) => copy.id === id)).filter((copy): copy is PlayData["copies"][number] => Boolean(copy));
  const gain = chosen.reduce((sum, copy) => sum + rate(copy.rarity), 0);
  const after = Math.min(brickCap, energy + gain);
  const wasted = energy + gain - after;
  const counts = brickRanks.map((key) => [key, data.copies.filter((copy) => copy.rarity.toUpperCase() === key).length] as const).filter(([, n]) => n > 0);
  const chip = "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition";

  useEffect(() => {
    const timer = window.setTimeout(() => setFilled(energy), 250);
    return () => window.clearTimeout(timer);
  }, [energy]);

  function toggle(id: number) {
    setPicked((items) => items.includes(id) ? items.filter((item) => item !== id) : items.length >= brickPick ? items : [...items, id]);
  }

  function pickPage() {
    const open = visible.filter((copy) => !copy.featured).map((copy) => copy.id);
    const allOn = open.length > 0 && open.every((id) => picked.includes(id));
    setPicked((items) => allOn ? items.filter((id) => !open.includes(id)) : [...items, ...open.filter((id) => !items.includes(id))].slice(0, brickPick));
  }

  function go(next: number) {
    setPage(next);
    const node = document.getElementById("brick-cards");
    if (node) window.scrollTo({ top: Math.max(0, node.getBoundingClientRect().top + window.scrollY - 88), behavior: "smooth" });
  }

  return (
    <div className="grid gap-5">
      <section className="album-rise relative overflow-hidden rounded-[20px] bg-linear-to-br from-[#1b1418] via-[#141215] to-[#121214] p-5 sm:p-7">
        <span className="album-ring pointer-events-none absolute top-1/2 -right-40 size-[520px] -translate-y-1/2 rounded-full border-[46px] border-white/[0.025]" />
        <span className="album-ring pointer-events-none absolute top-1/2 -right-16 size-[300px] -translate-y-1/2 rounded-full border-[28px] border-white/[0.02]" />
        <span className="pointer-events-none absolute -top-24 left-1/4 size-72 rounded-full bg-[#e93748]/8 blur-[90px]" />

        <div className="relative flex flex-wrap items-center gap-8">
          <div className="relative grid h-[190px] w-[220px] shrink-0 place-items-center max-sm:mx-auto">
            <span className="absolute transition-opacity duration-[1600ms]" style={{ opacity: 0.1 + (filled / brickCap) * 0.9 }}>
              <span className="brick-glow block size-36 rounded-full bg-[#e93748]/30 blur-[50px]" />
            </span>
            <span className="absolute h-10 w-48 rounded-[50%] bg-white/[0.04] blur-[2px]" style={{ transform: "translateY(70px)" }} />
            <span className="brick-float relative block h-[150px] w-[100px]">
              <Crystal tint="glass" />
              {after > energy ? (
                <span className="absolute inset-x-0 bottom-0 overflow-hidden opacity-45 transition-[height] duration-500 ease-out" style={{ height: `${(after / brickCap) * 100}%` }}>
                  <span className="absolute inset-x-0 bottom-0 block h-[150px]"><Crystal tint="red" /></span>
                </span>
              ) : null}
              <span className={`absolute inset-0 ${crystalFaces.body}`}>
                <span className="absolute inset-x-0 bottom-0 transition-[height] duration-[1600ms] ease-out" style={{ height: `${(filled / brickCap) * 100}%` }}>
                  <span className="absolute inset-0 overflow-hidden">
                    <span className="absolute inset-x-0 bottom-0 block h-[150px]"><Crystal tint="red" /></span>
                    {filled > 0 ? [18, 46, 70].map((left, index) => (
                      <span key={left} className="brick-bubble absolute bottom-1 size-1.5 rounded-full bg-white/60" style={{ left: `${left}%`, "--delay": `${index * 1.1}s` } as React.CSSProperties} />
                    )) : null}
                  </span>
                {energy > 0 && energy < brickCap ? (
                  <span className="absolute inset-x-0 bottom-full h-3 translate-y-[3px] transition-opacity duration-500" style={{ opacity: filled > 0 ? 1 : 0 }}>
                    <svg className="brick-wave absolute bottom-0 left-0 h-full w-[200%] opacity-50" style={{ animationDuration: "5s", animationDirection: "reverse" }} viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden>
                      <path d="M0 6 Q12.5 0 25 6 T50 6 T75 6 T100 6 T125 6 T150 6 T175 6 T200 6 V12 H0Z" fill="#ff8a95" />
                    </svg>
                    <svg className="brick-wave absolute bottom-0 left-0 h-full w-[200%]" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden>
                      <path d="M0 7 Q12.5 2 25 7 T50 7 T75 7 T100 7 T125 7 T150 7 T175 7 T200 7 V12 H0Z" fill="#f04656" />
                    </svg>
                  </span>
                ) : null}
                </span>
              </span>
            </span>
          </div>

          <div className="min-w-[260px] flex-1">
            <p className="flex items-center gap-1.5 text-xs font-medium text-[#ff8a95]"><Zap className="size-3.5" /> გამოღვიძების ენერგია</p>
            <h1 className="mt-2 text-[26px] leading-tight font-semibold tracking-tight sm:text-[32px]">ციური აგური</h1>
            <p className="mt-1 max-w-[520px] text-sm text-white/45">ზედმეტ ქარდებს ახალი დანიშნულება მიეცი: გადააქციე ენერგიად და დატენე აგური გამოღვიძებისთვის.</p>

            <div className="mt-6 flex flex-wrap items-end justify-between gap-2">
              <p className="text-sm text-white/55">ენერგიის მარაგი</p>
              <p className="text-sm text-white/45"><b className="mr-1 text-[26px] leading-none font-semibold text-white">{energy}</b>/ {brickCap}</p>
            </div>
            <div className="relative mt-2.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <span className="album-fill absolute inset-y-0 left-0 rounded-full bg-[#e93748]" style={{ width: `${(energy / brickCap) * 100}%`, "--delay": "200ms" } as React.CSSProperties} />
              {gain ? <span className="absolute inset-y-0 rounded-full bg-[#e93748]/40 transition-all duration-300" style={{ left: `${(energy / brickCap) * 100}%`, width: `${((after - energy) / brickCap) * 100}%` }} /> : null}
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-white/40">
              <span>{energy >= brickCap ? "აგური სავსეა — გამოღვიძება ხელმისაწვდომია" : `ცდამდე დარჩა ${brickCap - energy}`}</span>
              <span>გამოღვიძების ცდა: <b className="font-semibold text-white">{Math.floor(energy / brickCap)}</b></span>
            </div>
          </div>
        </div>
      </section>

      <div className="album-rise flex flex-wrap items-center gap-2 text-xs text-white/45" style={{ "--delay": "60ms" } as React.CSSProperties}>
        <span className="mr-1">ენერგიის კურსი</span>
        {brickRanks.map((key) => (
          <span key={key} className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-[#121214] px-2.5">
            <b style={{ color: tone[key] }}>{key}</b><span className="text-white/60">+{brickRate[key]}</span>
          </span>
        ))}
        <span className="ml-1">{brickCap} ენერგია = 1 ცდა. მაქსიმუმ {brickCap} ინახება.</span>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section id="brick-cards" className="album-rise rounded-[20px] bg-[#121214] p-4 sm:p-5" style={{ "--delay": "100ms" } as React.CSSProperties}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2.5 text-base font-semibold"><span className="grid size-7 place-items-center rounded-lg bg-white/[0.05] text-xs text-white/55">01</span> შენი ქარდები <span className="text-sm font-normal text-white/35">{data.copies.length}</span></h2>
            <span className="text-xs text-white/35">დააკლიკე ქარდს, რომ აირჩიო</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex flex-wrap gap-1 rounded-xl bg-[#0f0f11] p-1">
              <button type="button" onClick={() => { setRank(""); setPage(1); }} className={`${chip} ${rank ? "text-white/60 hover:bg-white/[0.06] hover:text-white" : "bg-[#e93748] text-white"}`}>ყველა</button>
              {counts.map(([key, n]) => (
                <button key={key} type="button" onClick={() => { setRank(rank === key ? "" : key); setPage(1); }} className={`${chip} ${rank === key ? "bg-[#e93748] text-white" : "text-white/60 hover:bg-white/[0.06] hover:text-white"}`}>
                  <span style={{ color: rank === key ? undefined : tone[key] }}>{key}</span><span className={`text-[10px] ${rank === key ? "text-white/75" : "text-white/35"}`}>{n}</span>
                </button>
              ))}
            </span>
            <span className="inline-flex gap-2">
              <AlbumAction label={hideLocked ? "ვიტრინის ქარდების ჩვენება" : "ვიტრინის ქარდების დამალვა"} active={hideLocked} onClick={() => { setHideLocked((value) => !value); setPage(1); }}><Shield className="size-4" /></AlbumAction>
              <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} className="h-9 cursor-pointer rounded-lg border-0 bg-[#1a1a1a] px-3 text-xs text-[#d1d5dc] outline-none">
                {brickSorts.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </span>
          </div>

          <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); setSearch(draft); setPage(1); }}>
            <label className="flex h-9 flex-1 items-center gap-2 rounded-lg bg-[#1a1a1a] px-3">
              <Search className="size-4 text-white/40" />
              <input value={draft} onChange={(event) => { setDraft(event.target.value); if (!event.target.value) setSearch(""); }} placeholder="პერსონაჟის სახელი" className="w-full bg-transparent text-xs outline-none placeholder:text-white/30" />
            </label>
            <button className="h-9 cursor-pointer rounded-lg bg-[#e93748] px-4 text-xs font-medium text-white transition hover:bg-[#f04656]">ძებნა</button>
          </form>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={pickPage} disabled={!visible.length} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#1a1a1a] px-3 text-xs text-white/75 transition hover:bg-[#222225] hover:text-white disabled:opacity-40"><Check className="size-3.5" /> გვერდზე ყველას არჩევა</button>
            {picked.length ? <button type="button" onClick={() => setPicked([])} className="cursor-pointer text-xs text-white/45 transition hover:text-white">არჩევის გასუფთავება</button> : null}
          </div>

          {visible.length ? (
            <div key={`${current}-${rank}-${sort}-${text}-${hideLocked}`} className="card-grid mt-4 grid grid-cols-3 gap-2.5 min-[560px]:grid-cols-4 min-[900px]:grid-cols-6 min-[1280px]:grid-cols-8">
              {visible.map((copy) => {
                const on = picked.includes(copy.id);
                const moving = /\.(webm|mp4)(\?|$)/i.test(copy.image);
                const key = copy.rarity.toUpperCase();
                return (
                  <button key={copy.id} type="button" disabled={copy.featured} title={copy.featured ? `${copy.name} — ვიტრინაშია` : copy.name} onClick={() => toggle(copy.id)} className="group relative block cursor-pointer text-left disabled:cursor-not-allowed">
                    <span className={`relative block aspect-[2/3] overflow-hidden rounded-[10px] bg-[#1a1a1a] shadow-[0_10px_22px_rgba(0,0,0,0.35)] transition duration-300 ${copy.featured ? "opacity-40" : "group-hover:-translate-y-1"} ${on ? "ring-2 ring-[#e93748] ring-offset-2 ring-offset-[#121214]" : ""}`}>
                      {copy.image && moving ? <video src={copy.image} autoPlay muted loop playsInline className="h-full w-full object-cover" /> : null}
                      {copy.image && !moving ? <img src={copy.image} alt={copy.name} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : null}
                      <span className="absolute top-1.5 left-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold" style={{ color: tone[key] ?? "#fff" }}>{key}</span>
                      <span className={`absolute top-1.5 right-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${on ? "bg-[#e93748] text-white" : "bg-black/70 text-white/85"}`}>+{rate(key)}</span>
                      {on ? <span className="absolute inset-0 bg-[#e93748]/15" /> : null}
                      {on ? <span className="brick-pop absolute bottom-1.5 left-1/2 grid size-6 -translate-x-1/2 place-items-center rounded-full bg-[#e93748] text-white"><Check className="size-3.5" strokeWidth={3} /></span> : null}
                      {copy.featured ? <span className="absolute inset-0 grid place-items-center"><Shield className="size-5 text-white/80" /></span> : null}
                    </span>
                    <span className="mt-1.5 block truncate text-center text-[11px] text-white/60">{copy.name}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-[16px] bg-[#0f0f11] py-12 text-center">
              <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-[#e93748]/12 text-[#ff8a95]"><Layers className="size-5" /></span>
              <p className="mt-3 text-sm text-white/50">{data.copies.length ? "ასეთი ქარდი ვერ მოიძებნა." : "დასაწვავი ქარდი არ გაქვს."}</p>
              {data.copies.length ? null : <a href="/packs" className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#e93748] px-4 text-sm font-medium text-white transition hover:bg-[#f04656]"><Package className="size-4" /> პაკების გახსნა</a>}
            </div>
          )}
          <Pager page={current} pages={pages} onPick={go} />
        </section>

        <aside className="album-rise rounded-[20px] bg-[#121214] p-4 sm:p-5 lg:sticky lg:top-24" style={{ "--delay": "160ms" } as React.CSSProperties}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2.5 text-base font-semibold"><span className="grid size-7 place-items-center rounded-lg bg-white/[0.05] text-xs text-white/55">02</span> ენერგიად</h2>
            <span className="text-xs text-white/35">მაქს. {brickPick} ქარდი</span>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-[14px] bg-[#0f0f11] px-3.5 py-3">
            <span>
              <span className="block text-sm font-medium">არჩეულია: {chosen.length} / {brickPick}</span>
              <span className="block text-[11px] text-white/40">ამოსაშლელად დააკლიკე ქარდს</span>
            </span>
            {chosen.length ? <button type="button" aria-label="გასუფთავება" onClick={() => setPicked([])} className="grid size-8 cursor-pointer place-items-center rounded-lg bg-white/[0.05] text-white/60 transition hover:bg-[#e93748] hover:text-white"><X className="size-4" /></button> : null}
          </div>

          {chosen.length ? (
            <div className="mt-3 grid max-h-[248px] grid-cols-5 gap-1.5 overflow-y-auto rounded-[14px] bg-[#0f0f11] p-2">
              {chosen.map((copy) => (
                <button key={copy.id} type="button" title={copy.name} onClick={() => toggle(copy.id)} className="brick-pop group relative block cursor-pointer overflow-hidden rounded-md">
                  <span className="block aspect-[2/3] bg-[#1a1a1a]">{copy.image && !/\.(webm|mp4)(\?|$)/i.test(copy.image) ? <img src={copy.image} alt={copy.name} className="h-full w-full object-cover" /> : null}</span>
                  <span className="absolute inset-0 grid place-items-center bg-black/0 text-transparent transition group-hover:bg-black/55 group-hover:text-white"><X className="size-4" /></span>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-3 grid place-items-center rounded-[14px] bg-[#0f0f11] px-4 py-9 text-center">
              <span className="grid size-10 place-items-center rounded-xl bg-white/[0.05] text-white/50"><Layers className="size-4" /></span>
              <span className="mt-2.5 text-sm font-medium">აირჩიე ქარდები</span>
              <span className="mt-1 text-[11px] text-white/40">ისინი აქ გამოჩნდება. ენერგია დაწვის შემდეგ დაგერიცხება.</span>
            </div>
          )}

          <div className="mt-4 grid gap-2 text-xs">
            <div className="flex items-center justify-between"><span className="text-white/45">მიიღებ</span><b className="text-[24px] leading-none font-semibold text-[#ff8a95]">+{gain}</b></div>
            <div className="flex items-center justify-between"><span className="text-white/45">ენერგია დაწვის შემდეგ</span><b className="font-semibold text-white">{after}</b></div>
            <div className="flex items-center justify-between"><span className="text-white/45">გამოღვიძების ცდა</span><b className="font-semibold text-white">{Math.floor(after / brickCap)}</b></div>
          </div>

          {wasted > 0 ? <p className="mt-3 rounded-[12px] bg-[#e93748]/10 px-3 py-2.5 text-[11px] leading-5 text-[#ff8a95]">აგური {brickCap}-ზე მეტს ვერ იტევს — {wasted} ენერგია დაიკარგება.</p> : null}
          {chosen.length ? <p className="mt-3 flex gap-2 rounded-[12px] bg-white/[0.04] px-3 py-2.5 text-[11px] leading-5 text-white/55"><CircleHelp className="mt-0.5 size-3.5 shrink-0" /> არჩეული ქარდები დაწვის შემდეგ სამუდამოდ გაქრება.</p> : null}

          <form action={burnCards} onSubmit={() => setBusy(true)} className="mt-4">
            <input type="hidden" name="back" value="/cards/mine/skybrick" />
            {chosen.map((copy) => <input key={copy.id} type="hidden" name="id" value={copy.id} />)}
            <button disabled={!chosen.length || busy} className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#e93748] text-sm font-medium text-white transition hover:bg-[#f04656] disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-white/40">
              <Zap className="size-4" /> {busy ? "იწვება..." : chosen.length ? `დაწვა · +${gain} ენერგია` : "აირჩიე ქარდები"}
            </button>
          </form>
          <a href="/awaken" className="mt-3 flex items-center justify-center gap-1 text-xs text-white/45 transition hover:text-white">გამოღვიძებაზე გადასვლა <ArrowUpRight className="size-3.5" /></a>
        </aside>
      </div>

      <p className="text-center text-xs text-white/35">ვიტრინაში გამოფენილი და გასაყიდად დადებული ქარდები ენერგიად ვერ გადაიქცევა.</p>
    </div>
  );
}

const mineCardsPerPage = 42;

function MineCards({ title, empty, cards: initial }: { title: string; empty: string; cards: PlayData["cards"] }) {
  const [all, setAll] = useState(initial);
  const [preview, setPreview] = useState<CardFace | null>(null);
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(all.length / mineCardsPerPage));
  const current = Math.min(page, pages);
  const cards = all.slice((current - 1) * mineCardsPerPage, current * mineCardsPerPage);

  function pick(next: number) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div>
      <h1 className="mb-6 text-center text-[22px] font-medium tracking-tight">{title}{all.length ? <span className="ml-2 text-sm font-normal text-white/40">{all.length}</span> : null}</h1>
      {cards.length ? (
        <div key={current} className="card-grid grid grid-cols-2 gap-3 min-[680px]:grid-cols-4 min-[1024px]:grid-cols-6 min-[1280px]:grid-cols-7">
          {cards.map((card) => {
            const moving = /\.(webm|mp4)(\?|$)/i.test(card.image);
            return (
              <button key={card.id} type="button" title={card.name} className="block w-full cursor-pointer" onClick={() => setPreview(card)}>
                <span className="relative block aspect-[2/3] overflow-hidden rounded-[10px] bg-[#101013]">
                  {card.image && moving ? <video src={card.image} autoPlay muted loop playsInline className="h-full w-full object-cover" /> : null}
                  {card.image && !moving ? <img src={card.image} alt={card.name} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : <p className="py-10 text-center text-sm text-white/45">{empty}</p>}
      <Pager page={current} pages={pages} onPick={pick} />
      {preview ? <CardPreview card={preview} onClose={() => setPreview(null)} onChange={(next) => { setPreview(next); setAll((items) => items.map((item) => item.id === next.id ? next : item)); }} /> : null}
    </div>
  );
}

const wishRanks = ["RE", "S+", "S", "A", "B", "C", "D", "E"];
const wishSorts = [
  ["new", "ახალი დამატებული"],
  ["old", "ძველი დამატებული"],
  ["rank", "რანგით"],
  ["name", "სახელით"],
] as const;
const wishPerPage = 63;

function Wishlist({ data }: { data: PlayData }) {
  const [cards, setCards] = useState(data.wishes);
  const [rank, setRank] = useState("");
  const [sort, setSort] = useState<string>("new");
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [hideOwned, setHideOwned] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState<Set<number>>(new Set());
  const [preview, setPreview] = useState<CardFace | null>(null);
  const text = search.trim().toLowerCase();
  const order = new Map(data.wishes.map((card, index) => [card.id, index]));
  const list = cards
    .filter((card) => !rank || card.rarity.toUpperCase() === rank)
    .filter((card) => !hideOwned || !card.owned)
    .filter((card) => !text || card.name.toLowerCase().includes(text) || card.anime.toLowerCase().includes(text))
    .sort((a, b) => {
      if (sort === "old") return (order.get(b.id) ?? 0) - (order.get(a.id) ?? 0);
      if (sort === "rank") return wishRanks.indexOf(a.rarity.toUpperCase()) - wishRanks.indexOf(b.rarity.toUpperCase());
      if (sort === "name") return a.name.localeCompare(b.name);
      return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
    });
  const pages = Math.max(1, Math.ceil(list.length / wishPerPage));
  const current = Math.min(page, pages);
  const visible = list.slice((current - 1) * wishPerPage, current * wishPerPage);
  const counts = new Map<string, number>();
  for (const card of cards) counts.set(card.rarity.toUpperCase(), (counts.get(card.rarity.toUpperCase()) ?? 0) + 1);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function reset() {
    setPage(1);
  }

  async function remove(ids: number[]) {
    if (!ids.length || busy) return;
    setBusy(true);
    setLeaving(new Set(ids));
    const response = await fetch("/api/cards/wish", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      setLeaving(new Set());
      setToast("ვერ წაიშალა, სცადე თავიდან.");
      return;
    }
    window.setTimeout(() => {
      const gone = new Set(ids);
      setCards((list) => list.filter((card) => !gone.has(card.id)));
      setPicked(new Set());
      setLeaving(new Set());
    }, 220);
    setToast(ids.length === 1 ? "ქარდი სურვილებიდან წაიშალა." : `${ids.length} ქარდი სურვილებიდან წაიშალა.`);
  }

  function toggle(id: number) {
    setPicked((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function pick(next: number) {
    setPage(next);
    const node = document.getElementById("wish-top");
    if (node) window.scrollTo({ top: Math.max(0, node.getBoundingClientRect().top + window.scrollY - 88), behavior: "smooth" });
  }

  const allPicked = visible.length > 0 && visible.every((card) => picked.has(card.id));

  return (
    <div id="wish-top" className="grid gap-4">
      {toast && typeof document !== "undefined"
        ? createPortal(
            <div className="album-toast fixed top-20 right-5 z-[90] flex max-w-[340px] items-start gap-3 rounded-[14px] bg-[#1a1a1d] px-4 py-3 text-sm text-white/85 shadow-[0_18px_40px_rgba(0,0,0,0.55)]">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#e93748]/15 text-[#ff8a95]"><Check className="size-3.5" /></span>
              <span className="flex-1 leading-5">{toast}</span>
              <button type="button" aria-label="დახურვა" className="cursor-pointer text-white/40 transition hover:text-white" onClick={() => setToast("")}><X className="size-4" /></button>
            </div>,
            document.body,
          )
        : null}
      {preview ? <CardPreview card={preview} onClose={() => setPreview(null)} onChange={(next) => { setPreview(next); setCards((items) => items.map((item) => item.id === next.id ? next : item)); }} /> : null}

      <section className="album-rise rounded-[20px] bg-[#121214] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <button type="button" onClick={() => { setRank(""); reset(); }} className={`filter-trigger inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs ${!rank ? "is-on" : "bg-white/[0.05] text-[#d1d5dc] hover:text-white"}`}>
            ყველა <span className="opacity-60">{cards.length}</span>
          </button>
          {wishRanks.filter((item) => counts.get(item)).map((item) => (
            <button key={item} type="button" onClick={() => { setRank((value) => (value === item ? "" : item)); reset(); }} className={`filter-trigger inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold ${rank === item ? "is-on" : "bg-white/[0.05] text-[#d1d5dc] hover:text-white"}`}>
              {item} <span className="font-normal opacity-60">{counts.get(item)}</span>
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-white/10" />
          <AlbumAction label={hideOwned ? "ყველას ჩვენება" : "რაც უკვე მაქვს, დამალვა"} onClick={() => { setHideOwned((value) => !value); reset(); }} active={hideOwned}><Check className="size-4" /></AlbumAction>
          <AlbumAction label={selecting ? "მონიშვნის გაუქმება" : "რამდენიმეს მონიშვნა"} onClick={() => { setSelecting((value) => !value); setPicked(new Set()); }} active={selecting}><LayoutGrid className="size-4" /></AlbumAction>
          <select value={sort} onChange={(event) => { setSort(event.target.value); reset(); }} className="h-9 cursor-pointer rounded-lg border-0 bg-white/[0.05] px-3 text-xs text-[#d1d5dc] outline-none">
            {wishSorts.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
        <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); setSearch(draft); reset(); }}>
          <input value={draft} onChange={(event) => { setDraft(event.target.value); if (!event.target.value) { setSearch(""); reset(); } }} placeholder="ქარდის ან ანიმეს სახელი" className="h-10 min-w-0 flex-1 rounded-lg bg-white/[0.04] px-3.5 text-sm outline-none placeholder:text-white/30 focus:bg-white/[0.06]" />
          <button type="submit" aria-label="ძებნა" className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg bg-[#e93748] text-white transition hover:bg-[#f04656]"><Search className="size-4" /></button>
        </form>
        {selecting ? (
          <div className="album-rise mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-white/60">
            <span>მონიშნულია <b className="font-semibold text-white">{picked.size}</b> ქარდი</span>
            <span className="flex gap-2">
              <button type="button" className="h-8 cursor-pointer rounded-lg bg-white/[0.06] px-3 text-white/80 transition hover:bg-white/[0.1] hover:text-white" onClick={() => setPicked(allPicked ? new Set() : new Set(visible.map((card) => card.id)))}>{allPicked ? "მონიშვნის მოხსნა" : "გვერდის მონიშვნა"}</button>
              <button type="button" disabled={!picked.size || busy} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#e93748] px-3 font-medium text-white transition hover:bg-[#f04656] disabled:cursor-not-allowed disabled:opacity-40" onClick={() => remove([...picked])}>
                <X className="size-3.5" /> წაშლა
              </button>
            </span>
          </div>
        ) : null}
      </section>

      <section className="album-rise rounded-[20px] bg-[#121214] p-4 sm:p-5" style={{ "--delay": "80ms" } as React.CSSProperties}>
        {visible.length ? (
          <div key={`${current}-${rank}-${sort}-${text}-${hideOwned}`} className="card-grid grid grid-cols-2 gap-3 min-[520px]:grid-cols-3 min-[760px]:grid-cols-5 min-[1024px]:grid-cols-6 min-[1280px]:grid-cols-7">
            {visible.map((card) => {
              const moving = /\.(webm|mp4)(\?|$)/i.test(card.image);
              const on = picked.has(card.id);
              const body = (
                <span className={`relative block aspect-[2/3] overflow-hidden rounded-[10px] bg-[#1a1a1a] shadow-[0_10px_24px_rgba(0,0,0,0.35)] transition duration-300 ${selecting ? "" : "group-hover:-translate-y-1"} ${on ? "ring-2 ring-[#e93748] ring-offset-2 ring-offset-[#121214]" : ""}`}>
                  {card.image && moving ? <video src={card.image} autoPlay muted loop playsInline className="h-full w-full object-cover" /> : null}
                  {card.image && !moving ? <img src={card.image} alt={card.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" /> : null}
                  {selecting ? <span className={`absolute inset-0 transition ${on ? "bg-[#e93748]/15" : "bg-black/0 group-hover:bg-black/20"}`} /> : null}
                </span>
              );
              return (
                <div key={card.id} className={`group relative transition duration-200 ${leaving.has(card.id) ? "scale-90 opacity-0" : ""}`}>
                  {selecting ? (
                    <button type="button" className="block w-full cursor-pointer text-left" onClick={() => toggle(card.id)} aria-pressed={on}>{body}</button>
                  ) : (
                    <button type="button" title={card.name} className="block w-full cursor-pointer text-left" onClick={() => setPreview(card)}>{body}</button>
                  )}
                  {selecting ? (
                    <span className={`pointer-events-none absolute top-2 right-2 grid size-6 place-items-center rounded-full transition ${on ? "bg-[#e93748] text-white" : "bg-black/60 text-transparent"}`}><Check className="size-3.5" strokeWidth={3} /></span>
                  ) : (
                    <button type="button" aria-label="სურვილებიდან წაშლა" title="სურვილებიდან წაშლა" disabled={busy} onClick={() => remove([card.id])} className="absolute top-2 right-2 grid size-7 cursor-pointer place-items-center rounded-lg bg-black/65 text-white/80 opacity-100 transition hover:bg-[#e93748] hover:text-white sm:opacity-0 sm:group-hover:opacity-100">
                      <X className="size-4" />
                    </button>
                  )}
                  {card.owned ? <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white"><Check className="size-3" /> გაქვს</span> : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-14 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#e93748]/12 text-[#ff8a95]"><Leaf className="size-5" /></span>
            <p className="mt-3 text-sm text-white/55">{cards.length ? "ამ ფილტრით ქარდი ვერ მოიძებნა." : "სურვილების სია ცარიელია."}</p>
            {!cards.length ? <a href="/cards" className="mt-4 inline-flex h-9 items-center rounded-lg bg-[#e93748] px-4 text-sm font-medium text-white transition hover:bg-[#f04656]">ქარდების კატალოგი</a> : null}
          </div>
        )}
        <Pager page={current} pages={pages} onPick={pick} />
      </section>
    </div>
  );
}

const progressSorts = [
  ["progress", "პროგრესით"],
  ["owned", "მეტი ქარდით"],
  ["near", "დასრულებასთან ახლოს"],
  ["name", "სახელით"],
  ["size", "ზომით"],
] as const;
const progressPerPage = 10;

function ProgressBar({ owned, total, delay = 0 }: { owned: number; total: number; delay?: number }) {
  const segments = Math.min(Math.max(total, 1), 20);
  const filled = total ? Math.round((owned / total) * segments) : 0;
  return (
    <span className="flex flex-1 gap-1">
      {Array.from({ length: segments }, (_, index) => (
        <span key={index} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
          {index < filled ? <span className="album-fill block h-full rounded-full bg-linear-to-r from-[#e93748] to-[#ff7a87]" style={{ "--delay": `${delay + index * 35}ms` } as React.CSSProperties} /> : null}
        </span>
      ))}
    </span>
  );
}

function Progress({ data }: { data: PlayData }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<string>("progress");
  const [hideDone, setHideDone] = useState(false);
  const [page, setPage] = useState(1);
  const [infoOpen, setInfoOpen] = useState(false);
  const decks = data.progress.map((deck) => {
    const owned = deck.cards.filter((card) => card.owned > 0).length;
    const total = deck.cards.length;
    return { ...deck, owned, total, share: total ? owned / total : 0 };
  });
  const collected = new Set(data.progress.flatMap((deck) => deck.cards.filter((card) => card.owned > 0).map((card) => card.id))).size;
  const allCards = decks.reduce((sum, deck) => sum + deck.total, 0);
  const finished = decks.filter((deck) => deck.total > 0 && deck.owned >= deck.total).length;
  const started = decks.filter((deck) => deck.owned > 0).length;
  const overall = allCards ? Math.round((collected / allCards) * 100) : 0;
  const text = search.trim().toLowerCase();
  const list = decks
    .filter((deck) => !text || deck.title.toLowerCase().includes(text))
    .filter((deck) => !hideDone || deck.owned < deck.total)
    .sort((a, b) => {
      if (sort === "near") return (a.total - a.owned || 999) - (b.total - b.owned || 999);
      if (sort === "owned") return b.owned - a.owned || b.share - a.share;
      if (sort === "name") return a.title.localeCompare(b.title, "ka");
      if (sort === "size") return b.total - a.total;
      return b.share - a.share || b.owned - a.owned;
    });
  const pages = Math.max(1, Math.ceil(list.length / progressPerPage));
  const current = Math.min(page, pages);
  const visible = list.slice((current - 1) * progressPerPage, current * progressPerPage);
  const backs = [-14, -5, 5, 14];

  function pick(next: number) {
    setPage(next);
    const node = document.getElementById("progress-list");
    if (node) window.scrollTo({ top: Math.max(0, node.getBoundingClientRect().top + window.scrollY - 88), behavior: "smooth" });
  }

  return (
    <div className="grid gap-5">
      <section className="album-rise relative overflow-hidden rounded-[20px] bg-linear-to-br from-[#1b1418] via-[#141215] to-[#121214] p-5 sm:p-7">
        <span className="album-ring pointer-events-none absolute top-1/2 -right-40 size-[520px] -translate-y-1/2 rounded-full border-[46px] border-white/[0.025]" />
        <span className="album-ring pointer-events-none absolute top-1/2 -right-16 size-[300px] -translate-y-1/2 rounded-full border-[28px] border-white/[0.02]" />
        <span className="pointer-events-none absolute -top-24 left-1/4 size-72 rounded-full bg-[#e93748]/8 blur-[90px]" />

        <div className="relative flex flex-wrap items-center gap-7">
          <div className="relative h-[190px] w-[220px] shrink-0 max-sm:mx-auto">
            {backs.map((angle, index) => (
              <span key={angle} className="album-rise absolute inset-0" style={{ zIndex: index, "--delay": `${index * 70}ms` } as React.CSSProperties}>
                <img src="/card-mm.png" alt="" className="absolute top-1/2 left-1/2 h-[150px] w-[100px] rounded-[12px] object-cover shadow-[0_16px_32px_rgba(0,0,0,0.5)]" style={{ transform: `translate(calc(-50% + ${angle * 2.6}px), -50%) rotate(${angle}deg)` }} />
              </span>
            ))}
          </div>

          <div className="min-w-[250px] flex-1">
            <p className="flex items-center gap-1.5 text-xs font-medium text-[#ff8a95]"><Sparkles className="size-3.5" /> ჩემი ქარდები</p>
            <h1 className="mt-2 text-[26px] leading-tight font-semibold tracking-tight sm:text-[32px]">კოლექციების პროგრესი</h1>
            <p className="mt-1 max-w-[480px] text-sm text-white/45">ანიმეები, რომელთა ქარდებიც გაქვს: რამდენი შეაგროვე და რამდენი დაგრჩა.</p>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-white/55">საერთო პროგრესი <b className="ml-1 font-semibold text-white">{allCards}-დან {collected}</b></p>
              <span className="w-11 text-right text-sm font-semibold text-[#ff8a95]">{overall}%</span>
            </div>
            <div className="mt-2.5 flex items-center">
              <ProgressBar owned={collected} total={allCards} delay={200} />
            </div>

            <div className="mt-5 grid gap-2.5 min-[560px]:grid-cols-3">
              {([
                ["უნიკალური ქარდი", collected, Layers],
                ["ანიმე", started, LayoutGrid],
                ["სრულად შეგროვებული", finished, Trophy],
              ] as const).map(([label, value, Icon], index) => (
                <div key={label} className="album-rise flex items-center gap-3 rounded-[14px] bg-white/[0.035] px-4 py-3" style={{ "--delay": `${160 + index * 70}ms` } as React.CSSProperties}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e93748]/12 text-[#ff8a95]"><Icon className="size-4" /></span>
                  <span>
                    <span className="block text-[11px] text-white/40">{label}</span>
                    <span className="block text-lg leading-tight font-semibold text-white">{value}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mt-6 rounded-[14px] bg-white/[0.03]">
          <button type="button" className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left" onClick={() => setInfoOpen((value) => !value)}>
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e93748]/12 text-[#ff8a95]"><CircleHelp className="size-4" /></span>
            <span className="flex-1">
              <span className="block text-sm font-medium text-white/90">როგორ მუშაობს პროგრესი</span>
              <span className="block text-xs text-white/45">ჩანს ანიმეები, რომლებსაც 10 ან მეტი ქარდი აქვს</span>
            </span>
            <ChevronDown className={`size-4 text-white/40 transition-transform ${infoOpen ? "rotate-180" : ""}`} />
          </button>
          {infoOpen ? <p className="album-rise px-4 pb-4 pl-16 text-sm leading-6 text-white/55">თითოეულ ანიმეზე წერია, რამდენი ქარდიდან რამდენი შეაგროვე, და ჩანს შენი ქარდები. „კოლექციის ნახვაზე“ დაჭერით ნახავ შეგროვებულ და დარჩენილ ქარდებს. როცა ანიმეს ყველა ქარდს შეაგროვებ, ის „სრულად შეგროვებულად“ მოინიშნება.</p> : null}
        </div>
      </section>

      <div id="progress-list" className="album-rise flex flex-wrap items-center gap-2" style={{ "--delay": "120ms" } as React.CSSProperties}>
        <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-lg bg-[#121214] px-3">
          <Search className="size-4 text-white/40" />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="ანიმეს სახელი" className="w-full bg-transparent text-sm outline-none placeholder:text-white/30" />
        </label>
        <button type="button" className={`filter-trigger inline-flex h-10 items-center gap-2 rounded-lg px-3.5 text-sm ${hideDone ? "is-on" : "bg-[#121214] text-[#d1d5dc] hover:text-white"}`} onClick={() => { setHideDone((value) => !value); setPage(1); }}>
          <Check className="size-3.5" /> დასრულებულის დამალვა
        </button>
        <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} className="h-10 cursor-pointer rounded-lg border-0 bg-[#121214] px-3 text-sm text-[#d1d5dc] outline-none">
          {progressSorts.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <span className="ml-auto text-xs text-white/35">{list.length} ანიმე</span>
      </div>

      <div key={`${current}-${sort}-${hideDone}-${text}`} className="grid gap-3">
        {visible.length ? visible.map((deck, index) => {
          const done = deck.total > 0 && deck.owned >= deck.total;
          const percent = Math.round(deck.share * 100);
          return (
            <article key={deck.id} className="album-rise group/deck relative overflow-hidden rounded-[20px] bg-[#121214] p-4 transition hover:bg-[#151518] sm:p-5" style={{ "--delay": `${Math.min(index, 8) * 60}ms` } as React.CSSProperties}>
              <div className="flex gap-4 sm:gap-5">
                <a href={`/cards/mine/progress/${deck.id}`} className="relative hidden w-[92px] shrink-0 self-start min-[560px]:block">
                  <span className="absolute -top-1.5 -left-1.5 size-4 rounded-tl-lg border-t-2 border-l-2 border-[#e93748]/70" />
                  <span className="absolute -right-1.5 -bottom-1.5 size-4 rounded-br-lg border-r-2 border-b-2 border-[#e93748]/70" />
                  <span className="block aspect-[2/3] overflow-hidden rounded-[10px] bg-[#1a1a1a] shadow-[0_12px_26px_rgba(0,0,0,0.45)]">
                    {deck.poster ? <img src={deck.poster} alt={deck.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover/deck:scale-[1.05]" /> : null}
                  </span>
                </a>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <a href={`/cards/mine/progress/${deck.id}`} className="block truncate text-[16px] font-semibold text-white transition hover:text-[#ff8a95]">{deck.title}</a>
                      <p className="mt-1 text-xs text-white/45">{deck.total} ქარდიდან <b className="font-semibold text-white">{deck.owned}</b> შეგროვებული</p>
                    </div>
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${done ? "bg-[#e93748] text-white" : "bg-white/[0.05] text-white/55"}`}>{done ? "სრულად შეგროვებული" : `დარჩა ${deck.total - deck.owned} ქარდი`}</span>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar owned={deck.owned} total={deck.total} delay={200 + Math.min(index, 8) * 60} />
                    <span className="w-10 text-right text-sm font-semibold text-[#ff8a95]">{percent}%</span>
                  </div>

                  <div className="mt-4 grid auto-rows-[0] grid-cols-4 grid-rows-[auto] gap-x-2.5 overflow-hidden min-[560px]:grid-cols-6 min-[900px]:grid-cols-8">
                    {deck.cards.filter((card) => card.owned > 0).slice(0, 8).map((card) => {
                      const moving = /\.(webm|mp4)(\?|$)/i.test(card.image);
                      return (
                        <a key={card.id} href={`/cards/${card.id}`} title={card.name} className="group relative block pt-1">
                          <span className="relative block aspect-[2/3] overflow-hidden rounded-[9px] bg-[#1a1a1a] shadow-[0_8px_18px_rgba(0,0,0,0.35)] transition duration-300 group-hover:-translate-y-1">
                            {card.image && moving ? <video src={card.image} muted loop playsInline className="h-full w-full object-cover" /> : null}
                            {card.image && !moving ? <img src={card.image} alt={card.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" /> : null}
                          </span>
                          {card.owned > 1 ? <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">×{card.owned}</span> : null}
                        </a>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                    {deck.slug ? (
                      <a href={`/anime/${deck.slug}`} className="inline-flex h-8 items-center gap-1 rounded-lg bg-white/[0.05] px-3 text-xs text-white/70 transition hover:bg-white/[0.09] hover:text-white">
                        ანიმეს გვერდი <ArrowUpRight className="size-3.5" />
                      </a>
                    ) : null}
                    <a href={`/cards/mine/progress/${deck.id}`} className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#e93748] px-3 text-xs font-medium text-white transition hover:bg-[#f04656]">
                      კოლექციის ნახვა <ChevronRight className="size-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </article>
          );
        }) : <p className="rounded-[20px] bg-[#121214] py-12 text-center text-sm text-white/45">{decks.length ? "არაფერი მოიძებნა." : data.me ? "ჯერ ქარდი არ გაქვს. გახსენი პაკი და აქ გამოჩნდება შენი ანიმეები." : "ამ გვერდისთვის შედი ანგარიშზე."}</p>}
      </div>
      <Pager page={current} pages={pages} onPick={pick} />
    </div>
  );
}
type AnimeCard = NonNullable<PlayData["anime"]>["cards"][number];

function CollectionTile({ card, index }: { card: AnimeCard; index: number }) {
  const moving = /\.(webm|mp4)(\?|$)/i.test(card.image);
  return (
    <a href={`/cards/${card.id}`} title={card.name} className="album-rise group relative block" style={{ "--delay": `${Math.min(index, 16) * 35}ms` } as React.CSSProperties}>
      <span className="relative block aspect-[2/3] overflow-hidden rounded-[10px] bg-[#1a1a1a] shadow-[0_10px_24px_rgba(0,0,0,0.35)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_34px_rgba(0,0,0,0.5)]">
        {card.image && moving ? <video src={card.image} muted loop playsInline autoPlay className="h-full w-full object-cover" /> : null}
        {card.image && !moving ? <img src={card.image} alt={card.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" /> : null}
      </span>
      {card.owned > 1 ? <span className="absolute bottom-2 left-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">×{card.owned}</span> : null}
      {!card.owned && card.wished ? <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-black/70 text-[#7ee0a8]"><Leaf className="size-3.5" /></span> : null}
    </a>
  );
}

function AlbumAction({ label, onClick, href, active, children }: { label: string; onClick?: () => void; href?: string; active?: boolean; children: React.ReactNode }) {
  const style = `grid size-9 place-items-center rounded-lg transition ${active ? "bg-[#e93748]/15 text-[#ff8a95]" : "bg-white/[0.05] text-white/70 hover:bg-white/[0.09] hover:text-white"}`;
  return (
    <span className="group relative">
      {href ? <a href={href} aria-label={label} className={style}>{children}</a> : <button type="button" aria-label={label} onClick={onClick} className={`${style} cursor-pointer`}>{children}</button>}
      <span className="album-tip absolute top-[calc(100%+8px)] left-1/2 z-20 whitespace-nowrap rounded-md bg-[#1f1f23] px-2 py-1 text-[11px] text-white/85 shadow-[0_8px_20px_rgba(0,0,0,0.45)]">{label}</span>
    </span>
  );
}

function AnimeProgress({ anime }: { anime: NonNullable<PlayData["anime"]> }) {
  const [view, setView] = useState<"all" | "owned" | "left">("all");
  const [cards, setCards] = useState(anime.cards);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [onlyLeft, setOnlyLeft] = useState(false);
  const owned = cards.filter((card) => card.owned > 0);
  const left = cards.filter((card) => card.owned === 0);
  const total = cards.length;
  const percent = total ? Math.round((owned.length / total) * 100) : 0;
  const done = total > 0 && owned.length >= total;
  const allWished = left.length > 0 && left.every((card) => card.wished);
  const segments = Math.min(Math.max(total, 1), 20);
  const filled = total ? Math.round((owned.length / total) * segments) : 0;
  const groups = [
    { key: "owned", label: "შეგროვებული ბარათები", hint: "შენს კოლექციაშია", icon: Check, cards: owned, empty: "ამ ანიმედან ჯერ ქარდი არ გაქვს." },
    { key: "left", label: "დარჩენილი ბარათები", hint: "შესაგროვებელია", icon: Search, cards: left, empty: "ყველა ქარდი შეგროვებულია." },
  ] as const;
  const shown = groups.filter((group) => (onlyLeft ? group.key === "left" : view === "all" || view === group.key));

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function wishLeft() {
    if (busy) return;
    setBusy(true);
    const response = await fetch("/api/cards/wish-anime", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: anime.id }) }).catch(() => null);
    const body = response ? await response.json().catch(() => null) : null;
    setBusy(false);
    if (!response?.ok || !body) {
      setToast(body?.error || "ვერ მოხერხდა, სცადე თავიდან.");
      return;
    }
    const ids = new Set<number>(body.ids);
    setCards((list) => list.map((card) => (card.owned ? card : { ...card, wished: ids.has(card.id) })));
    setToast(body.text);
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: anime.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setToast("ბმული დაკოპირდა.");
      }
    } catch {}
  }

  return (
    <div className="grid gap-5">
      {toast && typeof document !== "undefined"
        ? createPortal(
            <div className="album-toast fixed top-20 right-5 z-[90] flex max-w-[340px] items-start gap-3 rounded-[14px] bg-[#1a1a1d] px-4 py-3 text-sm text-white/85 shadow-[0_18px_40px_rgba(0,0,0,0.55)]">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#e93748]/15 text-[#ff8a95]"><Check className="size-3.5" /></span>
              <span className="flex-1 leading-5">{toast}</span>
              <button type="button" aria-label="დახურვა" className="cursor-pointer text-white/40 transition hover:text-white" onClick={() => setToast("")}><X className="size-4" /></button>
            </div>,
            document.body,
          )
        : null}

      <div className="album-rise flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <a href="/cards/mine/progress" className="inline-flex items-center gap-1.5 font-medium text-white/80 transition hover:text-white">
            <ArrowLeft className="size-4" /> ყველა ანიმე
          </a>
          <span className="h-4 w-px bg-white/10" />
          <span className="text-xs text-white/40">კოლექციონერის ალბომი</span>
        </div>
        <a href={`/cards?title=${encodeURIComponent(anime.title)}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/[0.05] px-3 text-xs text-white/75 transition hover:bg-white/[0.09] hover:text-white">
          <LayoutGrid className="size-3.5" /> კატალოგში
        </a>
      </div>

      <section className="album-rise relative overflow-hidden rounded-[20px] bg-linear-to-br from-[#1b1418] via-[#141215] to-[#121214] p-5 sm:p-7" style={{ "--delay": "60ms" } as React.CSSProperties}>
        <span className="album-ring pointer-events-none absolute top-1/2 -right-40 size-[520px] -translate-y-1/2 rounded-full border-[46px] border-white/[0.025]" />
        <span className="album-ring pointer-events-none absolute top-1/2 -right-16 size-[300px] -translate-y-1/2 rounded-full border-[28px] border-white/[0.02]" />
        <span className="pointer-events-none absolute -top-24 left-1/3 size-72 rounded-full bg-[#e93748]/8 blur-[90px]" />

        <div className="relative flex flex-wrap gap-7">
          <div className="w-[140px] shrink-0 sm:w-[160px]">
            <div className="relative">
              <span className="absolute -top-2 -left-2 size-6 rounded-tl-xl border-t-2 border-l-2 border-[#e93748]/80" />
              <span className="absolute -right-2 -bottom-2 size-6 rounded-br-xl border-r-2 border-b-2 border-[#e93748]/80" />
              <span className="block aspect-[2/3] overflow-hidden rounded-[12px] bg-[#1a1a1a] shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                {anime.poster ? <img src={anime.poster} alt={anime.title} className="h-full w-full object-cover transition duration-700 hover:scale-[1.04]" /> : null}
              </span>
            </div>
            {anime.slug ? (
              <a href={`/anime/${anime.slug}`} className="mt-3.5 flex items-center justify-center gap-1.5 text-xs text-white/50 transition hover:text-white">
                <Layers className="size-3.5" /> ანიმეს გვერდი
              </a>
            ) : null}
          </div>

          <div className="min-w-[250px] flex-1">
            <p className="flex items-center gap-1.5 text-xs font-medium text-[#ff8a95]"><Sparkles className="size-3.5" /> ანიმეს კოლექცია</p>
            <h1 className="mt-2 text-[26px] leading-tight font-semibold tracking-tight sm:text-[32px]">{anime.title}</h1>
            <p className="mt-1 text-sm text-white/45">{total} ქარდი ამ ანიმეში</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <AlbumAction label={allWished ? "დარჩენილები სურვილებიდან მოხსნა" : "დარჩენილები სურვილებში"} onClick={wishLeft} active={allWished}>
                <Leaf className={`size-4 ${busy ? "animate-pulse" : ""}`} />
              </AlbumAction>
              <AlbumAction label="ანიმეს ქარდები პაკებში" href="/packs"><Package className="size-4" /></AlbumAction>
              <AlbumAction label="გაზიარება" onClick={share}><Share2 className="size-4" /></AlbumAction>
              <span className="mx-1 h-5 w-px bg-white/10" />
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-white/55">
                მხოლოდ დარჩენილი
                <button type="button" role="switch" aria-checked={onlyLeft} onClick={() => setOnlyLeft((value) => !value)} className={`relative h-5 w-9 cursor-pointer rounded-full transition ${onlyLeft ? "bg-[#e93748]" : "bg-white/10"}`}>
                  <span className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform ${onlyLeft ? "translate-x-4" : ""}`} />
                </button>
              </label>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-white/55">შეგროვების პროგრესი <b className="ml-1 font-semibold text-white">{total}-დან {owned.length}</b></p>
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${done ? "bg-[#e93748] text-white" : "bg-white/[0.05] text-white/55"}`}>{done ? "სრულად შეგროვებული" : `დარჩა ${left.length} ქარდი`}</span>
            </div>
            <div className="mt-2.5 flex items-center gap-3">
              <span className="flex flex-1 gap-1">
                {Array.from({ length: segments }, (_, index) => (
                  <span key={index} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                    {index < filled ? <span className="album-fill block h-full rounded-full bg-linear-to-r from-[#e93748] to-[#ff7a87]" style={{ "--delay": `${200 + index * 45}ms` } as React.CSSProperties} /> : null}
                  </span>
                ))}
              </span>
              <span className="w-11 text-right text-sm font-semibold text-[#ff8a95]">{percent}%</span>
            </div>

            <div className="mt-5 grid gap-2.5 min-[560px]:grid-cols-3">
              {([
                ["შეგროვებული", owned.length, Check],
                ["ბარათების ჯამი", total, Layers],
                ["შესაგროვებელი", left.length, Search],
              ] as const).map(([label, value, Icon], index) => (
                <div key={label} className="album-rise flex items-center gap-3 rounded-[14px] bg-white/[0.035] px-4 py-3" style={{ "--delay": `${160 + index * 70}ms` } as React.CSSProperties}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e93748]/12 text-[#ff8a95]"><Icon className="size-4" /></span>
                  <span>
                    <span className="block text-[11px] text-white/40">{label}</span>
                    <span className="block text-lg leading-tight font-semibold text-white">{value}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mt-6 flex items-center gap-3 rounded-[14px] bg-white/[0.03] px-4 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e93748]/12 text-[#ff8a95]"><Trophy className="size-4" /></span>
          <div>
            <p className="text-sm font-medium text-white/90">{done ? "კოლექცია დასრულებულია" : "კოლექციის მიზანი"}</p>
            <p className="text-xs text-white/45">{done ? "ამ ანიმეს ყველა ქარდი შეაგროვე." : `დარჩა ${left.length} ქარდი, რომ ამ ანიმეს კოლექცია სრულად შეაგროვო.`}</p>
          </div>
        </div>
      </section>

      <div className="album-rise flex flex-wrap items-center justify-between gap-3" style={{ "--delay": "120ms" } as React.CSSProperties}>
        <div className="flex flex-wrap items-center gap-2">
          {groups.map((group) => {
            const on = !onlyLeft && view === group.key;
            return (
              <button key={group.key} type="button" onClick={() => { setOnlyLeft(false); setView((value) => (value === group.key ? "all" : group.key)); }} className={`filter-trigger inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm ${on ? "is-on" : "bg-[#121214] text-[#d1d5dc] hover:text-white"}`}>
                <group.icon className="size-3.5" /> {group.label}
                <span className={`ml-0.5 border-l pl-2 text-[12px] font-semibold ${on ? "border-white/25" : "border-white/10 text-[#ff8a95]"}`}>{group.cards.length}</span>
              </button>
            );
          })}
        </div>
        <span className="text-xs text-white/35">დააჭირე ქარდს დეტალების სანახავად</span>
      </div>

      {shown.map((group, groupIndex) => (
        <section key={`${group.key}-${view}-${onlyLeft}`} className="album-rise rounded-[20px] bg-[#121214] p-4 sm:p-6" style={{ "--delay": `${180 + groupIndex * 90}ms` } as React.CSSProperties}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#e93748]/12 text-[#ff8a95]"><group.icon className="size-4" /></span>
              <div>
                <p className="text-[11px] text-white/40">{group.hint}</p>
                <h2 className="text-[17px] font-semibold tracking-tight">{group.label}</h2>
              </div>
            </div>
            <span className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs text-white/55"><b className="font-semibold text-white">{group.cards.length}</b> ქარდი</span>
          </div>
          {group.cards.length ? (
            <div className="mt-5 grid grid-cols-3 gap-3 min-[560px]:grid-cols-5 min-[900px]:grid-cols-8">
              {group.cards.map((card, index) => <CollectionTile key={`${card.id}-${index}`} card={card} index={index} />)}
            </div>
          ) : <p className="py-10 text-center text-sm text-white/45">{group.empty}</p>}
        </section>
      ))}
    </div>
  );
}

const clubSorts = [
  ["rank", "რეიტინგით"],
  ["members", "წევრებით"],
  ["free", "თავისუფალი ადგილით"],
  ["name", "სახელით"],
] as const;
const clubsPerPage = 30;

function ClubAvatar({ club, size }: { club: PlayData["clubs"][number]; size: string }) {
  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-[#1a1a1a] font-semibold text-white/60 ${size}`}>
      {firstLetter(club.name)}
      {club.avatar ? <img src={club.avatar} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
    </span>
  );
}

function ClubSeats({ club, delay = 0 }: { club: PlayData["clubs"][number]; delay?: number }) {
  const share = club.max ? Math.min(100, Math.round((club.members / club.max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-white/40"><span>ადგილები</span><span>{club.max ? `${share}%` : "—"}</span></div>
      <div className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <span className="album-fill absolute inset-y-0 left-0 rounded-full bg-[#e93748]" style={{ width: `${share}%`, "--delay": `${delay}ms` } as React.CSSProperties} />
      </div>
    </div>
  );
}

function Clubs({ data }: { data: PlayData }) {
  const [find, setFind] = useState("");
  const [sort, setSort] = useState<string>("rank");
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const ranked = data.clubs.map((club, index) => ({ ...club, rank: index + 1 }));
  const mine = ranked.find((club) => club.mine);
  const leaders = ranked.slice(0, 3);
  const members = ranked.reduce((sum, club) => sum + club.members, 0);
  const text = find.trim().toLowerCase();
  const list = ranked
    .filter((club) => tab === "all" || club.mine)
    .filter((club) => !text || club.name.toLowerCase().includes(text) || club.tag.toLowerCase().includes(text) || club.owner.toLowerCase().includes(text))
    .sort((a, b) => {
      if (sort === "members") return b.members - a.members || a.rank - b.rank;
      if (sort === "free") return (b.max - b.members) - (a.max - a.members) || a.rank - b.rank;
      if (sort === "name") return a.name.localeCompare(b.name, "ka");
      return a.rank - b.rank;
    });
  const pages = Math.max(1, Math.ceil(list.length / clubsPerPage));
  const current = Math.min(page, pages);
  const visible = list.slice((current - 1) * clubsPerPage, current * clubsPerPage);
  const chip = "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs transition";

  function pick(next: number) {
    setPage(next);
    const node = document.getElementById("club-list");
    if (node) window.scrollTo({ top: Math.max(0, node.getBoundingClientRect().top + window.scrollY - 88), behavior: "smooth" });
  }

  if (!data.clubs.length) {
    return (
      <div className="album-rise rounded-[20px] bg-[#121214] py-14 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#e93748]/12 text-[#ff8a95]"><Shield className="size-5" /></span>
        <p className="mt-3 text-sm text-white/55">კლუბი ჯერ არ არის.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4">
        <div className="album-rise flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-end gap-3">
            <span className="text-[28px] leading-none font-semibold text-[#e93748]">01</span>
            <span>
              <span className="block text-[11px] font-medium tracking-wide text-white/40">კლუბების რეიტინგი</span>
              <span className="block text-xl font-semibold tracking-tight">ლიდერები</span>
            </span>
          </div>
          <span className="text-xs text-white/35">დონით და გამოცდილებით</span>
        </div>

        <div className="grid gap-3 min-[760px]:grid-cols-3">
          {leaders.map((club, index) => (
            <a key={club.id} href={`/clubs/${club.id}`} className="album-rise group relative block overflow-hidden rounded-[18px] bg-[#121214]" style={{ "--delay": `${index * 80}ms` } as React.CSSProperties}>
              <div className="relative h-36 overflow-hidden bg-[#1a1a1a]">
                {club.cover ? <img src={club.cover} alt="" loading="lazy" className="h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-[1.05]" /> : <span className="absolute inset-0 bg-linear-to-br from-[#2a1418] to-[#121214]" />}
                <span className="absolute inset-0 bg-linear-to-t from-[#121214] via-[#121214]/40 to-transparent" />
                <span className={`absolute top-3 left-3 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold backdrop-blur-sm ${index === 0 ? "bg-[#e93748] text-white" : "bg-black/60 text-white/85"}`}>{index === 0 ? <Crown className="size-3.5" /> : null} #{club.rank}</span>
                {club.mine ? <span className="absolute top-3 right-3 rounded-lg bg-black/60 px-2 py-1 text-[11px] font-medium text-[#ff8a95] backdrop-blur-sm">შენი კლუბი</span> : null}
                <div className="absolute inset-x-4 bottom-3 flex items-end gap-3">
                  <ClubAvatar club={club} size="size-12 text-lg" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2"><span className={`truncate text-base font-semibold text-white ${clubName(club.style)}`}>{club.name}</span>{club.badge ? <img src={club.badge} alt="" className="size-5 shrink-0 object-contain" /> : null}{club.tag ? <span className="shrink-0 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">{club.tag}</span> : null}</span>
                    <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-white/50"><Crown className="size-3" /> {club.owner || "—"}</span>
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 p-4 pt-3 text-center">
                {([
                  ["წევრები", `${club.members}${club.max ? ` / ${club.max}` : ""}`],
                  ["გამოცდილება", club.xp.toLocaleString("en-US")],
                  ["დონე", String(club.level)],
                ] as const).map(([label, value]) => (
                  <span key={label} className="rounded-[12px] bg-white/[0.035] px-2 py-2">
                    <span className="block text-[10px] text-white/40">{label}</span>
                    <span className="block text-sm font-semibold text-white">{value}</span>
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>
      </section>

      <div className="album-rise flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-linear-to-r from-[#1b1418] to-[#121214] px-5 py-4" style={{ "--delay": "200ms" } as React.CSSProperties}>
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#e93748]/12 text-[#ff8a95]"><Shield className="size-5" /></span>
          <span>
            <span className="flex items-center gap-2 text-base font-semibold">Animeb კლუბები <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-white/60">{data.clubs.length} კლუბი</span></span>
            <span className="block text-xs text-white/40">{members} წევრი · ერთად შეაგროვეთ და აწიეთ კლუბის დონე</span>
          </span>
        </div>
        {mine ? (
          <span className="flex items-center gap-2 rounded-xl bg-white/[0.04] py-1.5 pr-3 pl-1.5">
            <ClubAvatar club={mine} size="size-8 text-xs" />
            <span className="text-xs"><span className="block text-white/40">შენი კლუბი</span><span className="block font-medium text-white">{mine.name} · #{mine.rank}</span></span>
          </span>
        ) : null}
      </div>

      <section id="club-list" className="grid gap-4">
        <div className="album-rise flex flex-wrap items-end justify-between gap-3" style={{ "--delay": "240ms" } as React.CSSProperties}>
          <div className="flex items-end gap-3">
            <span className="text-[28px] leading-none font-semibold text-[#e93748]">02</span>
            <span>
              <span className="block text-[11px] font-medium tracking-wide text-white/40">იპოვე შენი გუნდი</span>
              <span className="block text-xl font-semibold tracking-tight">ყველა კლუბი</span>
            </span>
          </div>
          <span className="text-xs text-white/35">ნაჩვენებია {list.length}</span>
        </div>

        <div className="album-rise flex flex-wrap items-center gap-2" style={{ "--delay": "280ms" } as React.CSSProperties}>
          <label className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-lg bg-[#121214] px-3">
            <Search className="size-4 text-white/40" />
            <input value={find} onChange={(event) => { setFind(event.target.value); setPage(1); }} placeholder="კლუბი, ტეგი ან მფლობელი" className="w-full bg-transparent text-xs outline-none placeholder:text-white/30" />
          </label>
          <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} className="h-9 cursor-pointer rounded-lg border-0 bg-[#121214] px-3 text-xs text-[#d1d5dc] outline-none">
            {clubSorts.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <span className="inline-flex gap-1 rounded-lg bg-[#121214] p-1">
            <button type="button" aria-label="ბადე" onClick={() => setView("grid")} className={`grid size-7 cursor-pointer place-items-center rounded-md transition ${view === "grid" ? "bg-[#e93748] text-white" : "text-white/55 hover:bg-white/[0.06] hover:text-white"}`}><LayoutGrid className="size-3.5" /></button>
            <button type="button" aria-label="სია" onClick={() => setView("list")} className={`grid size-7 cursor-pointer place-items-center rounded-md transition ${view === "list" ? "bg-[#e93748] text-white" : "text-white/55 hover:bg-white/[0.06] hover:text-white"}`}><ListIcon className="size-3.5" /></button>
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex gap-1 rounded-xl bg-[#121214] p-1">
            <button type="button" onClick={() => { setTab("all"); setPage(1); }} className={`${chip} ${tab === "all" ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/[0.06] hover:text-white"}`}>ყველა კლუბი</button>
            <button type="button" onClick={() => { setTab("mine"); setPage(1); }} className={`${chip} ${tab === "mine" ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/[0.06] hover:text-white"}`}>ჩემი კლუბი</button>
          </span>
          <span className="text-[11px] text-white/35">ადგილი ითვლება დონით და გამოცდილებით</span>
        </div>

        {visible.length ? (
          view === "grid" ? (
            <div key={`${sort}-${tab}-${current}-${text}`} className="grid gap-3 min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3">
              {visible.map((club, index) => (
                <a key={club.id} href={`/clubs/${club.id}`} className="album-rise block rounded-[16px] bg-[#121214] p-4 transition hover:bg-[#151518]" style={{ "--delay": `${Math.min(index, 12) * 35}ms` } as React.CSSProperties}>
                  <div className="flex items-start gap-3">
                    <ClubAvatar club={club} size="size-12 text-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5"><span className={`truncate text-sm font-semibold text-white ${clubName(club.style)}`}>{club.name}</span>{club.badge ? <img src={club.badge} alt="" className="size-4 shrink-0 object-contain" /> : null}{club.tag ? <span className="shrink-0 rounded bg-white/[0.06] px-1 text-[9px] font-semibold text-white/55">{club.tag}</span> : null}</span>
                      <span className="block text-[11px] text-white/40">კლუბი · {club.level} დონე</span>
                      {club.mine ? <span className="mt-1 inline-block rounded-md bg-[#e93748]/12 px-1.5 py-0.5 text-[10px] font-medium text-[#ff8a95]">შენი კლუბი</span> : null}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className={`block text-xl leading-none font-semibold ${club.rank <= 3 ? "text-[#ff8a95]" : "text-white"}`}>{club.rank}</span>
                      <span className="text-[10px] text-white/35">ადგილი</span>
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-white/50">
                    <span className="flex items-center gap-1.5"><Users className="size-3.5" /> {club.members}{club.max ? ` / ${club.max}` : ""}</span>
                    <span className="flex items-center gap-1.5"><Sparkles className="size-3.5" /> {club.xp.toLocaleString("en-US")} XP</span>
                  </div>
                  <div className="mt-3"><ClubSeats club={club} delay={120 + Math.min(index, 12) * 35} /></div>
                </a>
              ))}
            </div>
          ) : (
            <div key={`${sort}-${tab}-${current}-${text}-list`} className="grid gap-2">
              {visible.map((club, index) => (
                <a key={club.id} href={`/clubs/${club.id}`} className="album-rise flex flex-wrap items-center gap-4 rounded-[14px] bg-[#121214] px-4 py-3 transition hover:bg-[#151518]" style={{ "--delay": `${Math.min(index, 12) * 30}ms` } as React.CSSProperties}>
                  <span className={`w-8 text-center text-lg font-semibold ${club.rank <= 3 ? "text-[#ff8a95]" : "text-white/70"}`}>{club.rank}</span>
                  <ClubAvatar club={club} size="size-10 text-sm" />
                  <span className="min-w-[160px] flex-1">
                    <span className="flex items-center gap-1.5"><span className={`truncate text-sm font-semibold ${clubName(club.style)}`}>{club.name}</span>{club.badge ? <img src={club.badge} alt="" className="size-4 shrink-0 object-contain" /> : null}{club.tag ? <span className="rounded bg-white/[0.06] px-1 text-[9px] font-semibold text-white/55">{club.tag}</span> : null}{club.mine ? <span className="rounded-md bg-[#e93748]/12 px-1.5 py-0.5 text-[10px] text-[#ff8a95]">შენი</span> : null}</span>
                    <span className="flex items-center gap-1 text-[11px] text-white/40"><Crown className="size-3" /> {club.owner || "—"}</span>
                  </span>
                  <span className="w-20 text-xs text-white/50"><b className="text-white">{club.level}</b> დონე</span>
                  <span className="w-24 text-xs text-white/50">{club.xp.toLocaleString("en-US")} XP</span>
                  <span className="w-24 text-xs text-white/50"><Users className="mr-1 inline size-3.5" />{club.members}{club.max ? ` / ${club.max}` : ""}</span>
                  <span className="w-full sm:w-40"><ClubSeats club={club} delay={100} /></span>
                </a>
              ))}
            </div>
          )
        ) : (
          <div className="album-rise rounded-[20px] bg-[#121214] py-14 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#e93748]/12 text-[#ff8a95]"><Shield className="size-5" /></span>
            <p className="mt-3 text-sm text-white/55">{tab === "mine" && !text ? "ჯერ არცერთ კლუბში არ ხარ." : "კლუბი ვერ მოიძებნა."}</p>
          </div>
        )}
        <Pager page={current} pages={pages} onPick={pick} />
      </section>
    </div>
  );
}

const clubRoles: Record<string, string> = { owner: "მფლობელი", moderator: "მოდერატორი", member: "წევრი" };
const clubNameStyles: [string, string][] = [
  ["none", "ჩვეულებრივი"], ["crimson", "ალისფერი"], ["rainbow", "ცისარტყელა"], ["galaxy", "გალაქტიკა"],
  ["fire", "ცეცხლი"], ["gold", "ოქრო"], ["ice", "ყინული"], ["neon", "ნეონი"],
];
const clubName = (style: string) => (style && style !== "none" ? `club-name club-name-${style}` : "");
const clubPeopleSorts = [
  ["role", "როლით"],
  ["cards", "ქარდებით"],
  ["uniq", "უნიკალურით"],
  ["joined", "გაწევრიანებით"],
  ["name", "სახელით"],
] as const;
const clubPeopleStep = 24;

const donateRanks = ["E", "D", "C", "B", "A", "S", "S+", "RE"];
const donateLimit = 50;

function ClubDonate({ copies, rates, busy, onClose, onDonate }: { copies: PlayData["copies"]; rates: Record<string, number>; busy: boolean; onClose: () => void; onDonate: (ids: number[]) => void }) {
  const [rank, setRank] = useState("");
  const [find, setFind] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const [shown, setShown] = useState(48);
  const text = find.trim().toLowerCase();
  const list = copies.filter((copy) => (!rank || copy.rarity.toUpperCase() === rank) && (!text || copy.name.toLowerCase().includes(text)));
  const counts = donateRanks.map((key) => [key, copies.filter((copy) => copy.rarity.toUpperCase() === key).length] as const).filter(([, n]) => n > 0);
  const total = copies.filter((copy) => picked.includes(copy.id)).reduce((sum, copy) => sum + (rates[copy.rarity.toUpperCase()] ?? 5), 0);
  const chip = "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition";

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", close); document.body.style.overflow = ""; };
  }, [onClose]);

  function toggle(id: number) {
    setPicked((items) => items.includes(id) ? items.filter((item) => item !== id) : items.length >= donateLimit ? items : [...items, id]);
  }

  return createPortal(
    <div className="card-dim fixed inset-0 z-[80] grid place-items-center bg-black/75 p-3 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div className="card-dialog flex max-h-full w-full max-w-[980px] flex-col overflow-hidden rounded-[20px] bg-[#121214] shadow-[0_30px_80px_rgba(0,0,0,0.6)]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 bg-linear-to-r from-[#24141a] to-[#121214] px-5 py-4">
          <span>
            <span className="block text-[11px] text-[#ff8a95]">კლუბის განვითარება</span>
            <span className="block text-lg font-semibold">ქარდების შეწირვა</span>
            <span className="mt-1 block text-xs text-white/45">შეწირული ქარდი კოლექციიდან ქრება და კლუბს XP-ს აძლევს. ერთ ჯერზე მაქსიმუმ {donateLimit}.</span>
          </span>
          <button type="button" aria-label="დახურვა" onClick={onClose} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg bg-white/[0.06] text-white/60 transition hover:bg-white/10 hover:text-white"><X className="size-4" /></button>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-5 pt-4 text-xs text-white/45">
          <span className="mr-1">XP კურსი</span>
          {donateRanks.map((key) => <span key={key} className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-[#18181b] px-2.5"><b style={{ color: tone[key] }}>{key}</b><span className="text-white/60">+{rates[key] ?? 5}</span></span>)}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-3">
          <span className="inline-flex flex-wrap gap-1 rounded-xl bg-[#0f0f11] p-1">
            <button type="button" onClick={() => setRank("")} className={`${chip} ${rank ? "text-white/60 hover:bg-white/[0.06] hover:text-white" : "bg-[#e93748] text-white"}`}>ყველა <span className="text-[10px] opacity-70">{copies.length}</span></button>
            {counts.map(([key, n]) => (
              <button key={key} type="button" onClick={() => setRank(rank === key ? "" : key)} className={`${chip} ${rank === key ? "bg-[#e93748] text-white" : "text-white/60 hover:bg-white/[0.06] hover:text-white"}`}>
                <span style={{ color: rank === key ? undefined : tone[key] }}>{key}</span><span className="text-[10px] opacity-60">{n}</span>
              </button>
            ))}
          </span>
          <label className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-lg bg-[#1a1a1a] px-3 sm:max-w-[260px]">
            <Search className="size-4 text-white/40" />
            <input value={find} onChange={(event) => setFind(event.target.value)} placeholder="პერსონაჟის სახელი" className="w-full bg-transparent text-xs outline-none placeholder:text-white/30" />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {list.length ? (
            <div className="grid grid-cols-3 gap-2.5 min-[560px]:grid-cols-5 min-[860px]:grid-cols-7">
              {list.slice(0, shown).map((copy) => {
                const on = picked.includes(copy.id);
                const key = copy.rarity.toUpperCase();
                const moving = /\.(webm|mp4)(\?|$)/i.test(copy.image);
                return (
                  <button key={copy.id} type="button" title={copy.name} onClick={() => toggle(copy.id)} className="group relative block cursor-pointer text-left">
                    <span className={`relative block aspect-[2/3] overflow-hidden rounded-[10px] bg-[#1a1a1a] transition duration-300 group-hover:-translate-y-1 ${on ? "ring-2 ring-[#e93748] ring-offset-2 ring-offset-[#121214]" : ""}`}>
                      {copy.image && moving ? <video src={copy.image} autoPlay muted loop playsInline className="h-full w-full object-cover" /> : null}
                      {copy.image && !moving ? <img src={copy.image} alt={copy.name} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : null}
                      <span className="absolute top-1.5 left-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold" style={{ color: tone[key] ?? "#fff" }}>{key}</span>
                      <span className={`absolute top-1.5 right-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${on ? "bg-[#e93748] text-white" : "bg-black/70 text-white/85"}`}>+{rates[key] ?? 5}</span>
                      {on ? <span className="absolute inset-0 bg-[#e93748]/15" /> : null}
                      {on ? <span className="brick-pop absolute bottom-1.5 left-1/2 grid size-6 -translate-x-1/2 place-items-center rounded-full bg-[#e93748] text-white"><Check className="size-3.5" strokeWidth={3} /></span> : null}
                    </span>
                    <span className="mt-1.5 block truncate text-center text-[11px] text-white/60">{copy.name}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[16px] bg-[#0f0f11] py-12 text-center">
              <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-[#e93748]/12 text-[#ff8a95]"><Layers className="size-5" /></span>
              <p className="mt-3 text-sm text-white/50">{copies.length ? "ასეთი ქარდი ვერ მოიძებნა." : "შესაწირი ქარდი არ გაქვს. ვიტრინისა და გაყიდვაში მყოფი ქარდები არ ჩანს."}</p>
            </div>
          )}
          {list.length > shown ? <button type="button" onClick={() => setShown((value) => value + 48)} className="mx-auto mt-4 flex h-9 cursor-pointer items-center rounded-lg bg-white/[0.06] px-4 text-xs text-white/75 transition hover:bg-white/10 hover:text-white">მეტის ჩვენება ({list.length - shown})</button> : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0f0f11] px-5 py-3.5">
          <span className="text-sm text-white/55">არჩეულია <b className="font-semibold text-white">{picked.length}</b> / {donateLimit} · კლუბი მიიღებს <b className="font-semibold text-[#ff8a95]">+{total.toLocaleString("en-US")} XP</b></span>
          <span className="flex gap-2">
            {picked.length ? <button type="button" onClick={() => setPicked([])} className="inline-flex h-10 cursor-pointer items-center rounded-lg bg-white/[0.06] px-4 text-sm text-white/75 transition hover:bg-white/10 hover:text-white">გასუფთავება</button> : null}
            <button type="button" disabled={busy || !picked.length} onClick={() => onDonate(picked)} className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-[#e93748] px-5 text-sm font-medium text-white transition hover:bg-[#f04656] disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-white/40"><Heart className="size-4" /> შეწირვა</button>
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ClubView({ data }: { data: PlayData }) {
  const base = data.club!;
  const [info, setInfo] = useState({ name: base.name, text: base.text, tag: base.tag, avatar: base.avatar, cover: base.cover });
  const [look, setLook] = useState({ style: base.style, badge: base.badge, vault: base.vault });
  const [growth, setGrowth] = useState({ xp: base.xp, level: base.level });
  const club = { ...base, ...info, ...look, ...growth };
  const [copies, setCopies] = useState(data.copies);
  const [donations, setDonations] = useState(base.donations);
  const [donors, setDonors] = useState(base.donors);
  const [donating, setDonating] = useState(false);
  const [levelUp, setLevelUp] = useState(0);
  const xpFor = (level: number) => {
    const n = Math.max(0, Math.min(club.curve.max, level) - 1);
    return n * club.curve.base + (club.curve.step * n * (n - 1)) / 2;
  };
  const floor = xpFor(club.level);
  const ceil = club.level >= club.curve.max ? undefined : xpFor(club.level + 1);
  const growthShare = ceil === undefined ? 100 : Math.max(0, Math.min(100, ((club.xp - floor) / (ceil - floor)) * 100));
  const milestone = Math.min(club.curve.max, Math.ceil((club.level + 1) / 50) * 50);
  const steps = Array.from(new Set([
    ...Array.from({ length: 6 }, (_, index) => club.level - 1 + index).filter((level) => level >= 1 && level <= club.curve.max),
    milestone, club.curve.max,
  ])).sort((a, b) => a - b);
  const [requests, setRequests] = useState(base.requests);
  const [panel, setPanel] = useState<"" | "requests" | "edit" | "look">("");
  const [draft, setDraft] = useState({ name: base.name, text: base.text, tag: base.tag });
  const [role, setRole] = useState(base.role);
  const [pending, setPending] = useState(club.pending);
  const [people, setPeople] = useState(club.people);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [find, setFind] = useState("");
  const [sort, setSort] = useState<string>("role");
  const [shown, setShown] = useState(clubPeopleStep);
  const [aboutOpen, setAboutOpen] = useState(true);
  const share = club.max ? Math.min(100, Math.round((people.length / club.max) * 100)) : 0;
  const totalCards = people.reduce((sum, person) => sum + person.cards, 0);
  const text = find.trim().toLowerCase();
  const list = people
    .filter((person) => !text || person.name.toLowerCase().includes(text))
    .sort((a, b) => {
      if (sort === "cards") return b.cards - a.cards;
      if (sort === "uniq") return b.uniq - a.uniq;
      if (sort === "joined") return b.joined.localeCompare(a.joined);
      if (sort === "name") return a.name.localeCompare(b.name, "ka");
      return 0;
    });
  const visible = list.slice(0, shown);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!levelUp) return;
    const timer = window.setTimeout(() => setLevelUp(0), 6000);
    return () => window.clearTimeout(timer);
  }, [levelUp]);

  async function act(action: "join" | "cancel" | "leave") {
    if (busy) return;
    if (!data.me) { setToast("ამისთვის შედი ანგარიშზე."); return; }
    setBusy(true);
    const response = await fetch("/api/clubs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: club.id, action }) }).catch(() => null);
    const result = response ? await response.json().catch(() => null) as { ok: boolean; error?: string; text?: string } | null : null;
    setBusy(false);
    if (!result?.ok) { setToast(result?.error ?? "კავშირი ვერ დამყარდა."); return; }
    setToast(result.text ?? "");
    if (action === "join") setPending(true);
    if (action === "cancel") setPending(false);
    if (action === "leave") { setRole(""); setPeople((items) => items.filter((person) => person.id !== data.me)); }
  }

  function share_() {
    void navigator.clipboard.writeText(`${location.origin}/clubs/${club.id}`);
    setToast("ბმული დაკოპირდა.");
  }

  const manager = role === "owner" || role === "moderator";

  async function manage(action: string, extra: Record<string, unknown> = {}) {
    if (busy) return null;
    setBusy(true);
    const response = await fetch("/api/clubs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: club.id, action, ...extra }) }).catch(() => null);
    const result = response ? await response.json().catch(() => null) as { ok: boolean; error?: string; text?: string; badge?: string; vault?: number | null; style?: string } | null : null;
    setBusy(false);
    setToast(result?.ok ? result.text ?? "" : result?.error ?? "კავშირი ვერ დამყარდა.");
    return result?.ok ? result : null;
  }

  async function donate(ids: number[]) {
    if (busy || !ids.length) return;
    setBusy(true);
    const response = await fetch("/api/clubs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: club.id, action: "donate", ids }) }).catch(() => null);
    const result = response ? await response.json().catch(() => null) as { ok: boolean; error?: string; text?: string; gain?: number; xp?: number; level?: number; up?: boolean; removed?: number[] } | null : null;
    setBusy(false);
    if (!result?.ok) { setToast(result?.error ?? "კავშირი ვერ დამყარდა."); return; }
    const gone = new Set(result.removed ?? []);
    const given = copies.filter((copy) => gone.has(copy.id));
    const me = people.find((person) => person.id === data.me);
    const now = new Date().toISOString().slice(0, 16).replace("T", " ");
    setCopies((items) => items.filter((copy) => !gone.has(copy.id)));
    setGrowth({ xp: result.xp ?? club.xp, level: result.level ?? club.level });
    setDonations((items) => [
      ...given.map((copy, index) => ({ id: -Date.now() - index, name: me?.name ?? "", avatar: me?.avatar ?? "", card: copy.name, image: copy.image, rarity: copy.rarity.toUpperCase(), xp: club.rates[copy.rarity.toUpperCase()] ?? 5, date: now })),
      ...items,
    ].slice(0, 12));
    setDonors((items) => {
      const gain = result.gain ?? 0;
      const found = items.find((item) => item.id === data.me);
      const next = found
        ? items.map((item) => item.id === data.me ? { ...item, xp: item.xp + gain, cards: item.cards + given.length } : item)
        : [...items, { id: data.me, name: me?.name ?? "", avatar: me?.avatar ?? "", xp: gain, cards: given.length }];
      return next.sort((a, b) => b.xp - a.xp).slice(0, 5);
    });
    setDonating(false);
    setToast(result.text ?? "");
    if (result.up) setLevelUp(result.level ?? 0);
  }

  async function pickStyle(style: string) {
    if (style === look.style) return;
    const result = await manage("style", { style });
    if (result) setLook((value) => ({ ...value, style }));
  }

  async function pickBadge(badge: ClubPage["badges"][number] | null) {
    if (badge && !window.confirm(`ბეჯი „${badge.name}“ — კლუბის ხაზინიდან ჩამოიჭრება ${badge.price.toLocaleString("en-US")}. გავაგრძელოთ?`)) return;
    const result = await manage("badge", { badge: badge?.id ?? 0 });
    if (result) setLook((value) => ({ ...value, badge: result.badge ?? "", vault: typeof result.vault === "number" ? result.vault : value.vault }));
  }

  async function answer(person: ClubPage["requests"][number], accept: boolean) {
    const result = await manage(accept ? "approve" : "reject", { user: person.id });
    if (!result) return;
    setRequests((items) => items.filter((item) => item.id !== person.id));
    if (accept) setPeople((items) => [...items, { id: person.id, name: person.name, avatar: person.avatar, role: "member", joined: new Date().toISOString().slice(0, 10), cards: person.cards, uniq: person.uniq }]);
  }

  async function memberAction(person: ClubPage["people"][number], action: "kick" | "promote" | "demote") {
    if (action === "kick" && !window.confirm(`${person.name} გავაგდოთ კლუბიდან?`)) return;
    const result = await manage(action, { user: person.id });
    if (!result) return;
    if (action === "kick") setPeople((items) => items.filter((item) => item.id !== person.id));
    else setPeople((items) => items.map((item) => item.id === person.id ? { ...item, role: action === "promote" ? "moderator" : "member" } : item));
  }

  async function saveInfo(event: React.FormEvent) {
    event.preventDefault();
    const result = await manage("edit", draft);
    if (result) setInfo((value) => ({ ...value, name: draft.name.trim(), text: draft.text.trim(), tag: draft.tag.trim().toUpperCase() }));
  }

  async function upload(kind: "avatar" | "cover", file: File | undefined) {
    if (!file || busy) return;
    const form = new FormData();
    form.append("id", String(club.id));
    form.append("kind", kind);
    form.append("file", file);
    setBusy(true);
    const response = await fetch("/api/clubs", { method: "POST", body: form }).catch(() => null);
    const result = response ? await response.json().catch(() => null) as { ok: boolean; error?: string; url?: string } | null : null;
    setBusy(false);
    if (!result?.ok || !result.url) { setToast(result?.error ?? "ატვირთვა ვერ მოხერხდა."); return; }
    setInfo((value) => ({ ...value, [kind]: result.url! }));
    setToast(kind === "avatar" ? "ავატარი განახლდა." : "ქავერი განახლდა.");
  }

  const tile = (person: ClubPage["people"][number], index: number) => {
    const owner = person.role === "owner";
    const mod = person.role === "moderator";
    const canKick = manager && !owner && person.id !== data.me && (role === "owner" || person.role === "member");
    const canRole = role === "owner" && !owner;
    return (
      <div key={person.id} className={`album-rise group relative flex items-center gap-3 rounded-[14px] p-3 transition ${owner ? "bg-linear-to-r from-[#e93748]/20 to-[#e93748]/[0.04] hover:from-[#e93748]/28" : mod ? "bg-linear-to-r from-white/[0.09] to-white/[0.02] hover:from-white/[0.12]" : "bg-[#18181b] hover:bg-[#1d1d21]"}`} style={{ "--delay": `${Math.min(index, 12) * 30}ms` } as React.CSSProperties}>
        <a href={`/profile/${encodeURIComponent(person.name)}`} className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#232327] text-sm font-semibold text-white/60">
          {firstLetter(person.name)}
          {person.avatar ? <img src={person.avatar} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
        </a>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <a href={`/profile/${encodeURIComponent(person.name)}`} className="truncate text-sm font-medium text-white transition hover:text-[#ff8a95]">{person.name}</a>
            {owner ? <Crown className="size-3.5 shrink-0 text-[#ff8a95]" /> : null}
            {person.id === data.me ? <span className="shrink-0 rounded bg-white/10 px-1 text-[9px] text-white/70">შენ</span> : null}
          </span>
          <span className={`block text-[11px] ${owner ? "text-[#ff8a95]" : mod ? "text-white/70" : "text-white/40"}`}>{clubRoles[person.role] ?? person.role}</span>
          <span className="mt-0.5 block text-[11px] text-white/45">ქარდები: <b className="font-semibold text-white/85">{person.cards}</b> · უნიკ. {person.uniq}</span>
        </span>
        {canKick || canRole ? (
          <span className="flex shrink-0 flex-col gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
            {canRole ? (
              <button type="button" disabled={busy} title={mod ? "მოდერატორობის მოხსნა" : "მოდერატორად დანიშვნა"} onClick={() => memberAction(person, mod ? "demote" : "promote")} className="grid size-7 cursor-pointer place-items-center rounded-lg bg-black/40 text-white/70 transition hover:bg-white/15 hover:text-white disabled:opacity-40">
                <Shield className={`size-3.5 ${mod ? "fill-white/60" : ""}`} />
              </button>
            ) : null}
            {canKick ? (
              <button type="button" disabled={busy} title="კლუბიდან გაგდება" onClick={() => memberAction(person, "kick")} className="grid size-7 cursor-pointer place-items-center rounded-lg bg-black/40 text-white/70 transition hover:bg-[#e93748] hover:text-white disabled:opacity-40">
                <X className="size-3.5" />
              </button>
            ) : null}
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <div className="grid gap-5">
      {toast && typeof document !== "undefined"
        ? createPortal(
            <div className="album-toast fixed top-20 right-5 z-[90] flex max-w-[340px] items-start gap-3 rounded-[14px] bg-[#1a1a1d] px-4 py-3 text-sm text-white/85 shadow-[0_18px_40px_rgba(0,0,0,0.55)]">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#e93748]/15 text-[#ff8a95]"><Check className="size-3.5" /></span>
              <span className="flex-1 leading-5">{toast}</span>
              <button type="button" aria-label="დახურვა" className="cursor-pointer text-white/40 transition hover:text-white" onClick={() => setToast("")}><X className="size-4" /></button>
            </div>,
            document.body,
          )
        : null}

      <div className="album-rise flex items-center justify-between gap-3 text-xs">
        <a href="/clubs" className="inline-flex items-center gap-1.5 text-white/55 transition hover:text-white"><ArrowLeft className="size-4" /> ყველა კლუბი <span className="text-white/25">/</span> <span className="text-white/35">კლუბი #{club.id}</span></a>
        {role ? <span className="rounded-md bg-[#e93748]/12 px-2 py-1 text-[11px] text-[#ff8a95]">შენი კლუბი · {clubRoles[role] ?? role}</span> : null}
      </div>

      <section className="album-rise relative overflow-hidden rounded-[20px] bg-[#121214]" style={{ "--delay": "40ms" } as React.CSSProperties}>
        <div className="relative h-[220px] overflow-hidden bg-[#1a1a1a] sm:h-[280px]">
          {club.cover ? <img src={club.cover} alt="" className="h-full w-full object-cover" /> : <span className="absolute inset-0 bg-linear-to-br from-[#2a1418] via-[#161214] to-[#121214]" />}
          <span className="absolute inset-0 bg-linear-to-t from-[#121214] via-[#121214]/35 to-black/20" />
          <span className="absolute top-4 left-4 flex items-center gap-2">
            {club.tag ? <span className="rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold tracking-wide text-white/85 backdrop-blur-sm">{club.tag}</span> : null}
            {club.boosted ? <span className="inline-flex items-center gap-1 rounded-md bg-[#e93748] px-2 py-1 text-[11px] font-medium text-white"><Zap className="size-3" /> ბუსტი</span> : null}
          </span>
          <span className="absolute top-4 right-4 rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold text-white/85 backdrop-blur-sm">#{club.rank}</span>
          <div className="absolute inset-x-5 bottom-5 flex items-end gap-4">
            <span className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#1a1a1a] text-2xl font-semibold text-white/60 shadow-[0_12px_28px_rgba(0,0,0,0.5)] sm:size-24">
              {firstLetter(club.name)}
              {club.avatar ? <img src={club.avatar} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
            </span>
            <span className="min-w-0 flex-1 pb-1">
              <span className="block text-[11px] text-white/50">კლუბი</span>
              <span className="flex items-center gap-2">
                <span className={`truncate text-[24px] leading-tight font-semibold tracking-tight sm:text-[30px] ${clubName(club.style)}`}>{club.name}</span>
                {club.badge ? <img src={club.badge} alt="" className="size-8 shrink-0 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]" /> : null}
              </span>
            </span>
            <span className="hidden shrink-0 flex-col items-center rounded-[14px] bg-black/50 px-3 py-2 backdrop-blur-sm sm:flex">
              <span className="text-[10px] text-white/50">დონე</span>
              <span className="text-[26px] leading-none font-semibold">{club.level}</span>
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <span className="inline-flex flex-wrap gap-1 text-xs">
            <a href="#club-about" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-white/70 transition hover:bg-white/[0.06] hover:text-white"><CircleHelp className="size-3.5" /> კლუბის შესახებ</a>
            <a href="#club-people" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-white/70 transition hover:bg-white/[0.06] hover:text-white"><Users className="size-3.5" /> წევრები <span className="rounded bg-white/[0.08] px-1 text-[10px]">{people.length}</span></a>
            {club.friends.length ? <a href="#club-friends" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-white/70 transition hover:bg-white/[0.06] hover:text-white"><Heart className="size-3.5" /> მეგობრები</a> : null}
          </span>
          <span className="inline-flex flex-wrap gap-2">
            {manager ? (
              <button type="button" onClick={() => setPanel(panel ? "" : "requests")} className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${panel ? "bg-white/15 text-white" : "bg-[#e93748] text-white hover:bg-[#f04656]"}`}>
                <SlidersHorizontal className="size-3.5" /> კლუბის მართვა
                {requests.length ? <span className={`rounded-md px-1.5 text-[10px] ${panel ? "bg-[#e93748]" : "bg-black/25"}`}>{requests.length}</span> : null}
              </button>
            ) : null}
            <button type="button" onClick={share_} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 text-xs text-white/80 transition hover:bg-white/10 hover:text-white"><Share2 className="size-3.5" /> გაზიარება</button>
            {role === "owner" ? null : role ? (
              <button type="button" disabled={busy} onClick={() => act("leave")} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 text-xs text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-50"><X className="size-3.5" /> კლუბის დატოვება</button>
            ) : pending ? (
              <button type="button" disabled={busy} onClick={() => act("cancel")} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 text-xs text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-50"><X className="size-3.5" /> განაცხადის გაუქმება</button>
            ) : club.inClub ? null : (
              <button type="button" disabled={busy || (club.max > 0 && people.length >= club.max)} onClick={() => act("join")} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-[#e93748] px-3.5 text-xs font-medium text-white transition hover:bg-[#f04656] disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-white/40"><Plus className="size-3.5" /> {club.max > 0 && people.length >= club.max ? "ადგილი აღარ არის" : "განაცხადის გაგზავნა"}</button>
            )}
          </span>
        </div>
      </section>

      <div className="grid gap-2.5 min-[560px]:grid-cols-2 min-[1024px]:grid-cols-4">
        {([
          ["წევრები", `${people.length}${club.max ? ` / ${club.max}` : ""}`, Users],
          ["გამოცდილება", club.xp.toLocaleString("en-US"), Sparkles],
          ["კლუბის ხაზინა", club.vault.toLocaleString("en-US"), Gem],
          ["რეიტინგი", `#${club.rank} / ${club.total}`, Trophy],
        ] as const).map(([label, value, Icon], index) => (
          <div key={label} className="album-rise flex items-center gap-3 rounded-[14px] bg-[#121214] px-4 py-3" style={{ "--delay": `${100 + index * 60}ms` } as React.CSSProperties}>
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e93748]/12 text-[#ff8a95]"><Icon className="size-4" /></span>
            <span>
              <span className="block text-[11px] text-white/40">{label}</span>
              <span className="block text-lg leading-tight font-semibold">{value}</span>
            </span>
          </div>
        ))}
      </div>

      {manager && panel ? (
        <section id="club-manage" className="album-rise rounded-[18px] bg-[#121214] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2.5 text-base font-semibold"><span className="grid size-8 place-items-center rounded-lg bg-[#e93748]/12 text-[#ff8a95]"><SlidersHorizontal className="size-4" /></span> კლუბის მართვა</span>
            <span className="inline-flex gap-1 rounded-xl bg-[#0f0f11] p-1">
              <button type="button" onClick={() => setPanel("requests")} className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs transition ${panel === "requests" ? "bg-[#e93748] text-white" : "text-white/60 hover:bg-white/[0.06] hover:text-white"}`}>განაცხადები <span className="text-[10px] opacity-75">{requests.length}</span></button>
              {role === "owner" ? <button type="button" onClick={() => setPanel("edit")} className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs transition ${panel === "edit" ? "bg-[#e93748] text-white" : "text-white/60 hover:bg-white/[0.06] hover:text-white"}`}>რედაქტირება</button> : null}
              {role === "owner" ? <button type="button" onClick={() => setPanel("look")} className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs transition ${panel === "look" ? "bg-[#e93748] text-white" : "text-white/60 hover:bg-white/[0.06] hover:text-white"}`}>სტილი და ბეჯი</button> : null}
            </span>
          </div>

          {panel === "requests" ? (
            requests.length ? (
              <div className="mt-4 grid gap-2 min-[700px]:grid-cols-2">
                {requests.map((person) => (
                  <div key={person.id} className="flex items-center gap-3 rounded-[14px] bg-[#18181b] p-3">
                    <a href={`/profile/${encodeURIComponent(person.name)}`} className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#232327] text-sm font-semibold text-white/60">
                      {firstLetter(person.name)}
                      {person.avatar ? <img src={person.avatar} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
                    </a>
                    <span className="min-w-0 flex-1">
                      <a href={`/profile/${encodeURIComponent(person.name)}`} className="block truncate text-sm font-medium transition hover:text-[#ff8a95]">{person.name}</a>
                      <span className="block text-[11px] text-white/40">{person.joined} · ქარდები {person.cards} · უნიკ. {person.uniq}</span>
                    </span>
                    <button type="button" disabled={busy} onClick={() => answer(person, true)} className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg bg-[#e93748] px-3 text-xs font-medium text-white transition hover:bg-[#f04656] disabled:opacity-40"><Check className="size-3.5" /> მიღება</button>
                    <button type="button" disabled={busy} onClick={() => answer(person, false)} className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg bg-white/[0.06] px-3 text-xs text-white/75 transition hover:bg-white/10 hover:text-white disabled:opacity-40"><X className="size-3.5" /> უარი</button>
                  </div>
                ))}
              </div>
            ) : <p className="mt-4 rounded-[14px] bg-[#0f0f11] py-8 text-center text-sm text-white/45">ახალი განაცხადი არ არის.</p>
          ) : null}

          {panel === "edit" && role === "owner" ? (
            <form onSubmit={saveInfo} className="mt-5 grid gap-5">
              <div>
                <div className="relative h-36 overflow-hidden rounded-[16px] bg-[#18181b] sm:h-44">
                  {info.cover ? <img src={info.cover} alt="" className="h-full w-full object-cover" /> : <span className="absolute inset-0 bg-linear-to-br from-[#2a1418] to-[#121214]" />}
                  <span className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
                  <label className="absolute top-3 right-3 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-black/60 px-3 text-xs text-white/85 backdrop-blur-sm transition hover:bg-[#e93748] hover:text-white">
                    <Palette className="size-3.5" /> ქავერის შეცვლა
                    <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" disabled={busy} onChange={(event) => { void upload("cover", event.target.files?.[0]); event.target.value = ""; }} />
                  </label>
                  <div className="absolute bottom-3 left-3 flex items-end gap-3">
                    <label className="group relative grid size-16 cursor-pointer place-items-center overflow-hidden rounded-xl bg-[#232327] text-lg font-semibold text-white/60 shadow-[0_8px_20px_rgba(0,0,0,0.5)]">
                      {firstLetter(draft.name || info.name)}
                      {info.avatar ? <img src={info.avatar} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
                      <span className="absolute inset-0 grid place-items-center bg-black/55 text-[10px] text-white opacity-0 transition group-hover:opacity-100">შეცვლა</span>
                      <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" disabled={busy} onChange={(event) => { void upload("avatar", event.target.files?.[0]); event.target.value = ""; }} />
                    </label>
                    <span className="pb-1">
                      <span className="block text-base font-semibold text-white">{draft.name || "კლუბის სახელი"}</span>
                      {draft.tag ? <span className="text-[11px] font-semibold tracking-wide text-white/60">{draft.tag}</span> : null}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-white/35">სურათი ატვირთვისთანავე ინახება. JPEG, PNG, GIF ან WEBP · ავატარი 2 მბ-მდე, ქავერი 4 მბ-მდე.</p>
              </div>

              <div className="grid gap-4 min-[640px]:grid-cols-[minmax(0,1fr)_160px]">
                <div className="grid gap-1.5">
                  <span className="flex items-center justify-between text-xs text-white/55"><span>კლუბის სახელი</span><span className="text-white/30">{draft.name.length} / 40</span></span>
                  <input value={draft.name} maxLength={40} onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))} className="h-10 w-full rounded-lg bg-[#18181b] px-3 text-sm text-white outline-none transition focus:bg-[#1d1d21]" />
                </div>
                <div className="grid gap-1.5">
                  <span className="text-xs text-white/55">ტეგი</span>
                  <input value={draft.tag} maxLength={6} onChange={(event) => setDraft((value) => ({ ...value, tag: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))} placeholder="ABGE" className="h-10 w-full rounded-lg bg-[#18181b] px-3 text-sm tracking-wide text-white outline-none transition placeholder:text-white/25 focus:bg-[#1d1d21]" />
                </div>
              </div>

              <div className="grid gap-1.5">
                <span className="flex items-center justify-between text-xs text-white/55"><span>აღწერა</span><span className="text-white/30">{draft.text.length} / 1500</span></span>
                <textarea value={draft.text} maxLength={1500} rows={6} onChange={(event) => setDraft((value) => ({ ...value, text: event.target.value }))} className="w-full resize-y rounded-lg bg-[#18181b] px-3 py-2.5 text-sm leading-6 text-white outline-none transition focus:bg-[#1d1d21]" />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button type="button" onClick={() => { setDraft({ name: info.name, text: info.text, tag: info.tag }); setPanel(""); }} className="inline-flex h-10 cursor-pointer items-center rounded-lg bg-white/[0.06] px-4 text-sm text-white/75 transition hover:bg-white/10 hover:text-white">გაუქმება</button>
                <button disabled={busy || (draft.name === info.name && draft.text === info.text && draft.tag === info.tag)} className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-[#e93748] px-5 text-sm font-medium text-white transition hover:bg-[#f04656] disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-white/40"><Check className="size-4" /> შენახვა</button>
              </div>
            </form>
          ) : null}

          {panel === "look" && role === "owner" ? (
            <div className="mt-5 grid gap-6">
              <div className="flex items-center gap-4 rounded-[16px] bg-linear-to-r from-[#1f1418] to-[#151517] p-4">
                <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#232327] text-lg font-semibold text-white/60">
                  {firstLetter(club.name)}
                  {club.avatar ? <img src={club.avatar} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] text-white/40">გადახედვა</span>
                  <span className="flex items-center gap-2">
                    <span className={`truncate text-xl font-semibold ${clubName(club.style)}`}>{club.name}</span>
                    {club.badge ? <img src={club.badge} alt="" className="size-7 shrink-0 object-contain" /> : null}
                  </span>
                </span>
                <span className="hidden shrink-0 text-right sm:block">
                  <span className="block text-[11px] text-white/40">კლუბის ხაზინა</span>
                  <span className="inline-flex items-center gap-1.5 text-lg font-semibold"><Gem className="size-4 text-[#ff8a95]" /> {club.vault.toLocaleString("en-US")}</span>
                </span>
              </div>

              <div>
                <div className="flex items-end gap-3">
                  <span className="text-[22px] leading-none font-semibold text-[#e93748]">01</span>
                  <span><span className="block text-[11px] text-white/40">უფასოა, ინახება დაჭერისთანავე</span><span className="block text-base font-semibold">სახელის სტილი</span></span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 min-[640px]:grid-cols-4">
                  {clubNameStyles.map(([id, label]) => {
                    const active = club.style === id;
                    return (
                      <button key={id} type="button" disabled={busy} onClick={() => pickStyle(id)} className={`group relative flex cursor-pointer flex-col items-start gap-1 overflow-hidden rounded-[14px] p-3 text-left transition disabled:cursor-wait ${active ? "bg-[#e93748]/15" : "bg-[#18181b] hover:bg-[#1f1f23]"}`}>
                        <span className={`block w-full truncate text-base font-semibold ${clubName(id)}`}>{club.name}</span>
                        <span className={`text-[11px] ${active ? "text-[#ff8a95]" : "text-white/45"}`}>{label}</span>
                        {active ? <span className="absolute top-2.5 right-2.5 grid size-5 place-items-center rounded-full bg-[#e93748] text-white"><Check className="size-3" /></span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <span className="flex items-end gap-3">
                    <span className="text-[22px] leading-none font-semibold text-[#e93748]">02</span>
                    <span><span className="block text-[11px] text-white/40">იყიდება კლუბის ხაზინიდან</span><span className="block text-base font-semibold">კლუბის ბეჯი</span></span>
                  </span>
                  {club.badge ? <button type="button" disabled={busy} onClick={() => pickBadge(null)} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 text-xs text-white/75 transition hover:bg-white/10 hover:text-white disabled:opacity-40"><X className="size-3.5" /> ბეჯის მოხსნა</button> : null}
                </div>
                {club.badges.length ? (
                  <div className="mt-3 grid grid-cols-3 gap-2 min-[560px]:grid-cols-4 min-[800px]:grid-cols-6 min-[1100px]:grid-cols-7">
                    {club.badges.map((badge) => {
                      const active = club.badge === badge.image;
                      const locked = club.level < badge.level;
                      const poor = !active && club.vault < badge.price;
                      return (
                        <button key={badge.id} type="button" disabled={busy || active || locked || poor} onClick={() => pickBadge(badge)} title={locked ? `საჭიროა ${badge.level} დონე` : poor ? "ხაზინაში საკმარისი თანხა არ არის" : badge.name} className={`group relative flex cursor-pointer flex-col items-center gap-1.5 rounded-[14px] p-3 transition disabled:cursor-not-allowed ${active ? "bg-[#e93748]/15" : "bg-[#18181b] enabled:hover:-translate-y-0.5 enabled:hover:bg-[#1f1f23]"}`}>
                          <img src={badge.image} alt="" loading="lazy" className={`size-12 object-contain transition group-enabled:group-hover:scale-110 ${locked ? "opacity-30 grayscale" : poor ? "opacity-50" : ""}`} />
                          <span className="w-full truncate text-center text-[11px] text-white/70">{badge.name}</span>
                          <span className={`inline-flex items-center gap-1 text-[10px] ${active ? "text-[#ff8a95]" : locked ? "text-white/35" : "text-white/50"}`}>
                            {active ? <><Check className="size-3" /> დაყენებული</> : locked ? <><Lock className="size-3" /> დონე {badge.level}</> : <><Gem className="size-3" /> {badge.price.toLocaleString("en-US")}</>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : <p className="mt-3 rounded-[14px] bg-[#0f0f11] py-8 text-center text-sm text-white/45">ბეჯები ვერ მოიძებნა.</p>}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <div id="club-about" className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="album-rise rounded-[18px] bg-[#121214] p-5" style={{ "--delay": "160ms" } as React.CSSProperties}>
          <button type="button" onClick={() => setAboutOpen((value) => !value)} className="flex w-full cursor-pointer items-end justify-between gap-3 text-left">
            <span className="flex items-end gap-3">
              <span className="text-[24px] leading-none font-semibold text-[#e93748]">01</span>
              <span><span className="block text-[11px] text-white/40">გაიცანი კლუბი</span><span className="block text-lg font-semibold">კლუბის შესახებ</span></span>
            </span>
            <ChevronDown className={`size-4 text-white/45 transition ${aboutOpen ? "rotate-180" : ""}`} />
          </button>
          {aboutOpen ? (
            <div className="mt-4">
              <p className="text-sm leading-7 whitespace-pre-line text-white/65">{club.text || "კლუბს აღწერა ჯერ არ აქვს."}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-2 rounded-lg bg-white/[0.04] py-1.5 pr-3 pl-1.5">
                  <span className="relative grid size-6 place-items-center overflow-hidden rounded-md bg-[#232327] text-[10px] text-white/60">
                    {firstLetter(club.owner)}
                    {club.ownerAvatar ? <img src={club.ownerAvatar} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
                  </span>
                  მფლობელი: <b className="font-medium text-white">{club.owner || "—"}</b>
                </span>
                {club.created ? <span className="inline-flex items-center rounded-lg bg-white/[0.04] px-3 py-1.5">შეიქმნა: <b className="ml-1 font-medium text-white">{club.created}</b></span> : null}
              </div>
            </div>
          ) : null}
        </section>

        <aside className="album-rise rounded-[18px] bg-linear-to-br from-[#1b1418] to-[#121214] p-5" style={{ "--delay": "220ms" } as React.CSSProperties}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium tracking-wide text-[#ff8a95]">კლუბის შევსება</span>
            <Users className="size-4 text-white/40" />
          </div>
          <p className="mt-2 text-[28px] leading-none font-semibold">{people.length}<span className="ml-1 text-sm font-normal text-white/40">{club.max ? `/ ${club.max} ადგილი` : "წევრი"}</span></p>
          <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <span className="album-fill absolute inset-y-0 left-0 rounded-full bg-[#e93748]" style={{ width: `${share}%`, "--delay": "300ms" } as React.CSSProperties} />
          </div>
          <p className="mt-2.5 text-xs text-white/45">{club.max ? (people.length >= club.max ? "კლუბი სავსეა." : `თავისუფალია ${club.max - people.length} ადგილი.`) : "ადგილების ლიმიტი არ არის."}</p>
          <p className="mt-3 text-xs text-white/45">წევრების ჯამური კოლექცია: <b className="font-semibold text-white">{totalCards.toLocaleString("en-US")}</b> ქარდი</p>
          {requests.length ? <button type="button" onClick={() => { setPanel("requests"); document.getElementById("club-manage")?.scrollIntoView({ behavior: "smooth", block: "center" }); }} className="mt-3 w-full cursor-pointer rounded-[10px] bg-[#e93748]/10 px-3 py-2 text-left text-xs text-[#ff8a95] transition hover:bg-[#e93748]/16">მოლოდინში {requests.length} განაცხადი →</button> : null}
        </aside>
      </div>

      <section id="club-growth" className="album-rise rounded-[18px] bg-[#121214] p-5" style={{ "--delay": "240ms" } as React.CSSProperties}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-end gap-3">
            <span className="text-[24px] leading-none font-semibold text-[#e93748]">02</span>
            <span><span className="block text-[11px] text-white/40">ქარდების შეწირვა</span><span className="block text-lg font-semibold">კლუბის განვითარება</span></span>
          </div>
          {role ? (
            <button type="button" disabled={busy} onClick={() => setDonating(true)} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-[#e93748] px-4 text-xs font-medium text-white transition hover:bg-[#f04656] disabled:opacity-50"><Heart className="size-3.5" /> ქარდების შეწირვა</button>
          ) : <span className="text-xs text-white/40">შეწირვა მხოლოდ წევრებს შეუძლიათ.</span>}
        </div>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid gap-4">
            <div key={levelUp} className={`relative overflow-hidden rounded-[16px] bg-linear-to-br from-[#24141a] via-[#181316] to-[#141416] p-4 ${levelUp ? "awake-reveal" : ""}`}>
              <div className="flex items-center gap-4">
                <span className="relative grid size-16 shrink-0 place-items-center rounded-2xl bg-[#e93748]/15">
                  <span className="text-[10px] text-[#ff8a95]">დონე</span>
                  <span className="absolute inset-x-0 bottom-2 text-center text-2xl leading-none font-semibold">{club.level}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm text-white/55">{levelUp ? <b className="font-semibold text-[#ff8a95]">ახალი დონე — {levelUp}!</b> : ceil === undefined ? "მაქსიმალური დონე" : `შემდეგ დონემდე ${(ceil - club.xp).toLocaleString("en-US")} XP`}</span>
                    <span className="text-xs text-white/45"><b className="text-base font-semibold text-white">{club.xp.toLocaleString("en-US")}</b>{ceil === undefined ? " XP" : ` / ${ceil.toLocaleString("en-US")} XP`}</span>
                  </span>
                  <span className="relative mt-2.5 block h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <span className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-[#e93748] to-[#ff6b7a] transition-all duration-700" style={{ width: `${growthShare}%` }} />
                  </span>
                </span>
              </div>
              <div className="mt-4 flex gap-1.5 overflow-x-auto pb-0.5">
                {steps.map((level, index) => {
                  const done = club.level > level;
                  const now = club.level === level;
                  const gap = index > 0 && level - steps[index - 1] > 1;
                  return (
                    <span key={level} className="flex flex-1 items-center gap-1.5">
                      {gap ? <span className="text-xs text-white/25">…</span> : null}
                      <span className={`flex min-w-[78px] flex-1 flex-col items-center rounded-[10px] px-2 py-1.5 text-center ${now ? "bg-[#e93748] text-white" : done ? "bg-[#e93748]/12 text-[#ff8a95]" : level % 50 === 0 ? "bg-white/[0.07] text-white/70" : "bg-white/[0.04] text-white/45"}`}>
                        <span className="text-[11px] font-semibold">{level} დონე</span>
                        <span className={`text-[10px] ${now ? "text-white/80" : "opacity-75"}`}>{xpFor(level).toLocaleString("en-US")} XP</span>
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
              <span className="mr-1">XP კურსი</span>
              {donateRanks.map((key) => <span key={key} className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-[#18181b] px-2.5"><b style={{ color: tone[key] }}>{key}</b><span className="text-white/60">+{club.rates[key] ?? 5}</span></span>)}
            </div>

            <div>
              <p className="text-[11px] font-medium tracking-wide text-white/40">ბოლო შეწირვები</p>
              {donations.length ? (
                <div className="mt-2 grid gap-1.5 min-[640px]:grid-cols-2">
                  {donations.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-[12px] bg-[#18181b] p-2">
                      <span className="relative h-12 w-8 shrink-0 overflow-hidden rounded-md bg-[#232327]">
                        {item.image && !/\.(webm|mp4)(\?|$)/i.test(item.image) ? <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs"><b className="font-medium text-white">{item.name}</b> <span className="text-white/45">შესწირა</span> <span style={{ color: tone[item.rarity] }}>{item.rarity}</span></span>
                        <span className="block truncate text-[11px] text-white/45">{item.card} · {item.date}</span>
                      </span>
                      <span className="shrink-0 rounded-md bg-[#e93748]/12 px-1.5 py-0.5 text-[11px] font-semibold text-[#ff8a95]">+{item.xp}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="mt-2 rounded-[12px] bg-[#0f0f11] py-6 text-center text-sm text-white/45">ჯერ არავის შეუწირავს ქარდი.</p>}
            </div>
          </div>

          <aside className="rounded-[16px] bg-[#18181b] p-4">
            <span className="flex items-center justify-between text-[11px] font-medium tracking-wide text-[#ff8a95]">საუკეთესო შემწირველები <Trophy className="size-4 text-white/40" /></span>
            {donors.length ? (
              <div className="mt-3 grid gap-1.5">
                {donors.map((item, index) => (
                  <a key={item.id} href={`/profile/${encodeURIComponent(item.name)}`} className={`flex items-center gap-2.5 rounded-[10px] p-2 transition ${index === 0 ? "bg-[#e93748]/12 hover:bg-[#e93748]/18" : "bg-white/[0.03] hover:bg-white/[0.06]"}`}>
                    <span className={`w-4 text-center text-xs font-semibold ${index === 0 ? "text-[#ff8a95]" : "text-white/40"}`}>{index + 1}</span>
                    <span className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#232327] text-xs text-white/60">
                      {firstLetter(item.name)}
                      {item.avatar ? <img src={item.avatar} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
                    </span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.name}</span><span className="block text-[11px] text-white/40">{item.cards} ქარდი</span></span>
                    <span className="text-xs font-semibold text-white">{item.xp.toLocaleString("en-US")} <span className="font-normal text-white/40">XP</span></span>
                  </a>
                ))}
              </div>
            ) : <p className="mt-3 text-sm text-white/45">სია ცარიელია. იყავი პირველი!</p>}
          </aside>
        </div>
      </section>

      {donating ? <ClubDonate copies={copies} rates={club.rates} busy={busy} onClose={() => setDonating(false)} onDonate={donate} /> : null}

      {club.friends.length ? (
        <section id="club-friends" className="album-rise rounded-[18px] bg-[#121214] p-5" style={{ "--delay": "260ms" } as React.CSSProperties}>
          <div className="flex items-end gap-3">
            <span className="text-[24px] leading-none font-semibold text-[#e93748]">03</span>
            <span><span className="block text-[11px] text-white/40">მოკავშირეები</span><span className="block text-lg font-semibold">მეგობარი კლუბები</span></span>
          </div>
          <div className="mt-4 grid gap-2 min-[560px]:grid-cols-2 min-[1024px]:grid-cols-3">
            {club.friends.map((friend) => (
              <a key={friend.id} href={`/clubs/${friend.id}`} className="group flex items-center gap-3 rounded-[12px] bg-[#18181b] p-2.5 transition hover:bg-[#1d1d21]">
                <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#232327] text-sm font-semibold text-white/60">
                  {firstLetter(friend.name)}
                  {friend.avatar ? <img src={friend.avatar} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
                </span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium transition group-hover:text-[#ff8a95]">{friend.name}</span><span className="block text-[11px] text-white/40">{friend.level} დონე</span></span>
                <ArrowUpRight className="size-4 text-white/30 transition group-hover:text-white" />
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section id="club-people" className="album-rise rounded-[18px] bg-[#121214] p-5" style={{ "--delay": "300ms" } as React.CSSProperties}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-end gap-3">
            <span className="text-[24px] leading-none font-semibold text-[#e93748]">{club.friends.length ? "04" : "03"}</span>
            <span><span className="block text-[11px] text-white/40">გუნდი</span><span className="flex items-center gap-2 text-lg font-semibold">კლუბის შემადგენლობა <span className="rounded-md bg-white/[0.06] px-1.5 text-[11px] font-medium text-white/55">{people.length}</span></span></span>
          </div>
          <span className="flex items-center gap-3 text-[11px] text-white/40">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#e93748]" /> მფლობელი</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-white/50" /> მოდერატორი</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-white/15" /> წევრი</span>
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <label className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-lg bg-[#18181b] px-3">
            <Search className="size-4 text-white/40" />
            <input value={find} onChange={(event) => { setFind(event.target.value); setShown(clubPeopleStep); }} placeholder="წევრის სახელი" className="w-full bg-transparent text-xs outline-none placeholder:text-white/30" />
          </label>
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-9 cursor-pointer rounded-lg border-0 bg-[#18181b] px-3 text-xs text-[#d1d5dc] outline-none">
            {clubPeopleSorts.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>

        {visible.length ? (
          <div key={`${sort}-${text}`} className="mt-4 grid gap-2.5 min-[560px]:grid-cols-2 min-[1024px]:grid-cols-3">
            {visible.map((person, index) => tile(person, index))}
          </div>
        ) : (
          <p className="mt-6 py-8 text-center text-sm text-white/45">{text ? "წევრი ვერ მოიძებნა." : "კლუბში ჯერ წევრი არ არის."}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-white/40">
          <span>ნაჩვენებია {visible.length} / {list.length}</span>
          {list.length > shown ? <button type="button" onClick={() => setShown((value) => value + clubPeopleStep)} className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-white/[0.06] px-4 text-white/80 transition hover:bg-white/10 hover:text-white">კიდევ {Math.min(clubPeopleStep, list.length - shown)}</button> : null}
        </div>
      </section>
    </div>
  );
}

function Collectors({ data }: { data: PlayData }) {
  if (!data.collectors.length) return <p className="text-center text-sm text-white/45">ჯერ არავინ არის.</p>;
  const podium = data.collectors.slice(0, 3);
  const rest = data.collectors.slice(3);
  const order = [1, 0, 2].filter((index) => podium[index]);
  return (
    <div>
      <h1 className="mb-2 text-center text-[22px] font-medium tracking-tight">საუკეთესო კოლექციონერები</h1>
      <p className="mb-8 text-center text-sm text-white/45">რეიტინგი უნიკალური ქარდების რაოდენობით ითვლება, თანაბრობისას კი კოლექციის ღირებულებით.</p>
      <div className="mx-auto grid max-w-[860px] grid-cols-3 items-end gap-3 sm:gap-4">
        {order.map((index) => {
          const person = podium[index];
          const first = index === 0;
          return (
            <a key={person.id} href={`/profile/${encodeURIComponent(person.name)}`} className={`relative flex flex-col items-center rounded-[18px] border bg-[#121214] px-3 text-center transition hover:border-white/20 ${first ? "border-[#e93748]/40 pt-8 pb-6" : "border-white/10 pt-6 pb-5"}`}>
              {first ? <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#e93748] to-transparent" /> : null}
              <span className={`absolute -top-3 grid size-7 place-items-center rounded-full text-xs font-bold ${first ? "bg-[#e93748] text-white" : "border border-white/10 bg-[#1a1a1a] text-white/80"}`}>{index + 1}</span>
              <span className={`overflow-hidden rounded-full border-2 bg-[#1a1a1a] ${first ? "size-20 border-[#e93748]/60" : "size-16 border-white/10"}`}>
                {person.avatar ? <img src={person.avatar} alt="" className="h-full w-full object-cover" /> : null}
              </span>
              <span className="mt-3 max-w-full truncate text-sm font-semibold text-white">{person.name}</span>
              <span className="mt-1 text-xs text-white/45"><b className="text-base font-semibold text-white">{person.unique}</b> უნიკალური</span>
              <span className="mt-0.5 text-[11px] text-white/35">{person.total} ქარდი · უმაღლესი {person.top}</span>
            </a>
          );
        })}
      </div>
      {rest.length ? (
        <div className="mx-auto mt-6 max-w-[860px] overflow-hidden rounded-[18px] border border-white/10 bg-[#121214]">
          <div className="grid grid-cols-[48px_minmax(0,1fr)_90px_90px] gap-3 border-b border-white/[0.06] px-4 py-3 text-xs text-white/35 sm:grid-cols-[56px_minmax(0,1fr)_110px_110px_90px]">
            <span>#</span><span>მომხმარებელი</span><span className="text-right">უნიკალური</span><span className="text-right">სულ</span><span className="hidden text-right sm:block">უმაღლესი</span>
          </div>
          {rest.map((person, index) => (
            <a key={person.id} href={`/profile/${encodeURIComponent(person.name)}`} className={`grid grid-cols-[48px_minmax(0,1fr)_90px_90px] items-center gap-3 border-b border-white/[0.04] px-4 py-2.5 text-sm transition last:border-0 hover:bg-white/[0.03] sm:grid-cols-[56px_minmax(0,1fr)_110px_110px_90px] ${person.me ? "bg-[#e93748]/[0.07]" : ""}`}>
              <span className="text-white/40">{index + 4}</span>
              <span className="flex min-w-0 items-center gap-3">
                <span className="size-8 shrink-0 overflow-hidden rounded-full bg-[#1a1a1a]">{person.avatar ? <img src={person.avatar} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}</span>
                <span className="truncate text-white/85">{person.name}</span>
              </span>
              <span className="text-right font-semibold text-white">{person.unique}</span>
              <span className="text-right text-white/55">{person.total}</span>
              <span className="hidden text-right text-white/55 sm:block">{person.top}</span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const faqGroups = [
  {
    id: "basics", title: "საფუძვლები", hint: "სად დავიწყო", icon: LayoutGrid,
    items: [
      ["რა არის ქარდები?", "ქარდები საკოლექციო ბარათებია, რომლებიც კონკრეტულ ანიმეს და პერსონაჟს უკავშირდება. თითოეულ ქარდს აქვს რანგი — E, D, C, B, A, S, S+ ან RE. რაც უფრო მაღალია რანგი, მით უფრო იშვიათია ქარდი."],
      ["როგორ მივიღო ქარდები?", "ქარდები პაკებიდან მოდის. პაკი სამ შემთხვევით ქარდს გაჩვენებს და შენ ერთს ირჩევ. ქარდის მიღება მარკეტზე, გაცვლით და გამოღვიძებითაც შეიძლება."],
      ["რა არის ვიტრინა?", "ვიტრინაში შენი საუკეთესო ქარდები გამოიტანე. ვიტრინის ქარდები დაცულია: მათი დაწვა, შეწირვა ან გამოღვიძებაში გამოყენება შემთხვევით ვერ მოხდება."],
      ["რა არის კოლექციები?", "კოლექცია შენ მიერ შედგენილი ქარდების ნაკრებია. შეგიძლია შექმნა თემატური კოლექცია და გაუზიარო სხვებს, ისინი კი მოიწონებენ."],
    ],
  },
  {
    id: "packs", title: "პაკები და მონეტები", hint: "ეკონომიკა", icon: Package,
    items: [
      ["რამდენი ღირს პაკი?", "ერთი პაკი 150 მონეტა ღირს. შეგიძლია ერთად გახსნა 1, 6 ან 20 პაკი."],
      ["რა არის ბონუს A და გარანტირებული S?", "ყოველ 50-ე პაკზე სამივე ქარდი A რანგისაა. ყოველ 200-ე პაკზე კი შემთხვევითი S ქარდი პირდაპირ კოლექციას ემატება, ჩვეულებრივი ვარდნის გარდა."],
      ["როგორ ვიშოვო მონეტები?", "მონეტებს იღებ დღიური ბონუსით, ქარდების გაყიდვით, აუქციონით, ცხოველის ექსპედიციით, ლაბირინთით და გამოღვიძებით. დეტალები პაკების გვერდზე, „პაკებისა და მონეტების შესახებ“ განყოფილებაშია."],
    ],
  },
  {
    id: "brick", title: "ციური აგური და გამოღვიძება", hint: "ქარდების გაძლიერება", icon: Gem,
    items: [
      ["რა არის ციური აგური?", "ციურ აგურში ზედმეტ ქარდებს წვავ და ენერგიას აგროვებ. ენერგია რანგზეა დამოკიდებული: E, D და C — 1, B — 2, A — 3, S — 8, S+ — 15, RE — 25. მაქსიმუმ 1000 ენერგია ინახება."],
      ["როგორ მუშაობს გამოღვიძება?", "გამოღვიძებას 1000 ენერგია სჭირდება. სამი S ქარდიდან შემთხვევითი S+ მოდის, სამი S+ ქარდიდან — შემთხვევითი RE. წარმატების შანსი 95%-ია."],
      ["რა ხდება, თუ გამოღვიძება ჩავარდა?", "ჩავარდნისას ქარდები და ენერგია იხარჯება, სანაცვლოდ 40 მონეტას იღებ. წარმატებისას ახალ ქარდთან ერთად 200 მონეტა მოდის."],
    ],
  },
  {
    id: "trade", title: "გაცვლა და მარკეტი", hint: "სხვა მოთამაშეებთან", icon: RefreshCw,
    items: [
      ["როგორ გავცვალო ქარდი?", "სხვა მომხმარებლის ქარდზე გაცვლას სთავაზობ შენი ქარდის სანაცვლოდ. „გაცვლების“ გვერდზე ხედავ შემოსულ და გაგზავნილ შეთავაზებებს — შეგიძლია მიიღო, უარყო ან გააუქმო."],
      ["როგორ მუშაობს მარკეტი?", "მარკეტზე ქარდს აუქციონზე გამოიტან საწყისი ფასით და, სურვილისამებრ, „ახლავე ყიდვის“ ფასით. სხვები ფსონს დებენ, ან ქარდს პირდაპირ ყიდულობენ. გაყიდვაში მყოფი ქარდის სხვაგან გამოყენება არ შეიძლება."],
    ],
  },
  {
    id: "clubs", title: "კლუბები", hint: "ერთად უფრო ძლიერები", icon: Shield,
    items: [
      ["რა არის კლუბები?", "კლუბი მომხმარებლების გაერთიანებაა. კლუბს აქვს დონე, ხაზინა, წევრები, მეგობარი კლუბები და საერთო გამოცდილება, რომელიც წევრების აქტივობით იზრდება."],
      ["როგორ გავწევრიანდე კლუბში?", "კლუბის გვერდზე გააგზავნე განაცხადი. მას მფლობელი ან მოდერატორი იღებს ან უარყოფს. ერთდროულად მხოლოდ ერთი კლუბის წევრი შეიძლება იყო."],
      ["როგორ აიწევს კლუბის დონე?", "წევრები კლუბს ქარდებს სწირავენ და XP-ს მატებენ: E — 5, D — 10, C — 20, B — 40, A — 80, S — 160, S+ — 320, RE — 640. დონე 500-მდე იზრდება და ყოველი შემდეგი დონე ცოტა მეტ XP-ს მოითხოვს. დონე არასდროს იკლებს."],
      ["რა არის კლუბის ბეჯი და სახელის სტილი?", "მფლობელს შეუძლია კლუბს სახელის სტილი უფასოდ შეურჩიოს, ხოლო ბეჯი იყიდოს კლუბის ხაზინიდან — მას 6 დონე სჭირდება."],
    ],
  },
  {
    id: "rating", title: "რეიტინგი", hint: "საუკეთესოები", icon: Trophy,
    items: [
      ["როგორ ითვლება საუკეთესო კოლექციონერი?", "რეიტინგი უნიკალური ქარდების რაოდენობით ითვლება. თუ ორ მომხმარებელს ერთნაირი რაოდენობა აქვს, მაღლა ის დგას, ვისი კოლექციაც უფრო ძვირფასია."],
      ["როგორ ითვლება კლუბების რეიტინგი?", "კლუბები ჯერ დონით ლაგდება, შემდეგ გამოცდილებით. რაც უფრო აქტიურად სწირავენ წევრები ქარდებს, მით მაღლა დგას კლუბი."],
    ],
  },
] as const;

const faqLinks = [
  ["/packs", "პაკების გახსნა", Package],
  ["/cards/mine/skybrick", "ციური აგური", Gem],
  ["/awaken", "გამოღვიძება", Zap],
  ["/clubs", "კლუბები", Shield],
  ["/collectors", "კოლექციონერები", Trophy],
] as const;

function Faq() {
  const [open, setOpen] = useState("basics-0");
  const [topic, setTopic] = useState("");
  const [find, setFind] = useState("");
  const text = find.trim().toLowerCase();
  const groups = faqGroups
    .filter((group) => !topic || group.id === topic)
    .map((group) => ({ ...group, rows: group.items.map(([question, answer], index) => ({ question, answer, key: `${group.id}-${index}` })).filter((row) => !text || row.question.toLowerCase().includes(text) || row.answer.toLowerCase().includes(text)) }))
    .filter((group) => group.rows.length);
  const total = faqGroups.reduce((sum, group) => sum + group.items.length, 0);
  const chip = "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition";

  return (
    <div className="grid gap-5">
      <section className="album-rise relative overflow-hidden rounded-[22px] bg-linear-to-br from-[#2a1418] via-[#161214] to-[#121214] px-6 py-8 sm:px-10 sm:py-10">
        <span className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-[#e93748]/15 blur-3xl" />
        <span className="pointer-events-none absolute right-8 bottom-6 hidden text-[120px] leading-none font-bold text-white/[0.03] sm:block">?</span>
        <div className="relative max-w-[640px]">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-[#e93748]/15 px-2 py-1 text-[11px] font-medium text-[#ff8a95]"><CircleHelp className="size-3.5" /> დახმარების ცენტრი</span>
          <h1 className="mt-3 text-[28px] leading-tight font-semibold tracking-tight sm:text-[36px]">ხშირად დასმული კითხვები</h1>
          <p className="mt-2 text-sm leading-6 text-white/55">ყველაფერი ქარდების, პაკების, ციური აგურის, გამოღვიძებისა და კლუბების შესახებ — {total} პასუხი ერთ ადგილას.</p>
          <label className="mt-5 flex h-11 items-center gap-2.5 rounded-xl bg-black/35 px-4 backdrop-blur-sm transition focus-within:bg-black/50">
            <Search className="size-4 text-white/40" />
            <input value={find} onChange={(event) => setFind(event.target.value)} placeholder="მოძებნე კითხვა, მაგ. „გამოღვიძება“" className="w-full bg-transparent text-sm outline-none placeholder:text-white/30" />
            {find ? <button type="button" aria-label="გასუფთავება" onClick={() => setFind("")} className="cursor-pointer text-white/40 transition hover:text-white"><X className="size-4" /></button> : null}
          </label>
        </div>
      </section>

      <div className="album-rise flex flex-wrap gap-1 rounded-xl bg-[#121214] p-1" style={{ "--delay": "60ms" } as React.CSSProperties}>
        <button type="button" onClick={() => setTopic("")} className={`${chip} ${topic ? "text-white/60 hover:bg-white/[0.06] hover:text-white" : "bg-[#e93748] text-white"}`}>ყველა <span className="text-[10px] opacity-70">{total}</span></button>
        {faqGroups.map((group) => (
          <button key={group.id} type="button" onClick={() => setTopic(topic === group.id ? "" : group.id)} className={`${chip} ${topic === group.id ? "bg-[#e93748] text-white" : "text-white/60 hover:bg-white/[0.06] hover:text-white"}`}>
            <group.icon className="size-3.5" /> {group.title}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4">
          {groups.length ? groups.map((group, groupIndex) => (
            <section key={group.id} className="album-rise rounded-[18px] bg-[#121214] p-5" style={{ "--delay": `${100 + groupIndex * 60}ms` } as React.CSSProperties}>
              <div className="flex items-end gap-3">
                <span className="text-[24px] leading-none font-semibold text-[#e93748]">{String(faqGroups.findIndex((item) => item.id === group.id) + 1).padStart(2, "0")}</span>
                <span><span className="block text-[11px] text-white/40">{group.hint}</span><span className="block text-lg font-semibold">{group.title}</span></span>
              </div>
              <div className="mt-4 grid gap-1.5">
                {group.rows.map((row) => {
                  const isOpen = open === row.key || Boolean(text);
                  return (
                    <div key={row.key} className={`overflow-hidden rounded-[14px] transition ${isOpen ? "bg-[#1b1b1f]" : "bg-[#18181b] hover:bg-[#1b1b1f]"}`}>
                      <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-3.5 text-left" onClick={() => setOpen(open === row.key ? "" : row.key)}>
                        <span className="flex items-center gap-3">
                          <span className={`size-1.5 shrink-0 rounded-full transition ${isOpen ? "bg-[#e93748]" : "bg-white/20"}`} />
                          <span className={`text-[15px] transition ${isOpen ? "text-white" : "text-white/80"}`}>{row.question}</span>
                        </span>
                        <span className={`grid size-7 shrink-0 place-items-center rounded-lg transition ${isOpen ? "bg-[#e93748]/15 text-[#ff8a95]" : "bg-white/[0.04] text-white/40"}`}>
                          <ChevronDown className={`size-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                        </span>
                      </button>
                      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                        <div className="overflow-hidden">
                          <p className="px-4 pb-4 pl-[34px] text-sm leading-7 text-white/60">{row.answer}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )) : (
            <div className="album-rise rounded-[18px] bg-[#121214] py-14 text-center">
              <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-[#e93748]/12 text-[#ff8a95]"><Search className="size-5" /></span>
              <p className="mt-3 text-sm text-white/50">ასეთი კითხვა ვერ მოიძებნა.</p>
              <button type="button" onClick={() => { setFind(""); setTopic(""); }} className="mt-4 inline-flex h-9 cursor-pointer items-center rounded-lg bg-white/[0.06] px-4 text-xs text-white/75 transition hover:bg-white/10 hover:text-white">ფილტრის გასუფთავება</button>
            </div>
          )}
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-24">
          <div className="album-rise rounded-[18px] bg-linear-to-br from-[#1b1418] to-[#121214] p-5" style={{ "--delay": "140ms" } as React.CSSProperties}>
            <span className="text-[11px] font-medium tracking-wide text-[#ff8a95]">რანგების კიბე</span>
            <p className="mt-1 text-xs text-white/45">ყველაზე ხშირიდან ყველაზე იშვიათამდე</p>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {["E", "D", "C", "B", "A", "S", "S+", "RE"].map((key) => (
                <span key={key} className="flex h-10 items-center justify-center rounded-lg bg-black/30 text-sm font-bold" style={{ color: tone[key] }}>{key}</span>
              ))}
            </div>
          </div>

          <div className="album-rise rounded-[18px] bg-[#121214] p-5" style={{ "--delay": "200ms" } as React.CSSProperties}>
            <span className="text-[11px] font-medium tracking-wide text-white/40">სწრაფი ბმულები</span>
            <div className="mt-3 grid gap-1.5">
              {faqLinks.map(([href, label, Icon]) => (
                <a key={href} href={href} className="group flex items-center gap-3 rounded-[12px] bg-[#18181b] px-3 py-2.5 text-sm text-white/75 transition hover:bg-[#1d1d21] hover:text-white">
                  <span className="grid size-8 place-items-center rounded-lg bg-[#e93748]/12 text-[#ff8a95]"><Icon className="size-4" /></span>
                  <span className="flex-1">{label}</span>
                  <ChevronRight className="size-4 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white" />
                </a>
              ))}
            </div>
          </div>

          <div className="album-rise rounded-[18px] bg-[#e93748]/10 p-5" style={{ "--delay": "260ms" } as React.CSSProperties}>
            <span className="grid size-9 place-items-center rounded-lg bg-[#e93748] text-white"><Sparkles className="size-4" /></span>
            <p className="mt-3 text-sm font-semibold">კითხვა მაინც დაგრჩა?</p>
            <p className="mt-1 text-xs leading-5 text-white/55">მიწერე ადმინისტრაციას ან ჰკითხე კლუბის წევრებს — სიამოვნებით დაგეხმარებიან.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

const deckSorts = [
  ["new", "ახლახან შექმნილი"],
  ["old", "ძველი"],
  ["likes", "პოპულარული"],
  ["views", "ნახვებით"],
  ["size", "ქარდების რაოდენობით"],
] as const;

function DeckCard({ deck, index }: { deck: PlayData["decks"][number]; index: number }) {
  const images = deck.images?.length ? deck.images : deck.image ? [deck.image] : [];
  const spread = images.length;
  return (
    <a href={`/decks/${deck.id}`} className="album-rise group relative block pt-3" style={{ "--delay": `${Math.min(index, 9) * 60}ms` } as React.CSSProperties}>
      <span className="absolute inset-x-8 top-0 h-6 rounded-t-[14px] bg-[#1a1a1d] transition duration-300 group-hover:-translate-y-1" />
      <span className="absolute inset-x-4 top-1.5 h-6 rounded-t-[14px] bg-[#18181b] transition duration-300 group-hover:-translate-y-0.5" />
      <span className="relative block rounded-[16px] bg-[#161618] p-4 shadow-[0_14px_32px_rgba(0,0,0,0.35)] transition duration-300 group-hover:bg-[#19191c]">
        <span className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <span className="relative grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-white/[0.06] text-[11px] font-semibold text-white/60 uppercase">
              {firstLetter(deck.author)}
              {deck.avatar ? <img src={deck.avatar} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
            </span>
            <span className="truncate text-sm text-white/80">{deck.author}</span>
          </span>
          <span className="flex shrink-0 items-center gap-3 text-xs text-white/50">
            <span className="inline-flex items-center gap-1"><Heart className="size-3.5" /> {deck.likes}</span>
            <span className="inline-flex items-center gap-1"><Layers className="size-3.5" /> {deck.count}</span>
            <span className="inline-flex items-center gap-1"><Eye className="size-3.5" /> {deck.views ?? 0}</span>
          </span>
        </span>
        <span className="relative mt-4 flex h-[150px] items-center justify-center">
          {spread ? images.map((image, slot) => {
            const offset = slot - (spread - 1) / 2;
            const moving = /\.(webm|mp4)(\?|$)/i.test(image);
            return (
              <span key={`${image}-${slot}`} className="absolute top-1/2 left-1/2 h-[136px] w-[91px] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ transform: `translate(calc(-50% + ${offset * 46}px), -50%) rotate(${offset * 3}deg)`, zIndex: 10 - Math.abs(Math.round(offset)) }}>
                <span className="block h-full w-full overflow-hidden rounded-[9px] bg-[#1a1a1a] shadow-[0_10px_22px_rgba(0,0,0,0.5)] transition duration-300 group-hover:-translate-y-1.5" style={{ transitionDelay: `${slot * 30}ms` }}>
                  {moving ? <video src={image} muted loop playsInline className="h-full w-full object-cover" /> : <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />}
                </span>
              </span>
            );
          }) : <span className="grid size-14 place-items-center rounded-2xl bg-white/[0.04] text-white/30"><Layers className="size-6" /></span>}
        </span>
        <span className="mt-4 block truncate text-center text-[15px] font-semibold text-white">{deck.title}</span>
      </span>
    </a>
  );
}

const builderPerPage = 60;

function DeckBuilder({ data }: { data: PlayData }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [chosen, setChosen] = useState<number[]>([]);
  const [find, setFind] = useState("");
  const [rank, setRank] = useState("");
  const [dupesOnly, setDupesOnly] = useState(false);
  const [pickedOnly, setPickedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const copies = data.copies;
  const totals = new Map<number, number>();
  for (const copy of copies) totals.set(copy.cardId, (totals.get(copy.cardId) ?? 0) + 1);
  const seen = new Map<number, number>();
  const numbered = copies.map((copy) => {
    const nth = (seen.get(copy.cardId) ?? 0) + 1;
    seen.set(copy.cardId, nth);
    return { ...copy, nth, of: totals.get(copy.cardId) ?? 1 };
  }).sort((a, b) => a.name.localeCompare(b.name) || a.cardId - b.cardId || a.nth - b.nth);
  const query = find.trim().toLowerCase();
  const picked = new Set(chosen);
  const list = numbered
    .filter((copy) => !query || copy.name.toLowerCase().includes(query))
    .filter((copy) => !rank || copy.rarity.toUpperCase() === rank)
    .filter((copy) => !dupesOnly || copy.of > 1)
    .filter((copy) => !pickedOnly || picked.has(copy.id));
  const pages = Math.max(1, Math.ceil(list.length / builderPerPage));
  const current = Math.min(page, pages);
  const visible = list.slice((current - 1) * builderPerPage, current * builderPerPage);
  const ranks = wishRanks.filter((item) => numbered.some((copy) => copy.rarity.toUpperCase() === item));
  const preview = chosen.slice(-5).map((id) => numbered.find((copy) => copy.id === id)).filter(Boolean) as typeof numbered;
  const allVisible = list.length > 0 && list.every((copy) => picked.has(copy.id));
  const dupes = numbered.filter((copy) => copy.of > 1).length;

  function toggle(id: number) {
    setChosen((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));
  }

  function toggleAll() {
    const ids = list.map((copy) => copy.id);
    setChosen((items) => (allVisible ? items.filter((id) => !ids.includes(id)) : [...new Set([...items, ...ids])]));
  }

  function pick(next: number) {
    setPage(next);
    const node = document.getElementById("builder-grid");
    if (node) window.scrollTo({ top: Math.max(0, node.getBoundingClientRect().top + window.scrollY - 140), behavior: "smooth" });
  }

  async function save() {
    if (busy) return;
    if (title.trim().length < 2) {
      setError("კოლექციას სახელი სჭირდება.");
      document.getElementById("deck-title")?.focus();
      return;
    }
    if (chosen.length < 3) {
      setError("აირჩიე მინიმუმ 3 ქარდი.");
      return;
    }
    setBusy(true);
    setError("");
    const response = await fetch("/api/decks/new", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, text, copies: chosen }) }).catch(() => null);
    const body = response ? await response.json().catch(() => null) : null;
    if (response?.ok && body?.id) {
      window.location.href = `/decks/${body.id}`;
      return;
    }
    setBusy(false);
    setError(body?.error || "კოლექცია ვერ შეიქმნა, სცადე თავიდან.");
  }

  return (
    <div className="grid gap-5 pb-24">
      <div className="album-rise flex items-center gap-3 text-sm">
        <a href="/cards/mine/decks" className="inline-flex items-center gap-1.5 font-medium text-white/80 transition hover:text-white">
          <ArrowLeft className="size-4" /> ჩემი კოლექციები
        </a>
        <span className="h-4 w-px bg-white/10" />
        <span className="text-xs text-white/40">ახალი კოლექცია</span>
      </div>

      <section className="album-rise relative overflow-hidden rounded-[20px] bg-linear-to-br from-[#1b1418] via-[#141215] to-[#121214] p-5 sm:p-7" style={{ "--delay": "60ms" } as React.CSSProperties}>
        <span className="album-ring pointer-events-none absolute top-1/2 -right-40 size-[520px] -translate-y-1/2 rounded-full border-[46px] border-white/[0.025]" />
        <span className="pointer-events-none absolute -top-24 left-1/3 size-72 rounded-full bg-[#e93748]/8 blur-[90px]" />
        <div className="relative flex flex-wrap items-center gap-7">
          <div className="relative h-[190px] w-[230px] shrink-0 max-sm:mx-auto">
            {preview.length ? preview.map((copy, index) => {
              const offset = index - (preview.length - 1) / 2;
              const moving = /\.(webm|mp4)(\?|$)/i.test(copy.image);
              return (
                <span key={copy.id} className="album-toast absolute top-1/2 left-1/2 h-[150px] w-[100px] transition-transform duration-500" style={{ transform: `translate(calc(-50% + ${offset * 34}px), -50%) rotate(${offset * 6}deg)`, zIndex: index }}>
                  <span className="block h-full w-full overflow-hidden rounded-[12px] bg-[#1a1a1a] shadow-[0_16px_32px_rgba(0,0,0,0.5)]">
                    {moving ? <video src={copy.image} autoPlay muted loop playsInline className="h-full w-full object-cover" /> : <img src={copy.image} alt="" className="h-full w-full object-cover" />}
                  </span>
                </span>
              );
            }) : [-14, -5, 5, 14].map((angle, index) => (
              <img key={angle} src="/card-mm.png" alt="" className="absolute top-1/2 left-1/2 h-[150px] w-[100px] rounded-[12px] object-cover opacity-60 shadow-[0_16px_32px_rgba(0,0,0,0.5)]" style={{ transform: `translate(calc(-50% + ${angle * 2.6}px), -50%) rotate(${angle}deg)`, zIndex: index }} />
            ))}
          </div>
          <div className="min-w-[260px] flex-1">
            <p className="flex items-center gap-1.5 text-xs font-medium text-[#ff8a95]"><Sparkles className="size-3.5" /> ახალი კოლექცია</p>
            <input id="deck-title" value={title} onChange={(event) => { setTitle(event.target.value); setError(""); }} maxLength={80} placeholder="კოლექციის სახელი" className="mt-2 w-full bg-transparent text-[26px] leading-tight font-semibold tracking-tight outline-none placeholder:text-white/25 sm:text-[30px]" />
            <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={500} rows={2} placeholder="აღწერა (არასავალდებულო)" className="mt-3 w-full resize-none rounded-[12px] bg-white/[0.04] px-3.5 py-2.5 text-sm outline-none placeholder:text-white/30 focus:bg-white/[0.06]" />
            <div className="mt-4 grid gap-2.5 min-[560px]:grid-cols-3">
              {([
                ["არჩეული", chosen.length, Check],
                ["შენი ქარდები", copies.length, Layers],
                ["დუბლიკატები", dupes, RefreshCw],
              ] as const).map(([label, value, Icon]) => (
                <div key={label} className="flex items-center gap-3 rounded-[14px] bg-white/[0.035] px-4 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e93748]/12 text-[#ff8a95]"><Icon className="size-4" /></span>
                  <span>
                    <span className="block text-[11px] text-white/40">{label}</span>
                    <span className="block text-lg leading-tight font-semibold text-white">{value}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="album-rise rounded-[20px] bg-[#121214] p-4 sm:p-5" style={{ "--delay": "120ms" } as React.CSSProperties}>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-lg bg-white/[0.04] px-3">
            <Search className="size-4 text-white/40" />
            <input value={find} onChange={(event) => { setFind(event.target.value); setPage(1); }} placeholder="ქარდის ძებნა" className="w-full bg-transparent text-sm outline-none placeholder:text-white/30" />
          </label>
          <button type="button" onClick={() => { setDupesOnly((value) => !value); setPage(1); }} className={`filter-trigger inline-flex h-10 items-center gap-2 rounded-lg px-3.5 text-sm ${dupesOnly ? "is-on" : "bg-white/[0.04] text-[#d1d5dc] hover:text-white"}`}>
            <RefreshCw className="size-3.5" /> მხოლოდ დუბლიკატები
          </button>
          <button type="button" onClick={() => { setPickedOnly((value) => !value); setPage(1); }} className={`filter-trigger inline-flex h-10 items-center gap-2 rounded-lg px-3.5 text-sm ${pickedOnly ? "is-on" : "bg-white/[0.04] text-[#d1d5dc] hover:text-white"}`}>
            <Check className="size-3.5" /> არჩეულები
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => { setRank(""); setPage(1); }} className={`filter-trigger inline-flex h-8 items-center rounded-lg px-3 text-xs ${!rank ? "is-on" : "bg-white/[0.04] text-[#d1d5dc] hover:text-white"}`}>ყველა</button>
          {ranks.map((item) => (
            <button key={item} type="button" onClick={() => { setRank((value) => (value === item ? "" : item)); setPage(1); }} className={`filter-trigger inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2.5 text-xs font-semibold ${rank === item ? "is-on" : "bg-white/[0.04] text-[#d1d5dc] hover:text-white"}`}>{item}</button>
          ))}
          <span className="ml-auto flex items-center gap-3 text-xs">
            <span className="text-white/40">{list.length} ქარდი</span>
            {list.length ? <button type="button" onClick={toggleAll} className="cursor-pointer text-white/65 underline-offset-2 transition hover:text-white hover:underline">{allVisible ? "მონიშვნის მოხსნა" : "ყველას მონიშვნა"}</button> : null}
            {chosen.length ? <button type="button" onClick={() => setChosen([])} className="cursor-pointer text-white/65 underline-offset-2 transition hover:text-white hover:underline">გასუფთავება</button> : null}
          </span>
        </div>

        <div id="builder-grid" className="mt-4">
          {visible.length ? (
            <div key={`${current}-${rank}-${dupesOnly}-${pickedOnly}-${query}`} className="card-grid grid grid-cols-3 gap-3 min-[560px]:grid-cols-5 min-[900px]:grid-cols-6 min-[1200px]:grid-cols-8">
              {visible.map((copy) => {
                const on = picked.has(copy.id);
                const moving = /\.(webm|mp4)(\?|$)/i.test(copy.image);
                return (
                  <button key={copy.id} type="button" title={copy.name} onClick={() => toggle(copy.id)} className="group relative block cursor-pointer text-left">
                    <span className={`block aspect-[2/3] overflow-hidden rounded-[10px] bg-[#1a1a1a] shadow-[0_10px_22px_rgba(0,0,0,0.35)] transition duration-200 ${on ? "ring-2 ring-[#e93748] ring-offset-2 ring-offset-[#121214]" : "group-hover:-translate-y-0.5"}`}>
                      {moving ? <video src={copy.image} muted loop playsInline className="h-full w-full object-cover" /> : <img src={copy.image} alt={copy.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />}
                    </span>
                    <span className={`absolute top-2 right-2 grid size-6 place-items-center rounded-full text-[10px] font-bold transition ${on ? "bg-[#e93748] text-white" : "bg-black/60 text-transparent group-hover:text-white/60"}`}><Check className="size-3.5" strokeWidth={3} /></span>
                    {copy.of > 1 ? <span className="absolute bottom-2 left-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">{copy.nth}/{copy.of}</span> : null}
                  </button>
                );
              })}
            </div>
          ) : <p className="py-12 text-center text-sm text-white/45">{copies.length ? "ამ ფილტრით ქარდი ვერ მოიძებნა." : "ჯერ ქარდი არ გაქვს. გახსენი პაკი და დაბრუნდი."}</p>}
          <Pager page={current} pages={pages} onPick={pick} />
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4">
        <div className="mx-auto flex w-full max-w-[900px] flex-wrap items-center justify-between gap-3 rounded-[16px] bg-[#18181b]/95 px-4 py-3 shadow-[0_18px_44px_rgba(0,0,0,0.6)] backdrop-blur">
          <span className="text-sm text-white/60">არჩეულია <b className="font-semibold text-white">{chosen.length}</b> ქარდი{error ? <span className="ml-3 text-[#ff8a95]">{error}</span> : null}</span>
          <span className="flex gap-2">
            <a href="/cards/mine/decks" className="inline-flex h-10 items-center rounded-lg bg-white/[0.06] px-4 text-sm text-white/80 transition hover:bg-white/[0.1] hover:text-white">გაუქმება</a>
            <button type="button" disabled={busy} onClick={save} className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-[#e93748] px-5 text-sm font-medium text-white transition hover:bg-[#f04656] disabled:opacity-50">
              <Check className="size-4" /> {busy ? "იქმნება..." : "კოლექციის შექმნა"}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

const decksPerPage = 24;

function MyDecks({ data, all = false }: { data: PlayData; all?: boolean }) {
  const [sort, setSort] = useState<string>("new");
  const [find, setFind] = useState("");
  const [page, setPage] = useState(1);
  const text = find.trim().toLowerCase();
  const decks = data.decks
    .filter((deck) => !text || deck.title.toLowerCase().includes(text) || deck.author.toLowerCase().includes(text))
    .sort((a, b) => {
      if (sort === "old") return a.id - b.id;
      if (sort === "likes") return b.likes - a.likes || b.id - a.id;
      if (sort === "views") return (b.views ?? 0) - (a.views ?? 0) || b.id - a.id;
      if (sort === "size") return b.count - a.count || b.id - a.id;
      return b.id - a.id;
    });
  const pages = Math.max(1, Math.ceil(decks.length / decksPerPage));
  const current = Math.min(page, pages);
  const visible = decks.slice((current - 1) * decksPerPage, current * decksPerPage);
  const tab = "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs transition";

  function pick(next: number) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="grid gap-5">
      <div className="album-rise flex justify-center">
        <span className="inline-flex gap-1 rounded-xl bg-[#121214] p-1">
          {all ? <span className={`${tab} bg-white/10 text-white`}><Layers className="size-3.5" /> ყველა კოლექცია</span> : <a href="/decks" className={`${tab} text-white/65 hover:bg-white/[0.06] hover:text-white`}><Layers className="size-3.5" /> ყველა კოლექცია</a>}
          {data.me ? (all ? <a href="/cards/mine/decks" className={`${tab} text-white/65 hover:bg-white/[0.06] hover:text-white`}><User className="size-3.5" /> ჩემი კოლექციები</a> : <span className={`${tab} bg-white/10 text-white`}><User className="size-3.5" /> ჩემი კოლექციები</span>) : null}
        </span>
      </div>
      <h1 className="album-rise flex flex-wrap items-center justify-center gap-3 text-center text-[24px] font-semibold tracking-tight" style={{ "--delay": "50ms" } as React.CSSProperties}>
        {all ? "ყველა კოლექცია" : "მომხმარებლის კოლექციები"}
        {all ? <span className="relative rounded-lg bg-white/[0.05] py-1 pr-3 pl-3.5 text-[18px] font-medium text-white/90"><span className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full bg-[#e93748]" />{data.decks.length}</span> : data.meName ? <span className="relative rounded-lg bg-white/[0.05] py-1 pr-3 pl-3.5 text-[18px] font-medium text-white/90"><span className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full bg-[#e93748]" />{data.meName}</span> : null}
      </h1>

      <div className="album-rise flex flex-wrap items-center justify-between gap-3" style={{ "--delay": "100ms" } as React.CSSProperties}>
        {all ? (
          <label className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-lg bg-[#121214] px-3 sm:max-w-[340px]">
            <Search className="size-4 text-white/40" />
            <input value={find} onChange={(event) => { setFind(event.target.value); setPage(1); }} placeholder="კოლექციის ან ავტორის სახელი" className="w-full bg-transparent text-xs outline-none placeholder:text-white/30" />
          </label>
        ) : (
          <span className="inline-flex gap-1.5">
            <span className="inline-flex h-9 items-center rounded-lg bg-[#e93748] px-3.5 text-xs font-medium text-white">ჩვეულებრივი</span>
            <a href="/cards/mine/trades" className="inline-flex h-9 items-center rounded-lg bg-[#121214] px-3.5 text-xs text-[#d1d5dc] transition hover:bg-white/[0.06] hover:text-white">გაცვლები</a>
          </span>
        )}
        <span className="inline-flex flex-wrap gap-2">
          <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} className="h-9 cursor-pointer rounded-lg border-0 bg-[#121214] px-3 text-xs text-[#d1d5dc] outline-none">
            {deckSorts.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          {data.me ? (
            <a href="/cards/mine/decks/new" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#e93748] px-3.5 text-xs font-medium text-white transition hover:bg-[#f04656]">
              <Plus className="size-4" /> კოლექციის შექმნა
            </a>
          ) : null}
        </span>
      </div>

      {visible.length ? (
        <div key={`${sort}-${current}-${text}`} className="grid gap-x-4 gap-y-5 min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3">
          {visible.map((deck, index) => <DeckCard key={deck.id} deck={deck} index={index} />)}
        </div>
      ) : (
        <div className="album-rise rounded-[20px] bg-[#121214] py-14 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#e93748]/12 text-[#ff8a95]"><Layers className="size-5" /></span>
          <p className="mt-3 text-sm text-white/55">{text ? "კოლექცია ვერ მოიძებნა." : all ? "კოლექცია ჯერ არავის შეუქმნია." : "ჯერ კოლექცია არ გაქვს."}</p>
          {data.me && !text ? <a href="/cards/mine/decks/new" className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#e93748] px-4 text-sm font-medium text-white transition hover:bg-[#f04656]"><Plus className="size-4" /> კოლექციის შექმნა</a> : null}
        </div>
      )}
      <Pager page={current} pages={pages} onPick={pick} />
    </div>
  );
}

function Deck({ data }: { data: PlayData }) {
  const deck = data.deck!;
  const [liked, setLiked] = useState(deck.liked);
  const [likes, setLikes] = useState(deck.likes);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [view, setView] = useState<"all" | "owned" | "left">("all");
  const cards = deck.cards.map((card) => ({ id: card.id, name: card.name, image: card.image, rarity: card.rarity.toUpperCase(), owned: card.owned, wished: false }));
  const owned = cards.filter((card) => card.owned > 0);
  const left = cards.filter((card) => card.owned === 0);
  const total = cards.length;
  const cover = cards.slice(0, 3);
  const groups = (deck.mine
    ? [{ key: "owned", label: "კოლექციის ქარდები", hint: "შენ მიერ შერჩეული", icon: Layers, cards, empty: "კოლექცია ცარიელია." }]
    : [
        { key: "owned", label: "ეს ქარდები გაქვს", hint: "შენს კოლექციაშიც არის", icon: Check, cards: owned, empty: "ამ კოლექციიდან ჯერ ქარდი არ გაქვს." },
        { key: "left", label: "ეს ქარდები არ გაქვს", hint: "შესაგროვებელია", icon: Search, cards: left, empty: "ამ კოლექციის ყველა ქარდი გაქვს." },
      ]) as { key: "owned" | "left"; label: string; hint: string; icon: typeof Check; cards: typeof cards; empty: string }[];
  const shown = groups.filter((group) => view === "all" || view === group.key);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function like() {
    if (busy) return;
    if (!data.me) {
      setToast("მოსაწონად შედი ანგარიშზე.");
      return;
    }
    setBusy(true);
    const response = await fetch("/api/decks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deck.id }) }).catch(() => null);
    const body = response ? await response.json().catch(() => null) : null;
    setBusy(false);
    if (!response?.ok || !body) {
      setToast(body?.error || "ვერ მოხერხდა, სცადე თავიდან.");
      return;
    }
    setLiked(body.liked);
    setLikes(body.likes);
    setToast(body.liked ? "კოლექცია მოიწონე." : "მოწონება მოიხსნა.");
  }

  async function remove() {
    setBusy(true);
    const response = await fetch("/api/decks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deck.id }) }).catch(() => null);
    if (response?.ok) {
      window.location.href = "/cards/mine/decks";
      return;
    }
    setBusy(false);
    setConfirming(false);
    setToast("კოლექცია ვერ წაიშალა.");
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: deck.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setToast("ბმული დაკოპირდა.");
      }
    } catch {}
  }

  return (
    <div className="grid gap-5">
      {toast && typeof document !== "undefined"
        ? createPortal(
            <div className="album-toast fixed top-20 right-5 z-[90] flex max-w-[340px] items-start gap-3 rounded-[14px] bg-[#1a1a1d] px-4 py-3 text-sm text-white/85 shadow-[0_18px_40px_rgba(0,0,0,0.55)]">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#e93748]/15 text-[#ff8a95]"><Check className="size-3.5" /></span>
              <span className="flex-1 leading-5">{toast}</span>
              <button type="button" aria-label="დახურვა" className="cursor-pointer text-white/40 transition hover:text-white" onClick={() => setToast("")}><X className="size-4" /></button>
            </div>,
            document.body,
          )
        : null}

      <div className="album-rise flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <a href={deck.mine ? "/cards/mine/decks" : "/decks"} className="inline-flex items-center gap-1.5 font-medium text-white/80 transition hover:text-white">
            <ArrowLeft className="size-4" /> {deck.mine ? "ჩემი კოლექციები" : "ყველა კოლექცია"}
          </a>
          <span className="h-4 w-px bg-white/10" />
          <span className="text-xs text-white/40">კოლექციონერის ალბომი</span>
        </div>
        <a href="/decks" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/[0.05] px-3 text-xs text-white/75 transition hover:bg-white/[0.09] hover:text-white">
          <Layers className="size-3.5" /> ყველა კოლექცია
        </a>
      </div>

      <section className="album-rise relative overflow-hidden rounded-[20px] bg-linear-to-br from-[#1b1418] via-[#141215] to-[#121214] p-5 sm:p-7" style={{ "--delay": "60ms" } as React.CSSProperties}>
        <span className="album-ring pointer-events-none absolute top-1/2 -right-40 size-[520px] -translate-y-1/2 rounded-full border-[46px] border-white/[0.025]" />
        <span className="album-ring pointer-events-none absolute top-1/2 -right-16 size-[300px] -translate-y-1/2 rounded-full border-[28px] border-white/[0.02]" />
        <span className="pointer-events-none absolute -top-24 left-1/3 size-72 rounded-full bg-[#e93748]/8 blur-[90px]" />

        <div className="relative flex flex-wrap gap-7">
          <div className="w-[150px] shrink-0 max-sm:mx-auto sm:w-[170px]">
            <div className="relative aspect-[2/3]">
              <span className="absolute -top-2 -left-2 z-10 size-6 rounded-tl-xl border-t-2 border-l-2 border-[#e93748]/80" />
              <span className="absolute -right-2 -bottom-2 z-10 size-6 rounded-br-xl border-r-2 border-b-2 border-[#e93748]/80" />
              {cover.length ? cover.map((card, index) => {
                const angle = cover.length === 1 ? 0 : [-7, 7, 0][index];
                const moving = /\.(webm|mp4)(\?|$)/i.test(card.image);
                return (
                  <span key={card.id} className="absolute inset-0 overflow-hidden rounded-[12px] bg-[#1a1a1a] shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition duration-500" style={{ transform: `rotate(${angle}deg) scale(${index === cover.length - 1 ? 1 : 0.94})`, zIndex: index }}>
                    {moving ? <video src={card.image} autoPlay muted loop playsInline className="h-full w-full object-cover" /> : <img src={card.image} alt={card.name} className="h-full w-full object-cover" />}
                  </span>
                );
              }) : <span className="grid h-full place-items-center rounded-[12px] bg-white/[0.04] text-white/30"><Layers className="size-8" /></span>}
            </div>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white/45"><Eye className="size-3.5" /> {deck.views} ნახვა</p>
          </div>

          <div className="min-w-[250px] flex-1">
            <p className="flex items-center gap-1.5 text-xs font-medium text-[#ff8a95]"><Sparkles className="size-3.5" /> მომხმარებლის კოლექცია</p>
            <h1 className="mt-2 text-[26px] leading-tight font-semibold tracking-tight sm:text-[32px]">{deck.title}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-white/45">
              <span className="relative grid size-6 place-items-center overflow-hidden rounded-full bg-white/[0.06] text-[10px] font-semibold text-white/60 uppercase">
                {firstLetter(deck.author)}
                {deck.avatar ? <img src={deck.avatar} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
              </span>
              კოლექცია <b className="font-semibold text-white/85">{deck.author}</b>-ს მიერ
              {deck.created ? <span className="text-white/30">· {deck.created}</span> : null}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {deck.mine ? null : (
                <AlbumAction label={liked ? "მოწონების მოხსნა" : "მოწონება"} onClick={like} active={liked}>
                  <Heart className={`size-4 ${liked ? "fill-current" : ""}`} />
                </AlbumAction>
              )}
              <AlbumAction label="გაზიარება" onClick={share}><Share2 className="size-4" /></AlbumAction>
              {deck.mine ? (
                confirming ? (
                  <span className="album-toast inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] py-1 pr-1 pl-3 text-xs text-white/70">
                    წავშალო?
                    <button type="button" disabled={busy} onClick={remove} className="h-7 cursor-pointer rounded-md bg-[#e93748] px-2.5 font-medium text-white transition hover:bg-[#f04656] disabled:opacity-50">კი</button>
                    <button type="button" onClick={() => setConfirming(false)} className="h-7 cursor-pointer rounded-md bg-white/[0.06] px-2.5 text-white/80 transition hover:bg-white/[0.1]">არა</button>
                  </span>
                ) : (
                  <AlbumAction label="კოლექციის წაშლა" onClick={() => setConfirming(true)}><X className="size-4" /></AlbumAction>
                )
              ) : null}
            </div>

            <div className="mt-6 grid gap-2.5 min-[560px]:grid-cols-3">
              {([
                ["ქარდები", total, Layers],
                ["მოწონება", likes, Heart],
                ["ნახვა", deck.views, Eye],
              ] as const).map(([label, value, Icon], index) => (
                <div key={label} className="album-rise flex items-center gap-3 rounded-[14px] bg-white/[0.035] px-4 py-3" style={{ "--delay": `${160 + index * 70}ms` } as React.CSSProperties}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e93748]/12 text-[#ff8a95]"><Icon className="size-4" /></span>
                  <span>
                    <span className="block text-[11px] text-white/40">{label}</span>
                    <span className="block text-lg leading-tight font-semibold text-white">{value}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {deck.text ? (
          <div className="relative mt-6 flex items-start gap-3 rounded-[14px] bg-white/[0.03] px-4 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e93748]/12 text-[#ff8a95]"><CircleHelp className="size-4" /></span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white/90">აღწერა</p>
              <p className="text-sm leading-6 break-words text-white/55">{deck.text}</p>
            </div>
          </div>
        ) : null}
      </section>

      {groups.length > 1 ? (
        <div className="album-rise flex flex-wrap items-center justify-between gap-3" style={{ "--delay": "120ms" } as React.CSSProperties}>
          <div className="flex flex-wrap items-center gap-2">
            {groups.map((group) => {
              const on = view === group.key;
              return (
                <button key={group.key} type="button" onClick={() => setView((value) => (value === group.key ? "all" : group.key))} className={`filter-trigger inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm ${on ? "is-on" : "bg-[#121214] text-[#d1d5dc] hover:text-white"}`}>
                  <group.icon className="size-3.5" /> {group.label}
                  <span className={`ml-0.5 border-l pl-2 text-[12px] font-semibold ${on ? "border-white/25" : "border-white/10 text-[#ff8a95]"}`}>{group.cards.length}</span>
                </button>
              );
            })}
          </div>
          <span className="text-xs text-white/35">დააჭირე ქარდს დეტალების სანახავად</span>
        </div>
      ) : null}

      {shown.map((group, groupIndex) => (
        <section key={`${group.key}-${view}`} className="album-rise rounded-[20px] bg-[#121214] p-4 sm:p-6" style={{ "--delay": `${180 + groupIndex * 90}ms` } as React.CSSProperties}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#e93748]/12 text-[#ff8a95]"><group.icon className="size-4" /></span>
              <div>
                <p className="text-[11px] text-white/40">{group.hint}</p>
                <h2 className="text-[17px] font-semibold tracking-tight">{group.label}</h2>
              </div>
            </div>
            <span className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs text-white/55"><b className="font-semibold text-white">{group.cards.length}</b> ქარდი</span>
          </div>
          {group.cards.length ? (
            <div className="mt-5 grid grid-cols-3 gap-3 min-[560px]:grid-cols-5 min-[900px]:grid-cols-8">
              {group.cards.map((card, index) => <CollectionTile key={`${card.id}-${index}`} card={card} index={index} />)}
            </div>
          ) : <p className="py-10 text-center text-sm text-white/45">{group.empty}</p>}
        </section>
      ))}
    </div>
  );
}

const tradesPerPage = 10;
const tradeTabs = [
  ["all", "ყველა"],
  ["in", "შემოსული"],
  ["out", "გაგზავნილი"],
  ["done", "ისტორია"],
] as const;

function TradeThumb({ card, label, accent }: { card: PlayData["trades"][number]["give"]; label: string; accent?: boolean }) {
  const moving = /\.(webm|mp4)(\?|$)/i.test(card.image);
  const body = (
    <span className="relative block aspect-[2/3] w-[78px] overflow-hidden rounded-[10px] bg-[#1a1a1a] shadow-[0_10px_22px_rgba(0,0,0,0.4)] transition duration-300 group-hover:-translate-y-1 sm:w-[88px]">
      {card.image && moving ? <video src={card.image} autoPlay muted loop playsInline className="h-full w-full object-cover" /> : null}
      {card.image && !moving ? <img src={card.image} alt={card.name} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : null}
      {card.image ? null : <span className="grid h-full place-items-center px-2 text-center text-[10px] text-white/35">წაშლილი</span>}
      <span className="absolute top-1.5 left-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold" style={{ color: tone[card.rarity] ?? "#fff" }}>{card.rarity}</span>
    </span>
  );
  return (
    <span className="flex w-[78px] flex-col items-center gap-1.5 sm:w-[88px]">
      <span className={`text-[10px] font-medium ${accent ? "text-[#ff8a95]" : "text-white/40"}`}>{label}</span>
      {card.id ? <a href={`/cards/${card.id}`} title={card.name} className="group block">{body}</a> : <span className="group block">{body}</span>}
      <span className="w-full truncate text-center text-[11px] text-white/70">{card.name}</span>
    </span>
  );
}

function Trades({ data }: { data: PlayData }) {
  const [tab, setTab] = useState<string>("all");
  const [find, setFind] = useState("");
  const [page, setPage] = useState(1);
  const incoming = data.trades.filter((trade) => trade.incoming).length;
  const outgoing = data.trades.filter((trade) => trade.sent && trade.state === "pending").length;
  const done = data.trades.filter((trade) => trade.state === "accepted").length;
  const counts: Record<string, number> = { all: data.trades.length, in: incoming, out: outgoing, done: data.trades.filter((trade) => trade.state !== "pending").length };
  const text = find.trim().toLowerCase();
  const list = data.trades
    .filter((trade) => tab === "all" || (tab === "in" && trade.incoming) || (tab === "out" && trade.sent && trade.state === "pending") || (tab === "done" && trade.state !== "pending"))
    .filter((trade) => !text || trade.who.toLowerCase().includes(text) || trade.give.name.toLowerCase().includes(text) || trade.get.name.toLowerCase().includes(text));
  const pages = Math.max(1, Math.ceil(list.length / tradesPerPage));
  const current = Math.min(page, pages);
  const visible = list.slice((current - 1) * tradesPerPage, current * tradesPerPage);
  const chip = "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs transition";

  function pick(next: number) {
    setPage(next);
    const node = document.getElementById("trade-list");
    if (node) window.scrollTo({ top: Math.max(0, node.getBoundingClientRect().top + window.scrollY - 88), behavior: "smooth" });
  }

  function stateBadge(trade: PlayData["trades"][number]) {
    if (trade.state === "accepted") return <span className="inline-flex h-7 items-center gap-1 rounded-lg bg-[#e93748]/12 px-2.5 text-[11px] font-medium text-[#ff8a95]"><Check className="size-3.5" /> {trade.status}</span>;
    if (trade.state === "pending") return <span className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 text-[11px] font-medium text-white/75"><span className="size-1.5 animate-pulse rounded-full bg-[#e93748]" /> {trade.incoming ? "პასუხს ელოდება" : trade.status}</span>;
    return <span className="inline-flex h-7 items-center gap-1 rounded-lg bg-white/[0.035] px-2.5 text-[11px] text-white/40"><X className="size-3.5" /> {trade.status}</span>;
  }

  return (
    <div className="grid gap-5">
      <section className="album-rise relative overflow-hidden rounded-[20px] bg-linear-to-br from-[#1b1418] via-[#141215] to-[#121214] p-5 sm:p-7">
        <span className="album-ring pointer-events-none absolute top-1/2 -right-40 size-[520px] -translate-y-1/2 rounded-full border-[46px] border-white/[0.025]" />
        <span className="album-ring pointer-events-none absolute top-1/2 -right-16 size-[300px] -translate-y-1/2 rounded-full border-[28px] border-white/[0.02]" />
        <span className="pointer-events-none absolute -top-24 left-1/4 size-72 rounded-full bg-[#e93748]/8 blur-[90px]" />

        <div className="relative flex flex-wrap items-center gap-7">
          <div className="relative h-[170px] w-[220px] shrink-0 max-sm:mx-auto">
            <span className="album-rise absolute inset-0" style={{ "--delay": "0ms" } as React.CSSProperties}>
              <img src="/card-mm.png" alt="" className="absolute top-1/2 left-1/2 h-[140px] w-[94px] rounded-[12px] object-cover shadow-[0_16px_32px_rgba(0,0,0,0.5)]" style={{ transform: "translate(calc(-50% - 52px), -50%) rotate(-10deg)" }} />
            </span>
            <span className="album-rise absolute inset-0" style={{ "--delay": "90ms" } as React.CSSProperties}>
              <img src="/card-mm.png" alt="" className="absolute top-1/2 left-1/2 h-[140px] w-[94px] rounded-[12px] object-cover shadow-[0_16px_32px_rgba(0,0,0,0.5)]" style={{ transform: "translate(calc(-50% + 52px), -50%) rotate(10deg)" }} />
            </span>
            <span className="album-rise absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2" style={{ "--delay": "180ms" } as React.CSSProperties}>
              <span className="grid size-11 place-items-center rounded-full bg-[#e93748] text-white shadow-[0_10px_24px_rgba(233,55,72,0.35)]"><RefreshCw className="size-5" /></span>
            </span>
          </div>

          <div className="min-w-[250px] flex-1">
            <p className="flex items-center gap-1.5 text-xs font-medium text-[#ff8a95]"><Sparkles className="size-3.5" /> ჩემი ქარდები</p>
            <h1 className="mt-2 text-[26px] leading-tight font-semibold tracking-tight sm:text-[32px]">გაცვლები</h1>
            <p className="mt-1 max-w-[480px] text-sm text-white/45">შემოსული და გაგზავნილი შეთავაზებები. გაცვლის შეთავაზება ქარდის გვერდიდან შეგიძლია გაგზავნო.</p>

            <div className="mt-5 grid gap-2.5 min-[560px]:grid-cols-3">
              {([
                ["შემოსული მოთხოვნა", incoming, "in"],
                ["გაგზავნილი", outgoing, "out"],
                ["შემდგარი გაცვლა", done, "done"],
              ] as const).map(([label, value, key], index) => (
                <button key={label} type="button" onClick={() => { setTab(key); setPage(1); }} className="album-rise flex cursor-pointer items-center gap-3 rounded-[14px] bg-white/[0.035] px-4 py-3 text-left transition hover:bg-white/[0.06]" style={{ "--delay": `${160 + index * 70}ms` } as React.CSSProperties}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e93748]/12 text-[#ff8a95]">{key === "in" ? <ArrowLeft className="size-4" /> : key === "out" ? <ArrowUpRight className="size-4" /> : <Check className="size-4" />}</span>
                  <span>
                    <span className="block text-[11px] text-white/40">{label}</span>
                    <span className="block text-lg leading-tight font-semibold text-white">{value}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div id="trade-list" className="album-rise flex flex-wrap items-center justify-between gap-3" style={{ "--delay": "80ms" } as React.CSSProperties}>
        <span className="inline-flex flex-wrap gap-1 rounded-xl bg-[#121214] p-1">
          {tradeTabs.map(([key, label]) => (
            <button key={key} type="button" onClick={() => { setTab(key); setPage(1); }} className={`${chip} ${tab === key ? "bg-[#e93748] text-white" : "text-white/65 hover:bg-white/[0.06] hover:text-white"}`}>
              {label} <span className={`rounded-md px-1.5 text-[10px] ${tab === key ? "bg-black/20" : "bg-white/[0.06] text-white/50"}`}>{counts[key]}</span>
            </button>
          ))}
        </span>
        <label className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-lg bg-[#121214] px-3 sm:max-w-[320px]">
          <Search className="size-4 text-white/40" />
          <input value={find} onChange={(event) => { setFind(event.target.value); setPage(1); }} placeholder="მომხმარებელი ან ქარდი" className="w-full bg-transparent text-xs outline-none placeholder:text-white/30" />
        </label>
      </div>

      {visible.length ? (
        <div key={`${tab}-${current}-${text}`} className="grid gap-3">
          {visible.map((trade, index) => (
            <article key={trade.id} className="album-rise flex flex-wrap items-center gap-5 rounded-[18px] bg-[#121214] p-4 transition hover:bg-[#151518] sm:p-5" style={{ "--delay": `${Math.min(index, 8) * 45}ms` } as React.CSSProperties}>
              <div className="flex min-w-[190px] flex-1 items-center gap-3">
                <a href={`/profile/${encodeURIComponent(trade.who)}`} className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#1a1a1a] text-sm font-semibold text-white/70">
                  {firstLetter(trade.who)}
                  {trade.avatar ? <img src={trade.avatar} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
                </a>
                <span className="min-w-0">
                  <span className="block text-[11px] text-white/40">{trade.sent ? "შენ შესთავაზე" : "შემოგთავაზა"}</span>
                  <a href={`/profile/${encodeURIComponent(trade.who)}`} className="block truncate text-sm font-medium text-white transition hover:text-[#ff8a95]">{trade.who}</a>
                  {trade.created ? <span className="block text-[11px] text-white/35">{trade.created}</span> : null}
                </span>
              </div>

              <div className="flex items-center gap-3 max-sm:w-full max-sm:justify-center">
                <TradeThumb card={trade.give} label="გასცემ" />
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.05] text-white/60"><RefreshCw className="size-4" /></span>
                <TradeThumb card={trade.get} label="მიიღებ" accent />
              </div>

              <div className="flex min-w-[180px] flex-1 flex-col items-end gap-2.5 max-sm:items-center">
                {stateBadge(trade)}
                {trade.incoming ? (
                  <span className="flex gap-2">
                    <form action={resolveTrade}><input type="hidden" name="id" value={trade.id} /><input type="hidden" name="back" value="/cards/mine/trades" /><button name="accept" value="1" className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-[#e93748] px-3.5 text-xs font-medium text-white transition hover:bg-[#f04656]"><Check className="size-4" /> დათანხმება</button></form>
                    <form action={resolveTrade}><input type="hidden" name="id" value={trade.id} /><input type="hidden" name="back" value="/cards/mine/trades" /><button name="accept" value="0" className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-white/[0.06] px-3.5 text-xs text-white/80 transition hover:bg-white/10 hover:text-white"><X className="size-4" /> უარი</button></form>
                  </span>
                ) : null}
                {trade.sent && trade.state === "pending" ? (
                  <form action={resolveTrade}><input type="hidden" name="id" value={trade.id} /><input type="hidden" name="back" value="/cards/mine/trades" /><button name="cancel" value="1" className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-white/[0.06] px-3.5 text-xs text-white/80 transition hover:bg-white/10 hover:text-white"><X className="size-4" /> გაუქმება</button></form>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="album-rise rounded-[20px] bg-[#121214] py-14 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#e93748]/12 text-[#ff8a95]"><RefreshCw className="size-5" /></span>
          <p className="mt-3 text-sm text-white/55">{text ? "ვერაფერი მოიძებნა." : tab === "in" ? "შემოსული შეთავაზება არ გაქვს." : tab === "out" ? "გაგზავნილი შეთავაზება არ გაქვს." : "გაცვლები ჯერ არ გქონია."}</p>
          {!text ? <a href="/cards" className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#e93748] px-4 text-sm font-medium text-white transition hover:bg-[#f04656]"><LayoutGrid className="size-4" /> ქარდების კატალოგი</a> : null}
        </div>
      )}
      <Pager page={current} pages={pages} onPick={pick} />
    </div>
  );
}

function Giveaways({ data }: { data: PlayData }) {
  return (
    <div className="grid gap-3">
      {data.giveaways.map((item) => (
        <article key={item.id} className="rounded-2xl bg-[#141417] p-4">
          <h2 className="text-lg">{item.title}</h2>
          <p className="text-sm text-white/50">{item.end} · {item.joined} მონაწილე</p>
          <p className="mt-2 text-sm">{item.text}</p>
          {item.winners ? <p className="mt-2 text-sm text-white">გამარჯვებული: {item.winners}</p> : null}
          {item.open && !item.mine ? <form action={enterGiveaway} className="mt-3"><input type="hidden" name="id" value={item.id} /><button className="h-10 cursor-pointer rounded-xl bg-[#e93748] px-4 text-sm">შესვლა</button></form> : null}
          {item.mine ? <p className="mt-2 text-sm text-[#e93748]">სიაში ხარ</p> : null}
        </article>
      ))}
    </div>
  );
}

function Battle({ data }: { data: PlayData }) {
  const battle = data.battle!;
  const side = (item: typeof battle.left) => (
    <form action={castVote} className="rounded-2xl bg-[#141417] p-3">
      <input type="hidden" name="battle" value={battle.id} />
      <input type="hidden" name="anime" value={item.id} />
      {item.image ? <img src={item.image} alt="" className="mb-3 aspect-video w-full rounded-xl object-cover" /> : null}
      <p className="text-lg">{item.title}</p>
      <p className="text-sm text-white/45">{item.votes} ხმა</p>
      <button disabled={battle.voted > 0} className="mt-3 h-10 cursor-pointer rounded-xl bg-[#e93748] px-4 text-sm disabled:opacity-40">{battle.voted === item.id ? "შენი ხმა" : "ხმა"}</button>
    </form>
  );
  return <div className="grid gap-3 md:grid-cols-2">{side(battle.left)}{side(battle.right)}</div>;
}

function Dubbers({ data }: { data: PlayData }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.dubbers.map((item) => (
        <a key={item.id} href={`/dubbers/${encodeURIComponent(item.alt)}`} className="flex gap-3 rounded-2xl bg-[#141417] p-3">
          {item.image ? <img src={item.image} alt="" className="size-16 rounded-xl object-cover" /> : null}
          <span>
            <span className="block">{item.name}</span>
            <span className="text-sm text-white/45">{item.rating.toFixed(1)} · {item.votes} ხმა · {item.anime} ანიმე</span>
          </span>
        </a>
      ))}
    </div>
  );
}

function Dubber({ data }: { data: PlayData }) {
  const item = data.dubber!;
  return (
    <div className="grid gap-4">
      <div className="flex gap-4">
        {item.image ? <img src={item.image} alt="" className="size-24 rounded-2xl object-cover" /> : null}
        <div>
          <h2 className="text-2xl">{item.name}</h2>
          <p className="text-sm text-white/50">{item.rating.toFixed(2)} / 10 · {item.votes} შეფასება</p>
        </div>
      </div>
      <p className="text-sm leading-6">{item.bio}</p>
      {item.mine ? <p className="text-sm text-white/45">უკვე შეაფასე. თავიდან ჩაწერა ძველს ცვლის.</p> : null}
      <form action={scoreDubber} className="flex flex-wrap gap-2">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="alt" value={data.q} />
        <input name="voice" type="number" min={1} max={10} required placeholder="ხმა" className="h-10 w-24 rounded-xl border border-white/10 bg-[#141417] px-3 text-sm" />
        <input name="text" type="number" min={1} max={10} required placeholder="თარგმანი" className="h-10 w-28 rounded-xl border border-white/10 bg-[#141417] px-3 text-sm" />
        <input name="emotion" type="number" min={1} max={10} required placeholder="ემოცია" className="h-10 w-24 rounded-xl border border-white/10 bg-[#141417] px-3 text-sm" />
        <button className="h-10 cursor-pointer rounded-xl bg-[#e93748] px-4 text-sm">შეფასება</button>
      </form>
    </div>
  );
}

function Pet({ data }: { data: PlayData }) {
  const pet = data.pet!;
  const bar = (label: string, value: number) => (
    <p className="text-sm">{label} <span className="text-white/50">{value}/100</span></p>
  );
  return (
    <div className="max-w-md rounded-2xl bg-[#141417] p-5">
      <h2 className="text-2xl">{pet.name}</h2>
      <p className="text-sm text-white/50">დონე {pet.level} · {pet.xp} გამოცდილება · {pet.status}{pet.busy ? ` · ${pet.busy}` : ""}</p>
      <div className="mt-3 grid gap-1">{bar("შიმშილი", pet.hunger)}{bar("ბედნიერება", pet.happiness)}{bar("ენერგია", pet.energy)}</div>
      <div className="mt-4 flex flex-wrap gap-2">
        {([["feed", "ჭამა"], ["play", "თამაში"], ["rest", "დასვენება"], ["walk", "გასვლა"]] as const).map(([act, label]) => (
          <form key={act} action={touchPet}><input type="hidden" name="act" value={act} /><button className="h-10 cursor-pointer rounded-xl bg-[#e93748] px-3 text-sm">{label}</button></form>
        ))}
      </div>
    </div>
  );
}

function Maze({ data }: { data: PlayData }) {
  const maze = data.labyrinth!;
  return (
    <div className="grid max-w-lg gap-3">
      <p className="text-sm text-white/50">ოთახი {maze.x},{maze.y} · {maze.room} · დარჩა {maze.moves} სვლა</p>
      {maze.quiz ? (
        <form action={solveLabyrinth} className="grid gap-2 rounded-2xl bg-[#141417] p-4">
          <p>{maze.quiz}</p>
          <input name="answer" className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-sm" />
          <button className="h-10 w-fit cursor-pointer rounded-xl bg-[#e93748] px-4 text-sm">პასუხი</button>
        </form>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {maze.doors.map((door) => (
          <form key={`${door.x}-${door.y}`} action={stepLabyrinth}>
            <input type="hidden" name="x" value={door.x} />
            <input type="hidden" name="y" value={door.y} />
            <button className="h-10 cursor-pointer rounded-xl bg-[#141417] px-3 text-sm">{door.x},{door.y} · {door.room}</button>
          </form>
        ))}
      </div>
    </div>
  );
}

function Taste({ data }: { data: PlayData }) {
  const taste = data.taste!;
  return (
    <div className="grid gap-3">
      <h2 className="text-2xl">{taste.name}</h2>
      <p className="text-sm text-white/50">ერთნაირი ემოუტი {taste.score}%</p>
      <div className="grid gap-2">
        {taste.shared.map((item) => <a key={item.slug} href={`/anime/${item.slug}`} className="rounded-xl bg-[#141417] px-3 py-2 text-sm">{item.title}</a>)}
      </div>
    </div>
  );
}

function Showcase({ data }: { data: PlayData }) {
  return (
    <div className="grid gap-3">
      <h2 className="text-2xl">{data.showcase!.name}</h2>
      <Grid cards={data.showcase!.cards} />
    </div>
  );
}
