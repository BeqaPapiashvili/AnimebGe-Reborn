"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, CircleCheck, Coins, Heart, Info, SlidersHorizontal, Users } from "lucide-react";
import type { PlayData } from "@/lib/play";

type Draw = { cardId: number; name: string; image: string; rarity: string; coins: number; owned?: number; wished?: boolean; holders?: number };
type Settings = { motion: "system" | "on" | "off"; style: "shuffle" | "deal"; hideWindow: boolean; stats: boolean; ownedTag: boolean; wishTag: boolean };
type Status = NonNullable<PlayData["packs"]>;

const defaultSettings: Settings = { motion: "system", style: "shuffle", hideWindow: true, stats: true, ownedTag: true, wishTag: true };
const settingsKey = "animeb-pack-settings";
type Phase = "idle" | "opening" | "choose" | "settling" | "kept";

const tone: Record<string, string> = {
  E: "#94a3b8", D: "#22c55e", C: "#3b82f6", B: "#a855f7", A: "#f59e0b", S: "#e93748", "S+": "#fb7185", RE: "#fbbf24",
};

const openPrice = 150;
const odds = [
  ["E", "45%"], ["D", "26%"], ["C", "16%"], ["B", "8.5%"], ["A", "3.35%"], ["S", "0.8%"], ["S+", "0.25%"], ["RE", "0.1%"],
] as const;

const bundles = [
  { count: 1, title: "ერთი პაკი", text: "სამიდან ერთი ქარდი", fan: [0] },
  { count: 6, title: "ექვსი პაკი", text: "ექვსჯერ ირჩევ", fan: [-12, 0, 12] },
  { count: 20, title: "ოცი პაკი", text: "ოცჯერ ირჩევ", fan: [-22, -11, 0, 11, 22] },
] as const;

const rankOrder = ["E", "D", "C", "B", "A", "S", "S+", "RE"];
const rankOf = (card?: Draw) => (card?.cardId ? rankOrder.indexOf(card.rarity.toUpperCase()) : -1);
const highRank = rankOrder.indexOf("S");

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function buildFan(cards: { id: number; name: string; image: string; rarity: string }[]) {
  const used = new Set<number>();
  const take = (rank: string) => {
    const card = cards.find((item) => item.rarity.toUpperCase() === rank && !used.has(item.id));
    if (!card) return null;
    used.add(card.id);
    return card;
  };
  const spare = () => cards.find((item) => !used.has(item.id)) ?? cards[0];
  return ["A", "B", "S", "C", "E"].map((rank) => {
    const card = take(rank) ?? spare();
    if (card) used.add(card.id);
    return card;
  }).filter((card): card is NonNullable<typeof card> => Boolean(card));
}

export function PackShop({ data }: { data: PlayData }) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [bundle, setBundle] = useState<1 | 6 | 20>(data.offer?.total === 6 || data.offer?.total === 20 ? data.offer.total : 1);
  const [phase, setPhase] = useState<Phase>(data.offer ? "choose" : "idle");
  const [offerId, setOfferId] = useState(data.offer?.id ?? 0);
  const [draws, setDraws] = useState<Draw[]>(data.offer?.cards ?? []);
  const [round, setRound] = useState(data.offer?.step ?? 1);
  const [total, setTotal] = useState(data.offer?.total ?? 1);
  const [choice, setChoice] = useState(-1);
  const [kept, setKept] = useState<Draw | null>(null);
  const [keptList, setKeptList] = useState<Draw[]>([]);
  const [coins, setCoins] = useState(data.coins);
  const [error, setError] = useState("");
  const [warn, setWarn] = useState<{ index: number; best: number } | null>(null);
  const [status, setStatus] = useState<Status | null>(data.packs);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [notice, setNotice] = useState("");
  const [gift, setGift] = useState<Draw | null>(null);
  const [summary, setSummary] = useState<Draw[]>([]);
  const [claiming, setClaiming] = useState(false);
  const faces = useMemo(() => data.cases.flatMap((item) => item.cards), [data.cases]);
  const deck = useMemo(() => buildFan(faces), [faces]);
  const motionOn = settings.motion === "on" || (settings.motion === "system" && !reducedMotion);
  const shuffleOn = motionOn && settings.style === "shuffle";
  const shuffleMs = shuffleOn ? 1050 : 200;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    try {
      const saved = JSON.parse(window.localStorage.getItem(settingsKey) ?? "null");
      if (saved && typeof saved === "object") setSettings({ ...defaultSettings, ...saved });
    } catch {}
    return () => media.removeEventListener("change", sync);
  }, []);

  function updateSettings(patch: Partial<Settings>) {
    setSettings((current) => {
      const next = { ...current, ...patch };
      window.localStorage.setItem(settingsKey, JSON.stringify(next));
      return next;
    });
  }

  function applyResult(body: { status?: Status; gift?: Draw | null; bonusA?: boolean }) {
    if (body.status) setStatus(body.status);
    if (body.gift) setGift(body.gift);
    setNotice(body.bonusA ? "ბონუსი: ამ სამეულში სამივე ქარდი A რანგისაა." : "");
  }

  async function claimBonus() {
    if (claiming) return;
    setClaiming(true);
    const response = await fetch("/api/packs/daily", { method: "POST" });
    const body = await response.json().catch(() => ({ error: "ბონუსი ვერ მოიხსნა." }));
    setClaiming(false);
    if (!response.ok || body.error) { setError(body.error || "ბონუსი ვერ მოიხსნა."); return; }
    setCoins(body.coins);
    setStatus(body.status);
  }

  async function openPack() {
    if (phase === "opening" || phase === "choose" || phase === "settling") return;
    if (!data.me) { setError("შესვლა სჭირდება."); return; }
    setError("");
    setKept(null);
    setKeptList([]);
    setChoice(-1);
    setRound(1);
    setTotal(bundle);
    setPhase("opening");
    const started = Date.now();
    const response = await fetch("/api/packs/open", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ times: bundle }) });
    const body = await response.json().catch(() => ({ error: "პაკი ვერ გაიხსნა." }));
    await wait(Math.max(0, shuffleMs - (Date.now() - started)));
    if (!response.ok || body.error) {
      setPhase("idle");
      setError(body.error || "პაკი ვერ გაიხსნა.");
      return;
    }
    applyResult(body);
    setOfferId(body.offerId);
    setDraws(body.cards);
    setRound(body.step ?? 1);
    setTotal(body.total ?? bundle);
    setCoins(body.coins);
    setPhase("choose");
  }

  function pick(index: number) {
    if (phase !== "choose" || !draws[index]) return;
    const rank = rankOf(draws[index]);
    const best = draws.reduce((top, card, i) => (rankOf(card) > rankOf(draws[top]) ? i : top), 0);
    if (rankOf(draws[best]) >= highRank && rank < rankOf(draws[best])) {
      setWarn({ index, best });
      return;
    }
    void choose(index);
  }

  async function choose(index: number) {
    setWarn(null);
    if (phase !== "choose") return;
    const current = draws[index];
    if (!current) return;
    setChoice(index);
    setPhase("settling");
    const response = await fetch("/api/packs/keep", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offerId, index }) });
    const body = await response.json().catch(() => ({ error: "ქარდი ვერ შეინახა." }));
    await wait(480);
    if (!response.ok || body.error) {
      setPhase("choose");
      setError(body.error || "ქარდი ვერ შეინახა.");
      return;
    }
    if (typeof body.coins === "number") setCoins(body.coins);
    applyResult(body);
    const saved = [...keptList, current];
    setKeptList(saved);
    if (Array.isArray(body.next) && body.next.length === 3) {
      setDraws(body.next);
      setRound(body.step ?? round + 1);
      setTotal(body.total ?? total);
      setChoice(-1);
      setPhase("opening");
      await wait(shuffleMs);
      setPhase("choose");
      return;
    }
    await wait(700);
    if (!settings.hideWindow) setSummary(saved);
    setKept(null);
    setKeptList([]);
    setChoice(-1);
    setPhase("idle");
  }

  return (
    <div className="mx-auto w-full">
      <section className="relative overflow-hidden rounded-[18px] border border-white/10 bg-[#121214] px-6 py-8 sm:px-10 sm:py-10">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#e93748] to-transparent" />
        <div className="relative grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_480px]">
          <div>
            <h1 className="max-w-[520px] text-[28px] leading-[1.15] font-semibold tracking-tight sm:text-[36px]">შემდეგი ქარდი შენს კოლექციაში</h1>
            <p className="mt-4 max-w-[480px] text-[15px] leading-7 text-white/55">გახსენი პაკი, შეადარე სამი ქარდი და დატოვე ის, რომელიც გინდა.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex h-10 items-center rounded-lg bg-[#1a1a1a] px-3.5 text-sm text-[#d1d5dc]">3 შემთხვევითი ქარდი</span>
              <span className="inline-flex h-10 items-center rounded-lg bg-[#1a1a1a] px-3.5 text-sm text-[#d1d5dc]">1 შენ ირჩევ</span>
            </div>
          </div>
          <div className="relative mx-auto h-[230px] w-[320px] sm:h-[300px] sm:w-[460px]">
            <div className="absolute top-1/2 left-1/2 h-[210px] w-[320px] -translate-x-1/2 -translate-y-1/2 sm:scale-[1.42]">
              {deck.map((card, index) => (
                <img
                  key={`${card.id}-${index}`}
                  src={card.image}
                  alt=""
                  className={`pack-in pack-in-${index} absolute top-1/2 left-1/2 h-[156px] w-[104px] rounded-[12px] object-cover shadow-[0_18px_28px_rgba(0,0,0,0.4)]`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-[18px] border border-white/10 bg-[#121214] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-1 pb-4">
          <div className="flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-xl border border-white/10 bg-[#1a1a1a] text-[#e93748]"><Coins className="size-6" /></span>
            <div>
              <p className="text-xs text-white/45">შენი ბალანსი</p>
              <p className="text-[26px] leading-tight font-semibold tracking-tight">{data.me ? coins : "—"} <span className="text-sm font-normal text-white/45">მონეტა</span></p>
            </div>
          </div>
          <p className="text-right text-xs text-white/40">ახალი პაკების გასახსნელად</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <PityCard letter="A" color="#e93748" title="ბონუს A არჩევით" text={status ? <>კიდევ <b className="font-semibold text-[#e93748]">{status.aLeft}</b> პაკი ბონუსამდე</> : "შესვლის შემდეგ ჩანს"} sub={status ? `ყოველ ${status.aEvery} პაკზე სამივე ქარდი A რანგისაა` : ""} progress={status ? 1 - status.aLeft / status.aEvery : 0} />
          <PityCard letter="S" color="#a855f7" title="გარანტირებული S" text={status ? <>კიდევ <b className="font-semibold text-[#e93748]">{status.sLeft}</b> პაკი · არჩევის გარეშე</> : "შესვლის შემდეგ ჩანს"} sub="ჩვეულებრივ S-ის შანსს ემატება" progress={status ? 1 - status.sLeft / status.sEvery : 0} />
        </div>

        <div className="mt-3 rounded-[14px] border border-white/10 bg-[#101013]">
          <button type="button" className="flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-sm text-white/85" onClick={() => setSettingsOpen((value) => !value)}>
            <span className="flex items-center gap-2"><SlidersHorizontal className="size-4 text-[#e93748]" /> გახსნის პარამეტრები</span>
            <span className="text-lg leading-none text-white/40">{settingsOpen ? "−" : "+"}</span>
          </button>
          {settingsOpen ? (
            <div className="border-t border-white/[0.06] px-4 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] py-4">
                <div>
                  <p className="text-sm text-white/85">გახსნის ანიმაცია</p>
                  <p className="mt-1 text-xs text-white/40">{settings.motion === "system" ? `სისტემა ${reducedMotion ? "ზღუდავს ანიმაციას — არევა გამორთულია" : "უშვებს ანიმაციას — არევა ჩართულია"}.` : settings.motion === "on" ? "არევა ყოველთვის ჩართულია." : "ქარდები ანიმაციის გარეშე ჩნდება."} არჩევანი ამ ბრაუზერში ინახება.</p>
                </div>
                <PackSelect value={settings.motion} onChange={(value) => updateSettings({ motion: value as Settings["motion"] })} options={[["system", "სისტემის მიხედვით"], ["on", "ჩართული"], ["off", "გამორთული"]]} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] py-4">
                <p className="text-sm text-white/85">ანიმაციის სტილი</p>
                <PackSelect value={settings.style} disabled={!motionOn} onChange={(value) => updateSettings({ style: value as Settings["style"] })} options={[["shuffle", "ქარდების არევა"], ["deal", "სწრაფი დარიგება"]]} />
              </div>
              <div className="grid gap-x-10 gap-y-4 pt-4 sm:grid-cols-2">
                <PackToggle label="არჩევის შემდეგ ქარდის ფანჯარა არ აჩვენო" on={settings.hideWindow} onChange={(value) => updateSettings({ hideWindow: value })} />
                <PackToggle label="ქარდის სტატისტიკის ჩვენება" on={settings.stats} onChange={(value) => updateSettings({ stats: value })} />
                <PackToggle label="წარწერა „გაქვს“ ქარდებზე" on={settings.ownedTag} onChange={(value) => updateSettings({ ownedTag: value })} />
                <PackToggle label="წარწერა „სასურველი“ ქარდებზე" on={settings.wishTag} onChange={(value) => updateSettings({ wishTag: value })} />
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-3 rounded-[14px] border border-white/10 bg-[#101013]">
          <button type="button" className="flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-sm text-white/85" onClick={() => setRulesOpen((value) => !value)}>
            <span className="flex items-center gap-2"><Info className="size-4 text-[#e93748]" /> პაკებისა და მონეტების შესახებ</span>
            <span className="text-lg leading-none text-white/40">{rulesOpen ? "−" : "+"}</span>
          </button>
          {rulesOpen ? (
            <div className="border-t border-white/[0.06] px-4 py-4 text-sm leading-6 text-white/65">
              <h3 className="text-base font-semibold text-white">რა არის <span className="text-[#e93748]">პაკი</span>?</h3>
              <p className="mt-2">პაკი სამი შემთხვევითი ქარდისგან შედგება, რომლებიც საიტზე არსებობს. გახსნისას შეგიძლია აირჩიო <span className="text-[#e93748]">მხოლოდ 1</span> ქარდი. ერთი პაკი {openPrice} მონეტა ღირს.</p>
              <h3 className="mt-5 text-base font-semibold text-white">ვარდნის შანსები</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {odds.map(([rank, chance]) => (
                  <span key={rank} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1a1a1a] px-3 text-sm text-[#d1d5dc]">
                    <span className="font-semibold" style={{ color: tone[rank] }}>{rank}</span>
                    {chance}
                  </span>
                ))}
              </div>
              <h3 className="mt-5 text-base font-semibold text-white">მონეტების მიღება შეიძლება:</h3>
              <ul className="mt-2 grid gap-2">
                <li className="flex flex-wrap items-center gap-2">
                  <CircleCheck className="size-4 shrink-0 text-[#2dd4bf]" />
                  დღიური შესვლისთვის <span className="text-[#e93748]">{status?.dailyCoins ?? 100} მონეტა</span>
                  {data.me ? (
                    <button type="button" disabled={claiming || status?.daily} className="ml-1 h-7 cursor-pointer rounded-lg bg-[#e93748] px-3 text-xs font-semibold text-white transition hover:bg-[#f04656] disabled:cursor-default disabled:bg-[#1a1a1a] disabled:text-white/40" onClick={() => void claimBonus()}>
                      {status?.daily ? "დღეს აღებულია" : claiming ? "..." : "აიღე"}
                    </button>
                  ) : null}
                </li>
                <li className="flex items-center gap-2"><CircleCheck className="size-4 shrink-0 text-[#2dd4bf]" /> <span>ქარდის გაყიდვით <span className="text-[#e93748]">8-დან 1200 მონეტამდე</span> რანგის მიხედვით · <Link href="/cards" className="text-[#f5c542] underline underline-offset-2">ქარდები</Link></span></li>
                <li className="flex items-center gap-2"><CircleCheck className="size-4 shrink-0 text-[#2dd4bf]" /> <span>აუქციონზე ქარდის გაყიდვით · <Link href="/market" className="text-[#f5c542] underline underline-offset-2">მარკეტი</Link></span></li>
                <li className="flex items-center gap-2"><CircleCheck className="size-4 shrink-0 text-[#2dd4bf]" /> <span>ცხოველის ექსპედიციით <span className="text-[#e93748]">25 მონეტა</span> · <Link href="/pet" className="text-[#f5c542] underline underline-offset-2">ცხოველი</Link></span></li>
                <li className="flex items-center gap-2"><CircleCheck className="size-4 shrink-0 text-[#2dd4bf]" /> <span>ლაბირინთის ოთახებში <span className="text-[#e93748]">15-დან 60 მონეტამდე</span> · <Link href="/labyrinth" className="text-[#f5c542] underline underline-offset-2">ლაბირინთი</Link></span></li>
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-8 text-center">
        <h2 className="text-[22px] font-medium tracking-tight">გახსნა</h2>
        <div className="mx-auto mt-5 grid grid-cols-3 gap-3 sm:gap-4">
          {bundles.map((item) => (
            <BundleCard key={item.count} {...item} active={bundle === item.count} disabled={phase === "opening" || phase === "choose" || phase === "settling"} onPick={() => setBundle(item.count)} />
          ))}
        </div>
        <button type="button" disabled={phase === "opening" || phase === "choose" || phase === "settling"} className="mx-auto mt-4 h-12 w-full cursor-pointer rounded-xl bg-[#e93748] text-sm font-semibold text-white transition hover:bg-[#f04656] disabled:cursor-default disabled:opacity-70" onClick={() => void openPack()}>
          {phase === "opening" ? "ვურევთ ქარდებს..." : phase === "choose" || phase === "settling" ? `${round} / ${total}` : `გახსნა × ${bundle}`}
        </button>
        {error ? <p className="mt-3 text-sm text-[#e93748]">{error}</p> : null}
      </section>

      <section className="mt-8 text-center">
        <h2 className="text-sm text-white/70">
          {phase === "opening" ? "ქარდები ირევა..." : phase === "choose" || phase === "settling" ? `აირჩიე ერთი სამიდან · ${round} / ${total}` : keptList.length > 1 ? "შენი ქარდები" : kept ? "შენი ქარდი" : "აქ გამოჩნდება შენი ქარდები"}
        </h2>
        {keptList.length && phase !== "idle" && phase !== "kept" ? (
          <div className="mx-auto mt-4 flex max-w-[1080px] flex-wrap justify-center gap-2">
            {keptList.map((card, index) => (
              card.image ? <img key={`${card.cardId}-${index}`} src={card.image} alt="" className="h-16 w-11 rounded-md object-cover" /> : <span key={`${card.cardId}-${index}`} className="grid h-16 w-11 place-items-center rounded-md bg-[#121214] text-[10px] text-[#e93748]">{card.coins}</span>
            ))}
          </div>
        ) : null}
        {phase === "opening" && shuffleOn ? <CardShuffle /> : null}
        {notice && (phase === "choose" || phase === "settling") ? <p className="mx-auto mt-4 w-fit rounded-lg border border-[#e93748]/30 bg-[#e93748]/10 px-3 py-1.5 text-sm text-white">{notice}</p> : null}
        {phase === "choose" || phase === "settling" ? (
          <div className="mx-auto mt-5 grid max-w-[1080px] grid-cols-3 gap-4 perspective-[900px]">
            {draws.map((card, index) => (
              <button key={`${offerId}-${index}`} type="button" disabled={phase !== "choose"} className={`pack-choice pack-deal cursor-pointer border-0 bg-transparent p-0 ${phase === "settling" && choice !== index ? "pack-discard" : ""}`} style={{ ["--delay" as string]: `${index * 160}ms`, ["--shift" as string]: `${(index - 1) * 72}px` }} onClick={() => pick(index)}>
                <span className="pack-lift relative block overflow-hidden rounded-[12px] border border-white/10 bg-[#101013] shadow-[0_16px_30px_rgba(0,0,0,0.35)]">
                  <DrawFace card={card} />
                  {card.cardId && settings.ownedTag && card.owned ? (
                    <span className="pointer-events-none absolute top-0 right-0 flex items-center gap-1 rounded-bl-[12px] bg-linear-to-br from-[#2dd4bf] to-[#14b8a6] py-1 pr-2.5 pl-2 text-[11px] font-semibold text-black shadow-[0_4px_14px_rgba(45,212,191,0.4)]">
                      <Check className="size-3.5" strokeWidth={3} />
                      გაქვს{card.owned > 1 ? ` ×${card.owned}` : ""}
                    </span>
                  ) : null}
                  {card.cardId && settings.wishTag && card.wished ? (
                    <span className="pointer-events-none absolute top-0 left-0 flex items-center gap-1 rounded-br-[12px] bg-linear-to-br from-[#f5c542] to-[#eab308] py-1 pr-2.5 pl-2 text-[11px] font-semibold text-black shadow-[0_4px_14px_rgba(245,197,66,0.4)]">
                      <Heart className="size-3.5 fill-current" />
                      სასურველი
                    </span>
                  ) : null}
                </span>
                {card.cardId && settings.stats ? (
                  <span className="mx-auto mt-2.5 flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-[#121214] px-3 py-1 text-xs text-white/70">
                    <Users className="size-3.5 text-[#e93748]" />
                    <b className="font-semibold text-white">{card.holders ?? 0}</b> მფლობელი
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ) : phase === "kept" && keptList.length > 1 ? (
          <div className="mx-auto mt-5 grid max-w-[1080px] grid-cols-3 gap-4 sm:grid-cols-6">
            {keptList.map((card, index) => (
              <div key={`${card.cardId}-${index}`} className="pack-keep overflow-hidden rounded-[12px] border border-white/10 bg-[#101013]">
                <DrawFace card={card} />
              </div>
            ))}
          </div>
        ) : phase === "kept" && kept ? (
          <div className="pack-keep mx-auto mt-5 w-[280px]">
            <div className="overflow-hidden rounded-[12px] border border-white/10 bg-[#101013] shadow-[0_18px_36px_rgba(0,0,0,0.4)]">
              <DrawFace card={kept} />
            </div>
          </div>
        ) : phase === "opening" ? null : (
          <div className="mx-auto mt-4 grid max-w-[1080px] grid-cols-3 gap-4">
            {[0, 1, 2].map((slot) => (
              <div key={slot}>
                <CardBack />
              </div>
            ))}
          </div>
        )}
      </section>
      {warn ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setWarn(null)}>
          <div className="pack-keep relative w-full max-w-[460px] overflow-hidden rounded-[18px] border border-white/10 bg-[#121214] p-6 text-center shadow-[0_30px_80px_rgba(0,0,0,0.6)]" onClick={(event) => event.stopPropagation()}>
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#e93748] to-transparent" />
            <h3 className="text-lg font-semibold text-white">დარწმუნებული ხარ?</h3>
            <p className="mt-2 text-sm text-white/60">
              ამ სამეულში <span className="font-semibold" style={{ color: tone[draws[warn.best]?.rarity.toUpperCase()] }}>{draws[warn.best]?.rarity}</span> რანგის ქარდიც არის. დანარჩენი ქარდები დაიკარგება.
            </p>
            <div className="mx-auto mt-5 w-[160px] overflow-hidden rounded-[12px] border border-white/10">
              {draws[warn.index] ? <DrawFace card={draws[warn.index]} /> : null}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" autoFocus className="h-11 cursor-pointer rounded-xl bg-[#e93748] text-sm font-semibold text-white transition hover:bg-[#f04656]" onClick={() => setWarn(null)}>
                უკან დაბრუნება
              </button>
              <button type="button" className="h-11 cursor-pointer rounded-xl border border-white/10 bg-[#1a1a1a] text-sm text-white/60 transition hover:bg-[#222] hover:text-white/80" onClick={() => void choose(warn.index)}>
                მაინც ამას ვიღებ
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {gift ? (
        <PackModal onClose={() => setGift(null)}>
          <h3 className="text-lg font-semibold text-white">გარანტირებული S</h3>
          <p className="mt-2 text-sm text-white/60">{status?.sEvery ?? 200} პაკი გახსენი და ეს S ქარდი საჩუქრად დაემატა კოლექციას.</p>
          <div className="mx-auto mt-5 w-[180px] overflow-hidden rounded-[12px] border border-[#a855f7]/50 shadow-[0_0_40px_rgba(168,85,247,0.35)]"><DrawFace card={gift} /></div>
          <button type="button" autoFocus className="mt-6 h-11 w-full cursor-pointer rounded-xl bg-[#e93748] text-sm font-semibold text-white transition hover:bg-[#f04656]" onClick={() => setGift(null)}>მშვენიერია</button>
        </PackModal>
      ) : summary.length && !gift ? (
        <PackModal wide onClose={() => setSummary([])}>
          <h3 className="text-lg font-semibold text-white">{summary.length > 1 ? "შენი ქარდები" : "შენი ქარდი"}</h3>
          <div className={`mt-5 grid gap-3 ${summary.length > 1 ? "grid-cols-3 sm:grid-cols-5" : "mx-auto w-[200px]"}`}>
            {summary.map((card, index) => (
              <div key={`${card.cardId}-${index}`} className="overflow-hidden rounded-[12px] border border-white/10"><DrawFace card={card} /></div>
            ))}
          </div>
          <button type="button" autoFocus className="mt-6 h-11 w-full cursor-pointer rounded-xl bg-[#e93748] text-sm font-semibold text-white transition hover:bg-[#f04656]" onClick={() => setSummary([])}>დახურვა</button>
        </PackModal>
      ) : null}
    </div>
  );
}

function PackModal({ children, onClose, wide = false }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className={`pack-keep relative max-h-[90vh] w-full overflow-y-auto rounded-[18px] border border-white/10 bg-[#121214] p-6 text-center shadow-[0_30px_80px_rgba(0,0,0,0.6)] ${wide ? "max-w-[760px]" : "max-w-[460px]"}`} onClick={(event) => event.stopPropagation()}>
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#e93748] to-transparent" />
        {children}
      </div>
    </div>
  );
}

function PityCard({ letter, color, title, text, sub, progress }: { letter: string; color: string; title: string; text: React.ReactNode; sub: string; progress: number }) {
  return (
    <div className="relative overflow-hidden rounded-[14px] border border-white/10 bg-[#101013] p-4">
      <div className="flex items-center gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl border text-lg font-semibold" style={{ borderColor: `${color}80`, color, background: `${color}14` }}>{letter}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs text-white/60">{text}</p>
          {sub ? <p className="mt-1 text-[11px] text-white/35">{sub}</p> : null}
        </div>
      </div>
      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/[0.04]">
        <span className="block h-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%`, background: color }} />
      </span>
    </div>
  );
}

function PackSelect({ value, options, onChange, disabled = false }: { value: string; options: [string, string][]; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="h-10 min-w-[190px] cursor-pointer rounded-lg border border-white/10 bg-[#1a1a1a] px-3 text-sm text-white/85 outline-none transition hover:bg-[#222] focus:border-[#e93748]/50 disabled:cursor-default disabled:opacity-50">
      {options.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select>
  );
}

function PackToggle({ label, on, onChange }: { label: string; on: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 text-sm text-white/80">
      {label}
      <button type="button" role="switch" aria-checked={on} className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition ${on ? "bg-[#e93748]" : "bg-white/15"}`} onClick={() => onChange(!on)}>
        <span className={`absolute top-1 size-4 rounded-full bg-white transition-all ${on ? "left-6" : "left-1"}`} />
      </button>
    </label>
  );
}

function BundleCard({ count, title, text, fan, active, disabled, onPick }: { count: 1 | 6 | 20; title: string; text: string; fan: readonly number[]; active: boolean; disabled: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className={`group relative cursor-pointer overflow-hidden rounded-[18px] border px-3 pt-5 pb-4 text-center transition duration-300 disabled:cursor-default sm:px-5 ${active ? "border-[#e93748]/60 bg-[#e93748]/[0.07] shadow-[0_0_0_1px_rgba(233,55,72,0.25),0_18px_40px_rgba(233,55,72,0.14)]" : "border-white/10 bg-[#121214] hover:border-white/20 hover:bg-[#151518]"}`}
    >
      <span className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#e93748] to-transparent transition-opacity ${active ? "opacity-100" : "opacity-0"}`} />
      <span className={`pointer-events-none absolute top-6 left-1/2 size-28 -translate-x-1/2 rounded-full bg-[#e93748] blur-[50px] transition-opacity duration-300 ${active ? "opacity-25" : "opacity-0 group-hover:opacity-10"}`} />
      <span className="relative mx-auto block h-[96px] w-full sm:h-[120px]">
        {fan.map((angle, index) => (
          <img
            key={index}
            src="/card-mm.png"
            alt=""
            className={`absolute bottom-0 left-1/2 h-[84px] w-[56px] rounded-[8px] object-cover shadow-[0_10px_20px_rgba(0,0,0,0.45)] transition-transform duration-300 sm:h-[105px] sm:w-[70px] ${active ? "-translate-y-1.5" : "group-hover:-translate-y-1"}`}
            style={{ transform: `translateX(calc(-50% + ${angle * 1.6}px)) rotate(${angle}deg)`, transformOrigin: "50% 120%", zIndex: index === Math.floor(fan.length / 2) ? 10 : 5 - Math.abs(index - Math.floor(fan.length / 2)) }}
          />
        ))}
        <span className="absolute -top-1 right-1 z-20 grid h-7 min-w-7 place-items-center rounded-full border border-white/10 bg-[#0d0d0f] px-2 text-xs font-semibold text-white sm:right-3">×{count}</span>
      </span>
      <span className={`relative mt-4 block text-[15px] font-semibold ${active ? "text-white" : "text-white/85"}`}>{title}</span>
      <span className="relative mt-0.5 block text-xs text-white/40">{text}</span>
      <span className={`relative mt-3 inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition ${active ? "bg-[#e93748] text-white" : "bg-[#1a1a1a] text-[#e93748]"}`}>
        <Coins className="size-3.5" /> {openPrice * count}
      </span>
    </button>
  );
}

function CardBack() {
  return <img src="/card-mm.png" alt="" className="aspect-[2/3] w-full rounded-[12px] object-cover shadow-[0_16px_30px_rgba(0,0,0,0.35)]" />;
}

function CardShuffle() {
  return (
    <div className="relative mx-auto mt-5 grid max-w-[1080px] grid-cols-3 gap-4">
      {[0, 1, 2].map((slot) => (
        <div key={slot} className={`pack-mix pack-mix-${slot}`}>
          <CardBack />
        </div>
      ))}
    </div>
  );
}

function DrawFace({ card }: { card: Draw }) {
  if (!card.cardId) {
    return (
      <span className="flex aspect-[2/3] flex-col items-center justify-center gap-2 bg-[#101013] text-[#e93748]">
        <Coins className="size-10" />
        <span className="text-sm font-semibold text-white">{card.coins} მონეტა</span>
      </span>
    );
  }
  return (
    <img src={card.image} alt={card.name} className="block aspect-[2/3] w-full object-cover" />
  );
}
