import "server-only";
import { query } from "@/lib/db";
import { absUrl, parseXFields } from "@/lib/dle";
import type { ContinueCard } from "@/lib/continue-types";

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

function formatOf(category: string, typ3?: string) {
  if (typ3 && ["სერიალი", "ფილმი", "OVA", "ONA"].includes(typ3)) return typ3;
  const ids = category.split(",").map((id) => id.trim());
  if (ids.includes("12")) return "ფილმი";
  if (ids.includes("44")) return "OVA";
  return "სერიალი";
}

export async function getContinueItems(userId: number): Promise<ContinueCard[]> {
  const rows = await query<{ id: number; title: string; alt_name: string; category: string; xfields: string; episode_idx: number; watch_time: number; duration: number; last_update: string }>(
    `SELECT p.id, p.title, p.alt_name, p.category, p.xfields, w.episode_idx, w.watch_time, w.duration, w.last_update
     FROM dle_watch_history w JOIN dle_post p ON p.id = w.news_id
     WHERE w.user_id = ? AND p.approve = 1
     ORDER BY w.last_update DESC`,
    [userId],
  );
  return rows.map((row) => {
    const fields = parseXFields(row.xfields);
    const duration = row.duration || 1;
    return {
      id: row.id,
      slug: row.alt_name,
      title: row.title,
      poster: absUrl(fields.image),
      banner: absUrl(fields.cover) ?? absUrl(fields.playerimage),
      format: formatOf(row.category, fields.typ3),
      year: fields.year || undefined,
      episode: Math.max(row.episode_idx, 0) + 1,
      progress: `${clock(row.watch_time)}/${clock(row.duration)}`,
      progressPct: Math.min(100, Math.max(0, (row.watch_time / duration) * 100)),
      updated: String(row.last_update),
    };
  });
}
