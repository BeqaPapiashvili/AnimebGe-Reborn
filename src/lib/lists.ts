import "server-only";
import { execute, query } from "@/lib/db";
import { listIcon, parseMylists, serializeMylists, sortLists, type SiteList } from "@/lib/list-model";
import { awardSeries, awardListAdd } from "@/lib/xp";

export async function getLists(): Promise<SiteList[]> {
  const rows = await query<{ list_id: number; list_name: string; list_name2: string }>("SELECT list_id, list_name, list_name2 FROM dle_mylists_lists ORDER BY list_id");
  return sortLists(rows.map((row) => ({ id: row.list_id, label: row.list_name, short: row.list_name2, icon: listIcon(row.list_id) })));
}

export async function getUserListMap(userId: number) {
  const [users, entries] = await Promise.all([
    query<{ mylists: string | null }>("SELECT mylists FROM dle_users WHERE user_id = ? LIMIT 1", [userId]),
    query<{ post_id: number; list_id: number }>("SELECT post_id, list_id FROM dle_mylists_entries WHERE user_id = ?", [userId]),
  ]);
  const map = new Map<number, number>();
  for (const row of entries) map.set(row.post_id, row.list_id);
  for (const [postId, listId] of parseMylists(users[0]?.mylists)) map.set(postId, listId);
  return map;
}

export async function setUserList(userId: number, postId: number, listId: number | null) {
  if (listId != null) {
    const known = await query<{ list_id: number }>("SELECT list_id FROM dle_mylists_lists WHERE list_id = ? LIMIT 1", [listId]);
    if (!known.length) return false;
  }
  const users = await query<{ mylists: string | null }>("SELECT mylists FROM dle_users WHERE user_id = ? LIMIT 1", [userId]);
  const map = parseMylists(users[0]?.mylists);
  const added = listId != null && !map.has(postId);
  if (listId == null) map.delete(postId);
  else map.set(postId, listId);
  await execute("UPDATE dle_users SET mylists = ? WHERE user_id = ?", [serializeMylists(map), userId]);
  if (listId == null) await execute("DELETE FROM dle_mylists_entries WHERE user_id = ? AND post_id = ?", [userId, postId]);
  else {
    await execute(
      "INSERT INTO dle_mylists_entries (user_id, post_id, list_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE list_id = VALUES(list_id)",
      [userId, postId, listId],
    );
  }
  if (listId === 2) await awardSeries(userId, postId);
  if (added) await awardListAdd(userId, postId);
  return true;
}
