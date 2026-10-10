import "server-only";
import bcrypt from "bcryptjs";
import { startSession } from "@/lib/auth";
import { execute, query } from "@/lib/db";
import { avatarUrl, imageSrc, parseXFields } from "@/lib/dle";
import { parsePrefs, type AccountSettings, type Prefs } from "@/lib/settings-model";

type Row = { user_id: number; name: string; email: string; password: string; foto: string | null; decoration_id: string | null; fullname: string; info: string; xfields: string; reg_date: string };

const months = ["იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი", "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"];

function joined(raw: string) {
  const date = new Date(Number(raw) * 1000);
  if (!Number.isFinite(date.getTime())) return "";
  return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
}

function writeFields(raw: string, extra: Record<string, string>) {
  const fields = parseXFields(raw);
  for (const [key, value] of Object.entries(extra)) {
    if (value) fields[key] = value;
    else delete fields[key];
  }
  return Object.entries(fields).map(([key, value]) => `${key}|${value}`).join("||");
}

async function rowOf(userId: number) {
  const [row] = await query<Row>("SELECT user_id, name, email, password, foto, decoration_id, fullname, info, xfields, reg_date FROM dle_users WHERE user_id = ? LIMIT 1", [userId]);
  return row ?? null;
}

export async function getPrefs(userId: number) {
  const row = await rowOf(userId);
  return parsePrefs(row ? parseXFields(row.xfields).ab : "");
}

export async function getAccount(userId: number): Promise<AccountSettings | null> {
  const row = await rowOf(userId);
  if (!row) return null;
  const fields = parseXFields(row.xfields);
  return {
    id: row.user_id,
    name: row.name,
    email: row.email,
    avatar: avatarUrl(row.foto),
    frame: /^\d+$/.test(row.decoration_id ?? "") ? undefined : imageSrc(avatarUrl(row.decoration_id)),
    cover: avatarUrl(fields.cover),
    displayName: row.fullname ?? "",
    bio: row.info ?? "",
    website: fields.site ?? "",
    joined: joined(row.reg_date),
    joinedAt: Number(row.reg_date) || 0,
    prefs: parsePrefs(fields.ab),
    locked: await (await import("@/lib/shop")).unownedShopFiles(row.user_id),
  };
}

export async function saveAccount(userId: number, input: { name: string; displayName: string; bio: string; website: string }) {
  const row = await rowOf(userId);
  if (!row) return "ანგარიში ვერ მოიძებნა.";
  const name = input.name.trim();
  const displayName = input.displayName.trim().slice(0, 32);
  const bio = input.bio.trim().slice(0, 500);
  const website = input.website.trim();
  if (name.length < 3 || name.length > 10 || !/^[\p{L}\p{N}]+$/u.test(name)) return "სახელი 3–10 სიმბოლო უნდა იყოს, მხოლოდ ასოები და ციფრები.";
  if (website && !/^https?:\/\/\S+$/i.test(website)) return "საიტის მისამართი http ან https უნდა იყოს.";
  if (name.toLowerCase() !== row.name.toLowerCase()) {
    const taken = await query<{ user_id: number }>("SELECT user_id FROM dle_users WHERE name = ? AND user_id <> ? LIMIT 1", [name, userId]);
    if (taken.length) return "ეს სახელი უკვე დაკავებულია.";
  }
  const memberId = String(userId);
  await execute("UPDATE dle_logs SET member = ? WHERE member = ? OR member = ?", [memberId, row.name, memberId]);
  await execute("UPDATE dle_comment_rating_log SET member = ? WHERE member = ? OR member = ?", [memberId, row.name, memberId]);
  await execute("UPDATE dle_users SET name = ?, fullname = ?, info = ?, xfields = ? WHERE user_id = ?", [name, displayName, bio, writeFields(row.xfields, { site: website }), userId]);
  return "";
}

export async function savePrefs(userId: number, prefs: Prefs) {
  const row = await rowOf(userId);
  if (!row) return false;
  const next = parsePrefs(JSON.stringify(prefs));
  await execute("UPDATE dle_users SET xfields = ? WHERE user_id = ?", [writeFields(row.xfields, { ab: JSON.stringify(next) }), userId]);
  return true;
}

async function checkPassword(row: Row, password: string) {
  return Boolean(row.password) && bcrypt.compare(password, row.password);
}

export async function changePassword(userId: number, current: string, next: string) {
  const row = await rowOf(userId);
  if (!row) return "ანგარიში ვერ მოიძებნა.";
  if (!(await checkPassword(row, current))) return "მიმდინარე პაროლი არასწორია.";
  if (next.length < 8) return "ახალი პაროლი მინიმუმ 8 სიმბოლო უნდა იყოს.";
  const hash = (await bcrypt.hash(next, 10)).replace(/^\$2b\$/, "$2y$");
  await execute("UPDATE dle_users SET password = ? WHERE user_id = ?", [hash, userId]);
  await startSession({ user_id: userId, password: hash });
  return "";
}

export async function changeEmail(userId: number, email: string, password: string) {
  const row = await rowOf(userId);
  if (!row) return "ანგარიში ვერ მოიძებნა.";
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 50) return "შეიყვანე სწორი ელფოსტა.";
  if (!(await checkPassword(row, password))) return "პაროლი არასწორია.";
  const taken = await query<{ user_id: number }>("SELECT user_id FROM dle_users WHERE email = ? AND user_id <> ? LIMIT 1", [clean, userId]);
  if (taken.length) return "ეს ელფოსტა უკვე რეგისტრირებულია.";
  await execute("UPDATE dle_users SET email = ? WHERE user_id = ?", [clean, userId]);
  return "";
}

export async function saveAvatar(userId: number, fileName: string) {
  await execute("UPDATE dle_users SET foto = ? WHERE user_id = ?", [fileName, userId]);
}

export async function saveFrame(userId: number, fileName: string) {
  await execute("UPDATE dle_users SET decoration_id = ? WHERE user_id = ?", [fileName, userId]);
}

export async function saveCover(userId: number, fileName: string) {
  const row = await rowOf(userId);
  if (!row) return;
  await execute("UPDATE dle_users SET xfields = ? WHERE user_id = ?", [writeFields(row.xfields, { cover: fileName }), userId]);
}
