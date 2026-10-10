import "server-only";
import { execute, query } from "@/lib/db";
import { parseXFields, portrait } from "@/lib/dle";
import { parsePrefs } from "@/lib/settings-model";
import { FRIEND_LIMIT, type FriendCard, type FriendRelation, type FriendsPageData } from "@/lib/friends-types";

export type { FriendCard, FriendRelation, FriendsPageData };

type UserBits = { user_id: number; name: string; foto: string | null; friends: string; friends_temp: string };

function parseIds(raw?: string | null) {
  return [...new Set((raw ?? "").split(",").map((part) => Number(part.trim())).filter((id) => Number.isInteger(id) && id > 0))];
}

function pack(ids: number[]) {
  return [...new Set(ids)].join(",");
}

async function loadUsers(ids: number[]) {
  if (!ids.length) return [];
  const rows = await query<{ user_id: number; name: string; foto: string | null; decoration_id: string | null; shop_image: string | null }>(
    `SELECT u.user_id, u.name, u.foto, u.decoration_id, si.image_url AS shop_image
     FROM dle_users u
     LEFT JOIN shop_items si ON u.decoration_id REGEXP '^[0-9]+$' AND si.id = u.decoration_id AND si.type = 'frame'
     WHERE u.user_id IN (${ids.map(() => "?").join(",")})`,
    ids,
  );
  const byId = new Map(rows.map((row) => [row.user_id, row]));
  return ids
    .map((id) => byId.get(id))
    .filter((row): row is NonNullable<typeof row> => !!row)
    .map((row) => ({ id: row.user_id, name: row.name, ...portrait(row.foto, row.decoration_id, row.shop_image) }))
    .sort((a, b) => a.name.localeCompare(b.name, "ka"));
}

async function me(userId: number) {
  const [row] = await query<UserBits>("SELECT user_id, name, foto, friends, friends_temp FROM dle_users WHERE user_id = ? LIMIT 1", [userId]);
  return row ?? null;
}

async function setColumn(userId: number, column: "friends" | "friends_temp", ids: number[]) {
  await execute(`UPDATE dle_users SET ${column} = ? WHERE user_id = ?`, [pack(ids), userId]);
}

async function blockedEither(aId: number, aName: string, bId: number, bName: string) {
  const rows = await query<{ user: number; user_from: string }>(
    "SELECT user, user_from FROM dle_ignore_list WHERE (user = ? AND user_from = ?) OR (user = ? AND user_from = ?) LIMIT 2",
    [aId, bName, bId, aName],
  );
  return {
    byMe: rows.some((row) => row.user === aId && row.user_from === bName),
    byThem: rows.some((row) => row.user === bId && row.user_from === aName),
  };
}

async function notify(userId: number, title: string, message: string) {
  const [row] = await query<{ xfields: string }>("SELECT xfields FROM dle_users WHERE user_id = ? LIMIT 1", [userId]);
  if (row && parsePrefs(parseXFields(row.xfields).ab).friends === false) return;
  await execute(
    "INSERT INTO site_notifications (user_id, type, title, message, link, is_read, icon, is_visited, created_at, date) VALUES (?, 'friend', ?, ?, '/friends', 0, NULL, 0, NOW(), NOW())",
    [userId, title.slice(0, 255), message.slice(0, 1000)],
  );
}

export async function relationBetween(viewerId: number | undefined, target: { id: number; name: string; friends: string; friendsTemp: string }): Promise<FriendRelation> {
  if (!viewerId) return "guest";
  if (viewerId === target.id) return "self";
  const viewer = await me(viewerId);
  if (!viewer) return "guest";
  const block = await blockedEither(viewer.user_id, viewer.name, target.id, target.name);
  if (block.byMe) return "blocked";
  if (parseIds(viewer.friends).includes(target.id) || parseIds(target.friends).includes(viewerId)) return "friends";
  if (parseIds(target.friendsTemp).includes(viewerId)) return "outgoing";
  if (parseIds(viewer.friends_temp).includes(target.id)) return "incoming";
  return "none";
}

export async function getFriendsPage(userId: number): Promise<FriendsPageData> {
  const viewer = await me(userId);
  if (!viewer) return { limit: FRIEND_LIMIT, friends: [], incoming: [], outgoing: [], blocked: [], notices: [] };
  const [outgoing, blocked, notices] = await Promise.all([
    query<{ user_id: number; name: string; foto: string | null; decoration_id: string | null; shop_image: string | null }>(
      `SELECT u.user_id, u.name, u.foto, u.decoration_id, si.image_url AS shop_image
       FROM dle_users u
       LEFT JOIN shop_items si ON u.decoration_id REGEXP '^[0-9]+$' AND si.id = u.decoration_id AND si.type = 'frame'
       WHERE FIND_IN_SET(?, u.friends_temp)`,
      [String(userId)],
    ),
    query<{ user_id: number; name: string; foto: string | null; decoration_id: string | null; shop_image: string | null }>(
      `SELECT u.user_id, u.name, u.foto, u.decoration_id, si.image_url AS shop_image
       FROM dle_ignore_list i
       JOIN dle_users u ON u.name = i.user_from
       LEFT JOIN shop_items si ON u.decoration_id REGEXP '^[0-9]+$' AND si.id = u.decoration_id AND si.type = 'frame'
       WHERE i.user = ?`,
      [userId],
    ),
    query<{ id: number; title: string; message: string; created_at: string }>(
      "SELECT id, title, message, created_at FROM site_notifications WHERE user_id = ? AND type = 'friend' ORDER BY id DESC LIMIT 40",
      [userId],
    ),
  ]);
  const [friends, incoming] = await Promise.all([loadUsers(parseIds(viewer.friends)), loadUsers(parseIds(viewer.friends_temp))]);
  return {
    limit: FRIEND_LIMIT,
    friends,
    incoming,
    outgoing: outgoing.map((row) => ({ id: row.user_id, name: row.name, ...portrait(row.foto, row.decoration_id, row.shop_image) })).sort((a, b) => a.name.localeCompare(b.name, "ka")),
    blocked: blocked.map((row) => ({ id: row.user_id, name: row.name, ...portrait(row.foto, row.decoration_id, row.shop_image) })).sort((a, b) => a.name.localeCompare(b.name, "ka")),
    notices: notices.map((row) => ({ id: row.id, title: row.title, message: row.message, createdAt: row.created_at })),
  };
}

export async function suggestFriends(userId: number, term: string) {
  const q = term.trim();
  if (q.length < 1) return [];
  const like = `%${q.replace(/[%_\\]/g, (char) => `\\${char}`)}%`;
  const rows = await query<{ user_id: number; name: string; foto: string | null; decoration_id: string | null; shop_image: string | null }>(
    `SELECT u.user_id, u.name, u.foto, u.decoration_id, si.image_url AS shop_image
     FROM dle_users u
     LEFT JOIN shop_items si ON u.decoration_id REGEXP '^[0-9]+$' AND si.id = u.decoration_id AND si.type = 'frame'
     WHERE u.user_id <> ? AND u.name LIKE ? ORDER BY u.name LIMIT 8`,
    [userId, like],
  );
  return rows.map((row) => ({ id: row.user_id, name: row.name, ...portrait(row.foto, row.decoration_id, row.shop_image) }));
}

async function pair(userId: number, otherId: number) {
  const [viewer, other] = await Promise.all([me(userId), me(otherId)]);
  if (!viewer || !other || viewer.user_id === other.user_id) return null;
  return { viewer, other };
}

export async function sendRequest(userId: number, name: string) {
  const handle = name.trim();
  const [other] = await query<UserBits>("SELECT user_id, name, foto, friends, friends_temp FROM dle_users WHERE name = ? LIMIT 1", [handle]);
  if (!other) return { error: "მომხმარებელი ვერ მოიძებნა" };
  if (other.user_id === userId) return { error: "საკუთარ თავს ვერ დაამატებ" };
  const viewer = await me(userId);
  if (!viewer) return { error: "შესვლა სჭირდება" };
  const block = await blockedEither(viewer.user_id, viewer.name, other.user_id, other.name);
  if (block.byMe || block.byThem) return { error: "ამ მომხმარებელთან მოთხოვნა ვერ გაიგზავნება" };
  if (parseIds(viewer.friends).includes(other.user_id)) return { error: "უკვე მეგობრები ხართ" };
  if (parseIds(viewer.friends_temp).includes(other.user_id)) {
    return acceptRequest(userId, other.user_id);
  }
  if (parseIds(other.friends_temp).includes(userId)) return { error: "მოთხოვნა უკვე გაგზავნილია" };
  if (parseIds(viewer.friends).length >= FRIEND_LIMIT || parseIds(other.friends).length >= FRIEND_LIMIT) return { error: "მეგობრების ლიმიტი 250-ია" };
  await setColumn(other.user_id, "friends_temp", [...parseIds(other.friends_temp), userId]);
  await notify(other.user_id, "მეგობრობის მოთხოვნა", `${viewer.name} მეგობრობას გთხოვს`);
  return { ok: true };
}

export async function acceptRequest(userId: number, otherId: number) {
  const found = await pair(userId, otherId);
  if (!found) return { error: "მოთხოვნა ვერ მოიძებნა" };
  const { viewer, other } = found;
  if (!parseIds(viewer.friends_temp).includes(other.user_id)) return { error: "მოთხოვნა ვერ მოიძებნა" };
  const mine = parseIds(viewer.friends);
  const theirs = parseIds(other.friends);
  if (mine.length >= FRIEND_LIMIT || theirs.length >= FRIEND_LIMIT) return { error: "მეგობრების ლიმიტი 250-ია" };
  await setColumn(viewer.user_id, "friends_temp", parseIds(viewer.friends_temp).filter((id) => id !== other.user_id));
  await setColumn(other.user_id, "friends_temp", parseIds(other.friends_temp).filter((id) => id !== viewer.user_id));
  await setColumn(viewer.user_id, "friends", [...mine, other.user_id]);
  await setColumn(other.user_id, "friends", [...theirs, viewer.user_id]);
  const stamp = String(Math.floor(Date.now() / 1000));
  await execute("INSERT INTO dle_friends (user, friend, date) VALUES (?, ?, ?), (?, ?, ?)", [viewer.name, other.name, stamp, other.name, viewer.name, stamp]);
  await notify(other.user_id, "მეგობრობა დადასტურდა", `${viewer.name} მეგობრობა დაადასტურა`);
  const { awardFriend } = await import("@/lib/xp");
  await awardFriend(viewer.user_id, other.user_id);
  return { ok: true };
}

export async function declineRequest(userId: number, otherId: number) {
  const viewer = await me(userId);
  if (!viewer) return { error: "მოთხოვნა ვერ მოიძებნა" };
  await setColumn(viewer.user_id, "friends_temp", parseIds(viewer.friends_temp).filter((id) => id !== otherId));
  return { ok: true };
}

export async function cancelRequest(userId: number, otherId: number) {
  const other = await me(otherId);
  if (!other) return { error: "მოთხოვნა ვერ მოიძებნა" };
  await setColumn(other.user_id, "friends_temp", parseIds(other.friends_temp).filter((id) => id !== userId));
  return { ok: true };
}

export async function removeFriend(userId: number, otherId: number) {
  const found = await pair(userId, otherId);
  if (!found) return { error: "მეგობარი ვერ მოიძებნა" };
  const { viewer, other } = found;
  await setColumn(viewer.user_id, "friends", parseIds(viewer.friends).filter((id) => id !== other.user_id));
  await setColumn(other.user_id, "friends", parseIds(other.friends).filter((id) => id !== viewer.user_id));
  await execute("DELETE FROM dle_friends WHERE (user = ? AND friend = ?) OR (user = ? AND friend = ?)", [viewer.name, other.name, other.name, viewer.name]);
  return { ok: true };
}

export async function blockUser(userId: number, otherId: number) {
  const found = await pair(userId, otherId);
  if (!found) return { error: "მომხმარებელი ვერ მოიძებნა" };
  await removeFriend(userId, otherId);
  await declineRequest(userId, otherId);
  await cancelRequest(userId, otherId);
  const { viewer, other } = found;
  const existing = await blockedEither(viewer.user_id, viewer.name, other.user_id, other.name);
  if (!existing.byMe) await execute("INSERT INTO dle_ignore_list (user, user_from) VALUES (?, ?)", [viewer.user_id, other.name]);
  return { ok: true };
}

export async function unblockUser(userId: number, otherId: number) {
  const other = await me(otherId);
  if (!other) return { error: "მომხმარებელი ვერ მოიძებნა" };
  await execute("DELETE FROM dle_ignore_list WHERE user = ? AND user_from = ?", [userId, other.name]);
  return { ok: true };
}

export async function markFriendNotices(userId: number) {
  await execute("UPDATE site_notifications SET is_read = 1, is_visited = 1 WHERE user_id = ? AND type = 'friend' AND is_read = 0", [userId]);
}
