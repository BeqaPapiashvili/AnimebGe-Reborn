"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { CommunityView } from "@/components/community-view";
import { CommunityPostView } from "@/components/community-post";
import { Watch2GetherView } from "@/components/watch2gether-view";
import { Watch2GetherRoom } from "@/components/watch2gether-room";
import { LeaderboardView } from "@/components/leaderboard-view";
import { GuideView } from "@/components/guide-view";
import { LevelsView } from "@/components/levels-view";
import type { GuideDoc } from "@/data/guide";
import type { LevelRank } from "@/lib/levels";
import { ShopView } from "@/components/shop-view";
import type { ShopFilters } from "@/lib/shop";
import type { LeaderboardPage } from "@/lib/hub";
import type { RoomPlay, WatchRoomCard } from "@/lib/watch-room-types";
import { animeHref } from "@/lib/data";
import type { CommunityCategory, CommunityPageData, CommunityPost } from "@/lib/community-types";
import type { ProfileCard } from "@/lib/profile-types";
import type { ScheduleItem } from "@/lib/types";

export type Hub =
  | { kind: "schedule"; items: ScheduleItem[] }
  | { kind: "ranks"; page: LeaderboardPage }
  | { kind: "help"; items: { q: string; a: string }[] }
  | { kind: "guide"; doc: GuideDoc }
  | { kind: "levels"; progressHref?: string; ranks: LevelRank[]; cap: string; rules: { id: string; on: boolean; amount: number; cap: number; after: number; max: number; percent: number; min: number }[] }
  | { kind: "shop"; signedIn: boolean; type: "all" | "avatar" | "frame" | "cover"; filters: ShopFilters; page: number; balance: number; pages: number; items: { id: number; type: "avatar" | "frame" | "cover"; name: string; image: string; poster: string; price: number; owned: boolean; worn: boolean; limited: boolean; stock: number; taken: boolean }[]; face: ProfileCard | null }
  | { kind: "status"; ok: boolean; at: string; ms: number }
  | { kind: "community"; page: CommunityPageData; topic?: CommunityCategory | "all" }
  | { kind: "community-post"; page: CommunityPageData; post: CommunityPost }
  | { kind: "feed"; items: { id: string; name: string; avatar?: string; frame?: string; kind: "watch" | "comment"; title: string; slug?: string; text: string; at: string }[] }
  | { kind: "together"; viewerId?: number; rooms: WatchRoomCard[]; friendIds: number[] }
  | { kind: "room"; code: string; hostId: number; host: string; title: string; episode: number; position: number; slug: string; play: RoomPlay | null; viewerId?: number; signedIn: boolean; closed: boolean; startsAt?: string | null }
  | { kind: "reset"; token: string };

function Shell({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="rise bg-[#070707] pt-20 text-white">
      <div className="border-b border-white/5 bg-[#0a0a0a] px-6 py-8 text-center">
        <h1 className="text-4xl leading-10 font-extrabold tracking-[-0.9px]">{title}</h1>
        <p className="mt-1 text-sm font-medium text-[#99a1af]">{text}</p>
      </div>
      <div className="mx-auto w-full max-w-[880px] px-4 py-8 sm:px-8">{children}</div>
    </div>
  );
}

function ago(value: string) {
  const then = new Date(value.replace(" ", "T"));
  const minutes = Math.max(0, Math.round((Date.now() - then.getTime()) / 60000));
  if (!Number.isFinite(minutes) || minutes < 1) return "ახლა";
  if (minutes < 60) return `${minutes} წუთის წინ`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} საათის წინ`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} დღის წინ`;
  return value.slice(0, 10);
}

const dayNames = ["კვირა", "ორშაბათი", "სამშაბათი", "ოთხშაბათი", "ხუთშაბათი", "პარასკევი", "შაბათი"];

export function HubView({ hub, onAuth }: { hub: Hub; onAuth: () => void }) {
  if (hub.kind === "schedule") return <Schedule items={hub.items} />;
  if (hub.kind === "ranks") return <LeaderboardView page={hub.page} />;
  if (hub.kind === "help") return <Help items={hub.items} />;
  if (hub.kind === "guide") return <GuideView doc={hub.doc} />;
  if (hub.kind === "levels") return <LevelsView progressHref={hub.progressHref} ranks={hub.ranks} cap={hub.cap} rules={hub.rules} onAuth={onAuth} />;
  if (hub.kind === "shop") return <ShopView type={hub.type} filters={hub.filters} balance={hub.balance} pages={hub.pages} page={hub.page} items={hub.items} face={hub.face} signedIn={hub.signedIn} onAuth={onAuth} />;
  if (hub.kind === "status") return <Status ok={hub.ok} at={hub.at} ms={hub.ms} />;
  if (hub.kind === "community") return <CommunityView page={hub.page} topic={hub.topic} onAuth={onAuth} />;
  if (hub.kind === "community-post") return <CommunityPostView page={hub.page} post={hub.post} onAuth={onAuth} />;
  if (hub.kind === "feed") return <Feed items={hub.items} />;
  if (hub.kind === "together") return <Watch2GetherView viewerId={hub.viewerId} rooms={hub.rooms} friendIds={hub.friendIds} />;
  if (hub.kind === "room") return <Watch2GetherRoom code={hub.code} hostId={hub.hostId} host={hub.host} title={hub.title} episode={hub.episode} position={hub.position} slug={hub.slug} play={hub.play} viewerId={hub.viewerId} signedIn={hub.signedIn} closed={hub.closed} startsAt={hub.startsAt} onAuth={onAuth} />;
  return <Reset token={hub.token} />;
}

function Schedule({ items }: { items: ScheduleItem[] }) {
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const day = new Date();
  day.setHours(12, 0, 0, 0);
  day.setDate(day.getDate() + offset);
  const rows = items.filter((item) => item.weekday === day.getDay());
  return (
    <Shell title="განრიგი" text="ამ კვირის ეპიზოდები დღეების მიხედვით">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" className="grid size-9 cursor-pointer place-items-center rounded-lg border border-white/10" aria-label="წინა დღე" onClick={() => setOffset((value) => value - 1)}>‹</button>
        <p className="text-sm font-semibold">{dayNames[day.getDay()]} · {day.getDate()}</p>
        <button type="button" className="grid size-9 cursor-pointer place-items-center rounded-lg border border-white/10" aria-label="შემდეგი დღე" onClick={() => setOffset((value) => value + 1)}>›</button>
      </div>
      {rows.length ? rows.map((row) => (
        <button key={`${row.slug}-${row.time}`} type="button" className="grid w-full grid-cols-[64px_1fr_auto] items-center gap-3 border-b border-white/6 py-3 text-left" onClick={() => router.push(`${animeHref(row.slug)}/watch`)}>
          <time className="text-sm font-semibold text-[#e93748]">{row.time}</time>
          <span className="truncate">{row.title}</span>
          <span className="text-xs text-[#99a1af]">{row.format} {row.ep}</span>
        </button>
      )) : <p className="py-16 text-center text-sm text-[#99a1af]">ამ დღეს ეპიზოდი არ არის.</p>}
    </Shell>
  );
}

function Help({ items }: { items: { q: string; a: string }[] }) {
  return (
    <Shell title="დახმარება" text="მოკლე პასუხები ხშირ კითხვებზე">
      {items.map((item) => (
        <section key={item.q} className="border-b border-white/6 py-4">
          <h2 className="font-bold">{item.q}</h2>
          <p className="mt-1 text-sm leading-6 text-[#99a1af]">{item.a}</p>
        </section>
      ))}
    </Shell>
  );
}

function Status({ ok, at, ms }: { ok: boolean; at: string; ms: number }) {
  const when = new Date(at);
  const label = Number.isFinite(when.getTime()) ? when.toLocaleString("ka-GE", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }) : at;
  return (
    <Shell title="სტატუსი" text="ბოლო შემოწმება საიტის ბაზასთან">
      <div className="rounded-2xl border border-white/8 bg-[#0c0c0c] px-6 py-8 text-center">
        <p className={`text-2xl font-extrabold ${ok ? "text-[#e93748]" : "text-white"}`}>{ok ? "მუშაობს" : "ბაზა არ პასუხობს"}</p>
        <p className="mt-2 text-sm text-[#99a1af]">{label} · {ms} მწმ</p>
      </div>
    </Shell>
  );
}

function Feed({ items }: { items: Extract<Hub, { kind: "feed" }>["items"] }) {
  return (
    <Shell title="საზოგადოება" text="მეგობრების ნანახი და კომენტარები">
      {items.length ? items.map((item) => (
        <article key={item.id} className="flex gap-3 border-b border-white/6 py-4">
          <Avatar src={item.avatar} frame={item.frame} size={40} />
          <div className="min-w-0">
            <p className="text-sm"><b>{item.name}</b> <span className="text-[#99a1af]">{item.kind === "watch" ? "უყურებს" : "წერს"}</span></p>
            {item.slug ? <a href={`${animeHref(item.slug)}${item.kind === "watch" ? "/watch" : ""}`} className="mt-1 block font-semibold text-[#e93748]">{item.title}</a> : <p className="mt-1 font-semibold">{item.title}</p>}
            <p className="mt-1 text-sm text-[#d1d5dc]">{item.text}</p>
            <p className="mt-1 text-xs text-[#6a7282]">{ago(item.at)}</p>
          </div>
        </article>
      )) : <p className="py-16 text-center text-sm text-[#99a1af]">საჩვენებელი აქტივობა ჯერ არ არის.</p>}
    </Shell>
  );
}

function Reset({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) return setError(data?.error || "ვერ შეიცვალა");
    router.push("/");
    router.refresh();
  }
  return (
    <Shell title="ახალი პაროლი" text="ბმული 30 წუთი მოქმედებს">
      {token ? (
        <form className="mx-auto flex max-w-sm flex-col gap-3" onSubmit={submit}>
          <input type="password" value={password} minLength={8} onChange={(event) => setPassword(event.target.value)} placeholder="მინიმუმ 8 სიმბოლო" aria-label="ახალი პაროლი" className="h-10 rounded-md bg-[#141414] px-3 text-sm outline-none" />
          <button type="submit" className="h-10 cursor-pointer rounded-md bg-[#e93748] text-sm font-semibold text-white">შეცვლა</button>
          {error ? <p className="text-sm text-[#e93748]">{error}</p> : null}
        </form>
      ) : <p className="text-center text-sm text-[#99a1af]">ბმულში კოდი არ არის.</p>}
    </Shell>
  );
}
