"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FrameOverlay } from "@/components/avatar";
import { LiveMedia } from "@/components/live-media";
import { Pager } from "@/components/pager";
import { toast } from "@/components/toast";
import { animeHref, formatCount } from "@/lib/data";
import type { ProfileCard, PublicProfile } from "@/lib/profile-types";

export function LevelBar({ level, rank, xp, step, total }: { level: number; rank?: string; xp: number; step: number; total?: number }) {
  const width = step > 0 ? Math.max(0, Math.min(100, (xp / step) * 100)) : 0;
  const earned = Math.max(0, total ?? xp);
  const next = level >= 80 ? earned : earned - xp + step;
  return (
    <div className="w-full max-w-[280px]">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-bold tracking-[0.4px]">
        <span className="text-[#e93748]">დონე {level}{rank ? ` · ${rank}` : ""}</span>
        <span className="text-[#99a1af]">{formatCount(earned)} / {formatCount(next)} XP</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-[#7f1d28] to-[#e93748]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function FriendAction({ id, name, relation, onAuth }: { id: number; name: string; relation: PublicProfile["relation"]; onAuth: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function act(action: string, payload: { name?: string; id?: number }) {
    if (relation === "guest") return onAuth();
    setBusy(true);
    setError("");
    const res = await fetch("/api/friends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!res.ok) {
      setError(data?.error || "მოთხოვნა ვერ გაიგზავნა");
      return;
    }
    router.refresh();
  }

  const label =
    relation === "friends" ? "მეგობრები ხართ" :
    relation === "outgoing" ? "მოთხოვნა გაგზავნილია" :
    relation === "incoming" ? "მოთხოვნის მიღება" :
    relation === "blocked" ? "განბლოკვა" :
    "მეგობრის დამატება";
  const marked = relation === "friends" || relation === "outgoing" || relation === "incoming";

  return (
    <button
      type="button"
      aria-label={error || label}
      title={error || label}
      disabled={busy || relation === "friends"}
      className={`grid size-7 cursor-pointer place-items-center rounded-full border border-white/10 bg-black/50 hover:text-white disabled:cursor-default disabled:opacity-80 ${marked ? "text-[#e93748]" : "text-white/80"}`}
      onClick={() => {
        if (relation === "guest" || relation === "none") act("request", { name });
        else if (relation === "incoming") act("accept", { id });
        else if (relation === "outgoing") act("cancel", { id });
        else if (relation === "blocked") act("unblock", { id });
      }}
    >
      {relation === "friends" ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="3" /><path d="M17 11l1.5 1.5L22 9" /></svg>
      ) : relation === "outgoing" ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10" cy="8" r="3" /><path d="M4.2 19c1-2.2 2.6-3.4 5.8-3.4" /><circle cx="17" cy="16" r="3.2" /><path d="M17 14.6V16l1.2.8" /></svg>
      ) : relation === "blocked" ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10" cy="8" r="3" /><path d="M4.2 19c1-2.2 2.6-3.4 5.8-3.4" /><path d="m15 13 6 6M21 13l-6 6" /></svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3" /><path d="M3.2 19c1.1-2.4 2.8-3.6 5.8-3.6 1.2 0 2.2.2 3 .7" /><path d="M19 8v6M16 11h6" /></svg>
      )}
    </button>
  );
}

function IconButton({ label, href, onClick, children }: { label: string; href?: string; onClick?: () => void; children: React.ReactNode }) {
  const className = "grid size-7 place-items-center rounded-full border border-white/10 bg-black/50 text-white/80 hover:text-white";
  if (href) return <a href={href} aria-label={label} className={className}>{children}</a>;
  return <button type="button" aria-label={label} className={className} onClick={onClick}>{children}</button>;
}

const PAGE_SIZE = 18;

export function ProfileHero({ profile, banner, onAuth, quiet }: { profile: PublicProfile | ProfileCard; banner?: string; onAuth?: () => void; quiet?: boolean }) {
  const [menu, setMenu] = useState(false);
  const owner = "owner" in profile ? profile.owner : true;
  const relation = "relation" in profile ? profile.relation : "self";
  const id = "id" in profile ? profile.id : 0;

  async function copyLink() {
    const url = `${window.location.origin}/@${encodeURIComponent(profile.name)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("ბმული დაკოპირდა");
    } catch {
      /* clipboard blocked */
    }
    setMenu(false);
  }

  return (
    <section className="relative overflow-hidden bg-[#070707]">
      {profile.cover ? <LiveMedia src={profile.cover} className="absolute inset-0 h-full w-full object-cover" /> : banner ? <img src={banner} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-md" /> : null}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.38)_0%,rgba(0,0,0,0.05)_22%,rgba(7,7,7,0.2)_46%,rgba(7,7,7,0.78)_72%,#070707_100%)]" />
      <div className="relative mx-auto w-full max-w-[1100px] px-4 pt-40 pb-2 sm:px-8 sm:pt-52">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="relative z-10 flex min-w-0 flex-1 items-end gap-4 sm:gap-5">
            <div className="relative size-36 shrink-0">
              <LiveMedia src={profile.avatar || "/assets/avatar.jpg"} className="size-36 rounded-full border-4 border-[#070707] object-cover" />
              <FrameOverlay src={profile.frame} className="pointer-events-none absolute top-1/2 left-1/2 size-[132%] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain" />
              <span className="absolute -right-1 bottom-3 flex h-7 -skew-x-12 items-center bg-[#111] px-2 shadow-[0_0_0_1px_#e93748]">
                <span className="skew-x-12 text-[10px] font-black tracking-wide text-[#e93748]">LV</span>
                <span className="skew-x-12 ml-1 text-sm font-black text-white">{profile.level}</span>
              </span>
            </div>
            <div className="min-w-[180px] flex-1 pb-1">
              <div className={`flex items-center gap-2 ${quiet ? "pointer-events-none" : ""}`}>
                <h1 className="text-3xl leading-9 font-extrabold tracking-[-0.75px] text-white">{profile.name}</h1>
                <div className="relative">
                  <IconButton label="პარამეტრები" onClick={() => setMenu((open) => !open)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
                  </IconButton>
                  {menu && !quiet ? (
                    <>
                      <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="დახურვა" onClick={() => setMenu(false)} />
                      <div className="absolute top-full left-0 z-50 mt-2 w-44 rounded-lg border border-white/10 bg-[#111] p-1 shadow-xl">
                        <button type="button" className="block w-full rounded-md px-3 py-2 text-left text-sm text-white hover:bg-white/5" onClick={copyLink}>ბმულის კოპირება</button>
                        {id ? <a href={`/showcase/${id}`} className="block rounded-md px-3 py-2 text-sm text-white hover:bg-white/5">ვიტრინა</a> : null}
                        {id && !owner ? <a href={`/taste/${encodeURIComponent(profile.name)}`} className="block rounded-md px-3 py-2 text-sm text-white hover:bg-white/5">გემოვნება</a> : null}
                        {owner ? <a href="/settings" className="block rounded-md px-3 py-2 text-sm text-white hover:bg-white/5">პარამეტრები</a> : null}
                        {owner ? <a href="/watchlist" className="block rounded-md px-3 py-2 text-sm text-white hover:bg-white/5">ჩემი სია</a> : null}
                      </div>
                    </>
                  ) : null}
                </div>
                <IconButton label="აქტივობა" href={quiet ? undefined : `/@${encodeURIComponent(profile.name)}/activity`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 14 4-4 3 3 5-6" /></svg>
                </IconButton>
                {relation !== "self" && onAuth ? <FriendAction id={id} name={profile.name} relation={relation} onAuth={onAuth} /> : null}
              </div>
              <p className="mt-1 text-sm text-[#c5cad3]">@{profile.name}</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#c5cad3]">
                <span className="inline-flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
                  შემოუერთდა {profile.joined}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 8v5l3 2" /><circle cx="12" cy="12" r="8" /></svg>
                  სერია {profile.streak} დღე
                </span>
                {owner && !quiet ? (
                  <a href="/friends" className="inline-flex items-center gap-1.5 hover:text-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="3" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    {profile.friends} მეგობარი
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="3" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    {profile.friends} მეგობარი
                  </span>
                )}
              </p>
              <div className="mt-4">
                <LevelBar level={profile.level} rank={profile.rank} xp={Math.max(0, profile.xp)} step={profile.xpStep} total={profile.totalXp} />
              </div>
            </div>
          </div>
          <dl className="flex gap-8 pb-1">
            {[
              [profile.stats.completed, "დასრულებული"],
              [profile.stats.watching, "ვუყურებ"],
              [profile.stats.planning, "ვგეგმავ"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="text-3xl font-extrabold text-white">{value}</dt>
                <dd className="text-[11px] font-bold tracking-[0.8px] text-[#c5cad3] uppercase">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

export function ProfileView({ profile, onAuth }: { profile: PublicProfile; onAuth: () => void }) {
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(1);
  const banner = profile.cover || profile.items.find((item) => item.banner)?.banner;
  const items = tab ? profile.items.filter((item) => item.listId === tab) : profile.items;
  const total = profile.items.length;
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function pickTab(id: number) {
    setTab(id);
    setPage(1);
  }

  return (
    <div className="bg-[#070707] pb-16">
      <ProfileHero profile={profile} banner={banner} onAuth={onAuth} />

      <div className="rise mx-auto w-full max-w-[1100px] px-4 sm:px-8">
        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2 text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 4h12v16l-6-3-6 3z" /></svg>
            <h2 className="text-lg font-extrabold">სია</h2>
            <p className="text-sm text-[#99a1af]"><span className="font-bold text-white">{total}</span> ანიმე</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button type="button" className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-bold ${tab === 0 ? "bg-[#e93748] text-white" : "bg-white/5 text-[#d1d5dc]"}`} onClick={() => pickTab(0)}>ყველა ({total})</button>
            {profile.lists.map((list) => (
              <button key={list.id} type="button" className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-bold ${tab === list.id ? "bg-[#e93748] text-white" : "bg-white/5 text-[#d1d5dc]"}`} onClick={() => pickTab(list.id)}>
                {list.label} ({list.count})
              </button>
            ))}
          </div>

          {items.length ? (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {visible.map((item) => {
                const done = item.seen || item.released || 0;
                const totalEp = item.total || item.released || 0;
                const pct = totalEp ? Math.min(100, (done / totalEp) * 100) : 0;
                return (
                  <a key={item.id} href={animeHref(item.slug)} className="group min-w-0">
                    <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-[#18181b]">
                      {item.poster ? <img src={item.poster} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : null}
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
                        {item.score ? <span className="rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-bold text-white">★ {item.score.toFixed(1)}</span> : <span />}
                        {item.rating ? <span className="rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white">{item.rating}</span> : null}
                      </div>
                      {totalEp ? (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 pt-6 pb-2">
                          <div className="mb-1 h-1 overflow-hidden rounded-full bg-white/20">
                            <div className="h-full bg-[#e93748]" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[11px] font-bold text-white">{done} / {totalEp}</p>
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-bold text-white">{item.title}</p>
                    <p className="mt-0.5 text-xs text-[#99a1af]">{[item.format, item.duration ? `${item.duration}წთ` : ""].filter(Boolean).join(" · ")}</p>
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="mt-8 rounded-xl border border-white/8 bg-[#0a0a0a] px-4 py-12 text-center text-sm text-[#99a1af]">ამ სიაში ანიმე არ არის</p>
          )}
          <Pager page={current} pages={pages} onPick={setPage} />
        </section>
      </div>
    </div>
  );
}
