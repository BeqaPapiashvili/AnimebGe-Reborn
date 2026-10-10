"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FrameOverlay } from "@/components/avatar";
import { LiveMedia } from "@/components/live-media";
import { LevelBar } from "@/components/profile-view";
import type { ProfileCard } from "@/lib/profile-types";
import type { ShopFilters } from "@/lib/shop";

type ShopKind = "avatar" | "frame" | "cover";
type ShopItem = { id: number; type: ShopKind; name: string; image: string; poster: string; price: number; owned: boolean; worn: boolean; limited: boolean; stock: number; taken: boolean };

const tabs: ["all" | ShopKind, string][] = [
  ["all", "ყველა"],
  ["avatar", "ავატარები"],
  ["cover", "ქოვერები"],
  ["frame", "ჩარჩოები"],
];

const guest: ProfileCard = {
  name: "სტუმარი",
  avatar: "/assets/avatar.jpg",
  joined: "",
  friends: 0,
  level: 1,
  rank: "Basic",
  xp: 0,
  xpStep: 1000,
  totalXp: 0,
  streak: 0,
  stats: { completed: 0, watching: 0, planning: 0 },
};

function RareMark({ taken }: { taken: boolean }) {
  return (
    <span title={taken ? "გაყიდულია" : "განსაკუთრებული"} aria-label={taken ? "გაყიდულია" : "განსაკუთრებული"} className={`shop-rare ${taken ? "is-sold" : ""}`}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M2 14.2 4.4 6.6 7.4 9.6 10 3.2l2.6 6.4 3-3 2.4 7.6H2zm.4 1.3h15.2V17H2.4v-1.5z" />
      </svg>
    </span>
  );
}

function toDraft(filters: ShopFilters) {
  return {
    sort: filters.sort,
    rarity: filters.rarity,
    min: filters.min == null ? "" : String(filters.min),
    max: filters.max == null ? "" : String(filters.max),
    afford: filters.afford,
    hide: filters.hide,
    anim: filters.anim,
  };
}

function Chip({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`h-10 cursor-pointer rounded-xl px-4 text-sm font-semibold ${on ? "bg-[#e93748] text-white" : "bg-[#1c1c21] text-white/70 hover:text-white"}`}>
      {children}
    </button>
  );
}

function MiniProfile({ profile }: { profile: ProfileCard }) {
  return (
    <section className="bg-[#070707]">
      <div className="relative h-44 overflow-hidden">
        {profile.cover ? <LiveMedia key={profile.cover} src={profile.cover} className="absolute inset-0 h-full w-full object-cover" /> : null}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.25)_0%,rgba(7,7,7,0)_42%,#070707_100%)]" />
      </div>
      <div className="px-6 pb-5">
        <div className="flex items-start gap-5">
          <div className="relative -mt-10 size-24 shrink-0">
            <LiveMedia src={profile.avatar || "/assets/avatar.jpg"} className="size-24 rounded-full border-4 border-[#070707] object-cover" />
            <FrameOverlay src={profile.frame} className="pointer-events-none absolute top-1/2 left-1/2 size-[132%] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain" />
            <span className="absolute right-0 bottom-1 flex h-6 -skew-x-12 items-center bg-[#111] px-1.5 shadow-[0_0_0_1px_#e93748]">
              <span className="skew-x-12 text-[9px] font-black tracking-wide text-[#e93748]">LV</span>
              <span className="skew-x-12 ml-1 text-xs font-black text-white">{profile.level}</span>
            </span>
          </div>
          <div className="min-w-0 pt-3">
            <p className="truncate text-2xl leading-8 font-extrabold tracking-[-0.5px]">{profile.name}</p>
            <p className="text-sm text-[#c5cad3]">@{profile.name}</p>
          </div>
        </div>
        <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#c5cad3]">
          <span className="inline-flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
            შემოუერთდა {profile.joined}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 8v5l3 2" /><circle cx="12" cy="12" r="8" /></svg>
            სერია {profile.streak} დღე
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="3" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            {profile.friends} მეგობარი
          </span>
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <LevelBar level={profile.level} rank={profile.rank} xp={Math.max(0, profile.xp)} step={profile.xpStep} total={profile.totalXp} />
          <dl className="flex gap-6">
            {[
              [profile.stats.completed, "დასრულებული"],
              [profile.stats.watching, "ვუყურებ"],
              [profile.stats.planning, "ვგეგმავ"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="text-xl font-extrabold text-white">{value}</dt>
                <dd className="text-[11px] font-bold tracking-[0.6px] text-[#c5cad3] uppercase">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

export function ShopView({
  type,
  filters,
  balance,
  pages,
  page,
  items,
  face,
  signedIn,
  onAuth,
}: {
  type: "all" | ShopKind;
  filters: ShopFilters;
  balance: number;
  pages: number;
  page: number;
  items: ShopItem[];
  face: ProfileCard | null;
  signedIn: boolean;
  onAuth: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState(() => toDraft(filters));
  const [picked, setPicked] = useState<ShopItem | null>(null);
  const base = face ?? guest;
  const preview = picked
    ? {
        ...base,
        avatar: picked.type === "avatar" ? picked.image : base.avatar,
        frame: picked.type === "frame" ? picked.image : base.frame,
        cover: picked.type === "cover" ? picked.image : base.cover,
      }
    : null;
  useEffect(() => {
    setDraft(toDraft(filters));
  }, [filters]);
  useEffect(() => {
    if (!picked) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPicked(null);
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [picked]);
  const [list, setList] = useState(items);
  const [cursor, setCursor] = useState(page);
  const [more, setMore] = useState(page < pages);
  const [loading, setLoading] = useState(false);
  const [wave, setWave] = useState(0);
  const lock = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setList(items);
    setCursor(page);
    setMore(page < pages);
    setWave(0);
  }, [items, page, pages]);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !more) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || lock.current) return;
      lock.current = true;
      setLoading(true);
      const query = new URLSearchParams();
      if (type !== "all") query.set("type", type);
      if (filters.sort) query.set("sort", filters.sort);
      if (filters.rarity.length) query.set("rare", filters.rarity.join(","));
      if (filters.min != null) query.set("min", String(filters.min));
      if (filters.max != null) query.set("max", String(filters.max));
      if (filters.afford) query.set("afford", "1");
      if (filters.hide) query.set("hide", "1");
      if (filters.anim) query.set("anim", "1");
      query.set("page", String(cursor + 1));
      fetch(`/api/shop?${query}`)
        .then((res) => res.json())
        .then((data: { pages?: number; items?: ShopItem[] }) => {
          const incoming = data.items ?? [];
          setList((current) => {
            const seen = new Set(current.map((item) => item.id));
            const extra = incoming.filter((item) => !seen.has(item.id));
            setWave(current.length);
            return extra.length ? [...current, ...extra] : current;
          });
          setCursor((value) => value + 1);
          setMore((cursor + 1) < (data.pages ?? 1));
        })
        .finally(() => {
          lock.current = false;
          setLoading(false);
        });
    }, { rootMargin: "520px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [more, cursor, type, filters]);
  async function act(item: ShopItem) {
    if (!signedIn) {
      onAuth();
      return;
    }
    if (item.worn || item.taken) return;
    setBusy(item.id);
    setError("");
    const res = await fetch("/api/shop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: item.owned ? "wear" : "buy", id: item.id }) });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(0);
    if (!res.ok) {
      setError(data.error || "ვერ შესრულდა.");
      return;
    }
    setPicked(null);
    router.refresh();
  }
  const href = (nextType: string, next: ShopFilters = filters) => {
    const query = new URLSearchParams();
    if (nextType !== "all") query.set("type", nextType);
    if (next.sort) query.set("sort", next.sort);
    if (next.rarity.length) query.set("rare", next.rarity.join(","));
    if (next.min != null) query.set("min", String(next.min));
    if (next.max != null) query.set("max", String(next.max));
    if (next.afford) query.set("afford", "1");
    if (next.hide) query.set("hide", "1");
    if (next.anim) query.set("anim", "1");
    const text = query.toString();
    return text ? `/shop?${text}` : "/shop";
  };
  const blank: ShopFilters = { sort: "", rarity: [], min: null, max: null, afford: false, hide: false, anim: false };
  function applyDraft() {
    router.push(href(type, {
      sort: draft.sort,
      rarity: draft.rarity,
      min: /^\d+$/.test(draft.min) ? Number(draft.min) : null,
      max: /^\d+$/.test(draft.max) ? Number(draft.max) : null,
      afford: draft.afford,
      hide: draft.hide,
      anim: draft.anim,
    }));
  }
  return (
    <>
    <div className="rise bg-[#070707] pt-24 pb-16 text-white">
      <div className="mx-auto w-full max-w-[1600px] px-6 sm:px-10">
        <h1 className="text-[42px] leading-none font-extrabold tracking-[-0.8px]">მაღაზია</h1>
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {tabs.map(([value, label]) => (
            <a key={value} href={href(value)} className={`inline-flex h-10 shrink-0 items-center rounded-xl px-4 text-sm font-semibold ${type === value ? "bg-[#e93748] text-white" : "bg-[#141417] text-white/65"}`}>{label}</a>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button type="button" className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl px-4 text-sm font-semibold ${filterOpen ? "bg-[#e93748] text-white" : "bg-[#141417] text-white/80"}`} onClick={() => setFilterOpen((open) => !open)}>
            <img src="/assets/shop/filter.svg" alt="" width={16} height={16} />
            ფილტრი
          </button>
          <p className="ml-auto flex items-center gap-2 text-[13px] font-semibold text-white/70">
            ბალანსი:
            <img src="/assets/shop/coin.svg" alt="" width={15} height={15} />
            <span className="text-lg font-extrabold tracking-[0.5px] text-white">{balance}</span>
          </p>
        </div>
        {filterOpen ? (
          <div className="mt-3 rounded-2xl bg-[#141417] px-5 py-5">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="mb-3 text-[13px] font-semibold text-white/45">სორტირება</p>
                <div className="flex flex-wrap gap-2">
                  {([
                    ["", "პოპულარული"],
                    ["cheap", "ჯერ იაფი"],
                    ["rich", "ჯერ ძვირი"],
                    ["name", "სახელით"],
                  ] as const).map(([value, label]) => (
                    <Chip key={label} on={draft.sort === value} onClick={() => setDraft((current) => ({ ...current, sort: value }))}>{label}</Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-[13px] font-semibold text-white/45">იშვიათობა</p>
                <div className="flex flex-wrap gap-2">
                  {([
                    ["common", "ჩვეულებრივი"],
                    ["rare", "იშვიათი"],
                    ["epic", "ეპიკური"],
                    ["legend", "ლეგენდარული"],
                  ] as const).map(([value, label]) => (
                    <Chip key={value} on={draft.rarity.includes(value)} onClick={() => setDraft((current) => ({ ...current, rarity: current.rarity.includes(value) ? current.rarity.filter((item) => item !== value) : [...current.rarity, value] }))}>{label}</Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-[13px] font-semibold text-white/45">ფასი</p>
                <div className="flex items-center gap-2">
                  <input value={draft.min} inputMode="numeric" placeholder="დან" aria-label="ფასი დან" onChange={(event) => setDraft((current) => ({ ...current, min: event.target.value.replace(/\D/g, "").slice(0, 7) }))} className="h-10 w-full rounded-xl bg-[#1c1c21] px-4 text-sm text-white outline-none placeholder:text-white/35 focus:ring-1 focus:ring-[#e93748]" />
                  <span className="text-white/30">—</span>
                  <input value={draft.max} inputMode="numeric" placeholder="მდე" aria-label="ფასი მდე" onChange={(event) => setDraft((current) => ({ ...current, max: event.target.value.replace(/\D/g, "").slice(0, 7) }))} className="h-10 w-full rounded-xl bg-[#1c1c21] px-4 text-sm text-white outline-none placeholder:text-white/35 focus:ring-1 focus:ring-[#e93748]" />
                </div>
              </div>
              <div>
                <p className="mb-3 text-[13px] font-semibold text-white/45">ჩვენება</p>
                <div className="flex flex-wrap gap-2">
                  <Chip on={draft.afford} onClick={() => setDraft((current) => ({ ...current, afford: !current.afford }))}>მონეტა ჰყოფნის</Chip>
                  <Chip on={draft.hide} onClick={() => setDraft((current) => ({ ...current, hide: !current.hide }))}>ნაყიდის დამალვა</Chip>
                  <Chip on={draft.anim} onClick={() => setDraft((current) => ({ ...current, anim: !current.anim }))}>მხოლოდ ანიმაციური</Chip>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button type="button" className="h-10 cursor-pointer rounded-xl bg-[#1c1c21] px-5 text-sm font-semibold text-white/75 hover:text-white" onClick={() => { setDraft(toDraft(blank)); router.push(href(type, blank)); }}>გასუფთავება</button>
              <button type="button" className="h-10 cursor-pointer rounded-xl bg-[#e93748] px-5 text-sm font-semibold text-white" onClick={applyDraft}>ჩვენება</button>
            </div>
          </div>
        ) : null}
        {error ? <p className="mt-4 text-sm text-[#e93748]">{error}</p> : null}
        {list.length ? (
          <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {list.map((item, index) => (
              <button key={item.id} type="button" title={item.limited ? (item.taken ? "გაყიდულია" : `${item.stock} ცალი`) : undefined} className={`${index >= wave ? "shop-card-in" : ""} cursor-pointer overflow-hidden rounded-2xl bg-[#141417] text-left ${item.worn ? "ring-1 ring-[#e93748]" : ""} ${item.taken ? "opacity-60" : ""}`} style={index >= wave ? { animationDelay: `${Math.min(index - wave, 14) * 50}ms` } : undefined} onClick={() => { setError(""); setPicked(item); }}>
                <div className="p-3.5">
                  <div className="relative grid h-[154px] place-items-center overflow-hidden rounded-xl bg-[#0d0d10]">
                    {item.limited ? <RareMark taken={item.taken} /> : null}
                    {item.type === "frame" ? (
                      <span className="relative size-28">
                        <span className="absolute inset-4 rounded-full bg-white/10" />
                        <img src={item.poster} alt="" className="absolute inset-0 size-full object-contain" />
                      </span>
                    ) : item.type === "avatar" ? (
                      <LiveMedia src={item.image} className="size-28 rounded-full object-cover" />
                    ) : (
                      <LiveMedia src={item.image} className="h-full w-full object-cover" />
                    )}
                  </div>
                </div>
                <div className="px-3.5 pt-1 pb-3.5">
                  <p className="font-bog truncate text-sm font-bold">{item.name}</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm font-bold">
                    <img src="/assets/shop/coin.svg" alt="" width={15} height={15} />
                    {item.worn ? "დაყენებულია" : item.taken ? "გაყიდულია" : item.owned ? "ჩაცმა" : item.price.toLocaleString("en-US")}
                  </p>
                </div>
              </button>
            ))}
            {loading ? Array.from({ length: 5 }, (_, index) => <span key={`wait-${index}`} className="h-[230px] animate-pulse rounded-2xl bg-[#141417]" />) : null}
          </div>
        ) : <p className="py-24 text-center text-sm text-[#9ca3af]">ამ სიაში არაფერია.</p>}
        <div ref={sentinel} className="h-8" />
      </div>
    </div>
      {picked && preview ? (
        <div className="folder-overlay fixed inset-0 z-[70] grid place-items-center bg-black/60 px-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setPicked(null)}>
          <div className="folder-dialog auth-frame w-full max-w-[720px]" role="dialog" aria-modal="true" aria-labelledby="shop-preview-title">
            <div className="auth-shell relative bg-[#0a0a0a]">
              <button type="button" className="auth-close absolute top-5 right-5 z-10 grid size-8 -skew-x-12 cursor-pointer place-items-center border border-white/10" aria-label="დახურვა" onClick={() => setPicked(null)}>
                <span className="relative block size-4 skew-x-12">
                  <img src="/assets/auth/close-a.svg" alt="" width={9.33333} height={9.33333} className="absolute top-[3.33px] left-[3.33px]" />
                  <img src="/assets/auth/close-b.svg" alt="" width={9.33333} height={9.33333} className="absolute top-[3.33px] left-[3.33px]" />
                </span>
              </button>
              <div className="px-7 pt-7 pr-16">
                <h2 id="shop-preview-title" className="flex items-center gap-3 text-2xl leading-8 font-bold tracking-[-0.6px] text-white">
                  <span className="h-6 w-1 shrink-0 -skew-x-12 bg-[#e93748]" />
                  <span className="truncate">{picked.name}</span>
                </h2>
                <p className="pt-1 pl-4 text-sm leading-5 text-[#6a7282]">ასე გამოჩნდება შენს პროფილზე</p>
                {picked.limited ? (
                  <p className={`mt-2 flex items-center gap-1.5 pl-4 text-sm font-semibold ${picked.taken ? "text-white/35" : "text-[#e2b340]"}`}>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M2 14.2 4.4 6.6 7.4 9.6 10 3.2l2.6 6.4 3-3 2.4 7.6H2zm.4 1.3h15.2V17H2.4v-1.5z" />
                    </svg>
                    ლიმიტირებულია · {picked.stock} ცალი
                  </p>
                ) : null}
              </div>
              <div className="mx-7 mt-5 overflow-hidden border border-white/8">
                <MiniProfile profile={preview} />
              </div>
              {error ? <p className="px-7 pt-3 text-sm text-[#e93748]">{error}</p> : null}
              <div className="flex items-center justify-end gap-3 px-7 py-6">
                <button type="button" className="hero-ghost relative h-9 -skew-x-12 cursor-pointer border border-white/20 bg-black/60 px-5 text-white" onClick={() => setPicked(null)}>
                  <span className="inline-flex skew-x-12 items-center text-xs font-black tracking-[1px] uppercase">დახურვა</span>
                </button>
                <button type="button" disabled={busy === picked.id || picked.worn || picked.taken} className="hero-cta relative h-9 -skew-x-12 cursor-pointer overflow-hidden bg-[#e93748] px-5 text-white disabled:cursor-default disabled:opacity-60" onClick={() => act(picked)}>
                  <span className="inline-flex skew-x-12 items-center gap-2 text-xs font-black tracking-[1px] uppercase">
                    {picked.worn ? "დაყენებულია" : picked.taken ? "გაყიდულია" : picked.owned ? "ჩაცმა" : <>ყიდვა <img src="/assets/shop/coin.svg" alt="" width={15} height={15} /> {picked.price.toLocaleString("en-US")}</>}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
