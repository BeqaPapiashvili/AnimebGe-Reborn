import "server-only";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db, query } from "@/lib/db";
import { ensureHub } from "@/lib/hub";
import { grouped, levelForXp } from "@/lib/levels";
import { readyShop } from "@/lib/shop";
import { loadLevelSpans } from "@/lib/site-config";

function plain(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
}

export async function readUserDesk(userId: number) {
  await readyShop();
  await loadLevelSpans();
  await ensureHub();
  const [coins, user, comments, reports, lists, folders] = await Promise.all([
    query<{ balance: number }>("SELECT balance FROM site_coins WHERE user_id = ? LIMIT 1", [userId]),
    query<{ total_xp: number; user_level: number }>("SELECT total_xp, user_level FROM dle_users WHERE user_id = ? LIMIT 1", [userId]),
    query<{ id: number; text: string; title: string | null; slug: string | null }>(
      "SELECT c.id, c.text, p.title, p.alt_name slug FROM dle_comments c LEFT JOIN dle_post p ON p.id = c.post_id WHERE c.user_id = ? ORDER BY c.id DESC LIMIT 6",
      [userId],
    ).catch(() => []),
    query<{ id: number; message: string; title: string | null; status: string }>(
      "SELECT r.id, r.message, p.title, r.status FROM site_reports r LEFT JOIN dle_post p ON p.id = r.post_id WHERE r.user_id = ? ORDER BY r.id DESC LIMIT 6",
      [userId],
    ).catch(() => []),
    query<{ name: string; n: number }>(
      "SELECT l.list_name name, COUNT(e.post_id) n FROM dle_mylists_lists l LEFT JOIN dle_mylists_entries e ON e.list_id = l.list_id AND e.user_id = ? GROUP BY l.list_id, l.list_name ORDER BY l.list_id",
      [userId],
    ).catch(() => []),
    query<{ id: number; name: string; n: number }>(
      "SELECT f.id, f.name, COUNT(i.post_id) n FROM site_folders f LEFT JOIN site_folder_items i ON i.folder_id = f.id WHERE f.user_id = ? GROUP BY f.id, f.name ORDER BY f.id DESC LIMIT 6",
      [userId],
    ).catch(() => []),
  ]);
  const xp = Number(user[0]?.total_xp) || 0;
  return {
    coins: Number(coins[0]?.balance) || 0,
    xp,
    level: levelForXp(xp),
    comments: comments.map((row) => ({ id: row.id, text: plain(row.text) || "ცარიელი", title: row.title || "ანიმე", slug: row.slug || "" })),
    reports: reports.map((row) => ({ id: row.id, text: plain(row.message), title: row.title || "ანიმე", open: row.status !== "done" })),
    lists: lists.map((row) => ({ name: row.name, n: Number(row.n) || 0 })),
    folders: folders.map((row) => ({ id: row.id, name: row.name, n: Number(row.n) || 0 })),
  };
}

function amountOf(value: number) {
  const amount = Math.trunc(value);
  if (!amount || Math.abs(amount) > 1000000) return 0;
  return amount;
}

export async function adjustUserCoins(userId: number, delta: number) {
  const amount = amountOf(delta);
  if (!amount) return "რაოდენობა 1-დან 1 000 000-მდე უნდა იყოს.";
  await readyShop();
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("INSERT INTO site_coins (user_id, balance) VALUES (?, 0) ON DUPLICATE KEY UPDATE balance = balance", [userId]);
    await conn.query("UPDATE site_coins SET balance = GREATEST(balance + ?, 0) WHERE user_id = ?", [amount, userId]);
    await conn.query<ResultSetHeader>(
      "INSERT INTO site_coin_ledger (user_id, amount, reason, ref, created_at) VALUES (?, ?, 'admin', ?, UTC_TIMESTAMP())",
      [userId, amount, `a${Date.now()}`],
    );
    await conn.commit();
    return "";
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function adjustUserXp(userId: number, delta: number) {
  const amount = amountOf(delta);
  if (!amount) return "რაოდენობა 1-დან 1 000 000-მდე უნდა იყოს.";
  await loadLevelSpans();
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query<RowDataPacket[]>("SELECT user_id FROM dle_users WHERE user_id = ? FOR UPDATE", [userId]);
    await conn.query("UPDATE dle_users SET total_xp = GREATEST(total_xp + ?, 0) WHERE user_id = ?", [amount, userId]);
    const [rows] = await conn.query<RowDataPacket[]>("SELECT total_xp FROM dle_users WHERE user_id = ? LIMIT 1", [userId]);
    const xp = Number(rows[0]?.total_xp) || 0;
    await conn.query("UPDATE dle_users SET user_level = ? WHERE user_id = ?", [levelForXp(xp), userId]);
    await conn.commit();
    return "";
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export function deskNumber(value: number) {
  return grouped(value);
}
