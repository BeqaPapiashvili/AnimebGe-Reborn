import "server-only";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { parseEpisodes, parseXFields } from "@/lib/dle";
import { levelForXp, levelProgress, xpForLevel } from "@/lib/levels";
import { addCoins, coinsFor, grantCoins, readyShop, takeCoins } from "@/lib/shop";
import { loadLevelSpans, loadXpRules, xpPath } from "@/lib/site-config";

export { levelForXp, levelProgress, xpForLevel };

function utcDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function yesterdayUtc() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

let ready: Promise<void> | null = null;

export function readyXp() {
  return ensureXp();
}

function ensureXp() {
  ready ??= (async () => {
    await db.query(`CREATE TABLE IF NOT EXISTS site_xp_events (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      kind VARCHAR(16) NOT NULL,
      ref VARCHAR(80) NOT NULL,
      amount INT NOT NULL,
      created_at DATETIME NOT NULL,
      UNIQUE KEY user_ref (user_id, kind, ref),
      KEY user_kind_day (user_id, kind, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await db.query(`CREATE TABLE IF NOT EXISTS site_watch_credit (
      user_id INT NOT NULL,
      news_id INT NOT NULL,
      episode INT NOT NULL,
      trusted INT NOT NULL,
      last_pos INT NOT NULL,
      PRIMARY KEY (user_id, news_id, episode)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    const [cols] = await db.query<RowDataPacket[]>("SHOW COLUMNS FROM site_watch_credit");
    if (!cols.some((col) => String(col.Field) === "seen_at")) await db.query("ALTER TABLE site_watch_credit ADD COLUMN seen_at DATETIME NULL");
  })();
  return ready;
}

async function give(userId: number, kind: string, ref: string, amount: number, opts?: { cap?: number; capLike?: string; fullAt?: number; fallback?: number; streak?: { days: number } }) {
  await ensureXp();
  await readyShop();
  await loadLevelSpans();
  await loadXpRules();
  const full = opts?.fullAt ?? xpPath("episode")?.amount ?? 1000;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("SELECT user_id FROM dle_users WHERE user_id = ? FOR UPDATE", [userId]);
    if (opts?.cap != null && opts.cap > 0) {
      const params: Array<number | string> = [userId, kind];
      let extra = "";
      if (opts.capLike) {
        extra += " AND ref LIKE ?";
        params.push(opts.capLike);
      }
      if (opts.fullAt) {
        extra += " AND amount >= ?";
        params.push(opts.fullAt);
      }
      const [counted] = await conn.query<RowDataPacket[]>(
        `SELECT COUNT(*) n FROM site_xp_events WHERE user_id = ? AND kind = ? AND created_at >= UTC_DATE()${extra}`,
        params,
      );
      const used = Number(counted[0]?.n) || 0;
      if (used >= opts.cap) amount = opts.fallback ?? 0;
    }
    if (amount <= 0) {
      await conn.commit();
      return 0;
    }
    let coins = coinsFor(kind, amount, ref);
    const gate = xpPath("episode")?.gate ?? 6;
    if (kind === "episode" && amount < full && gate > 0) {
      const [small] = await conn.query<RowDataPacket[]>(
        "SELECT COUNT(*) n FROM site_xp_events WHERE user_id = ? AND kind = 'episode' AND amount < ? AND created_at >= UTC_DATE()",
        [userId, full],
      );
      if ((Number(small[0]?.n) || 0) >= gate) coins = 0;
    }
    const [inserted] = await conn.query<ResultSetHeader>(
      "INSERT IGNORE INTO site_xp_events (user_id, kind, ref, amount, created_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP())",
      [userId, kind, ref, amount],
    );
    if (!inserted.affectedRows) {
      await conn.commit();
      return 0;
    }
    if (opts?.streak) {
      await conn.query("UPDATE dle_users SET login_streak = ?, last_streak_date = UTC_TIMESTAMP() WHERE user_id = ?", [opts.streak.days, userId]);
    }
    await conn.query("UPDATE dle_users SET total_xp = total_xp + ? WHERE user_id = ?", [amount, userId]);
    if (coins > 0) await addCoins(conn, userId, coins, kind, ref);
    const [rows] = await conn.query<RowDataPacket[]>("SELECT total_xp FROM dle_users WHERE user_id = ? LIMIT 1", [userId]);
    const level = levelForXp(Number(rows[0]?.total_xp) || 0);
    await conn.query("UPDATE dle_users SET user_level = ? WHERE user_id = ?", [level, userId]);
    await conn.commit();
    return amount;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function quietly(work: () => Promise<unknown>) {
  try {
    await work();
  } catch (error) {
    console.error("xp", error);
  }
}

export async function awardWatch(userId: number, postId: number, episode: number, time: number, _duration = 0) {
  if (time < 1) return;
  await quietly(async () => {
    await ensureXp();
    const [[post]] = await db.query<RowDataPacket[]>("SELECT xfields FROM dle_post WHERE id = ? AND approve = 1 LIMIT 1", [postId]);
    if (!post) return;
    const fields = parseXFields(String(post.xfields ?? ""));
    const listed = parseEpisodes(fields);
    const released = Number(fields["new-episode"]) || Number((fields.episodenum ?? "").split("/")[0]?.replace(/\D/g, "")) || listed.length;
    const known = Math.max(listed.length, released);
    if (episode < 1 || !known || episode > known) return;
    const length = (Number((fields.qronometraji ?? "").replace(/\D/g, "")) || 0) * 60;
    const conn = await db.getConnection();
    let trusted = 0;
    try {
      await conn.beginTransaction();
      const [credit] = await conn.query<RowDataPacket[]>(
        "SELECT trusted, last_pos, seen_at FROM site_watch_credit WHERE user_id = ? AND news_id = ? AND episode = ? LIMIT 1 FOR UPDATE",
        [userId, postId, episode],
      );
      const prev = Number(credit[0]?.last_pos) || 0;
      const seen = credit[0]?.seen_at ? new Date(String(credit[0].seen_at).replace(" ", "T") + "Z").getTime() : 0;
      const wall = seen ? Math.max(0, (Date.now() - seen) / 1000) : 0;
      const delta = credit[0] && time >= prev ? time - prev : 0;
      const add = delta > 0 && delta <= 180 ? Math.min(delta, Math.floor(wall) + 2) : 0;
      trusted = (Number(credit[0]?.trusted) || 0) + add;
      await conn.query(
        `INSERT INTO site_watch_credit (user_id, news_id, episode, trusted, last_pos, seen_at) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE trusted = VALUES(trusted), last_pos = VALUES(last_pos), seen_at = UTC_TIMESTAMP()`,
        [userId, postId, episode, trusted, Math.floor(time)],
      );
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
    await loadXpRules();
    const episodeRule = xpPath("episode");
    const need = (episodeRule?.percent || 80) / 100;
    if (length < 60 || trusted < length * need) return;
    const today = utcDay();
    const episodeRef = `${postId}:${episode}`;
    const [existing] = await db.query<RowDataPacket[]>(
      "SELECT kind FROM site_xp_events WHERE user_id = ? AND ((kind = 'episode' AND ref = ?) OR (kind = 'streak' AND ref = ?))",
      [userId, episodeRef, today],
    );
    const have = new Set(existing.map((row) => String(row.kind)));
    if (episodeRule && !have.has("episode")) {
      await give(userId, "episode", episodeRef, episodeRule.amount, {
        ...(episodeRule.cap > 0 ? { cap: episodeRule.cap, fullAt: episodeRule.amount, fallback: episodeRule.after } : {}),
      });
    }
    const streak = xpPath("streak");
    if (!streak || have.has("streak")) return;

    const [users] = await db.query<RowDataPacket[]>("SELECT login_streak, last_streak_date FROM dle_users WHERE user_id = ? LIMIT 1", [userId]);
    const last = String(users[0]?.last_streak_date ?? "").slice(0, 10);
    if (last === today) return;
    const previous = Number(users[0]?.login_streak) || 0;
    const days = last === yesterdayUtc() ? Math.min(previous + 1, 1000) : 1;
    const ceiling = streak.max > 0 ? streak.max : streak.amount;
    const bonus = Math.min(ceiling, streak.amount + Math.max(0, days - 1) * streak.after);
    await give(userId, "streak", today, bonus, { streak: { days } });
  });
}

export async function awardSeries(userId: number, postId: number) {
  await quietly(async () => {
    await ensureXp();
    const [[post]] = await db.query<RowDataPacket[]>("SELECT xfields FROM dle_post WHERE id = ? AND approve = 1 LIMIT 1", [postId]);
    if (!post) return;
    const fields = parseXFields(String(post.xfields ?? ""));
    const listed = parseEpisodes(fields);
    const released = Number(fields["new-episode"]) || Number((fields.episodenum ?? "").split("/")[0]?.replace(/\D/g, "")) || listed.length;
    const known = Math.max(listed.length, released);
    if (known < 1) return;
    const [earned] = await db.query<RowDataPacket[]>(
      "SELECT COUNT(*) n FROM site_xp_events WHERE user_id = ? AND kind = 'episode' AND ref LIKE ?",
      [userId, `${postId}:%`],
    );
    if ((Number(earned[0]?.n) || 0) < known) return;
    await loadXpRules();
    const series = xpPath("series");
    if (!series || series.amount <= 0) return;
    await give(userId, "series", String(postId), series.amount, series.cap > 0 ? { cap: series.cap } : undefined);
  });
}

export async function revokeSocial(userId: number, ref: string) {
  await quietly(async () => {
    await ensureXp();
    await readyShop();
    await loadLevelSpans();
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query("SELECT user_id FROM dle_users WHERE user_id = ? FOR UPDATE", [userId]);
      const [rows] = await conn.query<RowDataPacket[]>("SELECT amount FROM site_xp_events WHERE user_id = ? AND kind = 'social' AND ref = ? LIMIT 1", [userId, ref]);
      const amount = Number(rows[0]?.amount) || 0;
      if (!amount) {
        await conn.commit();
        return;
      }
      await conn.query("DELETE FROM site_xp_events WHERE user_id = ? AND kind = 'social' AND ref = ?", [userId, ref]);
      await conn.query("UPDATE dle_users SET total_xp = GREATEST(total_xp - ?, 0) WHERE user_id = ?", [amount, userId]);
      await takeCoins(conn, userId, "social", ref);
      const [xp] = await conn.query<RowDataPacket[]>("SELECT total_xp FROM dle_users WHERE user_id = ? LIMIT 1", [userId]);
      await conn.query("UPDATE dle_users SET user_level = ? WHERE user_id = ?", [levelForXp(Number(xp[0]?.total_xp) || 0), userId]);
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  });
}

export async function awardVisit(userId: number) {
  await quietly(async () => {
    await loadXpRules();
    const visit = xpPath("visit");
    if (!visit || visit.coins <= 0) return;
    const today = utcDay();
    const paid = await grantCoins(userId, visit.coins, "visit", today);
    if (!paid) return;
    const week = xpPath("week");
    if (!week || week.coins <= 0 || week.gate <= 0) return;
    const [rows] = await db.query<RowDataPacket[]>("SELECT ref FROM site_coin_ledger WHERE user_id = ? AND reason = 'visit' ORDER BY ref DESC LIMIT 21", [userId]);
    const have = new Set(rows.map((row) => String(row.ref)));
    let days = 0;
    const cursor = new Date(`${today}T00:00:00Z`);
    for (let index = 0; index < 21; index += 1) {
      if (!have.has(cursor.toISOString().slice(0, 10))) break;
      days += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    if (days > 0 && days % week.gate === 0) await grantCoins(userId, week.coins, "week", today);
  });
}

export async function awardEmote(userId: number, postId: number) {
  await quietly(async () => {
    await loadXpRules();
    const path = xpPath("emote");
    if (!path || path.coins <= 0) return;
    await grantCoins(userId, path.coins, "emote", String(postId), path.cap);
  });
}

export async function awardListAdd(userId: number, postId: number) {
  await quietly(async () => {
    await loadXpRules();
    const path = xpPath("list");
    if (!path || path.coins <= 0) return;
    await grantCoins(userId, path.coins, "list", String(postId), path.cap);
  });
}

export async function awardFriend(userId: number, otherId: number) {
  await quietly(async () => {
    await loadXpRules();
    const path = xpPath("friend");
    if (!path || path.coins <= 0) return;
    const pair = [userId, otherId].sort((a, b) => a - b).join("-");
    await grantCoins(userId, path.coins, "friend", pair);
    await grantCoins(otherId, path.coins, "friend", pair);
  });
}

export async function awardSocial(userId: number, ref: string) {
  await quietly(async () => {
    await ensureXp();
    await loadXpRules();
    const kind = ref.startsWith("post:") ? "post" : ref.startsWith("comment:") ? "comment" : ref.startsWith("reply:") ? "reply" : ref.startsWith("rate:") ? "rate" : "";
    if (!kind) return;
    const path = xpPath(kind);
    if (!path || path.amount <= 0) return;
    const mark = `${kind}:%`;
    await give(userId, "social", ref, path.amount, path.cap > 0 ? { cap: path.cap, capLike: mark } : undefined);
  });
}
