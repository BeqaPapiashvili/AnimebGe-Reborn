import "server-only";
import { createHash, randomBytes } from "crypto";
import { execute, query } from "@/lib/db";
import { absUrl, avatarUrl, htmlToText, imageSrc, parseXFields, portrait } from "@/lib/dle";
import type { RoomChatMessage, WatchRoomCard } from "@/lib/watch-room-types";
import { parsePrefs } from "@/lib/settings-model";
import { notifyUsers } from "@/lib/notifications";

export type RankRow = { name: string; avatar?: string; frame?: string; anime: number; episodes: number; minutes: number };
export type LeaderComment = { id: number; name: string; avatar?: string; frame?: string; text: string; at: string; likes: number; dislikes: number; replies: number; anime?: string; slug?: string };
export type LeaderAnime = { slug: string; title: string; poster?: string; desc: string; score?: string; views: number; comments: number; episodes?: string };
export type LeaderSpan = "all" | "week" | "month";
export type LeaderboardPage = {
  comments: Record<LeaderSpan, LeaderComment[]>;
  users: Record<LeaderSpan, RankRow[]>;
  anime: Record<LeaderSpan, LeaderAnime[]>;
};
export type FeedItem = { id: string; name: string; avatar?: string; frame?: string; kind: "watch" | "comment"; title: string; slug?: string; text: string; at: string };
export type RoomState = { code: string; hostId: number; host: string; slug: string; title: string; episode: number; position: number; updated: string; closed: boolean; visibility: "public" | "link" | "friends"; startsAt: string | null };

let ready: Promise<void> | null = null;

export function ensureHub() {
  ready ??= (async () => {
    await execute(`CREATE TABLE IF NOT EXISTS site_reports (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      post_id INT NOT NULL,
      episode INT NOT NULL,
      message VARCHAR(500) NOT NULL,
      created_at DATETIME NOT NULL,
      KEY post_id (post_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await execute(`CREATE TABLE IF NOT EXISTS site_requests (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(120) NOT NULL,
      note VARCHAR(500) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL,
      KEY user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await execute(`CREATE TABLE IF NOT EXISTS site_request_votes (
      request_id INT NOT NULL,
      user_id INT NOT NULL,
      PRIMARY KEY (request_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await execute(`CREATE TABLE IF NOT EXISTS site_rooms (
      code VARCHAR(8) NOT NULL PRIMARY KEY,
      host_id INT NOT NULL,
      slug VARCHAR(190) NOT NULL DEFAULT '',
      title VARCHAR(255) NOT NULL DEFAULT '',
      episode INT NOT NULL DEFAULT 1,
      position INT NOT NULL DEFAULT 0,
      updated_at DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await execute(`CREATE TABLE IF NOT EXISTS site_room_chat (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(8) NOT NULL,
      user_id INT NOT NULL,
      body VARCHAR(500) NOT NULL,
      created_at DATETIME NOT NULL,
      KEY code_id (code, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    for (const sql of [
      "ALTER TABLE site_rooms ADD COLUMN visibility VARCHAR(12) NOT NULL DEFAULT 'public'",
      "ALTER TABLE site_rooms ADD COLUMN voice TINYINT NOT NULL DEFAULT 0",
      "ALTER TABLE site_rooms ADD COLUMN starts_at DATETIME NULL",
      "ALTER TABLE site_rooms ADD COLUMN closed_at DATETIME NULL",
      "ALTER TABLE site_reports ADD COLUMN status VARCHAR(12) NOT NULL DEFAULT 'open'",
    ]) {
      try {
        await execute(sql);
      } catch (error) {
        if ((error as { errno?: number }).errno !== 1060) throw error;
      }
    }
    await execute(`CREATE TABLE IF NOT EXISTS site_room_presence (
      code VARCHAR(8) NOT NULL,
      token CHAR(32) NOT NULL,
      seen_at DATETIME NOT NULL,
      PRIMARY KEY (code, token),
      KEY seen (code, seen_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await execute(`CREATE TABLE IF NOT EXISTS site_resets (
      token CHAR(64) NOT NULL PRIMARY KEY,
      user_id INT NOT NULL,
      expires_at DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await execute(`CREATE TABLE IF NOT EXISTS site_episode_seen (
      news_id INT NOT NULL PRIMARY KEY,
      episodes INT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  })();
  return ready;
}

export async function saveReport(userId: number, postId: number, episode: number, message: string) {
  await ensureHub();
  const text = message.trim().slice(0, 500);
  if (text.length < 3) return "მოკლედ დაწერე, რა არ მუშაობს.";
  await execute("INSERT INTO site_reports (user_id, post_id, episode, message, created_at) VALUES (?, ?, ?, ?, NOW())", [userId, postId, episode, text]);
  return "";
}

export async function listReports(status: "" | "open" | "done" = "") {
  await ensureHub();
  const where = status ? "WHERE r.status = ?" : "";
  const params = status ? [status] : [];
  const [rows, counts] = await Promise.all([
    query<{ id: number; name: string | null; post_id: number | null; title: string | null; slug: string | null; episode: number; message: string; status: string; created_at: string }>(
      `SELECT r.id, u.name, p.id post_id, p.title, p.alt_name slug, r.episode, r.message, r.status, r.created_at
       FROM site_reports r
       LEFT JOIN dle_users u ON u.user_id = r.user_id
       LEFT JOIN dle_post p ON p.id = r.post_id
       ${where}
       ORDER BY r.id DESC
       LIMIT 80`,
      params,
    ),
    query<{ status: string; total: number }>("SELECT status, COUNT(*) total FROM site_reports GROUP BY status"),
  ]);
  const tally = (value: string) => Number(counts.find((row) => row.status === value)?.total) || 0;
  return { rows, open: tally("open"), done: tally("done") };
}

export async function setReportStatus(id: number, status: "open" | "done") {
  await ensureHub();
  await execute("UPDATE site_reports SET status = ? WHERE id = ?", [status, id]);
}

export async function leaderboard(): Promise<RankRow[]> {
  const rows = await query<{ name: string; foto: string | null; anime: number; episodes: number; seconds: number }>(
    `SELECT u.name, u.foto, COUNT(*) anime, SUM(w.episode_idx + 1) episodes,
      SUM(w.episode_idx * IF(w.duration > 60 AND w.duration < 21600, w.duration, 0) + LEAST(w.watch_time, IF(w.duration > 60 AND w.duration < 21600, w.duration, 21600))) seconds
     FROM dle_watch_history w JOIN dle_users u ON u.user_id = w.user_id
     GROUP BY u.user_id, u.name, u.foto
     ORDER BY episodes DESC, seconds DESC
     LIMIT 40`,
  );
  return rows.map((row) => ({
    name: row.name,
    avatar: avatarUrl(row.foto),
    anime: Number(row.anime) || 0,
    episodes: Number(row.episodes) || 0,
    minutes: Math.round((Number(row.seconds) || 0) / 60),
  }));
}

function shopPortrait(foto: string | null, decoration: string | null, shopType: string | null, shopImage: string | null) {
  const face = avatarUrl(foto);
  const extra = decoration?.trim() ?? "";
  const shop = absUrl(shopImage);
  const path = extra && extra !== "0" && !/^\d+$/.test(extra) ? avatarUrl(extra) : undefined;
  const deco = imageSrc(shop) || imageSrc(path);
  if (!deco) return { avatar: face };
  if (shopType === "frame" || (face && shopType !== "avatar")) return { avatar: face, frame: deco };
  return { avatar: face || deco };
}

function since(span: LeaderSpan) {
  if (span === "week") return 7;
  if (span === "month") return 30;
  return 0;
}

async function rankRows(span: LeaderSpan): Promise<RankRow[]> {
  const { levelForXp, readyXp } = await import("@/lib/xp");
  await readyXp();
  const days = since(span);
  const rows = await query<{ name: string; foto: string | null; decoration_id: string | null; shop_type: string | null; shop_image: string | null; xp: number; total_xp: number }>(
    days
      ? `SELECT u.name, u.foto, u.decoration_id, u.total_xp, ANY_VALUE(si.type) shop_type, ANY_VALUE(si.image_url) shop_image, COALESCE(x.xp, 0) xp
         FROM (
           SELECT user_id FROM dle_watch_history WHERE last_update >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
           UNION
           SELECT user_id FROM site_xp_events WHERE created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${days} DAY)
         ) active
         JOIN dle_users u ON u.user_id = active.user_id
         LEFT JOIN (
           SELECT user_id, SUM(amount) xp FROM site_xp_events
           WHERE created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${days} DAY)
           GROUP BY user_id
         ) x ON x.user_id = u.user_id
         LEFT JOIN shop_items si ON u.decoration_id REGEXP '^[0-9]+$' AND si.id = u.decoration_id
         GROUP BY u.user_id, u.name, u.foto, u.decoration_id, u.total_xp, x.xp
         ORDER BY xp DESC, u.total_xp DESC
         LIMIT 10`
      : `SELECT u.name, u.foto, u.decoration_id, u.total_xp, u.total_xp xp, ANY_VALUE(si.type) shop_type, ANY_VALUE(si.image_url) shop_image
         FROM dle_users u
         LEFT JOIN shop_items si ON u.decoration_id REGEXP '^[0-9]+$' AND si.id = u.decoration_id
         WHERE u.total_xp > 0
         GROUP BY u.user_id, u.name, u.foto, u.decoration_id, u.total_xp
         ORDER BY u.total_xp DESC
         LIMIT 10`,
  );
  return rows.map((row) => ({
    name: row.name,
    ...shopPortrait(row.foto, row.decoration_id, row.shop_type, row.shop_image),
    anime: levelForXp(Number(row.total_xp) || 0),
    episodes: 0,
    minutes: Number(row.xp) || 0,
  }));
}

async function commentRows(span: LeaderSpan): Promise<LeaderComment[]> {
  const days = since(span);
  const rows = await query<{ id: number; name: string; foto: string | null; decoration_id: string | null; shop_type: string | null; shop_image: string | null; text: string; date: string; rating: number; vote_num: number; replies: number; title: string | null; alt_name: string | null }>(
    `SELECT c.id, u.name, u.foto, u.decoration_id, si.type shop_type, si.image_url shop_image, c.text, c.date, c.rating, c.vote_num, p.title, p.alt_name,
      (SELECT COUNT(*) FROM dle_comments r WHERE r.parent = c.id AND r.approve = 1) replies
     FROM dle_comments c
     JOIN dle_users u ON u.user_id = c.user_id
     LEFT JOIN shop_items si ON u.decoration_id REGEXP '^[0-9]+$' AND si.id = u.decoration_id
     LEFT JOIN dle_post p ON p.id = c.post_id AND p.approve = 1
     WHERE c.approve = 1 AND c.parent = 0 ${days ? `AND c.date >= DATE_SUB(NOW(), INTERVAL ${days} DAY)` : ""}
     ORDER BY c.rating DESC, c.vote_num DESC, c.date DESC
     LIMIT 20`,
  );
  return rows.map((row) => {
    const votes = Number(row.vote_num) || 0;
    const rating = Number(row.rating) || 0;
    const likes = Math.max(0, Math.round((votes + rating) / 2));
    return {
      id: row.id,
      name: row.name,
      ...shopPortrait(row.foto, row.decoration_id, row.shop_type, row.shop_image),
      text: htmlToText(row.text).replace(/\s+/g, " ").trim().slice(0, 180),
      at: String(row.date),
      likes,
      dislikes: Math.max(0, votes - likes),
      replies: Number(row.replies) || 0,
      anime: row.title ?? undefined,
      slug: row.alt_name ?? undefined,
    };
  });
}

function animeCard(row: { title: string; alt_name: string; short_story: string; xfields: string; comm_num: number; news_read: number; day_read: number }, week: boolean): LeaderAnime {
  const fields = parseXFields(row.xfields);
  const score = Number(fields.imdb);
  const episodes = Number((fields.episodenum ?? "").split("/").pop()?.replace(/\D/g, "")) || Number(fields["new-episode"]) || 0;
  return {
    slug: row.alt_name,
    title: row.title,
    poster: absUrl(fields.image),
    desc: htmlToText(row.short_story).replace(/\s+/g, " ").trim().slice(0, 180),
    score: Number.isFinite(score) && score > 0 ? score.toFixed(1) : undefined,
    views: Number(week ? row.day_read : row.news_read) || 0,
    comments: Number(row.comm_num) || 0,
    episodes: episodes ? String(episodes) : undefined,
  };
}

async function animeRows(span: LeaderSpan): Promise<LeaderAnime[]> {
  const days = since(span);
  const rows = days
    ? await query<{ title: string; alt_name: string; short_story: string; xfields: string; comm_num: number; news_read: number; day_read: number }>(
        `SELECT p.title, p.alt_name, p.short_story, p.xfields, p.comm_num, e.news_read, t.day_read
         FROM (
           SELECT w.news_id, COUNT(*) day_read
           FROM dle_watch_history w
           JOIN dle_post ap ON ap.id = w.news_id AND ap.approve = 1
           WHERE w.last_update >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
           GROUP BY w.news_id
           ORDER BY day_read DESC
           LIMIT 20
         ) t
         JOIN dle_post p ON p.id = t.news_id
         JOIN dle_post_extras e ON e.news_id = p.id
         ORDER BY t.day_read DESC`,
      )
    : await query<{ title: string; alt_name: string; short_story: string; xfields: string; comm_num: number; news_read: number; day_read: number }>(
        `SELECT p.title, p.alt_name, p.short_story, p.xfields, p.comm_num, e.news_read, e.day_read
         FROM dle_post p
         JOIN dle_post_extras e ON e.news_id = p.id
         WHERE p.approve = 1
         ORDER BY e.news_read DESC, p.comm_num DESC
         LIMIT 20`,
      );
  return rows.map((row) => animeCard(row, days > 0));
}

export async function leaderboardPage(): Promise<LeaderboardPage> {
  const spans: LeaderSpan[] = ["all", "week", "month"];
  const [comments, users, anime] = await Promise.all([
    Promise.all(spans.map((span) => commentRows(span))),
    Promise.all(spans.map((span) => rankRows(span))),
    Promise.all(spans.map((span) => animeRows(span))),
  ]);
  return {
    comments: { all: comments[0], week: comments[1], month: comments[2] },
    users: { all: users[0], week: users[1], month: users[2] },
    anime: { all: anime[0], week: anime[1], month: anime[2] },
  };
}

export async function communityFeed(viewerId?: number): Promise<FeedItem[]> {
  const [watches, comments, viewer] = await Promise.all([
    query<{ user_id: number; name: string; foto: string | null; decoration_id: string | null; shop_image: string | null; xfields: string; friends: string; title: string; alt_name: string; episode_idx: number; last_update: string }>(
      `SELECT w.user_id, u.name, u.foto, u.decoration_id, si.image_url AS shop_image, u.xfields, u.friends, p.title, p.alt_name, w.episode_idx, w.last_update
       FROM dle_watch_history w
       JOIN dle_users u ON u.user_id = w.user_id
       LEFT JOIN shop_items si ON u.decoration_id REGEXP '^[0-9]+$' AND si.id = u.decoration_id AND si.type = 'frame'
       JOIN dle_post p ON p.id = w.news_id AND p.approve = 1
       ORDER BY w.last_update DESC LIMIT 60`,
    ),
    query<{ id: number; user_id: number; name: string; foto: string | null; decoration_id: string | null; shop_image: string | null; xfields: string; friends: string; title: string | null; alt_name: string | null; text: string; date: string }>(
      `SELECT c.id, c.user_id, u.name, u.foto, u.decoration_id, si.image_url AS shop_image, u.xfields, u.friends, p.title, p.alt_name, c.text, c.date
       FROM dle_comments c
       JOIN dle_users u ON u.user_id = c.user_id
       LEFT JOIN shop_items si ON u.decoration_id REGEXP '^[0-9]+$' AND si.id = u.decoration_id AND si.type = 'frame'
       LEFT JOIN dle_post p ON p.id = c.post_id
       WHERE c.approve = 1
       ORDER BY c.date DESC LIMIT 40`,
    ),
    viewerId ? query<{ friends: string }>("SELECT friends FROM dle_users WHERE user_id = ? LIMIT 1", [viewerId]) : Promise.resolve([]),
  ]);
  const friends = new Set((viewer[0]?.friends ?? "").split(",").map((id) => Number(id)).filter((id) => id > 0));
  const visible = (userId: number, xfields: string, friendList: string) => {
    if (viewerId === userId) return true;
    const live = parsePrefs(parseXFields(xfields).ab).live;
    if (live === "none") return false;
    if (live === "all") return true;
    if (!viewerId) return false;
    const theirs = new Set(friendList.split(",").map((id) => Number(id)).filter((id) => id > 0));
    return friends.has(userId) || theirs.has(viewerId);
  };
  const items: FeedItem[] = [];
  for (const row of watches) {
    if (!visible(row.user_id, row.xfields, row.friends)) continue;
    items.push({
      id: `w${row.user_id}-${row.alt_name}`,
      name: row.name,
      ...portrait(row.foto, row.decoration_id, row.shop_image),
      kind: "watch",
      title: row.title,
      slug: row.alt_name,
      text: `${row.episode_idx + 1}-ე ეპიზოდი`,
      at: String(row.last_update),
    });
  }
  for (const row of comments) {
    if (!visible(row.user_id, row.xfields, row.friends)) continue;
    items.push({
      id: `c${row.id}`,
      name: row.name,
      ...portrait(row.foto, row.decoration_id, row.shop_image),
      kind: "comment",
      title: row.title ?? "კომენტარი",
      slug: row.alt_name ?? undefined,
      text: htmlToText(row.text).replace(/\s+/g, " ").slice(0, 160),
      at: String(row.date),
    });
  }
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40);
}

export async function siteStatus() {
  const started = Date.now();
  try {
    await query("SELECT 1 AS ok");
    return { ok: true, at: new Date().toISOString(), ms: Date.now() - started };
  } catch {
    return { ok: false, at: new Date().toISOString(), ms: Date.now() - started };
  }
}

function code() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
}

export async function createRoom(hostId: number, input: { title: string; visibility: "public" | "link" | "friends"; voice: boolean; startsAt: string | null }) {
  await ensureHub();
  const starts = input.startsAt && Number.isFinite(Date.parse(input.startsAt)) ? new Date(input.startsAt) : null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const room = code();
    try {
      await execute(
        "INSERT INTO site_rooms (code, host_id, title, visibility, voice, starts_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
        [room, hostId, input.title.slice(0, 255), input.visibility, input.voice ? 1 : 0, starts],
      );
      return room;
    } catch {
      /* code taken */
    }
  }
  return "";
}

function roomStatus(slug: string, updated: string, closed: boolean): WatchRoomCard["status"] {
  if (closed) return "ended";
  const age = Date.now() - new Date(updated.replace(" ", "T")).getTime();
  if (!Number.isFinite(age)) return "waiting";
  if (!slug) return age > 6 * 60 * 60 * 1000 ? "ended" : "waiting";
  if (age < 20 * 60 * 1000) return "live";
  if (age < 6 * 60 * 60 * 1000) return "waiting";
  return "ended";
}

export async function listWatchRooms(viewerId?: number) {
  await ensureHub();
  const [rows, friendsRow] = await Promise.all([
    query<{ code: string; host_id: number; slug: string; title: string; episode: number; position: number; visibility: string; closed_at: string | null; updated_at: string; name: string; foto: string | null; decoration_id: string | null; shop_image: string | null; xfields: string | null }>(
      `SELECT r.code, r.host_id, r.slug, r.title, r.episode, r.position, r.visibility, r.closed_at, r.updated_at, u.name, u.foto, u.decoration_id, si.image_url AS shop_image, p.xfields
       FROM site_rooms r
       JOIN dle_users u ON u.user_id = r.host_id
       LEFT JOIN shop_items si ON u.decoration_id REGEXP '^[0-9]+$' AND si.id = u.decoration_id AND si.type = 'frame'
       LEFT JOIN dle_post p ON p.id = (SELECT id FROM dle_post WHERE alt_name COLLATE utf8mb4_general_ci = r.slug COLLATE utf8mb4_general_ci AND approve = 1 ORDER BY id DESC LIMIT 1)
       ORDER BY r.updated_at DESC
       LIMIT 200`,
    ),
    viewerId ? query<{ friends: string }>("SELECT friends FROM dle_users WHERE user_id = ? LIMIT 1", [viewerId]) : Promise.resolve([] as { friends: string }[]),
  ]);
  const friendIds = (friendsRow[0]?.friends ?? "").split(",").map((id) => Number(id)).filter((id) => id > 0);
  const rooms: WatchRoomCard[] = rows.map((row) => ({
    code: row.code,
    hostId: row.host_id,
    host: row.name,
    ...portrait(row.foto, row.decoration_id, row.shop_image),
    slug: row.slug,
    title: row.title,
    poster: absUrl(parseXFields(row.xfields).image),
    episode: row.episode,
    position: row.position,
    updated: String(row.updated_at),
    status: roomStatus(row.slug, String(row.updated_at), !!row.closed_at),
    visibility: (row.visibility === "link" || row.visibility === "friends" ? row.visibility : "public") as WatchRoomCard["visibility"],
  })).filter((room) => {
    if (room.visibility === "public") return true;
    if (!viewerId) return false;
    if (room.hostId === viewerId) return true;
    return room.visibility === "friends" && friendIds.includes(room.hostId);
  });
  return { rooms, friendIds };
}

export async function readRoom(roomCode: string): Promise<RoomState | null> {
  await ensureHub();
  const [row] = await query<{ code: string; host_id: number; host_name: string | null; slug: string; title: string; episode: number; position: number; visibility: string; closed_at: string | null; updated_at: string; starts_at: string | null }>(
    `SELECT r.code, r.host_id, u.name AS host_name, r.slug, r.title, r.episode, r.position, r.visibility, r.closed_at, r.updated_at, r.starts_at
     FROM site_rooms r
     LEFT JOIN dle_users u ON u.user_id = r.host_id
     WHERE r.code = ? LIMIT 1`,
    [roomCode],
  );
  if (!row) return null;
  const visibility = row.visibility === "link" || row.visibility === "friends" ? row.visibility : "public";
  const startsAt = row.starts_at ? new Date(String(row.starts_at).replace(" ", "T")).toISOString() : null;
  return { code: row.code, hostId: row.host_id, host: row.host_name ?? "", slug: row.slug, title: row.title, episode: row.episode, position: row.position, updated: String(row.updated_at), closed: !!row.closed_at, visibility, startsAt: startsAt && Date.parse(startsAt) > Date.now() ? startsAt : null };
}

export async function canEnterRoom(room: RoomState, viewerId?: number) {
  if (room.visibility !== "friends") return true;
  if (!viewerId) return false;
  if (viewerId === room.hostId) return true;
  const [row] = await query<{ friends: string }>("SELECT friends FROM dle_users WHERE user_id = ? LIMIT 1", [viewerId]);
  return (row?.friends ?? "").split(",").map((id) => Number(id)).includes(room.hostId);
}

export async function closeRoom(hostId: number, roomCode: string) {
  await ensureHub();
  const room = await readRoom(roomCode);
  if (!room || room.hostId !== hostId || room.closed) return false;
  await execute("UPDATE site_rooms SET closed_at = NOW(), updated_at = NOW() WHERE code = ?", [room.code]);
  return true;
}

export async function listNewRoomChat(roomCode: string, since: number): Promise<RoomChatMessage[]> {
  return listRoomChat(roomCode, since > 0 ? since : -1);
}

export async function listRoomChat(roomCode: string, since = 0): Promise<RoomChatMessage[]> {
  await ensureHub();
  const rows = await query<{ id: number; user_id: number; name: string; foto: string | null; decoration_id: string | null; shop_image: string | null; body: string }>(
    since > 0
      ? `SELECT c.id, c.user_id, u.name, u.foto, u.decoration_id, si.image_url AS shop_image, c.body
         FROM site_room_chat c
         JOIN dle_users u ON u.user_id = c.user_id
         LEFT JOIN shop_items si ON u.decoration_id REGEXP '^[0-9]+$' AND si.id = u.decoration_id AND si.type = 'frame'
         WHERE c.code = ? AND c.id > ?
         ORDER BY c.id ASC
         LIMIT 40`
      : `SELECT c.id, c.user_id, u.name, u.foto, u.decoration_id, si.image_url AS shop_image, c.body
         FROM site_room_chat c
         JOIN dle_users u ON u.user_id = c.user_id
         LEFT JOIN shop_items si ON u.decoration_id REGEXP '^[0-9]+$' AND si.id = u.decoration_id AND si.type = 'frame'
         WHERE c.code = ?
         ORDER BY c.id DESC
         LIMIT ${since < 0 ? 20 : 80}`,
    since > 0 ? [roomCode, since] : [roomCode],
  );
  const ordered = since > 0 ? rows : rows.reverse();
  return ordered.map((row) => ({ id: row.id, userId: row.user_id, name: row.name, ...portrait(row.foto, row.decoration_id, row.shop_image), body: row.body }));
}

export async function addRoomChat(userId: number, roomCode: string, body: string) {
  await ensureHub();
  const room = await readRoom(roomCode);
  const text = body.trim().slice(0, 500);
  if (!room || room.closed || !text) return null;
  await execute("INSERT INTO site_room_chat (code, user_id, body, created_at) VALUES (?, ?, ?, NOW())", [room.code, userId, text]);
  const [row] = await query<{ id: number }>("SELECT LAST_INSERT_ID() AS id");
  if (!row?.id) return null;
  return { id: row.id, body: text };
}

export async function touchRoomPresence(roomCode: string, token: string) {
  await ensureHub();
  const room = await readRoom(roomCode);
  const key = token.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32);
  if (!room || key.length < 8) return 0;
  await execute(
    "INSERT INTO site_room_presence (code, token, seen_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE seen_at = NOW()",
    [room.code, key],
  );
  await execute("DELETE FROM site_room_presence WHERE code = ? AND seen_at < DATE_SUB(NOW(), INTERVAL 25 SECOND)", [room.code]);
  const [row] = await query<{ total: number }>("SELECT COUNT(*) AS total FROM site_room_presence WHERE code = ? AND seen_at >= DATE_SUB(NOW(), INTERVAL 20 SECOND)", [room.code]);
  return Number(row?.total) || 0;
}

export async function syncRoom(hostId: number, roomCode: string, input: { slug: string; title: string; episode: number; position: number }) {
  await ensureHub();
  const room = await readRoom(roomCode);
  if (!room || room.hostId !== hostId || room.closed) return false;
  await execute("UPDATE site_rooms SET slug = ?, title = ?, episode = ?, position = ?, updated_at = NOW() WHERE code = ?", [
    input.slug.slice(0, 190),
    input.title.slice(0, 255),
    input.episode,
    Math.max(0, input.position),
    roomCode,
  ]);
  return true;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createReset(email: string) {
  await ensureHub();
  const [user] = await query<{ user_id: number }>("SELECT user_id FROM dle_users WHERE email = ? LIMIT 1", [email.trim().toLowerCase()]);
  if (!user) return "";
  const token = randomBytes(24).toString("hex");
  await execute("INSERT INTO site_resets (token, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))", [hashToken(token), user.user_id]);
  return token;
}

export async function consumeReset(token: string, password: string) {
  await ensureHub();
  if (password.length < 8) return "პაროლი მინიმუმ 8 სიმბოლო უნდა იყოს.";
  const [row] = await query<{ user_id: number }>("SELECT user_id FROM site_resets WHERE token = ? AND expires_at > NOW() LIMIT 1", [hashToken(token)]);
  if (!row) return "ბმული არასწორია ან ვადა გაუვიდა.";
  const bcrypt = await import("bcryptjs");
  const { startSession } = await import("@/lib/auth");
  const hash = (await bcrypt.hash(password, 10)).replace(/^\$2b\$/, "$2y$");
  await execute("UPDATE dle_users SET password = ? WHERE user_id = ?", [hash, row.user_id]);
  await execute("DELETE FROM site_resets WHERE user_id = ?", [row.user_id]);
  await startSession({ user_id: row.user_id, password: hash });
  return "";
}

let episodeSyncAt = 0;

export async function syncNewEpisodes(items: { id: number; title: string; slug: string; episode: number }[]) {
  if (Date.now() - episodeSyncAt < 10 * 60 * 1000) return;
  episodeSyncAt = Date.now();
  await ensureHub();
  const seen = await query<{ news_id: number; episodes: number }>("SELECT news_id, episodes FROM site_episode_seen");
  const known = new Map(seen.map((row) => [row.news_id, row.episodes]));
  for (const item of items) {
    if (!item.id || item.episode < 1) continue;
    const previous = known.get(item.id);
    if (previous != null && item.episode > previous) await notifyEpisode(item);
    if (previous !== item.episode) {
      await execute("INSERT INTO site_episode_seen (news_id, episodes) VALUES (?, ?) ON DUPLICATE KEY UPDATE episodes = VALUES(episodes)", [item.id, item.episode]);
    }
  }
}

async function notifyEpisode(item: { id: number; title: string; slug: string; episode: number }) {
  const [favorites, listed] = await Promise.all([
    query<{ user_id: number; xfields: string }>("SELECT user_id, xfields FROM dle_users WHERE FIND_IN_SET(?, favorites)", [String(item.id)]),
    query<{ user_id: number; list_id: number; xfields: string }>(
      `SELECT e.user_id, e.list_id, u.xfields FROM dle_mylists_entries e JOIN dle_users u ON u.user_id = e.user_id WHERE e.post_id = ?`,
      [item.id],
    ),
  ]);
  const ids = new Set<number>();
  for (const row of favorites) {
    if (parsePrefs(parseXFields(row.xfields).ab).news !== false) ids.add(row.user_id);
  }
  for (const row of listed) {
    const prefs = parsePrefs(parseXFields(row.xfields).ab);
    const folder = String(row.list_id) as "1" | "3" | "2" | "5" | "4";
    if (prefs.news === false) continue;
    if (folder in prefs.folders && prefs.folders[folder] === false) continue;
    ids.add(row.user_id);
  }
  await notifyUsers([...ids], {
    title: "ახალი სერია",
    message: `${item.title} · ეპ ${item.episode}`,
    link: `/anime/${item.slug}/watch?ep=${item.episode}`,
  });
}

