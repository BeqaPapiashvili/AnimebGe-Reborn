"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { AnimeCard } from "@/components/anime-card";
import { AnimeDetailView } from "@/components/anime-detail";
import { AuthDialog } from "@/components/auth-dialog";
import { Logo } from "@/components/logo";
import { Notifications } from "@/components/notifications";
import { Marks } from "@/components/marks";
import { WatchView } from "@/components/watch-view";
import { ActivityView } from "@/components/activity-view";
import { ProfileView } from "@/components/profile-view";
import { ContinueView } from "@/components/continue-view";
import { ContinueSwiper } from "@/components/continue-swiper";
import { HubView, type Hub } from "@/components/hub-view";
import { FriendsView } from "@/components/friends-view";
import { NotificationsView, type InboxItem } from "@/components/notifications-view";
import type { ContinueCard } from "@/lib/continue-types";
import type { FriendsPageData } from "@/lib/friends-types";
import { SettingsView, type SettingsSection } from "@/components/settings-view";
import { WatchlistView } from "@/components/watchlist-view";
import { SearchView } from "@/components/search-view";
import type { SearchHit } from "@/lib/catalog";
import type { SearchFacets, SearchQuery } from "@/lib/search-query";
import { MyListsView } from "@/components/my-lists-view";
import type { FolderCard, FolderDetail } from "@/lib/folders";
import type { AnimeDetail, CommentItem, ContinueItem, UserAnimeState } from "@/lib/catalog";
import type { EmoteState } from "@/lib/emote";
import { animeHref, art, posts } from "@/lib/data";
import type { SiteList } from "@/lib/list-model";
import type { Anime, SessionUser, SiteData } from "@/lib/types";
import type { ActivityData, PublicProfile } from "@/lib/profile-types";
import type { AccountSettings, Prefs } from "@/lib/settings-model";
import type { WatchPage, WatchQuery } from "@/lib/watchlist";

const dayNames = ["კვი", "ორშ", "სამ", "ოთხ", "ხუთ", "პარ", "შაბ"];
const periods = [
  { id: "Day", label: "დღე" },
  { id: "Week", label: "კვირა" },
  { id: "Month", label: "თვე" },
] as const;
const trendAccents = ["#e93748", "#f5a21a", "#6ea8ff"];

type HomeData = SiteData & { continue: ContinueItem[]; trendingBy: Record<string, Anime[]>; userLists: Record<number, number> };

const emptyData: HomeData = { slides: [], continue: [], latest: [], fresh: [], upcoming: [], trending: [], trendingBy: {}, schedule: [], userLists: {} };

const menuItems = {
  browse: [
    { id: "home", name: "მთავარი", icon: "/assets/menu/home.svg", href: "/" },
    { id: "search", name: "ძებნა", icon: "/assets/menu/search.svg" },
    { id: "schedule", name: "განრიგი", icon: "/assets/menu/schedule.svg", href: "/schedule" },
    { id: "community", name: "საზოგადოება", icon: "/assets/menu/community.svg", href: "/community" },
  ],
  more: [
    { id: "watch", name: "ერთად ყურება", icon: "/assets/menu/watch.svg", href: "/watch2gether" },
    { id: "leaderboard", name: "რეიტინგი", icon: "/assets/menu/leaderboard.svg", href: "/leaderboard" },
    { id: "levels", name: "ლეველები", icon: "/assets/menu/leaderboard.svg", href: "/levels" },
    { id: "shop", name: "მაღაზია", icon: "/assets/menu/guides.svg", href: "/shop" },
    { id: "cards", name: "ქარდები", icon: "/assets/menu/guides.svg", href: "/cards" },
  ],
} as const;

type HomeProps = {
  user: SessionUser | null;
  data?: HomeData;
  detail?: AnimeDetail;
  state?: UserAnimeState;
  comments?: CommentItem[];
  commentStats?: { total: number; roots: number };
  watchEpisode?: number;
  watchRoom?: string;
  lists?: SiteList[];
  watchlist?: { page: WatchPage; query: WatchQuery };
  search?: { items: SearchHit[]; total: number; facets: SearchFacets; query: SearchQuery; userLists?: Record<number, number> };
  myLists?: { folders: FolderCard[]; folder?: undefined } | { folder: FolderDetail; folders?: undefined };
  profile?: PublicProfile;
  friends?: { page: FriendsPageData; tab: "friends" | "requests" | "notices" | "blocked" };
  continueWatch?: ContinueCard[];
  hub?: Hub;
  inbox?: InboxItem[];
  activity?: ActivityData;
  settings?: { section: SettingsSection; account: AccountSettings };
  prefs?: Prefs;
  emotes?: EmoteState;
  characterCards?: { id: number; name: string; image: string; rarity: string; owned?: number; wished?: boolean }[];
  panel?: ReactNode;
  notice?: { kicker: string; text: string; href: string; label: string } | null;
  sections?: { id: string; title: string; on: boolean }[];
};

function joinedAgo(unix: number) {
  const days = Math.max(0, Math.floor((Date.now() - unix * 1000) / 86400000));
  if (!unix || days === 0) return "დღეს";
  if (days === 1) return "1 დღის წინ";
  return `${days} დღის წინ`;
}

function MenuGlyph({ name }: { name: "user" | "public" | "bookmark" | "lists" | "friends" | "play" | "bell" | "out" | "admin" }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7 };
  if (name === "user") return <svg {...common}><circle cx="12" cy="8" r="3.2" /><path d="M5.2 19.2c1.5-3.1 3.7-4.5 6.8-4.5s5.3 1.4 6.8 4.5" /></svg>;
  if (name === "public") return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c2.2 2.4 3.3 5.1 3.3 8S14.2 17.6 12 20c-2.2-2.4-3.3-5.1-3.3-8S9.8 6.4 12 4z" /></svg>;
  if (name === "bookmark") return <svg {...common}><path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.2L6 20V5.5a1 1 0 0 1 1-1z" /></svg>;
  if (name === "lists") return <svg {...common}><path d="M9 7h10M9 12h10M9 17h10" /><path d="M5 7h.01M5 12h.01M5 17h.01" /></svg>;
  if (name === "friends") return <svg {...common}><circle cx="9" cy="9" r="2.6" /><circle cx="16" cy="10" r="2.1" /><path d="M4.8 18.2c.8-2.4 2.4-3.6 4.2-3.6s3.4 1.2 4.2 3.6M14 14.8c1.3-.3 2.4.1 3.3 1.1.8.9 1.2 2 1.4 2.3" /></svg>;
  if (name === "play") return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="m10 9 5 3-5 3z" /></svg>;
  if (name === "bell") return <svg {...common}><path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 6.5 2.5 8H3.5C3.5 15.5 6 15 6 9" /><path d="M10 19.5a2 2 0 0 0 4 0" /></svg>;
  if (name === "admin") return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" /></svg>;
  return <svg {...common}><path d="M10 7H6.5A1.5 1.5 0 0 0 5 8.5v7A1.5 1.5 0 0 0 6.5 17H10" /><path d="M10 12h9" /><path d="m16 9 3 3-3 3" /></svg>;
}

function MenuLink({ href, icon, onClick, children }: { href: string; icon: "user" | "public" | "bookmark" | "lists" | "friends" | "play" | "bell" | "admin"; onClick: () => void; children: string }) {
  return (
    <a href={href} role="menuitem" className="user-menu-item" onClick={onClick}>
      <MenuGlyph name={icon} />
      {children}
    </a>
  );
}

export function Home({ user, data, detail, state, comments, commentStats, watchEpisode, watchRoom, lists = [], watchlist, search, myLists, friends, continueWatch, hub, inbox, profile, activity, settings, prefs, emotes, panel, notice = null, sections, characterCards }: HomeProps) {
  const router = useRouter();
  const home = data ?? emptyData;
  const homeBlocks = sections?.length ? sections : [
    { id: "continue", title: "განაგრძე ყურება", on: true },
    { id: "latest", title: "ბოლო ეპიზოდები", on: true },
    { id: "fresh", title: "ახალი საიტზე", on: true },
    { id: "upcoming", title: "მალე", on: true },
    { id: "trend", title: "ტრენდი", on: true },
    { id: "schedule", title: "განრიგი", on: true },
    { id: "posts", title: "პოსტები", on: true },
  ];
  const [links, setLinks] = useState({ twitter: "", discord: "", reddit: "" });
  useEffect(() => {
    fetch("/api/site/chrome").then((res) => res.json()).then((body) => {
      if (body?.links) setLinks(body.links);
    }).catch(() => undefined);
  }, []);
  const sideBlocks = homeBlocks.filter((block) => block.on && (block.id === "trend" || block.id === "schedule" || block.id === "posts"));
  const [slide, setSlide] = useState(1);
  const [announce, setAnnounce] = useState(true);
  const [dockOpen, setDockOpen] = useState(true);
  const [headerSolid, setHeaderSolid] = useState(Boolean(panel));
  const [dockLocked, setDockLocked] = useState(false);
  const [dockReady, setDockReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [userLists, setUserLists] = useState({ ...home.userLists, ...(search?.userLists ?? {}) });
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [results, setResults] = useState<Anime[] | null>(null);
  const [hiddenContinue, setHiddenContinue] = useState<number[]>([]);
  const [period, setPeriod] = useState("Day");
  const [dayOffset, setDayOffset] = useState(0);
  const [timerKey, setTimerKey] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollY = useRef(0);
  const heroRef = useRef<HTMLElement>(null);
  const dragRef = useRef({ active: false, x: 0, moved: false, width: 1 });
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [showDock, setShowDock] = useState(prefs?.dock !== false);
  useEffect(() => {
    if (prefs) {
      setShowDock(prefs.dock);
      return;
    }
    if (!user) return;
    let stop = false;
    fetch("/api/settings/me").then((res) => res.json()).then((data: { prefs?: { dock?: boolean } }) => {
      if (!stop && data.prefs) setShowDock(data.prefs.dock !== false);
    }).catch(() => undefined);
    return () => { stop = true; };
  }, [prefs, user]);
  const days = [-2, -1, 0].map((delta) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + dayOffset + delta);
    return date;
  });
  const selectedDay = days[2];
  const scheduleRows = home.schedule.filter((row) => row.weekday === selectedDay.getDay());
  const trending = home.trendingBy[period] ?? home.trending;
  const continueItems = home.continue.filter((item) => item.id == null || !hiddenContinue.includes(item.id));
  const slideCount = Math.max(home.slides.length, 1);
  const q = query.trim().toLowerCase();
  const hits = q ? results ?? [] : home.trending.slice(0, 8);

  function go(next: number) {
    setSlide((next + slideCount) % slideCount);
    setTimerKey((value) => value + 1);
  }
  function openDetail(slug: string) {
    router.push(animeHref(slug));
  }

  function openWatch(slug: string, episode = 1) {
    router.push(`${animeHref(slug)}/watch?ep=${episode}`);
    setSearchOpen(false);
  }
  const closeAuth = useCallback(() => setAuthOpen(false), []);

  async function changeList(id: number | undefined, listId: number | null) {
    if (!id) return false;
    if (!user) {
      setAuthOpen(true);
      return false;
    }
    const res = await fetch("/api/lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: id, listId }) });
    if (!res.ok) return false;
    setUserLists((lists) => {
      const next = { ...lists };
      if (listId == null) delete next[id];
      else next[id] = listId;
      return next;
    });
    return true;
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUserMenu(false);
    router.refresh();
  }

  function openSearch() {
    setMenuOpen(false);
    setSearchOpen(true);
  }
  function onSearchKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((value) => (hits.length ? (value + 1) % hits.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((value) => (hits.length ? (value - 1 + hits.length) % hits.length : 0));
    } else if (event.key === "Enter") {
      const term = query.trim();
      if (!term) return;
      setSearchOpen(false);
      router.push(`/search?q=${encodeURIComponent(term)}`);
    }
  }
  function highlight(title: string) {
    const at = q ? title.toLowerCase().indexOf(q) : -1;
    if (at < 0) return title;
    return <>{title.slice(0, at)}<mark className="bg-transparent text-[#e93748]">{title.slice(at, at + q.length)}</mark>{title.slice(at + q.length)}</>;
  }
  function onHeroPointerDown(event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button, a")) return;
    dragRef.current = { active: true, x: event.clientX, moved: false, width: event.currentTarget.clientWidth || 1 };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }
  function onHeroPointerMove(event: React.PointerEvent<HTMLElement>) {
    if (!dragRef.current.active) return;
    const dx = event.clientX - dragRef.current.x;
    if (Math.abs(dx) > 6) dragRef.current.moved = true;
    setOffset(dx);
  }
  function onHeroPointerUp(event: React.PointerEvent<HTMLElement>) {
    if (!dragRef.current.active) return;
    const dx = event.clientX - dragRef.current.x;
    const width = heroRef.current?.clientWidth ?? 1;
    const threshold = Math.min(120, width * 0.16);
    dragRef.current.active = false;
    if (dx <= -threshold) go(slide + 1);
    else if (dx >= threshold) go(slide - 1);
    setOffset(0);
    setDragging(false);
  }
  function onHeroClickCapture(event: React.MouseEvent) {
    if (!dragRef.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current.moved = false;
  }

  useEffect(() => {
    if (dragging) return;
    const id = setInterval(() => setSlide((value) => (value + 1) % slideCount), 7000);
    return () => clearInterval(id);
  }, [timerKey, dragging, slideCount]);

  useEffect(() => {
    if (!q) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        setResults(((await res.json()) as { results: Anime[] }).results);
      } catch {}
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen && !authOpen) return;
    const root = document.documentElement;
    root.style.scrollbarGutter = "stable";
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = "";
      root.style.scrollbarGutter = "";
    };
  }, [searchOpen, authOpen]);

  useEffect(() => {
    document.querySelector(".search-row.is-active")?.scrollIntoView({ block: "nearest" });
  }, [active]);

  useEffect(() => {
    let locked = dockLocked;
    try {
      locked = localStorage.getItem("animeb.dockLock") === "1";
    } catch {}
    setDockLocked(locked);
    scrollY.current = window.scrollY;
    if (locked || window.scrollY > 32) setDockOpen(false);
    setDockReady(true);
    setHeaderSolid(window.scrollY > 12);
    function onScroll() {
      const y = window.scrollY;
      setHeaderSolid(y > 12);
      if (!locked) {
        if (y < scrollY.current - 4) setDockOpen(true);
        else if (y > scrollY.current + 4 && y > 24) setDockOpen(false);
      }
      scrollY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [dockLocked]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        openSearch();
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setMenuOpen(false);
      }
      if ((event.target as HTMLElement).tagName === "INPUT") return;
      if (event.key === "ArrowRight") go(slide + 1);
      if (event.key === "ArrowLeft") go(slide - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slide]);

  return (
    <>
      <header className={`site-header fixed inset-x-0 top-0 z-40 flex h-20 items-center justify-between pr-4 pl-6 ${headerSolid ? "is-solid" : ""}`}>
        <div className="relative z-10 flex items-center gap-3">
          <button type="button" className={`burger grid size-10 cursor-pointer place-items-center ${menuOpen ? "is-open" : ""}`} aria-label={menuOpen ? "მენიუს დახურვა" : "მენიუ"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <span className="burger-lines" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </button>
          <a href="/" className="inline-flex items-center"><Logo /></a>
        </div>
        <button type="button" className="search-trigger absolute top-1/2 left-1/2 z-10 flex h-14 w-[min(560px,calc(100vw-480px))] -translate-x-1/2 -translate-y-1/2 cursor-text items-center gap-3 rounded-full pr-3 pl-5 text-[15px] text-[#8b929e] max-[700px]:w-14 max-[700px]:justify-center max-[700px]:px-0" onClick={openSearch} onMouseMove={(event) => { const box = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty("--mx", `${event.clientX - box.left}px`); }} aria-label="ანიმეს ძებნა">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <span className="flex-1 text-left max-[700px]:hidden">მოძებნე ანიმე...</span>
          <span className="flex gap-1 max-[700px]:hidden"><kbd className="search-trigger-kbd">Ctrl</kbd><kbd className="search-trigger-kbd">S</kbd></span>
        </button>
        <div className="relative z-10 flex items-center">
          {user ? (
            <>
              <Notifications />
              <div className="relative">
                <button type="button" className="cursor-pointer p-1" aria-label="მომხმარებლის მენიუ" aria-expanded={userMenu} onClick={() => setUserMenu((open) => !open)}>
                  <Avatar src={user.avatar} frame={user.frame} alt={user.name} size={28} faceClass="shadow-[0_0_0_1px_rgba(255,255,255,0.15)]" />
                </button>
                {userMenu ? (
                  <>
                    <button type="button" className="fixed inset-0 cursor-default" aria-label="მენიუს დახურვა" onClick={() => setUserMenu(false)} />
                    <div className="absolute top-full right-0 z-10 mt-2 w-[272px] overflow-hidden rounded-xl border border-white/10 bg-[#101010] py-2 shadow-[0_24px_60px_rgba(0,0,0,0.7)] before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-[#e93748]" role="menu">
                      <div className="flex items-center gap-3 px-4 py-2.5">
                        <Avatar src={user.avatar} frame={user.frame} size={40} />
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-white">{user.name}</p>
                          <p className="truncate text-xs text-white/45">{user.email}</p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-[#e93748]">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>
                            შემოუერთდა {joinedAgo(user.joinedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="mx-3 my-1 h-px bg-white/8" />
                      <MenuLink href="/settings" icon="user" onClick={() => setUserMenu(false)}>პროფილი</MenuLink>
                      <MenuLink href={`/@${encodeURIComponent(user.name)}`} icon="public" onClick={() => setUserMenu(false)}>საჯარო პროფილი</MenuLink>
                      <MenuLink href="/watchlist" icon="bookmark" onClick={() => setUserMenu(false)}>სანახავი სია</MenuLink>
                      <MenuLink href="/lists" icon="lists" onClick={() => setUserMenu(false)}>ჩემი სიები</MenuLink>
                      <MenuLink href="/friends" icon="friends" onClick={() => setUserMenu(false)}>მეგობრები</MenuLink>
                      <MenuLink href="/continue" icon="play" onClick={() => setUserMenu(false)}>განაგრძე ყურება</MenuLink>
                      <MenuLink href="/notifications" icon="bell" onClick={() => setUserMenu(false)}>შეტყობინებები</MenuLink>
                      {user.group === 1 || /admin|ადმინ/i.test(user.groupName ?? "") ? <MenuLink href="/admin" icon="admin" onClick={() => setUserMenu(false)}>ადმინპანელი</MenuLink> : null}
                      <button type="button" role="menuitem" className="user-menu-item text-[#e93748] hover:bg-[#e93748]/10" onClick={signOut}>
                        <MenuGlyph name="out" />
                        გასვლა
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </>
          ) : (
            <button type="button" className="hero-cta relative mr-2 h-9 -skew-x-12 cursor-pointer overflow-hidden bg-[#e93748] px-5 text-white" onClick={() => setAuthOpen(true)}>
              <span className="inline-flex skew-x-12 items-center gap-2 text-xs font-black tracking-[2px] uppercase">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></svg>
                შესვლა
              </span>
            </button>
          )}
        </div>
      </header>

      {menuOpen ? (
        <>
          <button type="button" className="fixed inset-0 z-30 cursor-default" aria-label="მენიუს დახურვა" onClick={() => setMenuOpen(false)} />
          <nav className="nav-menu fixed top-[72px] left-4 z-[46] w-[198px] overflow-hidden border border-white/10 bg-[rgba(10,10,10,0.85)] shadow-[0_18px_68px_rgba(0,0,0,0.75)] backdrop-blur-[28px]" aria-label="დათვალიერება">
            <div className="pointer-events-none absolute -top-[120px] left-[68px] size-[240px] rounded-full border border-[#e93748]/25" />
            {([
              ["დათვალიერება", menuItems.browse],
              ["სხვა", menuItems.more],
            ] as const).map(([label, items]) => (
              <div key={label} className="relative">
                <div className="relative flex items-center pt-2 pr-[13.6px] pb-[7.2px] pl-[15.2px]">
                  <span className="absolute top-[9px] -left-[1.8px] h-[11.5px] w-[5px] -skew-x-[18deg] scale-y-95 bg-[#e93748]" />
                  <span className="text-[9.28px] leading-[13.92px] font-extrabold tracking-[1.67px] text-[#6f7683] uppercase">{label}</span>
                </div>
                <div className="px-[6.4px]">
                  {items.map((item) => {
                    const active = item.id === "home";
                    const row = (
                      <>
                        <span className="menu-row-wash" />
                        <span className="menu-row-bar" />
                        <span className="menu-row-icon">
                          <img src={`${item.icon}?v=2`} alt="" />
                        </span>
                        <span className="menu-row-label">{item.name}</span>
                      </>
                    );
                    const className = `menu-row relative flex w-full items-center gap-[9.6px] px-[8.8px] py-2 text-left ${active ? "is-on" : ""}`;
                    if (item.id === "search") return <button key={item.name} type="button" className={className} onClick={() => { setMenuOpen(false); setSearchOpen(false); router.push("/search"); }}>{row}</button>;
                    if ("href" in item) return <a key={item.name} href={item.href} className={className} onClick={() => setMenuOpen(false)}>{row}</a>;
                    return <button key={(item as { name: string }).name} type="button" className={className}>{row}</button>;
                  })}
                </div>
              </div>
            ))}
          </nav>
        </>
      ) : null}

      {showDock && dockReady ? <nav
        className={`fixed z-[45] flex flex-col items-center shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-300 ease-out ${dockOpen ? "top-[245px] left-4 w-[70px] translate-y-0 gap-3 rounded-full border border-white/10 bg-[rgba(10,10,10,0.92)] p-3" : "top-1/2 left-0 w-10 -translate-y-1/2 gap-0.5 rounded-r-[16px] border border-l-0 border-white/10 bg-black/70 py-1.5"}`}
        aria-label="ნავიგაცია"
      >
        {dockOpen ? (
        <>
          <a href="/" className="relative grid size-[42px] place-items-center rounded-full border border-white/5 bg-white/8 text-white" aria-label="მთავარი">
            <span className="absolute top-2.5 -left-3 h-5 w-[3px] rounded-r-full bg-[#e93748]" />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" /></svg>
          </a>
          <button type="button" className="grid size-[42px] place-items-center text-[#9ca3af]" aria-label="ძებნა" onClick={() => { setSearchOpen(false); router.push("/search"); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3-3" /></svg>
          </button>
          <a href="/schedule" className="grid size-[42px] place-items-center text-[#9ca3af]" aria-label="განრიგი">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>
          </a>
          <a href="/community" className="grid size-[42px] place-items-center text-[#9ca3af]" aria-label="საზოგადოება">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3" /><path d="M3 19c1-3 3.5-4.5 6-4.5S14 16 15 19" /><circle cx="17" cy="9" r="2.2" /><path d="M16.5 14.6c2.2.3 4 1.7 4.8 4.4" /></svg>
          </a>
          <div className="h-px w-6 bg-white/8" />
          <a href="/settings" className="grid size-[42px] place-items-center text-[#9ca3af]" aria-label="პარამეტრები">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></svg>
          </a>
          <a href="/community" className="grid size-[42px] place-items-center text-[#9ca3af]" aria-label="აქტივობა">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 12h4l2-6 4 12 2-6h6" /></svg>
          </a>
          <div className="h-px w-6 bg-white/8" />
          <button type="button" className="grid size-11 place-items-center rounded-lg text-[#9ca3af]" aria-label="ჩაკეცვა" onClick={() => setDockOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 6 9 12l6 6" /></svg>
          </button>
        </>
        ) : (
          <>
            <button type="button" className="grid h-16 w-full place-items-center rounded-[10px] text-white/85" aria-label="გაშლა" onClick={() => setDockOpen(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m9 6 6 6-6 6" /></svg>
            </button>
            <button
              type="button"
              className={`grid size-8 place-items-center ${dockLocked ? "text-[#e93748]" : "text-white/70"}`}
              aria-pressed={dockLocked}
              aria-label={dockLocked ? "მენიუს განბლოკვა" : "მენიუს ჩაკეტვა"}
              onClick={() => {
                setDockLocked((locked) => {
                  const next = !locked;
                  try { localStorage.setItem("animeb.dockLock", next ? "1" : "0"); } catch {}
                  return next;
                });
                setDockOpen(false);
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
            </button>
            <a href="/#posts" className="grid size-8 place-items-center text-white/70" aria-label="აქტივობა">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 12h4l2-6 4 12 2-6h6" /></svg>
            </a>
          </>
        )}
      </nav> : null}

      {panel ? (
        <div className="bg-[#070707] pt-20 text-white">{panel}</div>
      ) : settings ? (
        <SettingsView section={settings.section} account={settings.account} />
      ) : myLists ? (
        <MyListsView folders={myLists.folders} folder={myLists.folder} />
      ) : search ? (
        <SearchView items={search.items} total={search.total} facets={search.facets} query={search.query} lists={lists} listOf={(id) => userLists[id] ?? null} onList={changeList} onOpen={openWatch} />
      ) : watchlist ? (
        <WatchlistView page={watchlist.page} query={watchlist.query} lists={lists} signedIn={!!user} onAuth={() => setAuthOpen(true)} />
      ) : activity ? (
        <ActivityView data={activity} />
      ) : hub ? (
        <HubView hub={hub} onAuth={() => setAuthOpen(true)} />
      ) : continueWatch ? (
        <ContinueView items={continueWatch} />
      ) : inbox ? (
        <NotificationsView items={inbox} />
      ) : friends ? (
        <FriendsView page={friends.page} tab={friends.tab} />
      ) : profile ? (
        <ProfileView profile={profile} onAuth={() => setAuthOpen(true)} />
      ) : detail && watchEpisode ? (
        <WatchView detail={detail} initialEpisode={watchEpisode} user={user} state={state} lists={lists} initialComments={comments ?? []} commentStats={commentStats} prefs={prefs} room={watchRoom} emotes={emotes} onAuth={() => setAuthOpen(true)} />
      ) : detail ? (
        <AnimeDetailView detail={detail} user={user} state={state} lists={lists} cards={characterCards} onAuth={() => setAuthOpen(true)} />
      ) : (<>
      <section
        ref={heroRef}
        className={`relative h-[638px] touch-pan-y overflow-hidden bg-[#0a0a0a] select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        aria-roledescription="carousel"
        onPointerDown={onHeroPointerDown}
        onPointerMove={onHeroPointerMove}
        onPointerUp={onHeroPointerUp}
        onPointerCancel={onHeroPointerUp}
        onClickCapture={onHeroClickCapture}
      >
        {home.slides.map((item, index) => {
          const count = home.slides.length;
          const span = Math.max(dragRef.current.width, 1) * 0.45;
          const progress = dragging ? Math.max(-1, Math.min(1, offset / span)) : 0;
          const neighbor = (slide + (progress < 0 ? 1 : -1) + count) % count;
          const opacity = !dragging || progress === 0 ? (index === slide ? 1 : 0) : index === slide ? 1 - Math.abs(progress) : index === neighbor ? Math.abs(progress) : 0;
          return (
            <div
              key={item.title}
              className="absolute inset-0 overflow-hidden bg-cover bg-center"
              aria-hidden={index !== slide}
              style={{
                backgroundImage: `url('${item.banner || item.poster}')`,
                opacity,
                zIndex: dragging && index === neighbor ? 2 : index === slide ? 1 : 0,
                pointerEvents: index === slide && !dragging ? "auto" : "none",
                transition: dragging ? "none" : "opacity 480ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,10,0.72)_0%,rgba(10,10,10,0.48)_20%,rgba(10,10,10,0.2)_40%,rgba(10,10,10,0.06)_62%,rgba(10,10,10,0)_82%),linear-gradient(180deg,rgba(10,10,10,0)_0%,rgba(10,10,10,0.6)_50%,#0a0a0a_100%)]" />
              <div className="absolute bottom-20 left-[108px] z-2 w-[672px] max-w-[calc(100%-160px)]">
                <div className="flex gap-2">
                  {[item.score ? `★ ${item.score}` : null, item.type, item.year].filter((badge): badge is string => !!badge).map((badge) => (
                    <span key={badge} className="rounded bg-black/80 px-2 py-1 text-sm leading-5 font-semibold text-[#e93748]">{badge}</span>
                  ))}
                </div>
                {item.poster ? <img src={item.poster} alt={item.title} draggable={false} className="h-24 w-[93px] object-cover shadow-[0_0_4px_rgba(255,255,255,0.65),0_1px_4px_rgba(0,0,0,0.9),0_6px_36px_rgba(0,0,0,0.7)]" /> : null}
                <p className="font-mkhedruli mt-4 h-[72px] max-w-[576px] overflow-hidden text-base leading-6 font-normal text-[#d1d5dc]">{item.desc || item.title}</p>
                <div className="flex items-center gap-6 pt-4">
                  <button type="button" className="hero-cta relative h-11 -skew-x-12 cursor-pointer overflow-hidden bg-[#e93748] px-8 text-white" onClick={() => openWatch(item.slug)}>
                    <span className="inline-flex skew-x-12 items-center gap-2 text-sm font-black tracking-[2.8px] uppercase"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg> ყურება</span>
                  </button>
                  <button type="button" className="hero-ghost relative h-[46px] -skew-x-12 cursor-pointer border border-white/20 bg-black/60 px-8 text-white" onClick={() => openDetail(item.slug)}>
                    <span className="inline-flex skew-x-12 items-center gap-2 text-sm font-bold tracking-[2.8px] uppercase"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 8h.01" /></svg> დეტალები</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        <div className="absolute top-20 right-4 z-3 flex gap-2">
          <button type="button" className="grid size-[38px] cursor-pointer place-items-center rounded border border-white/10 bg-black/60 backdrop-blur-sm" aria-label="წინა" onClick={() => go(slide - 1)}>‹</button>
          <button type="button" className="grid size-[38px] cursor-pointer place-items-center rounded border border-white/10 bg-black/60 backdrop-blur-sm" aria-label="შემდეგი" onClick={() => go(slide + 1)}>›</button>
        </div>
        <div className="absolute right-10 bottom-10 z-3 flex items-center gap-2">
          {home.slides.map((item, index) => (
            <button key={item.slug} type="button" className={`h-1.5 cursor-pointer rounded-full transition-[width,background-color] duration-300 ${index === slide ? "w-8 bg-[#e93748]" : "w-2 bg-white/30"}`} aria-label={`Go to ${item.title}`} onClick={() => go(index)} />
          ))}
        </div>
      </section>

      <main className={`rise-in mx-auto grid w-full max-w-[1920px] grid-cols-1 gap-6 px-6 pt-8 ${sideBlocks.length ? "min-[1200px]:grid-cols-[minmax(0,1fr)_450px]" : ""}`} style={{ animationDelay: "220ms" }}>
        <div className="min-w-0">
          {notice && announce ? (
            <div className={`relative grid min-h-[59px] items-center gap-3 border border-[#e93748]/28 bg-black py-[11px] pr-2 pl-4 ${notice.href ? "grid-cols-[30px_1fr_auto_auto]" : "grid-cols-[30px_1fr_auto]"}`}>
              <span className="absolute top-3 left-0 h-[35px] w-[3px] bg-linear-to-b from-[#e93748] to-[#e93748]/30" />
              <span className="grid size-[30px] place-items-center border border-[#e93748]/30 bg-[#e93748]/10 text-[#e93748]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 2.9 6.6L22 9.2l-5 4.6 1.4 6.9L12 17.8 5.6 20.7 7 13.8 2 9.2l7.1-.6z" /></svg>
              </span>
              <div className="min-w-0">
                <small className="block text-[9.3px] font-extrabold tracking-[1.5px] text-[#e93748] uppercase">{notice.kicker}</small>
                <p className="mt-0.5 text-[12.5px] font-medium text-[#c7ccd4]">{notice.text}</p>
              </div>
              {notice.href ? <a className="inline-flex h-[27px] items-center border border-white/10 bg-[#0a0a0a] px-2 text-[9.6px] font-extrabold tracking-[1.15px] text-[#969ca7] uppercase" href={notice.href} target={notice.href.startsWith("http") ? "_blank" : undefined} rel={notice.href.startsWith("http") ? "noreferrer" : undefined}>{notice.label || "გახსნა"} ›</a> : null}
              <button type="button" className="grid size-[30px] place-items-center border border-white/10 bg-[#0a0a0a] text-[#969ca7]" aria-label="განცხადების დახურვა" onClick={() => setAnnounce(false)}>×</button>
            </div>
          ) : null}

          {homeBlocks.filter((block) => block.on && block.id !== "trend" && block.id !== "schedule" && block.id !== "posts").map((block) => {
            if (block.id === "continue") {
              if (!continueItems.length) return null;
              return (
                <section key={block.id} id="continue" className="mt-8">
                  <div className="flex h-8 items-center justify-between">
                    <h2 className="flex items-center gap-3 text-2xl leading-8 font-bold"><span className="h-6 w-1 rounded-sm bg-[#e93748]" />{block.title}</h2>
                    <a href="/continue" className="text-sm font-semibold text-[#e93748]">ყველა</a>
                  </div>
                  <ContinueSwiper
                    items={continueItems}
                    onOpen={openWatch}
                    onRemove={(id) => {
                      setHiddenContinue((list) => [...list, id]);
                      fetch("/api/history", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: id }) });
                    }}
                  />
                </section>
              );
            }
            const items = block.id === "latest" ? home.latest : block.id === "fresh" ? home.fresh : home.upcoming;
            if (!items.length) return null;
            return (
              <section key={block.id} className="mt-8">
                <div className="flex h-8 items-center justify-between">
                  <h2 className="flex items-center gap-3 text-2xl leading-8 font-bold"><span className="h-6 w-1 rounded-sm bg-[#e93748]" />{block.title}</h2>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-4 min-[900px]:grid-cols-3 min-[1400px]:grid-cols-6">
                  {items.map((item) => <AnimeCard key={item.slug} item={item} lists={lists} listId={item.id ? userLists[item.id] ?? null : null} onList={(listId) => changeList(item.id, listId)} onOpen={openWatch} />)}
                </div>
              </section>
            );
          })}
        </div>

        {sideBlocks.length ? <aside className="flex flex-col gap-6">
          {sideBlocks.map((block) => block.id === "trend" ? (
          <div key={block.id} className="relative border border-white/6 bg-[#141414] p-[17px] before:absolute before:top-2 before:left-2 before:size-3.5 before:border-t before:border-l before:border-[#e93748]/70 after:absolute after:right-2 after:bottom-2 after:size-3.5 after:border-r after:border-b after:border-[#e93748]/70">
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-bold">{block.title}</h2>
              <div className="flex">
                {periods.map((item) => (
                  <button key={item.id} type="button" className={`relative h-7 px-2 text-sm ${period === item.id ? "text-[#e93748]" : "text-[#9ca3af]"}`} onClick={() => setPeriod(item.id)}>
                    {item.label}
                    {period === item.id ? <span className="absolute inset-x-0 -bottom-2 h-0.5 bg-[#e93748]" /> : null}
                  </button>
                ))}
              </div>
            </div>
            {trending.map((item, index) => (
              <button key={item.slug} type="button" style={{ "--trend": trendAccents[index % trendAccents.length] } as React.CSSProperties} className="group relative mt-2.5 block h-[96px] w-full cursor-pointer text-left transition duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] hover:translate-x-1 motion-reduce:transition-none motion-reduce:hover:translate-none" onClick={() => openWatch(item.slug)}>
                <span className="trend-clip pointer-events-none absolute inset-0">
                  {item.banner || item.poster ? (
                    <img
                      src={item.banner || item.poster}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover object-right opacity-40 transition-opacity duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100 motion-reduce:transition-none"
                    />
                  ) : null}
                  <span className="absolute inset-0 bg-linear-to-r from-[#111111] from-28% via-[#111111]/90 via-48% to-transparent" />
                  <span className="absolute inset-y-0 left-0 w-[5px] bg-(--trend) opacity-0 transition-opacity duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100 motion-reduce:transition-none" />
                </span>
                <div className="relative flex h-full items-center gap-2 pr-14 pl-3">
                  <div className="relative grid h-full w-16 shrink-0 place-items-center">
                    <span className={`trend-rank absolute -left-1 leading-none font-black ${index >= 9 ? "text-[48px]" : "text-[68px]"}`}>{index + 1}</span>
                    <span className={`trend-digit relative z-10 leading-none font-extrabold text-white transition-colors duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${index >= 9 ? "text-[22px]" : "text-[26px]"}`}>{index + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bog truncate text-[15px] leading-none font-normal">{item.title}</h3>
                    <div className="mt-2 flex items-center gap-2 text-[12px] text-[#d4d4d8]">
                      {item.score ? <b className="font-semibold text-[#e93748]">★ {item.score}</b> : null}
                      <span className="text-white/80">{item.type}</span>
                      <span className="inline-flex items-center gap-1 text-white/70"><Marks sub={item.sub} dub={item.dub} total={item.total} /></span>
                    </div>
                  </div>
                </div>
                <span className="absolute top-1/2 right-3 grid size-9 -translate-y-1/2 scale-90 place-items-center rounded-full bg-white opacity-0 shadow-[0_6px_16px_rgba(0,0,0,0.4)] transition duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-100 group-hover:opacity-100 motion-reduce:transition-none">
                  <svg width="12" height="14" viewBox="0 0 14 16" className="ml-0.5" aria-hidden="true"><path fill="#111" d="M.6.7 13.1 8 .6 15.3Z" /></svg>
                </span>
              </button>
            ))}
          </div>

          ) : block.id === "schedule" ? (
          <div key={block.id} id="schedule" className="relative scroll-mt-24 border border-white/6 bg-[#141414] p-[17px]">
            <div className="grid grid-cols-[36px_1fr_36px] items-center border-b-2 border-transparent bg-[linear-gradient(#e93748,#e93748)] bg-size-[72px_2px] bg-bottom-left bg-no-repeat pb-3">
              <button type="button" className="grid size-9 place-items-center rounded-lg border border-white/8" aria-label="წინა დღე" onClick={() => setDayOffset((value) => value - 1)}>‹</button>
              <div className="flex justify-center gap-4">
                {days.map((date, index) => (
                  <div key={date.toISOString()} className={`w-16 text-center ${index === 2 ? "text-white" : "text-[#9ca3af]"}`}>
                    <small className="block text-[11px] tracking-wide">{dayNames[date.getDay()]}</small>
                    <b className={`mt-1.5 block text-base ${index === 2 ? "rounded-lg bg-[#e93748]/16 leading-[30px] text-[#e93748]" : ""}`}>{date.getDate()}</b>
                  </div>
                ))}
              </div>
              <button type="button" className="grid size-9 place-items-center rounded-lg border border-white/8" aria-label="შემდეგი დღე" onClick={() => setDayOffset((value) => value + 1)}>›</button>
            </div>
            {scheduleRows.length ? scheduleRows.map((row) => (
              <button key={row.slug} type="button" className="grid min-h-10 w-full grid-cols-[64px_1fr_auto] items-center gap-2 text-left" onClick={() => openWatch(row.slug)}>
                <time className="text-[13px] font-semibold text-[#e93748]">{row.time}</time>
                <strong className="font-bog truncate text-sm font-normal">{row.title}</strong>
                <em className="text-xs text-[#a1a1aa] not-italic">{row.format} {row.ep}</em>
              </button>
            )) : <p className="py-4 text-sm text-[#a1a1aa]">ამ დღეს ეპიზოდი არ არის.</p>}
            <div className="mt-3 text-xs text-[#6a7282]">{`${selectedDay.getFullYear()}/${String(selectedDay.getMonth() + 1).padStart(2, "0")}/${String(selectedDay.getDate()).padStart(2, "0")}`}</div>
          </div>

          ) : (
          <div key={block.id} id="posts" className="relative scroll-mt-24 border border-white/6 bg-[#141414] p-[17px]">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{block.title}</h2>
              <a href="/community" className="text-sm text-[#a1a1aa]">მეტი ›</a>
            </div>
            {posts.map((post) => (
              <article key={post.handle} className="mt-4 border border-white/6 bg-white/2">
                <div className="px-3 pt-3 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-[#e93748]/12 px-2 py-0.5 text-[11px] font-bold text-[#e93748]">{post.tag}</span>
                    <span className="flex gap-2.5 text-xs text-[#a1a1aa]"><span>💬 {post.comments}</span><span>👁 {post.views}</span></span>
                  </div>
                  <h3 className="mt-2 text-sm leading-snug font-semibold">{post.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-snug text-[#a1a1aa]">{post.body}</p>
                </div>
                <div className="flex items-center gap-2 border-t border-white/5 px-3 py-2">
                  <img src={post.avatar} alt={post.user} className="size-6 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <strong className="block text-xs">{post.user}</strong>
                    <small className="text-[11px] text-[#6a7282]">{post.handle}</small>
                  </div>
                  <span className="text-xs text-[#e93748]">წაკითხვა →</span>
                </div>
              </article>
            ))}
          </div>
          ))}
        </aside> : null}
      </main>
      </>)}

      {hub?.kind === "room" ? null : <footer className="mt-12 border-t border-white/6 px-8 pt-12 pb-8">
        <Logo />
        <p className="mt-3 max-w-[672px] text-sm leading-[22.75px] text-[#99a1af]">ანიმეს ყურება, განხილვა და საზოგადოება ერთ სივრცეში. აღმოაჩინე, უყურე და დაუკავშირდი სხვა მოყვარულებს.</p>
        <div className="mt-6 flex gap-4">
          {([["twitter", "Twitter", "𝕏"], ["discord", "Discord", "D"], ["reddit", "Reddit", "R"]] as const).map(([key, label, mark]) => links[key] ? (
            <a key={key} className="grid size-9 place-items-center rounded-lg border border-white/8" href={links[key]} target="_blank" rel="noreferrer" aria-label={label}>{mark}</a>
          ) : null)}
        </div>
        <div className="mt-6 border-t border-white/6 pt-6 text-xs text-[#6a7282]">
          <p>© 2026 Animeb. ყველა უფლება დაცულია.</p>
          <p className="mt-2">Animeb ფაილებს საკუთარ სერვერზე არ ინახავს. ვიდეო მესამე მხარის სერვისებზეა განთავსებული.</p>
          <nav className="mt-3 flex gap-6 text-sm text-[#9ca3af]"><a href="/help">დახმარება</a><a href="/guide">გზამკვლევი</a><a href="/status">სტატუსი</a></nav>
        </div>
      </footer>}

      {searchOpen ? (
        <div className="search-overlay fixed inset-0 z-[80] flex items-start justify-center px-6 pt-[12vh]">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="ძებნის დახურვა" onClick={() => setSearchOpen(false)} />
          <div className="search-panel relative w-full max-w-[600px] overflow-hidden rounded-[36px] border border-white/8 bg-[rgba(14,14,14,0.88)] p-2" role="dialog" aria-label="ანიმეს ძებნა">
            <label className="search-trigger search-box relative flex h-14 cursor-text items-center gap-3 rounded-full pr-2.5 pl-5 text-[#8b929e]" onMouseMove={(event) => { const box = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty("--mx", `${event.clientX - box.left}px`); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <input ref={searchRef} value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); setResults(null); }} onKeyDown={onSearchKey} placeholder="მოძებნე ანიმე..." className="h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] text-white outline-none placeholder:text-[#6a7282]" />
              {query ? (
                <button type="button" className="grid size-8 cursor-pointer place-items-center rounded-full text-[#6a7282] transition-colors hover:bg-white/8 hover:text-white" aria-label="ძებნის გასუფთავება" onClick={() => { setQuery(""); setActive(0); searchRef.current?.focus(); }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              ) : (
                <kbd className="search-trigger-kbd">Esc</kbd>
              )}
            </label>
            <p className="px-4 pt-4 pb-2 text-xs font-medium text-[#6a7282]">
              {q ? `${hits.length} შედეგი` : "ახლა პოპულარული"}
            </p>
            <div className="search-list max-h-[56vh] overflow-y-auto">
              {hits.length ? hits.map((item, index) => (
                <button key={item.slug} type="button" className={`search-row group flex w-full cursor-pointer items-center gap-3.5 rounded-2xl px-2.5 py-2 text-left ${index === active ? "is-active" : ""}`} onMouseEnter={() => setActive(index)} onClick={() => openWatch(item.slug)}>
                  {art(item) ? <img src={art(item)} alt="" className="h-[56px] w-[40px] shrink-0 rounded-lg object-cover" /> : <span className="h-[56px] w-[40px] shrink-0 rounded-lg bg-[#1a1a1a]" />}
                  <span className="min-w-0 flex-1">
                    <span className="font-bog block truncate text-sm font-normal text-white">{highlight(item.title)}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs text-[#6a7282]">
                      {[Number(item.score) > 0 ? `★ ${item.score}` : "", item.type, item.year, Number(item.sub) > 0 ? `სუბ ${item.sub}` : "", Number(item.dub) > 0 ? `დაბ ${item.dub}` : ""].filter(Boolean).map((part, i) => (
                        <span key={i} className="flex items-center gap-1.5">
                          {i ? <span className="size-[3px] rounded-full bg-white/20" /> : null}
                          <span className={part?.startsWith("★") ? "text-[#e93748]" : ""}>{part}</span>
                        </span>
                      ))}
                    </span>
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="search-arrow shrink-0 text-[#8b929e]"><path d="M9 6l6 6-6 6" /></svg>
                </button>
              )) : q && results === null ? (
                <p className="px-4 py-10 text-center text-sm text-[#6a7282]">იძებნება…</p>
              ) : !q ? (
                <p className="px-4 py-10 text-center text-sm text-[#6a7282]">დაიწყე წერა საძიებოდ.</p>
              ) : (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-medium text-white">„{query.trim()}“ ვერ მოიძებნა</p>
                  <p className="mt-1.5 text-xs text-[#6a7282]">სცადე სხვა სახელი ან შეამოწმე მართლწერა.</p>
                </div>
              )}
            </div>
            <div className="mt-1 flex items-center gap-5 border-t border-white/6 px-6 pt-3 pb-2.5 text-[11px] text-[#6a7282]">
              <span className="flex items-center gap-1.5"><kbd className="search-kbd">↑</kbd><kbd className="search-kbd">↓</kbd> არჩევა</span>
              <span className="flex items-center gap-1.5"><kbd className="search-kbd">↵</kbd> ძებნა</span>
              <span className="flex items-center gap-1.5"><kbd className="search-kbd">esc</kbd> დახურვა</span>
            </div>
          </div>
        </div>
      ) : null}

      {authOpen ? <AuthDialog onClose={closeAuth} onSuccess={() => { setAuthOpen(false); router.refresh(); }} /> : null}
    </>
  );
}
