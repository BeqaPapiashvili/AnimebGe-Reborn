"use client";

import { useEffect, useMemo, useState } from "react";
import { EyeOff, Monitor, Search, Smartphone, Tablet, TrendingUp, UserRound, Users } from "lucide-react";
import type { PresenceSnapshot, PresenceTab } from "@/lib/presence";

const REFRESH_MS = 5000;
const deviceLabel: Record<PresenceTab["device"], string> = { desktop: "კომპიუტერი", mobile: "მობილური", tablet: "ტაბლეტი" };
const deviceIcon = { desktop: Monitor, mobile: Smartphone, tablet: Tablet };

function span(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} წმ`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} წთ`;
  return `${Math.floor(m / 60)} სთ ${m % 60} წთ`;
}

function clock(at: number) {
  return new Date(at).toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" });
}

function host(referrer: string) {
  try {
    const name = new URL(referrer).hostname.replace(/^www\./, "");
    return name === location.hostname.replace(/^www\./, "") ? "" : name;
  } catch {
    return "";
  }
}

function Stat({ label, value, hint, icon: Icon, live }: { label: string; value: number | string; hint?: string; icon: typeof Users; live?: boolean }) {
  return (
    <div className="rounded-2xl bg-[#121214] p-5">
      <div className="flex items-center justify-between text-white/45">
        <span className="text-xs">{label}</span>
        {live ? <span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-[#e93748] opacity-75" /><span className="relative inline-flex size-2.5 rounded-full bg-[#e93748]" /></span> : <Icon className="size-4" />}
      </div>
      <p className="mt-3 text-4xl font-black tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-white/35">{hint}</p> : null}
    </div>
  );
}

export function AdminLive({ initial }: { initial: PresenceSnapshot }) {
  const [data, setData] = useState(initial);
  const [now, setNow] = useState(initial.at);
  const [failed, setFailed] = useState(false);
  const [who, setWho] = useState<"all" | "members" | "guests">("all");
  const [needle, setNeedle] = useState("");
  const [section, setSection] = useState("");

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const res = await fetch("/api/presence", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const next = (await res.json()) as PresenceSnapshot;
        if (!stop) {
          setData(next);
          setFailed(false);
        }
      } catch {
        if (!stop) setFailed(true);
      }
    }
    const loop = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      stop = true;
      window.clearInterval(loop);
      window.clearInterval(tick);
    };
  }, []);

  const people = useMemo(() => {
    const q = needle.trim().toLowerCase();
    return data.list.filter((tab) => {
      if (who === "members" && !tab.userId) return false;
      if (who === "guests" && tab.userId) return false;
      if (section && !data.pages.some((page) => page.path === tab.path && page.section === section)) return false;
      return !q || `${tab.name} ${tab.title} ${tab.path}`.toLowerCase().includes(q);
    });
  }, [data, who, needle, section]);

  const maxSection = Math.max(1, ...data.sections.map((item) => item.count));
  const totalDevices = Math.max(1, data.devices.desktop + data.devices.mobile + data.devices.tablet);

  return (
    <div className="mx-auto max-w-[1600px] px-6 pt-6 lg:px-10">
      <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 ${failed ? "bg-amber-500/10 text-amber-400" : "bg-[#e93748]/10 text-[#ff8a95]"}`}>
          <span className={`size-1.5 rounded-full ${failed ? "bg-amber-400" : "animate-pulse bg-[#e93748]"}`} />
          {failed ? "კავშირი შეწყდა, ვცდილობ თავიდან…" : `ლაივი · ახლდება ყოველ ${REFRESH_MS / 1000} წამში`}
        </span>
        <span>ბოლო განახლება: {span(now - data.at)} წინ</span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="ახლა საიტზე" value={data.people} hint="უნიკალური ვიზიტორი ბოლო 1 წუთში" icon={Users} live />
        <Stat label="შესული მომხმარებელი" value={data.members} hint="ანგარიშით" icon={UserRound} />
        <Stat label="სტუმარი" value={data.guests} hint="ანგარიშის გარეშე" icon={Users} />
        <Stat label="ღია ტაბი" value={data.tabs} hint="ერთ ადამიანს შეიძლება რამდენიმე ჰქონდეს" icon={Monitor} />
        <Stat label="პიკი" value={data.peak.count} hint={`სერვერის გაშვების შემდეგ · ${clock(data.peak.at)}`} icon={TrendingUp} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-2xl bg-[#121214] p-5">
          <h2 className="text-sm font-semibold">მოწყობილობები</h2>
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-[#0f0f11]">
            <span className="bg-[#e93748]" style={{ width: `${(data.devices.desktop / totalDevices) * 100}%` }} />
            <span className="bg-[#ff8a95]" style={{ width: `${(data.devices.mobile / totalDevices) * 100}%` }} />
            <span className="bg-white/40" style={{ width: `${(data.devices.tablet / totalDevices) * 100}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(["desktop", "mobile", "tablet"] as const).map((key, index) => {
              const Icon = deviceIcon[key];
              return (
                <div key={key} className="rounded-xl bg-[#18181b] p-3">
                  <span className="flex items-center gap-2 text-xs text-white/45"><span className={`size-2 rounded-full ${["bg-[#e93748]", "bg-[#ff8a95]", "bg-white/40"][index]}`} /><Icon className="size-3.5" />{deviceLabel[key]}</span>
                  <p className="mt-1 text-xl font-bold tabular-nums">{data.devices[key]}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl bg-[#121214] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">განყოფილებები</h2>
            {section ? <button type="button" className="cursor-pointer text-xs text-[#ff8a95]" onClick={() => setSection("")}>ფილტრის მოხსნა</button> : null}
          </div>
          <div className="mt-4 grid gap-2">
            {data.sections.length ? data.sections.map((item) => (
              <button key={item.id} type="button" onClick={() => setSection(section === item.label ? "" : item.label)} className={`grid cursor-pointer grid-cols-[140px_1fr_36px] items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm ${section === item.label ? "bg-[#e93748]/10" : "hover:bg-white/[0.03]"}`}>
                <span className="truncate text-white/75">{item.label}</span>
                <span className="h-2 overflow-hidden rounded-full bg-[#0f0f11]"><span className="block h-full rounded-full bg-[#e93748]" style={{ width: `${(item.count / maxSection) * 100}%` }} /></span>
                <span className="text-right font-semibold tabular-nums">{item.count}</span>
              </button>
            )) : <p className="text-sm text-white/35">ახლა არავინაა.</p>}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-[#121214] p-5">
        <h2 className="text-sm font-semibold">გვერდები</h2>
        <div className="mt-3 max-h-[360px] overflow-y-auto">
          {data.pages.length ? data.pages.map((page) => (
            <a key={page.path} href={page.path} target="_blank" rel="noreferrer" className="grid grid-cols-[minmax(0,1fr)_120px_60px] items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-white/[0.03] max-md:grid-cols-[minmax(0,1fr)_44px]">
              <span className="min-w-0">
                <span className="block truncate text-white/85">{page.title || page.path}</span>
                <span className="block truncate text-xs text-white/35">{page.path}</span>
              </span>
              <span className="truncate text-xs text-white/40 max-md:hidden">{page.section}</span>
              <span className="text-right"><span className="font-bold tabular-nums">{page.count}</span>{page.users ? <span className="block text-[10px] text-white/35">{page.users} წევრი</span> : null}</span>
            </a>
          )) : <p className="text-sm text-white/35">ახლა არავინაა.</p>}
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-[#121214] p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="mr-auto text-sm font-semibold">ვინ სად არის <span className="text-white/35">· {people.length}</span></h2>
          <div className="flex gap-1 rounded-xl bg-[#0f0f11] p-1">
            {([["all", "ყველა"], ["members", "წევრები"], ["guests", "სტუმრები"]] as const).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setWho(key)} className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs ${who === key ? "bg-[#e93748] text-white" : "text-white/50 hover:text-white"}`}>{label}</button>
            ))}
          </div>
          <label className="flex h-9 items-center gap-2 rounded-xl bg-[#0f0f11] px-3 text-white/40">
            <Search className="size-4" />
            <input value={needle} onChange={(event) => setNeedle(event.target.value)} placeholder="სახელი ან გვერდი" className="w-44 bg-transparent text-sm text-white outline-none placeholder:text-white/30" />
          </label>
        </div>
        <div className="mt-3 grid gap-1">
          {people.length ? people.map((tab) => {
            const Icon = deviceIcon[tab.device];
            const from = host(tab.referrer);
            return (
              <div key={tab.tab} className="grid grid-cols-[36px_minmax(0,180px)_minmax(0,1fr)_150px_110px] items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.03] max-lg:grid-cols-[36px_minmax(0,1fr)_80px]">
                {tab.avatar ? <img src={tab.avatar} alt="" className="size-9 rounded-full object-cover" /> : <span className="grid size-9 place-items-center rounded-full bg-[#18181b] text-white/40"><UserRound className="size-4" /></span>}
                <span className="min-w-0">
                  {tab.userId ? <a href={`/@${encodeURIComponent(tab.name)}`} target="_blank" rel="noreferrer" className="block truncate text-sm font-semibold hover:text-[#ff8a95]">{tab.name}</a> : <span className="block truncate text-sm text-white/55">სტუმარი</span>}
                  <span className="block truncate text-[11px] text-white/30">{from ? `მოვიდა: ${from}` : "პირდაპირ"}</span>
                </span>
                <a href={tab.path} target="_blank" rel="noreferrer" className="min-w-0 max-lg:hidden">
                  <span className="block truncate text-sm text-white/80 hover:text-white">{tab.title || tab.path}</span>
                  <span className="block truncate text-[11px] text-white/30">{tab.path}</span>
                </a>
                <span className="flex items-center gap-2 text-xs text-white/45 max-lg:hidden"><Icon className="size-3.5" />{deviceLabel[tab.device]} · {tab.browser}{tab.hidden ? <EyeOff className="size-3.5 text-amber-400/80" aria-label="ტაბი ფონზეა" /> : null}</span>
                <span className="text-right text-xs text-white/45">
                  <span className="block tabular-nums text-white/70">{span(now - tab.pageSince)}</span>
                  <span className="block text-[10px]">საიტზე {span(now - tab.since)}</span>
                </span>
              </div>
            );
          }) : <p className="text-sm text-white/35">ამ ფილტრით არავინაა.</p>}
        </div>
      </div>
    </div>
  );
}
