import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { execute, query } from "@/lib/db";
import { portrait } from "@/lib/dle";
import type { SessionUser } from "@/lib/types";

export const SESSION_COOKIE = "animeb_session";
const MAX_AGE = 60 * 60 * 24 * 30;

type UserRow = { user_id: number; name: string; email: string; password: string; foto: string | null; decoration_id: string | null; shop_image: string | null; user_group: number; group_name: string | null; banned: string; reg_date: string };

const userSelect = `SELECT u.user_id, u.name, u.email, u.password, u.foto, u.decoration_id, si.image_url AS shop_image, u.user_group, g.group_name, u.banned, u.reg_date
  FROM dle_users u
  LEFT JOIN dle_usergroups g ON g.id = u.user_group
  LEFT JOIN shop_items si ON u.decoration_id REGEXP '^[0-9]+$' AND si.id = u.decoration_id AND si.type = 'frame'`;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return value;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");
const fingerprint = (hash: string) => createHmac("sha256", secret()).update(hash).digest("base64url").slice(0, 16);

function toUser(row: UserRow): SessionUser {
  const face = portrait(row.foto, row.decoration_id, row.shop_image);
  return { id: row.user_id, name: row.name, email: row.email, avatar: face.avatar, frame: face.frame, group: row.user_group, groupName: row.group_name ?? undefined, joinedAt: Number(row.reg_date) || 0 };
}

export function isAdmin(user: { group: number; groupName?: string }) {
  if (user.group === 1) return true;
  const name = (user.groupName ?? "").toLowerCase();
  return name.includes("admin") || name.includes("ადმინ");
}

export function createToken(row: { user_id: number; password: string }) {
  const payload = Buffer.from(JSON.stringify({ uid: row.user_id, fp: fingerprint(row.password), exp: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readToken(token?: string) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { uid: number; fp: string; exp: number };
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const data = readToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!data) return null;
  const [row] = await query<UserRow>(`${userSelect} WHERE u.user_id = ? LIMIT 1`, [data.uid]);
  if (!row || row.banned === "yes" || fingerprint(row.password) !== data.fp) return null;
  return toUser(row);
}

export async function clientIp() {
  if (process.env.TRUST_PROXY !== "1") return "0.0.0.0";
  const list = await headers();
  return (list.get("x-real-ip") || list.get("x-forwarded-for")?.split(",").pop() || "0.0.0.0").trim().slice(0, 46);
}

export function siteUrl(fallback = "http://localhost:3000") {
  const value = process.env.SITE_URL?.replace(/\/+$/, "");
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("SITE_URL is not set");
  return fallback;
}

export async function startSession(row: { user_id: number; password: string }) {
  (await cookies()).set(SESSION_COOKIE, createToken(row), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export type AuthResult = { ok: true; user?: SessionUser; pending?: boolean } | { ok: false; error: string };

async function ensureVerify() {
  await execute(`CREATE TABLE IF NOT EXISTS site_unverified (
    user_id INT NOT NULL PRIMARY KEY,
    created_at DATETIME NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await execute(`CREATE TABLE IF NOT EXISTS site_verify (
    token CHAR(64) NOT NULL PRIMARY KEY,
    user_id INT NOT NULL,
    expires_at DATETIME NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

async function sendVerify(userId: number, email: string, origin: string) {
  await ensureVerify();
  const token = randomBytes(24).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  await execute("DELETE FROM site_verify WHERE user_id = ?", [userId]);
  await execute("INSERT INTO site_verify (token, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))", [hash, userId]);
  const { sendMail } = await import("@/lib/mail");
  await sendMail(email, "ანგარიშის დადასტურება — Animeb", `ანგარიშის ჩასართავად გახსენი ბმული. ერთი დღე იმუშავებს.\n\n${origin}/api/auth/verify?token=${token}`);
}

export async function login(identifier: string, password: string): Promise<AuthResult> {
  const login = identifier.trim();
  if (!login || !password) return { ok: false, error: "შეიყვანე მომხმარებელი და პაროლი." };
  const [row] = await query<UserRow>(`${userSelect} WHERE u.name = ? OR u.email = ? LIMIT 1`, [login, login]);
  if (!row || !row.password || !(await bcrypt.compare(password, row.password))) return { ok: false, error: "მომხმარებელი ან პაროლი არასწორია." };
  if (row.banned === "yes") return { ok: false, error: "ეს ანგარიში დაბლოკილია." };
  await ensureVerify();
  const [pending] = await query<{ user_id: number }>("SELECT user_id FROM site_unverified WHERE user_id = ? LIMIT 1", [row.user_id]);
  if (pending) {
    try { await sendVerify(row.user_id, row.email, siteUrl()); } catch { /* წერილი შეიძლება ხელახლა ვერ გავიდეს */ }
    return { ok: false, error: "ჯერ ფოსტა დაადასტურე. წერილი თავიდან გაიგზავნა." };
  }
  await execute("UPDATE dle_users SET lastdate = ?, logged_ip = ? WHERE user_id = ?", [String(Math.floor(Date.now() / 1000)), await clientIp(), row.user_id]);
  await startSession(row);
  return { ok: true, user: toUser(row) };
}

export async function register(name: string, email: string, password: string, origin: string): Promise<AuthResult> {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  if (cleanName.length < 3 || cleanName.length > 40 || /[<>"'&\\/]/.test(cleanName)) return { ok: false, error: "სახელი 3–40 სიმბოლო უნდა იყოს, სპეცსიმბოლოების გარეშე." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 50) return { ok: false, error: "შეიყვანე სწორი ელფოსტა." };
  if (password.length < 8) return { ok: false, error: "პაროლი მინიმუმ 8 სიმბოლო უნდა იყოს." };
  const taken = await query<{ name: string; email: string }>("SELECT name, email FROM dle_users WHERE name = ? OR email = ? LIMIT 1", [cleanName, cleanEmail]);
  if (taken.length) return { ok: false, error: taken[0].email.toLowerCase() === cleanEmail ? "ეს ელფოსტა უკვე რეგისტრირებულია." : "ეს სახელი უკვე დაკავებულია." };
  const hash = (await bcrypt.hash(password, 10)).replace(/^\$2b\$/, "$2y$");
  const now = String(Math.floor(Date.now() / 1000));
  const result = await execute(
    `INSERT INTO dle_users (name, email, password, user_group, reg_date, lastdate, logged_ip, banned, info, signature, favorites, xfields, mylists, favFilms, favWillLook, favFindWeb, favWatched, gender, friends, friends_temp, user_balance)
     VALUES (?, ?, ?, 4, ?, ?, ?, '', '', '', '', '', '', '', '', '', '', '', '', '', 0)`,
    [cleanName, cleanEmail, hash, now, now, await clientIp()],
  );
  await ensureVerify();
  await execute("INSERT INTO site_unverified (user_id, created_at) VALUES (?, NOW())", [result.insertId]);
  try {
    await sendVerify(result.insertId, cleanEmail, origin);
  } catch {
    await execute("DELETE FROM site_unverified WHERE user_id = ?", [result.insertId]);
    await execute("DELETE FROM dle_users WHERE user_id = ?", [result.insertId]);
    return { ok: false, error: "დადასტურების წერილი ვერ გაიგზავნა. სცადე თავიდან." };
  }
  return { ok: true, pending: true };
}

export async function confirmEmail(token: string) {
  await ensureVerify();
  const hash = createHash("sha256").update(token).digest("hex");
  const [row] = await query<{ user_id: number; password: string }>(
    "SELECT v.user_id, u.password FROM site_verify v JOIN dle_users u ON u.user_id = v.user_id WHERE v.token = ? AND v.expires_at > NOW() LIMIT 1",
    [hash],
  );
  if (!row) return "ბმული არასწორია ან ვადა გაუვიდა.";
  await execute("DELETE FROM site_unverified WHERE user_id = ?", [row.user_id]);
  await execute("DELETE FROM site_verify WHERE user_id = ?", [row.user_id]);
  await startSession({ user_id: row.user_id, password: row.password });
  return "";
}
