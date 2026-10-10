import "server-only";
import { execute, query } from "@/lib/db";
import { parseXFields } from "@/lib/dle";
import { parsePrefs } from "@/lib/settings-model";

export type Notice = {
  id: number;
  type: string;
  title: string;
  message: string;
  link?: string;
  icon?: string;
  visited: boolean;
  read: boolean;
  createdAt: string;
};

export async function listNotifications(userId: number) {
  const [rows, counts] = await Promise.all([
    query<{ id: number; type: string; title: string; message: string; link: string | null; icon: string | null; is_visited: number; is_read: number; created_at: string }>(
      "SELECT id, type, title, message, link, icon, is_visited, is_read, created_at FROM site_notifications WHERE user_id = ? ORDER BY id DESC LIMIT 120",
      [userId],
    ),
    query<{ n: number }>("SELECT COUNT(*) AS n FROM site_notifications WHERE user_id = ? AND is_read = 0", [userId]),
  ]);
  return {
    count: Number(counts[0]?.n) || 0,
    items: rows.map((row) => ({
      id: row.id,
      type: row.type || "system",
      title: row.title,
      message: row.message,
      link: row.link || undefined,
      icon: row.icon || undefined,
      visited: row.is_visited === 1,
      read: row.is_read === 1,
      createdAt: row.created_at,
    })) satisfies Notice[],
  };
}

export async function markNotificationsRead(userId: number, types?: string[]) {
  const allowed = (types ?? []).filter((type) => ["anime", "friend", "comment", "community", "system"].includes(type));
  if (!allowed.length) {
    await execute("UPDATE site_notifications SET is_read = 1, is_visited = 1 WHERE user_id = ? AND is_read = 0", [userId]);
    return;
  }
  await execute(`UPDATE site_notifications SET is_read = 1, is_visited = 1 WHERE user_id = ? AND is_read = 0 AND type IN (${allowed.map(() => "?").join(",")})`, [userId, ...allowed]);
}

export async function deleteNotifications(userId: number, ids: number[]) {
  const clean = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))].slice(0, 100);
  if (!clean.length) return;
  await execute(`DELETE FROM site_notifications WHERE user_id = ? AND id IN (${clean.map(() => "?").join(",")})`, [userId, ...clean]);
}

export async function visitNotification(userId: number, id: number) {
  await execute("UPDATE site_notifications SET is_visited = 1, is_read = 1 WHERE id = ? AND user_id = ?", [id, userId]);
}

export async function notifyUsers(userIds: number[], note: { title: string; message: string; link: string; icon?: string }) {
  const ids = [...new Set(userIds.filter((id) => Number.isInteger(id) && id > 0))];
  if (!ids.length) return;
  const title = note.title.slice(0, 255);
  const message = note.message.slice(0, 1000);
  const link = note.link.slice(0, 255);
  const icon = note.icon?.slice(0, 255) ?? null;
  for (let index = 0; index < ids.length; index += 200) {
    const chunk = ids.slice(index, index + 200);
    const values = chunk.map(() => "(?, 'anime', ?, ?, ?, 0, ?, 0, NOW(), NOW())").join(",");
    const params = chunk.flatMap((id) => [id, title, message, link, icon]);
    await execute(`INSERT INTO site_notifications (user_id, type, title, message, link, is_read, icon, is_visited, created_at, date) VALUES ${values}`, params);
  }
}

export async function notifyFavorites(postId: number, exceptUserId: number, note: { title: string; message: string; link: string; icon?: string }) {
  const users = await query<{ user_id: number; xfields: string }>("SELECT user_id, xfields FROM dle_users WHERE user_id <> ? AND FIND_IN_SET(?, favorites)", [exceptUserId, String(postId)]);
  const ids = users.filter((user) => parsePrefs(parseXFields(user.xfields).ab).news !== false).map((user) => user.user_id);
  await notifyUsers(ids, note);
}
