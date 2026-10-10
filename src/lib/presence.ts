import "server-only";
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ALIVE_MS = 60_000;
const MAX_TABS = 5000;

export type PresenceTab = {
  tab: string;
  visitor: string;
  userId: number;
  name: string;
  avatar?: string;
  path: string;
  title: string;
  device: "mobile" | "tablet" | "desktop";
  browser: string;
  referrer: string;
  since: number;
  pageSince: number;
  last: number;
  hidden: boolean;
};

export type PresenceSection = { id: string; label: string; count: number };
export type PresencePage = { path: string; title: string; section: string; count: number; users: number };

export type PresenceSnapshot = {
  at: number;
  people: number;
  tabs: number;
  members: number;
  guests: number;
  devices: Record<PresenceTab["device"], number>;
  sections: PresenceSection[];
  pages: PresencePage[];
  list: PresenceTab[];
  peak: { count: number; at: number };
};

const SAVE_FILE = process.env.PRESENCE_FILE || join(tmpdir(), "animeb-presence.json");
const SAVE_MS = 15_000;

const store = globalThis as typeof globalThis & { presenceTabs?: Map<string, PresenceTab>; presencePeak?: { count: number; at: number }; presenceSaver?: boolean };
const tabs = (store.presenceTabs ??= restore());

function restore() {
  const map = new Map<string, PresenceTab>();
  try {
    const saved = JSON.parse(readFileSync(SAVE_FILE, "utf8")) as { tabs?: PresenceTab[]; peak?: { count: number; at: number } };
    const now = Date.now();
    for (const tab of saved.tabs ?? []) if (tab?.tab && now - tab.last <= ALIVE_MS) map.set(tab.tab, tab);
    if (saved.peak && Number.isFinite(saved.peak.count)) store.presencePeak = saved.peak;
  } catch {}
  return map;
}

function save() {
  try {
    const file = `${SAVE_FILE}.tmp`;
    writeFileSync(file, JSON.stringify({ tabs: [...tabs.values()], peak: store.presencePeak }));
    renameSync(file, SAVE_FILE);
  } catch {}
}

if (!store.presenceSaver) {
  store.presenceSaver = true;
  setInterval(() => {
    prune(Date.now());
    trackPeak();
    save();
  }, SAVE_MS).unref();
  process.once("exit", save);
}

function trackPeak() {
  const now = Date.now();
  const count = new Set([...tabs.values()].map((tab) => tab.visitor)).size;
  const peak = (store.presencePeak ??= { count: 0, at: now });
  if (count > peak.count) Object.assign(peak, { count, at: now });
  return peak;
}

const sectionLabels: [RegExp, string, string][] = [
  [/^\/$/, "home", "მთავარი"],
  [/^\/anime\/[^/]+\/watch/, "watch", "ყურება"],
  [/^\/anime\//, "anime", "ანიმეს გვერდი"],
  [/^\/(cards|packs|clubs|collectors|decks|market|trades|craft|cases|labyrinth|upgrade|awaken|battle|showcase|wishlist|pet|giveaways)(\/|$)/, "cards", "ქარდები"],
  [/^\/shop/, "shop", "მაღაზია"],
  [/^\/community/, "community", "საზოგადოება"],
  [/^\/(watch2gether|together)/, "together", "ერთად ყურება"],
  [/^\/(profile|@|taste)/, "profile", "პროფილები"],
  [/^\/(search|schedule|dubbers)/, "browse", "ძებნა და კატალოგი"],
  [/^\/(watchlist|lists|continue|friends|notifications|settings)/, "personal", "პირადი გვერდები"],
  [/^\/(leaderboard|levels)/, "ranking", "რეიტინგი"],
  [/^\/admin/, "admin", "ადმინპანელი"],
];

export function sectionOf(path: string) {
  const hit = sectionLabels.find(([pattern]) => pattern.test(path));
  return hit ? { id: hit[1], label: hit[2] } : { id: "other", label: "სხვა" };
}

function deviceOf(agent: string): PresenceTab["device"] {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(agent)) return "tablet";
  if (/mobi|iphone|android/i.test(agent)) return "mobile";
  return "desktop";
}

function browserOf(agent: string) {
  if (/edg\//i.test(agent)) return "Edge";
  if (/opr\/|opera/i.test(agent)) return "Opera";
  if (/firefox|fxios/i.test(agent)) return "Firefox";
  if (/chrome|crios/i.test(agent)) return "Chrome";
  if (/safari/i.test(agent)) return "Safari";
  return "სხვა";
}

function prune(now: number) {
  for (const [key, tab] of tabs) if (now - tab.last > ALIVE_MS) tabs.delete(key);
}

export function touchPresence(input: { tab: string; visitor: string; path: string; title: string; referrer: string; hidden: boolean; agent: string; user: { id: number; name: string; avatar?: string } | null }) {
  const now = Date.now();
  const current = tabs.get(input.tab);
  if (!current && tabs.size >= MAX_TABS) prune(now);
  if (!current && tabs.size >= MAX_TABS) return;
  tabs.set(input.tab, {
    tab: input.tab,
    visitor: input.visitor,
    userId: input.user?.id ?? 0,
    name: input.user?.name ?? "",
    avatar: input.user?.avatar,
    path: input.path,
    title: input.title,
    device: deviceOf(input.agent),
    browser: browserOf(input.agent),
    referrer: current?.referrer ?? input.referrer,
    since: current?.since ?? now,
    pageSince: current && current.path === input.path ? current.pageSince : now,
    last: now,
    hidden: input.hidden,
  });
}

export function leavePresence(tab: string) {
  tabs.delete(tab);
}

export function presenceSnapshot(): PresenceSnapshot {
  const now = Date.now();
  prune(now);
  const list = [...tabs.values()].sort((a, b) => b.last - a.last);
  const visitors = new Map<string, PresenceTab>();
  for (const tab of list) if (!visitors.has(tab.visitor)) visitors.set(tab.visitor, tab);
  const people = [...visitors.values()];
  const members = new Set(people.filter((tab) => tab.userId).map((tab) => tab.userId)).size;
  const devices = { mobile: 0, tablet: 0, desktop: 0 };
  for (const tab of people) devices[tab.device] += 1;
  const sections = new Map<string, PresenceSection>();
  const pages = new Map<string, PresencePage & { seen: Set<string>; members: Set<number> }>();
  for (const tab of list) {
    const section = sectionOf(tab.path);
    const page = pages.get(tab.path) ?? { path: tab.path, title: tab.title, section: section.label, count: 0, users: 0, seen: new Set<string>(), members: new Set<number>() };
    if (!page.seen.has(tab.visitor)) {
      page.seen.add(tab.visitor);
      page.count += 1;
      if (tab.userId) page.members.add(tab.userId);
      const group = sections.get(section.id) ?? { ...section, count: 0 };
      group.count += 1;
      sections.set(section.id, group);
    }
    page.users = page.members.size;
    pages.set(tab.path, page);
  }
  const peak = trackPeak();
  return {
    at: now,
    people: people.length,
    tabs: list.length,
    members,
    guests: people.filter((tab) => !tab.userId).length,
    devices,
    sections: [...sections.values()].sort((a, b) => b.count - a.count),
    pages: [...pages.values()].map(({ seen: _seen, members: _members, ...page }) => page).sort((a, b) => b.count - a.count).slice(0, 100),
    list: list.slice(0, 300),
    peak: { ...peak },
  };
}
