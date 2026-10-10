import "server-only";
import { execute, query } from "@/lib/db";

function tokens(raw?: string | null) {
  return (raw ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}

export function hasFavorite(raw: string | null | undefined, postId: number) {
  return tokens(raw).includes(String(postId));
}

export async function setFavorite(userId: number, postId: number, on: boolean) {
  const posts = await query<{ id: number }>("SELECT id FROM dle_post WHERE id = ? AND approve = 1 LIMIT 1", [postId]);
  if (!posts.length) return null;
  const [row] = await query<{ favorites: string | null }>("SELECT favorites FROM dle_users WHERE user_id = ? LIMIT 1", [userId]);
  if (!row) return null;
  const id = String(postId);
  const list = tokens(row.favorites).filter((token) => token !== id);
  if (on) list.push(id);
  await execute("UPDATE dle_users SET favorites = ? WHERE user_id = ?", [list.join(","), userId]);
  return on;
}
