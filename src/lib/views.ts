import "server-only";
import { execute, query } from "@/lib/db";

const PUBLIC_MS = 10 * 60 * 1000;
const seen = new Map<string, number>();
let ready: Promise<void> | null = null;

function ensure() {
  ready ??= execute(`CREATE TABLE IF NOT EXISTS animeb_post_hits (
    news_id INT NOT NULL PRIMARY KEY,
    hits BIGINT UNSIGNED NOT NULL DEFAULT 0
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).then(() => undefined);
  return ready;
}

function prune(now: number) {
  if (seen.size < 50_000) return;
  for (const [key, at] of seen) if (now - at > PUBLIC_MS) seen.delete(key);
}

export async function recordView(postId: number, visitor: string) {
  await ensure();
  const result = await execute(
    `INSERT INTO animeb_post_hits (news_id, hits) SELECT id, 1 FROM dle_post WHERE id = ? AND approve = 1
     ON DUPLICATE KEY UPDATE hits = hits + 1`,
    [postId],
  );
  if (!result.affectedRows) return false;
  const now = Date.now();
  const key = `${postId}:${visitor}`;
  if (now - (seen.get(key) ?? 0) < PUBLIC_MS) return true;
  seen.set(key, now);
  prune(now);
  await execute("UPDATE dle_post_extras SET news_read = news_read + 1 WHERE news_id = ?", [postId]);
  return true;
}

export async function readHits(ids: number[]) {
  const map = new Map<number, { hits: number; views: number }>();
  if (!ids.length) return map;
  await ensure();
  const marks = ids.map(() => "?").join(",");
  const rows = await query<{ id: number; hits: number | null; views: number | null }>(
    `SELECT p.id, h.hits, e.news_read views FROM dle_post p
     LEFT JOIN animeb_post_hits h ON h.news_id = p.id
     LEFT JOIN dle_post_extras e ON e.news_id = p.id
     WHERE p.id IN (${marks})`,
    ids,
  );
  for (const row of rows) map.set(row.id, { hits: Number(row.hits) || 0, views: Number(row.views) || 0 });
  return map;
}
