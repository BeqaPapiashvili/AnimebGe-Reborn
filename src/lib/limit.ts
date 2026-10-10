import { createHash } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { db, execute } from "@/lib/db";

let ready: Promise<void> | null = null;

function ensure() {
  ready ??= execute(`CREATE TABLE IF NOT EXISTS site_rate_limits (
    bucket VARCHAR(80) NOT NULL PRIMARY KEY,
    hits INT NOT NULL,
    reset_at DATETIME NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).then(() => undefined);
  return ready;
}

export async function ipLimited(prefix: string, ip: string, max: number, windowMs: number) {
  return ip !== "0.0.0.0" && limited(`${prefix}:${ip}`, max, windowMs);
}

export async function limited(raw: string, max: number, windowMs: number) {
  await ensure();
  const key = raw.length > 80 ? `${raw.slice(0, 16)}:${createHash("sha256").update(raw).digest("hex").slice(0, 48)}` : raw;
  const seconds = Math.max(1, Math.ceil(windowMs / 1000));
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO site_rate_limits (bucket, hits, reset_at) VALUES (?, 0, UTC_TIMESTAMP())
       ON DUPLICATE KEY UPDATE bucket = bucket`,
      [key],
    );
    const [rows] = await conn.query<RowDataPacket[]>("SELECT hits, reset_at FROM site_rate_limits WHERE bucket = ? FOR UPDATE", [key]);
    const reset = new Date(String(rows[0]?.reset_at ?? "").replace(" ", "T") + "Z").getTime();
    const open = reset > Date.now();
    const hits = open ? Number(rows[0]?.hits) || 0 : 0;
    if (hits >= max) {
      await conn.commit();
      return true;
    }
    if (open) await conn.query("UPDATE site_rate_limits SET hits = hits + 1 WHERE bucket = ?", [key]);
    else await conn.query("UPDATE site_rate_limits SET hits = 1, reset_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND) WHERE bucket = ?", [seconds, key]);
    await conn.commit();
    return false;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
