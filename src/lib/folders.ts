import "server-only";
import { execute, query } from "@/lib/db";
import { absUrl, htmlToText, parseEpisodes, parseXFields, portrait } from "@/lib/dle";

export type FolderVisibility = "public" | "unlisted" | "private";
export type FolderSort = "manual" | "title" | "year" | "score";

export type FolderCard = {
  id: number;
  name: string;
  description: string;
  visibility: FolderVisibility;
  pinned: boolean;
  sort: FolderSort;
  views: number;
  shares: number;
  adult: boolean;
  updatedAt: string;
  createdAt: string;
  count: number;
  covers: string[];
};

export type FolderAnime = {
  id: number;
  slug: string;
  title: string;
  poster?: string;
  year?: string;
  format?: string;
  score?: number;
  episodes?: string;
  description: string;
};

export type FolderDetail = FolderCard & {
  mine: boolean;
  owner: { name: string; avatar?: string; frame?: string };
  items: FolderAnime[];
};

type FolderRow = {
  id: number;
  user_id: number;
  name: string;
  description: string;
  visibility: FolderVisibility;
  pinned: number;
  sort_mode: FolderSort;
  views: number;
  shares: number;
  adult: number;
  created_at: string;
  updated_at: string;
  count: number;
};

let ready: Promise<void> | null = null;

function ensure() {
  ready ??= (async () => {
    await execute(`CREATE TABLE IF NOT EXISTS site_folders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(40) NOT NULL,
      description VARCHAR(240) NOT NULL DEFAULT '',
      visibility VARCHAR(12) NOT NULL DEFAULT 'public',
      pinned TINYINT NOT NULL DEFAULT 0,
      sort_mode VARCHAR(12) NOT NULL DEFAULT 'manual',
      views INT NOT NULL DEFAULT 0,
      shares INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX (user_id)
    )`);
    await execute(`CREATE TABLE IF NOT EXISTS site_folder_items (
      folder_id INT NOT NULL,
      post_id INT NOT NULL,
      position INT NOT NULL DEFAULT 0,
      added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (folder_id, post_id),
      INDEX (post_id)
    )`);
    const columns = await query<{ Field: string }>("SHOW COLUMNS FROM site_folders");
    const names = new Set(columns.map((column) => column.Field));
    if (!names.has("adult")) await execute("ALTER TABLE site_folders ADD COLUMN adult TINYINT NOT NULL DEFAULT 0");
    await execute("ALTER TABLE site_folders MODIFY name VARCHAR(60) NOT NULL, MODIFY description VARCHAR(500) NOT NULL DEFAULT ''");
  })();
  return ready;
}

function card(row: FolderRow, covers: string[]): FolderCard {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    visibility: row.visibility === "private" || row.visibility === "unlisted" ? row.visibility : "public",
    pinned: Boolean(row.pinned),
    sort: row.sort_mode === "title" || row.sort_mode === "year" || row.sort_mode === "score" ? row.sort_mode : "manual",
    views: Number(row.views) || 0,
    shares: Number(row.shares) || 0,
    adult: Boolean(row.adult),
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    count: Number(row.count) || 0,
    covers,
  };
}

async function coversOf(ids: number[]) {
  const map = new Map<number, string[]>();
  if (!ids.length) return map;
  const rows = await query<{ folder_id: number; xfields: string }>(
    `SELECT i.folder_id, p.xfields FROM site_folder_items i JOIN dle_post p ON p.id = i.post_id
     WHERE i.folder_id IN (${ids.map(() => "?").join(",")}) ORDER BY i.position, i.added_at`,
    ids,
  );
  for (const row of rows) {
    const list = map.get(row.folder_id) ?? [];
    if (list.length >= 4) continue;
    const poster = absUrl(parseXFields(row.xfields).image);
    if (poster) list.push(poster);
    map.set(row.folder_id, list);
  }
  return map;
}

export async function listFolders(userId: number) {
  await ensure();
  const rows = await query<FolderRow>(
    `SELECT f.*, COUNT(i.post_id) count FROM site_folders f
     LEFT JOIN site_folder_items i ON i.folder_id = f.id
     WHERE f.user_id = ? GROUP BY f.id ORDER BY f.pinned DESC, f.updated_at DESC`,
    [userId],
  );
  const covers = await coversOf(rows.map((row) => row.id));
  return rows.map((row) => card(row, covers.get(row.id) ?? []));
}

export async function foldersForPost(userId: number, postId: number) {
  await ensure();
  const rows = await query<{ id: number; name: string; has: number }>(
    `SELECT f.id, f.name, EXISTS(SELECT 1 FROM site_folder_items i WHERE i.folder_id = f.id AND i.post_id = ?) has
     FROM site_folders f WHERE f.user_id = ? ORDER BY f.name`,
    [postId, userId],
  );
  return rows.map((row) => ({ id: row.id, name: row.name, has: Boolean(row.has) }));
}

function animeOf(row: { id: number; title: string; alt_name: string; short_story: string; xfields: string; category: string }): FolderAnime {
  const fields = parseXFields(row.xfields);
  const episodes = parseEpisodes(fields);
  const [done, totalRaw] = (fields.episodenum ?? "").split("/");
  const total = Number((totalRaw ?? "").replace(/\D/g, "")) || Number((done ?? "").replace(/\D/g, "")) || episodes.length;
  const ids = row.category.split(",").map((id) => id.trim());
  const value = Number(fields.imdb);
  return {
    id: row.id,
    slug: row.alt_name,
    title: row.title,
    poster: absUrl(fields.image),
    year: fields.year,
    format: ids.includes("12") ? "ფილმი" : ids.includes("44") ? "OVA" : "სერიალი",
    score: Number.isFinite(value) && value > 0 ? value : undefined,
    episodes: total ? String(total) : undefined,
    description: htmlToText(row.short_story).replace(/\s+/g, " ").trim().slice(0, 220),
  };
}

export async function getFolder(id: number, viewerId?: number): Promise<FolderDetail | null> {
  await ensure();
  const [row] = await query<FolderRow & { owner_name: string; foto: string | null; decoration_id: string | null; shop_image: string | null }>(
    `SELECT f.*, COUNT(i.post_id) count, u.name owner_name, u.foto, u.decoration_id, ANY_VALUE(si.image_url) shop_image
     FROM site_folders f
     JOIN dle_users u ON u.user_id = f.user_id
     LEFT JOIN shop_items si ON u.decoration_id REGEXP '^[0-9]+$' AND si.id = u.decoration_id AND si.type = 'frame'
     LEFT JOIN site_folder_items i ON i.folder_id = f.id
     WHERE f.id = ? GROUP BY f.id LIMIT 1`,
    [id],
  );
  if (!row) return null;
  const mine = row.user_id === viewerId;
  if (row.visibility === "private" && !mine) return null;
  const items = await query<{ id: number; title: string; alt_name: string; short_story: string; xfields: string; category: string; position: number }>(
    `SELECT p.id, p.title, p.alt_name, p.short_story, p.xfields, p.category, i.position
     FROM site_folder_items i JOIN dle_post p ON p.id = i.post_id
     WHERE i.folder_id = ? ORDER BY i.position, i.added_at`,
    [id],
  );
  const covers = items.map((item) => absUrl(parseXFields(item.xfields).image)).filter((url): url is string => !!url).slice(0, 4);
  return { ...card(row, covers), mine, owner: { name: row.owner_name, ...portrait(row.foto, row.decoration_id, row.shop_image) }, items: items.map(animeOf) };
}

export async function createFolder(userId: number, input: { name: string; description?: string; visibility?: string; adult?: boolean; postId?: number }) {
  await ensure();
  const name = input.name.trim().slice(0, 60);
  if (name.length < 1) return null;
  const visibility = input.visibility === "private" || input.visibility === "unlisted" ? input.visibility : "public";
  const description = (input.description ?? "").trim().slice(0, 500);
  const result = await execute("INSERT INTO site_folders (user_id, name, description, visibility, adult) VALUES (?, ?, ?, ?, ?)", [userId, name, description, visibility, input.adult ? 1 : 0]);
  const id = result.insertId;
  if (input.postId) await toggleFolderItem(userId, id, input.postId, true);
  return id;
}

export async function updateFolder(userId: number, id: number, input: { name?: string; description?: string; visibility?: string; pinned?: boolean; sort?: string; adult?: boolean }) {
  await ensure();
  const [row] = await query<{ id: number }>("SELECT id FROM site_folders WHERE id = ? AND user_id = ? LIMIT 1", [id, userId]);
  if (!row) return false;
  if (input.name != null) await execute("UPDATE site_folders SET name = ? WHERE id = ?", [input.name.trim().slice(0, 60) || "სია", id]);
  if (input.description != null) await execute("UPDATE site_folders SET description = ? WHERE id = ?", [input.description.trim().slice(0, 500), id]);
  if (input.adult != null) await execute("UPDATE site_folders SET adult = ? WHERE id = ?", [input.adult ? 1 : 0, id]);
  if (input.visibility === "public" || input.visibility === "unlisted" || input.visibility === "private") await execute("UPDATE site_folders SET visibility = ? WHERE id = ?", [input.visibility, id]);
  if (input.pinned != null) await execute("UPDATE site_folders SET pinned = ? WHERE id = ?", [input.pinned ? 1 : 0, id]);
  if (input.sort === "manual" || input.sort === "title" || input.sort === "year" || input.sort === "score") await execute("UPDATE site_folders SET sort_mode = ? WHERE id = ?", [input.sort, id]);
  return true;
}

export async function deleteFolder(userId: number, id: number) {
  await ensure();
  const result = await execute("DELETE FROM site_folders WHERE id = ? AND user_id = ?", [id, userId]);
  if (!result.affectedRows) return false;
  await execute("DELETE FROM site_folder_items WHERE folder_id = ?", [id]);
  return true;
}

export async function toggleFolderItem(userId: number, folderId: number, postId: number, force?: boolean) {
  await ensure();
  const [folder] = await query<{ id: number }>("SELECT id FROM site_folders WHERE id = ? AND user_id = ? LIMIT 1", [folderId, userId]);
  if (!folder) return false;
  const [post] = await query<{ id: number }>("SELECT id FROM dle_post WHERE id = ? AND approve = 1 LIMIT 1", [postId]);
  if (!post) return false;
  const [existing] = await query<{ post_id: number }>("SELECT post_id FROM site_folder_items WHERE folder_id = ? AND post_id = ? LIMIT 1", [folderId, postId]);
  const shouldHave = force ?? !existing;
  if (shouldHave && !existing) {
    const [last] = await query<{ position: number }>("SELECT COALESCE(MAX(position), 0) position FROM site_folder_items WHERE folder_id = ?", [folderId]);
    await execute("INSERT INTO site_folder_items (folder_id, post_id, position) VALUES (?, ?, ?)", [folderId, postId, (last?.position ?? 0) + 1]);
  } else if (!shouldHave && existing) {
    await execute("DELETE FROM site_folder_items WHERE folder_id = ? AND post_id = ?", [folderId, postId]);
  }
  await execute("UPDATE site_folders SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [folderId]);
  return true;
}

export async function reorderFolder(userId: number, folderId: number, postIds: number[]) {
  await ensure();
  const [folder] = await query<{ id: number }>("SELECT id FROM site_folders WHERE id = ? AND user_id = ? LIMIT 1", [folderId, userId]);
  if (!folder) return false;
  for (let index = 0; index < postIds.length; index += 1) {
    await execute("UPDATE site_folder_items SET position = ? WHERE folder_id = ? AND post_id = ?", [index + 1, folderId, postIds[index]]);
  }
  await execute("UPDATE site_folders SET sort_mode = 'manual', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [folderId]);
  return true;
}

export async function bumpFolder(id: number, field: "views" | "shares", viewerId?: number) {
  await ensure();
  const [row] = await query<{ user_id: number; visibility: string }>("SELECT user_id, visibility FROM site_folders WHERE id = ? LIMIT 1", [id]);
  if (!row) return false;
  if (row.visibility === "private" && row.user_id !== viewerId) return false;
  await execute(`UPDATE site_folders SET ${field} = ${field} + 1 WHERE id = ?`, [id]);
  return true;
}
