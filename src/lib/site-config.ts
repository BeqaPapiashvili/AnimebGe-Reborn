import "server-only";
import { defaultGuide, type GuideBlock, type GuideDoc, type GuideSection } from "@/data/guide";
import { execute, query } from "@/lib/db";
import { applyLevelSpans, applyRankNames, currentRankColors, currentRankNames, currentSpans, defaultRankColors, defaultRankNames, defaultSpans, type LevelSpan } from "@/lib/levels";

export type SiteNotice = { on: boolean; kicker: string; text: string; href: string; label: string };
export type HomeSource = "pick" | "rating" | "popular" | "ongoing" | "movies";
export type HomeBlock = { id: string; title: string; on: boolean; source?: HomeSource; picks?: { id: number; title: string }[]; size?: number };

const homeSources = new Set<HomeSource>(["pick", "rating", "popular", "ongoing", "movies"]);
const homeSizes = new Set([6, 12, 18]);

const defaultNotice: SiteNotice = {
  on: true,
  kicker: "დომენების სია",
  text: "სარეზერვო დომენები გვაქვს. აქ დააჭირე და შეინახე, თუ დაგვიკარგავ :)",
  href: "https://discord.com",
  label: "Discord",
};

export const defaultHomeBlocks: HomeBlock[] = [
  { id: "continue", title: "განაგრძე ყურება", on: true },
  { id: "latest", title: "ბოლო ეპიზოდები", on: true },
  { id: "fresh", title: "ახალი საიტზე", on: true },
  { id: "upcoming", title: "მალე", on: true },
  { id: "trend", title: "ტრენდი", on: true },
  { id: "schedule", title: "განრიგი", on: true },
  { id: "posts", title: "პოსტები", on: true },
];

let ready: Promise<void> | null = null;
let spansLoaded: Promise<void> | null = null;

function ensureSettings() {
  ready ??= execute(`CREATE TABLE IF NOT EXISTS site_settings (
    name VARCHAR(40) NOT NULL,
    value MEDIUMTEXT NOT NULL,
    PRIMARY KEY (name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).then(() => undefined).catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

async function readSetting(name: string) {
  await ensureSettings();
  const rows = await query<{ value: string }>("SELECT value FROM site_settings WHERE name = ? LIMIT 1", [name]);
  if (!rows[0]) return null;
  try {
    return JSON.parse(rows[0].value) as unknown;
  } catch {
    return null;
  }
}

async function writeSetting(name: string, value: unknown) {
  await ensureSettings();
  await execute(
    "INSERT INTO site_settings (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
    [name, JSON.stringify(value)],
  );
}

function text(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export async function getNotice(): Promise<SiteNotice | null> {
  const raw = await readSetting("notice") as Partial<SiteNotice> | null;
  const notice = {
    on: raw?.on !== false,
    kicker: text(raw?.kicker ?? defaultNotice.kicker, 40) || defaultNotice.kicker,
    text: text(raw?.text ?? defaultNotice.text, 240),
    href: safeHref(String(raw?.href ?? defaultNotice.href)),
    label: text(raw?.label ?? defaultNotice.label, 24),
  };
  if (!notice.on || !notice.text) return null;
  return notice;
}

export async function readNotice(): Promise<SiteNotice> {
  const raw = await readSetting("notice") as Partial<SiteNotice> | null;
  return {
    on: raw ? raw.on !== false : defaultNotice.on,
    kicker: text(raw?.kicker ?? defaultNotice.kicker, 40),
    text: text(raw?.text ?? defaultNotice.text, 240),
    href: safeHref(String(raw?.href ?? defaultNotice.href)),
    label: text(raw?.label ?? defaultNotice.label, 24),
  };
}

function safeHref(value: string) {
  const href = value.trim().slice(0, 200);
  if (!href) return "";
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export async function saveNotice(input: SiteNotice) {
  await writeSetting("notice", {
    on: input.on,
    kicker: text(input.kicker, 40),
    text: text(input.text, 240),
    href: safeHref(input.href),
    label: text(input.label, 24),
  });
}

export type MaintenanceKind = "maintenance" | "update" | "offline";
export type Maintenance = { on: boolean; kind: MaintenanceKind; title: string; text: string; until: string; href: string; label: string };

export const maintenanceKinds: { id: MaintenanceKind; label: string; title: string; text: string }[] = [
  { id: "maintenance", label: "ტექნიკური სამუშაოები", title: "ცოტა ხანში დავბრუნდებით", text: "სერვერებზე ტექნიკური სამუშაოები მიმდინარეობს. ყველაფერს ვასწორებთ, რომ ანიმე კიდევ უფრო სწრაფად და მშვიდად უყურო." },
  { id: "update", label: "განახლება", title: "საიტი ახლდება", text: "ახალ ფუნქციებს ვამატებთ. რამდენიმე წუთში ყველაფერი ახალი სახით დაგხვდება." },
  { id: "offline", label: "დროებით გამორთულია", title: "საიტი დროებით გათიშულია", text: "Animeb ამ ეტაპზე მიუწვდომელია. მადლობა მოთმინებისთვის, მალე დავბრუნდებით." },
];

const maintenanceIds = new Set<MaintenanceKind>(["maintenance", "update", "offline"]);
let maintenanceCache: { at: number; value: Maintenance } | null = null;

function cleanMaintenance(raw: Partial<Maintenance> | null): Maintenance {
  const kind = maintenanceIds.has(raw?.kind as MaintenanceKind) ? raw!.kind as MaintenanceKind : "maintenance";
  const until = String(raw?.until ?? "").trim().slice(0, 25);
  return {
    on: raw?.on === true,
    kind,
    title: text(raw?.title, 80),
    text: String(raw?.text ?? "").trim().slice(0, 500),
    until: until && Number.isFinite(new Date(until).getTime()) ? until : "",
    href: safeHref(String(raw?.href ?? "")),
    label: text(raw?.label, 24),
  };
}

export async function getMaintenance(): Promise<Maintenance> {
  if (maintenanceCache && Date.now() - maintenanceCache.at < 10_000) return maintenanceCache.value;
  const value = cleanMaintenance(await readSetting("maintenance").catch(() => null) as Partial<Maintenance> | null);
  maintenanceCache = { at: Date.now(), value };
  return value;
}

export async function saveMaintenance(input: Partial<Maintenance>) {
  const value = cleanMaintenance(input);
  await writeSetting("maintenance", value);
  maintenanceCache = { at: Date.now(), value };
}

function cleanHomeBlocks(input: unknown[]) {
  const known = new Map(defaultHomeBlocks.map((item) => [item.id, item]));
  const used = new Set<string>();
  const blocks: HomeBlock[] = [];
  for (const raw of input.slice(0, 30)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as HomeBlock;
    const id = text(item.id, 24);
    if (!id || used.has(id)) continue;
    const base = known.get(id);
    if (base) {
      used.add(id);
      blocks.push({ id, title: text(item.title, 40) || base.title, on: item.on !== false });
      continue;
    }
    if (!/^c-[a-z0-9]{4,16}$/.test(id) || !homeSources.has(item.source as HomeSource)) continue;
    used.add(id);
    const picks = item.source === "pick" && Array.isArray(item.picks)
      ? item.picks.map((pick) => ({ id: Number(pick?.id), title: text(pick?.title, 120) })).filter((pick) => Number.isInteger(pick.id) && pick.id > 0).slice(0, 24)
      : undefined;
    blocks.push({ id, title: text(item.title, 40) || "სექცია", on: item.on !== false, source: item.source, picks, size: homeSizes.has(Number(item.size)) ? Number(item.size) : 12 });
  }
  return blocks;
}

export async function getHomeBlocks(): Promise<HomeBlock[]> {
  const raw = await readSetting("home");
  return Array.isArray(raw) ? cleanHomeBlocks(raw) : defaultHomeBlocks;
}

export async function saveHomeBlocks(input: unknown[]) {
  await writeSetting("home", cleanHomeBlocks(input));
}

function lines(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => text(item, 200)).filter(Boolean).slice(0, 12);
}

function cleanGuide(raw: unknown): GuideDoc | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Partial<GuideDoc>;
  if (!Array.isArray(source.sections)) return null;
  const sections: GuideSection[] = [];
  for (const section of source.sections.slice(0, 8)) {
    if (!section || typeof section !== "object") continue;
    const title = text(section.title, 80);
    if (title.length < 2) continue;
    const blocks: GuideBlock[] = [];
    for (const block of (Array.isArray(section.blocks) ? section.blocks : []).slice(0, 12)) {
      if (!block || typeof block !== "object") continue;
      const blockTitle = text(block.title, 120);
      if (blockTitle.length < 2) continue;
      const rows = [
        { ok: true, items: lines(block.rows?.find((row) => row.ok)?.items) },
        { ok: false, items: lines(block.rows?.filter((row) => !row.ok).flatMap((row) => row.items)) },
      ].filter((row) => row.items.length);
      blocks.push({
        code: text(block.code, 8) || `${sections.length + 1}.${blocks.length + 1}`,
        title: blockTitle,
        body: String(block.body ?? "").trim().slice(0, 2000),
        rows: rows.length ? rows : undefined,
      });
    }
    const id = text(section.id, 24).toLowerCase().replace(/[^a-z0-9-]/g, "") || `part-${sections.length + 1}`;
    sections.push({ id, n: String(sections.length + 1), title, lead: String(section.lead ?? "").trim().slice(0, 400), blocks });
  }
  if (!sections.length) return null;
  const steps = lines(source.steps);
  return { sections, steps: steps.length ? steps : defaultGuide.steps };
}

export async function getGuide(): Promise<GuideDoc> {
  return cleanGuide(await readSetting("guide")) ?? defaultGuide;
}

export async function saveGuide(raw: unknown) {
  const guide = cleanGuide(raw);
  if (!guide) return "წესის ერთი სექცია მაინც უნდა დარჩეს.";
  await writeSetting("guide", guide);
  return "";
}

export async function loadLevelSpans() {
  spansLoaded ??= (async () => {
    const raw = await readSetting("levels");
    const next = Array.isArray(raw) ? raw : [];
    const table: LevelSpan[] = defaultSpans.map((span, index) => {
      const step = Math.floor(Number((next[index] as LevelSpan | undefined)?.step));
      return { to: span.to, step: step >= 100 && step <= 100000 ? step : span.step };
    });
    applyLevelSpans(table);
    const names = await readSetting("ranks");
    applyRankNames(Array.isArray(names) ? names : []);
  })().catch((error) => {
    spansLoaded = null;
    throw error;
  });
  return spansLoaded;
}

export async function readLevelSpans() {
  await loadLevelSpans();
  return currentSpans();
}

export async function readRankNames() {
  await loadLevelSpans();
  return currentRankNames().map((name, index) => ({ name, color: currentRankColors()[index] || defaultRankColors[index] }));
}

export async function saveRankNames(names: string[], colors: string[]) {
  const next = defaultRankNames.map((name, index) => ({
    name: String(names[index] ?? "").trim().slice(0, 24) || name,
    color: /^#[0-9a-fA-F]{6}$/.test(String(colors[index] ?? "")) ? String(colors[index]) : defaultRankColors[index],
  }));
  await writeSetting("ranks", next);
  applyRankNames(next);
}

export async function saveLevelSpans(steps: number[]) {
  const table = defaultSpans.map((span, index) => {
    const step = Math.floor(Number(steps[index]));
    return { to: span.to, step: step >= 100 && step <= 100000 ? step : span.step };
  });
  await writeSetting("levels", table);
  applyLevelSpans(table);
  spansLoaded = Promise.resolve();
}

export type FooterLinks = { twitter: string; discord: string; reddit: string };

export async function getFooterLinks(): Promise<FooterLinks> {
  const raw = await readSetting("footer") as Partial<FooterLinks> | null;
  return {
    twitter: safeHref(String(raw?.twitter ?? "")),
    discord: safeHref(String(raw?.discord ?? "")),
    reddit: safeHref(String(raw?.reddit ?? "")),
  };
}

export async function saveFooterLinks(input: FooterLinks) {
  await writeSetting("footer", {
    twitter: safeHref(input.twitter),
    discord: safeHref(input.discord),
    reddit: safeHref(input.reddit),
  });
}

export type HelpItem = { q: string; a: string };

export const defaultHelp: HelpItem[] = [
  { q: "როგორ ვეძებო?", a: "ზედა ძებნა ხსნის სწრაფ ფანჯარას. Enter სრული გვერდია, სადაც ჟანრი, წელი და სტატუსი იფილტრება." },
  { q: "სად რჩება ნანახი?", a: "ეპიზოდის დრო ინახება ანგარიშზე. განაგრძე ყურება მენიუდან და მთავარი გვერდიდან იხსნება." },
  { q: "სია როგორ ივსება?", a: "ანიმეს ან ყურების გვერდზე აირჩიე სია: ვუყურებ, ვგეგმავ, დავასრულე, გადაიდო ან მიტოვებული." },
  { q: "მეგობარი როგორ დავამატო?", a: "სხვის პროფილზე სახელის გვერდითაა ხატულა. მოთხოვნა /friends-ზე ჩანს." },
  { q: "ეპიზოდი არ იხსნება", a: "სცადე სხვა სერვერი. თუ მაინც არ მუშაობს, ყურების გვერდზე გაგზავნე შეტყობინება." },
];

export async function getHelp(): Promise<HelpItem[]> {
  const raw = await readSetting("help");
  if (!Array.isArray(raw)) return defaultHelp;
  const items = raw.map((item) => ({
    q: text((item as HelpItem)?.q, 120),
    a: String((item as HelpItem)?.a ?? "").trim().slice(0, 500),
  })).filter((item) => item.q.length >= 2 && item.a.length >= 2).slice(0, 20);
  return items.length ? items : defaultHelp;
}

export async function saveHelp(input: HelpItem[]) {
  const items = input.map((item) => ({
    q: text(item.q, 120),
    a: String(item.a ?? "").trim().slice(0, 500),
  })).filter((item) => item.q.length >= 2 && item.a.length >= 2).slice(0, 20);
  if (!items.length) return "ერთი კითხვა მაინც უნდა დარჩეს.";
  await writeSetting("help", items);
  return "";
}

export const slideModes = [
  { id: "auto", label: "ბანერები", hint: "პირველი 7 ანიმე, რომელსაც ბანერი აქვს" },
  { id: "manual", label: "ხელით", hint: "თვითონ არჩეული რიგი, მაქსიმუმ 12" },
  { id: "popular", label: "პოპულარული", hint: "ყველაზე ნანახი, სულ" },
  { id: "day", label: "დღეს", hint: "დღეს ყველაზე ნანახი" },
  { id: "week", label: "კვირა", hint: "ბოლო 7 დღის ნახვები" },
  { id: "weekScore", label: "კვირის რეიტინგი", hint: "ბოლო 7 დღეში განახლებული, ქულით" },
  { id: "month", label: "თვე", hint: "ბოლო 30 დღის ნახვები" },
  { id: "fresh", label: "ახალი", hint: "ბოლოს დამატებული ანიმეები" },
  { id: "updated", label: "ახალი და განახლებული", hint: "ბოლოს დამატებული ან „პირველზე აწევით“ განახლებული" },
  { id: "rating", label: "რეიტინგი", hint: "ყველაზე მაღალი ქულა" },
  { id: "ongoing", label: "მიმდინარე", hint: "ახლა მიმდინარე, ნახვებით" },
  { id: "upcoming", label: "მალე", hint: "ჯერ გამოუშვებელი" },
] as const;

export type SlideMode = (typeof slideModes)[number]["id"];

function cleanIds(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  const ids: number[] = [];
  for (const item of raw) {
    const id = Math.floor(Number(item));
    if (id > 0 && !ids.includes(id)) ids.push(id);
    if (ids.length >= 12) break;
  }
  return ids;
}

function asMode(value: unknown): SlideMode {
  return slideModes.some((item) => item.id === value) ? value as SlideMode : "auto";
}

export async function readSlideSetup(): Promise<{ mode: SlideMode; ids: number[] }> {
  const raw = await readSetting("slides");
  if (Array.isArray(raw)) return { mode: raw.length ? "manual" : "auto", ids: cleanIds(raw) };
  if (raw && typeof raw === "object") {
    const body = raw as { mode?: unknown; ids?: unknown };
    return { mode: asMode(body.mode), ids: cleanIds(body.ids) };
  }
  return { mode: "auto", ids: [] };
}

export async function getSlideIds(): Promise<number[]> {
  const setup = await readSlideSetup();
  return setup.mode === "manual" ? setup.ids : [];
}

export async function readSlides() {
  const { ids } = await readSlideSetup();
  if (!ids.length) return [];
  const rows = await query<{ id: number; title: string }>(`SELECT id, title FROM dle_post WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
  const byId = new Map(rows.map((row) => [row.id, row.title]));
  return ids.filter((id) => byId.has(id)).map((id) => ({ id, title: byId.get(id) || "ანიმე" }));
}

export async function saveSlides(mode: SlideMode, ids: number[]) {
  const clean = cleanIds(ids);
  const next = asMode(mode);
  if (next !== "manual" || !clean.length) {
    await writeSetting("slides", { mode: next === "manual" ? "auto" : next, ids: [] });
    return;
  }
  const rows = await query<{ id: number }>(`SELECT id FROM dle_post WHERE id IN (${clean.map(() => "?").join(",")})`, clean);
  const known = new Set(rows.map((row) => row.id));
  await writeSetting("slides", { mode: "manual", ids: clean.filter((id) => known.has(id)) });
}

export type XpPathId = "episode" | "streak" | "series" | "comment" | "post" | "reply" | "rate" | "visit" | "week" | "emote" | "list" | "friend";

export type XpPath = {
  id: XpPathId;
  on: boolean;
  amount: number;
  cap: number;
  after: number;
  max: number;
  percent: number;
  min: number;
  coins: number;
  coinsSmall: number;
  gate: number;
};

const xpIds: XpPathId[] = ["episode", "streak", "series", "comment", "post", "reply", "rate", "visit", "week", "emote", "list", "friend"];

export const xpDefaults: Record<XpPathId, XpPath> = {
  episode: { id: "episode", on: true, amount: 1000, cap: 8, after: 200, max: 0, percent: 80, min: 0, coins: 40, coinsSmall: 12, gate: 6 },
  streak: { id: "streak", on: true, amount: 2000, cap: 0, after: 500, max: 5000, percent: 0, min: 0, coins: 0, coinsSmall: 0, gate: 0 },
  series: { id: "series", on: true, amount: 5000, cap: 2, after: 0, max: 0, percent: 0, min: 0, coins: 400, coinsSmall: 0, gate: 0 },
  comment: { id: "comment", on: true, amount: 500, cap: 20, after: 0, max: 0, percent: 0, min: 20, coins: 20, coinsSmall: 0, gate: 0 },
  post: { id: "post", on: true, amount: 500, cap: 20, after: 0, max: 0, percent: 0, min: 20, coins: 40, coinsSmall: 0, gate: 0 },
  reply: { id: "reply", on: true, amount: 500, cap: 20, after: 0, max: 0, percent: 0, min: 20, coins: 15, coinsSmall: 0, gate: 0 },
  rate: { id: "rate", on: true, amount: 500, cap: 20, after: 0, max: 0, percent: 0, min: 0, coins: 20, coinsSmall: 0, gate: 0 },
  visit: { id: "visit", on: true, amount: 0, cap: 1, after: 0, max: 0, percent: 0, min: 0, coins: 100, coinsSmall: 0, gate: 0 },
  week: { id: "week", on: true, amount: 0, cap: 0, after: 0, max: 0, percent: 0, min: 0, coins: 250, coinsSmall: 0, gate: 7 },
  emote: { id: "emote", on: true, amount: 0, cap: 8, after: 0, max: 0, percent: 0, min: 0, coins: 25, coinsSmall: 0, gate: 0 },
  list: { id: "list", on: true, amount: 0, cap: 8, after: 0, max: 0, percent: 0, min: 0, coins: 40, coinsSmall: 0, gate: 0 },
  friend: { id: "friend", on: true, amount: 0, cap: 0, after: 0, max: 0, percent: 0, min: 0, coins: 80, coinsSmall: 0, gate: 0 },
};

let xpRules: XpPath[] = xpIds.map((id) => ({ ...xpDefaults[id] }));
let xpLoaded: Promise<void> | null = null;

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const number = Math.floor(Number(value));
  return number >= min && number <= max ? number : fallback;
}

function isPathId(value: unknown): value is XpPathId {
  return xpIds.includes(value as XpPathId);
}

function cleanPath(id: XpPathId, raw: Partial<XpPath> | undefined, on: boolean): XpPath {
  const base = xpDefaults[id];
  return {
    id,
    on,
    amount: clamp(raw?.amount, 0, 100000, base.amount),
    cap: clamp(raw?.cap, 0, 500, base.cap),
    after: clamp(raw?.after, 0, 100000, base.after),
    max: clamp(raw?.max, 0, 100000, base.max),
    percent: clamp(raw?.percent, 1, 100, base.percent),
    min: clamp(raw?.min, 0, 500, base.min),
    coins: clamp(raw?.coins, 0, 100000, base.coins),
    coinsSmall: clamp(raw?.coinsSmall, 0, 100000, base.coinsSmall),
    gate: clamp(raw?.gate, 0, 365, base.gate),
  };
}

function pathsFromLegacy(raw: { episode?: unknown; episodeSmall?: unknown; episodeFull?: unknown; series?: unknown; seriesDaily?: unknown; social?: unknown; socialDaily?: unknown }) {
  return xpIds.map((id) => {
    if (id === "episode") return cleanPath(id, { amount: Number(raw.episode), after: Number(raw.episodeSmall), cap: Number(raw.episodeFull), percent: 80 }, true);
    if (id === "streak") return cleanPath(id, xpDefaults.streak, true);
    if (id === "series") return cleanPath(id, { amount: Number(raw.series), cap: Number(raw.seriesDaily) }, true);
    if (id === "comment" || id === "post" || id === "reply" || id === "rate") {
      return cleanPath(id, { amount: Number(raw.social), cap: Number(raw.socialDaily), min: id === "rate" ? 0 : 20 }, true);
    }
    return { ...xpDefaults[id] };
  });
}

function pathsFromList(raw: unknown[]) {
  const next: XpPath[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const body = item as Partial<XpPath>;
    if (!isPathId(body.id) || next.some((row) => row.id === body.id)) continue;
    next.push(cleanPath(body.id, body, body.on !== false));
  }
  return xpIds.map((id) => next.find((item) => item.id === id) ?? { ...xpDefaults[id] });
}

export function currentXpRules() {
  return xpRules;
}

export function xpPath(id: XpPathId) {
  return xpRules.find((item) => item.id === id && item.on);
}

export async function loadXpRules() {
  xpLoaded ??= (async () => {
    const raw = await readSetting("xp");
    if (Array.isArray(raw)) xpRules = pathsFromList(raw);
    else if (raw && typeof raw === "object" && "episode" in raw) xpRules = pathsFromLegacy(raw as { episode?: unknown });
    else xpRules = xpIds.map((id) => ({ ...xpDefaults[id] }));
  })().catch((error) => {
    xpLoaded = null;
    throw error;
  });
  return xpLoaded;
}

export async function readXpRules() {
  await loadXpRules();
  return xpRules;
}

export async function saveXpRules(input: unknown) {
  const next = Array.isArray(input) ? pathsFromList(input) : xpIds.map((id) => ({ ...xpDefaults[id] }));
  await writeSetting("xp", next);
  xpRules = next;
  xpLoaded = Promise.resolve();
}
