export type LevelSpan = { to: number; step: number };

export const defaultSpans: LevelSpan[] = [
  { to: 10, step: 3200 },
  { to: 20, step: 5480 },
  { to: 30, step: 7880 },
  { to: 40, step: 10280 },
  { to: 50, step: 12680 },
  { to: 60, step: 15080 },
  { to: 70, step: 17480 },
  { to: 80, step: 19880 },
];

const bands = [
  { name: "Basic", from: 1, to: 9, color: "#a3e635" },
  { name: "Bronze", from: 10, to: 19, color: "#f97316" },
  { name: "Silver", from: 20, to: 29, color: "#06b6d4" },
  { name: "Gold", from: 30, to: 39, color: "#eab308" },
  { name: "Platinum", from: 40, to: 49, color: "#14b8a6" },
  { name: "Emerald", from: 50, to: 59, color: "#10b981" },
  { name: "Ruby", from: 60, to: 69, color: "#ef4444" },
  { name: "Diamond", from: 70, to: 79, color: "#d946ef" },
  { name: "Radiant", from: 80, to: 80, color: "#fbbf24", rainbow: true },
] as const;

export const defaultRankNames = bands.map((band) => band.name);
export const defaultRankColors = bands.map((band) => band.color);
let rankNames: string[] = [...defaultRankNames];
let rankColors: string[] = [...defaultRankColors];

function rankHex(value: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export function applyRankNames(raw: unknown[]) {
  rankNames = defaultRankNames.map((name, index) => {
    const item = raw[index];
    const next = String(typeof item === "object" && item ? (item as { name?: string }).name : item ?? "").trim().slice(0, 24);
    return next || name;
  });
  rankColors = defaultRankColors.map((color, index) => {
    const item = raw[index];
    const next = typeof item === "object" && item ? String((item as { color?: string }).color ?? "") : "";
    return rankHex(next, color);
  });
}

export function currentRankNames() {
  return rankNames;
}

export function currentRankColors() {
  return rankColors;
}

let spans = defaultSpans;

export function applyLevelSpans(next: LevelSpan[]) {
  spans = next;
}

export function currentSpans() {
  return spans;
}

export function xpForLevel(level: number, table: LevelSpan[] = spans) {
  const target = Math.max(1, Math.min(80, Math.floor(level)));
  let xp = 0;
  let cursor = 1;
  for (const span of table) {
    if (target <= cursor) break;
    const end = Math.min(target, span.to);
    xp += (end - cursor) * span.step;
    cursor = end;
  }
  return xp;
}

export function levelForXp(total: number, table: LevelSpan[] = spans) {
  const xp = Math.max(0, Math.floor(total));
  let level = 1;
  for (let next = 2; next <= 80; next += 1) {
    if (xpForLevel(next, table) > xp) break;
    level = next;
  }
  return level;
}

export function levelProgress(total: number, table: LevelSpan[] = spans) {
  const xp = Math.max(0, Math.floor(total));
  const level = levelForXp(xp, table);
  const floor = xpForLevel(level, table);
  const cap = level >= 80;
  const step = cap ? Math.max(1, xpForLevel(80, table) - xpForLevel(79, table)) : xpForLevel(level + 1, table) - floor;
  return { level, xp: cap ? step : xp - floor, xpStep: step, total: xp };
}

export function grouped(value: number) {
  return String(Math.max(0, Math.floor(value))).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export type LevelRank = { name: string; range: string; xp: string; color: string; rainbow?: boolean };

export function levelLadder(table: LevelSpan[] = spans): LevelRank[] {
  return bands.map((band, index) => ({
    name: rankNames[index] || band.name,
    range: band.from === band.to ? `დონე ${band.from}` : `დონე ${band.from}–${band.to}`,
    xp: band.from <= 1 ? "დასაწყისი" : `${grouped(xpForLevel(band.from, table))} ქულა`,
    color: rankColors[index] || band.color,
    rainbow: "rainbow" in band ? band.rainbow : undefined,
  }));
}

export function levelCap(table: LevelSpan[] = spans) {
  return grouped(xpForLevel(80, table));
}
