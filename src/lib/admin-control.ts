import "server-only";
import bcrypt from "bcryptjs";
import { clearCatalogCache } from "@/lib/catalog";
import { avatarUrl, escapeHtml, htmlToText } from "@/lib/dle";
import { deleteCommunityPost, deleteCommunityReply, pinCommunityPost, updateCommunityPost } from "@/lib/community";
import { visibleBody } from "@/lib/community-body";
import { execute, query } from "@/lib/db";

const TYPE = new Set([10, 11, 12, 44, 45, 47, 48, 49, 51, 52]);

export type AdminUser = { id: number; name: string; email: string; group: number; groupName: string; banned: boolean; avatar: string; joined: string };
export type AdminGroup = { id: number; name: string };
export type AdminComment = { id: number; author: string; anime: string; postId: number; slug: string; text: string; visible: boolean; pinned: boolean; at: string };
export type AdminCommunity = { id: number; author: string; title: string; category: string; pinned: boolean; body: string; at: string; replyCount: number; messages: { id: number; author: string; body: string }[] };
export type AdminRoom = { code: string; host: string; title: string; slug: string; episode: number; visibility: string; closed: boolean; at: string };
export type AdminFolder = { id: number; name: string; owner: string; description: string; visibility: string; count: number; at: string };
export type AdminGenre = { id: number; name: string; count: number };

function like(term: string) {
  return `%${term.trim()}%`;
}

export async function controlCounts() {
  const [users] = await query<{ total: number }>("SELECT COUNT(*) total FROM dle_users");
  const [comments] = await query<{ total: number }>("SELECT COUNT(*) total FROM dle_comments");
  const safe = async (sql: string) => {
    try {
      const [row] = await query<{ total: number }>(sql);
      return Number(row?.total) || 0;
    } catch {
      return 0;
    }
  };
  const [community, rooms, folders] = await Promise.all([
    safe("SELECT COUNT(*) total FROM site_community_posts"),
    safe("SELECT COUNT(*) total FROM site_rooms WHERE closed_at IS NULL"),
    safe("SELECT COUNT(*) total FROM site_folders"),
  ]);
  return { users: Number(users?.total) || 0, comments: Number(comments?.total) || 0, community, rooms, folders };
}

export async function listGroups(): Promise<AdminGroup[]> {
  const rows = await query<{ id: number; group_name: string }>("SELECT id, group_name FROM dle_usergroups ORDER BY id");
  return rows.filter((row) => row.id !== 5).map((row) => ({ id: row.id, name: row.group_name }));
}

export async function readAdminUser(id: number) {
  const [row] = await query<{ user_id: number; name: string; email: string; user_group: number; banned: string }>(
    "SELECT user_id, name, email, user_group, banned FROM dle_users WHERE user_id = ? LIMIT 1",
    [id],
  );
  if (!row) return null;
  return { id: row.user_id, name: row.name, email: row.email, group: row.user_group, banned: row.banned === "yes" };
}

export async function saveAdminUser(actorId: number, input: { id: number; name: string; email: string; password: string; group: number; banned: boolean }) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (name.length < 3 || name.length > 40 || /[<>"'&\\/]/.test(name)) return { error: "სახელი 3–40 სიმბოლო უნდა იყოს, სპეცსიმბოლოების გარეშე." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 50) return { error: "შეიყვანე სწორი ელფოსტა." };
  if (input.password && input.password.length < 8) return { error: "პაროლი მინიმუმ 8 სიმბოლო უნდა იყოს." };
  if (!input.id && input.password.length < 8) return { error: "პაროლი მინიმუმ 8 სიმბოლო უნდა იყოს." };
  const taken = await query<{ user_id: number; email: string }>("SELECT user_id, email FROM dle_users WHERE (name = ? OR email = ?) AND user_id <> ? LIMIT 1", [name, email, input.id]);
  if (taken.length) return { error: taken[0].email.toLowerCase() === email ? "ეს ელფოსტა უკვე რეგისტრირებულია." : "ეს სახელი უკვე დაკავებულია." };
  const [group] = await query<{ id: number }>("SELECT id FROM dle_usergroups WHERE id = ? AND id <> 5 LIMIT 1", [input.group]);
  const groupId = group?.id ?? 4;
  const hash = input.password ? (await bcrypt.hash(input.password, 10)).replace(/^\$2b\$/, "$2y$") : "";
  const self = input.id > 0 && input.id === actorId;
  if (!input.id) {
    const now = String(Math.floor(Date.now() / 1000));
    const created = await execute(
      `INSERT INTO dle_users (name, email, password, user_group, reg_date, lastdate, logged_ip, banned, info, signature, favorites, xfields, mylists, favFilms, favWillLook, favFindWeb, favWatched, gender, friends, friends_temp, user_balance)
       VALUES (?, ?, ?, ?, ?, ?, '', ?, '', '', '', '', '', '', '', '', '', '', '', '', 0)`,
      [name, email, hash, groupId, now, now, input.banned ? "yes" : ""],
    );
    return { id: created.insertId };
  }
  const [existing] = await query<{ user_id: number }>("SELECT user_id FROM dle_users WHERE user_id = ? LIMIT 1", [input.id]);
  if (!existing) return { error: "მომხმარებელი ვერ მოიძებნა." };
  if (hash) await execute("UPDATE dle_users SET name = ?, email = ?, password = ? WHERE user_id = ?", [name, email, hash, input.id]);
  else await execute("UPDATE dle_users SET name = ?, email = ? WHERE user_id = ?", [name, email, input.id]);
  if (!self) await execute("UPDATE dle_users SET user_group = ?, banned = ? WHERE user_id = ?", [groupId, input.banned ? "yes" : "", input.id]);
  return { id: input.id, password: self ? hash : "" };
}

export async function adminUserStats() {
  const [row] = await query<{ total: number; active: number; admins: number }>(
    "SELECT COUNT(*) total, SUM(IFNULL(banned, '') <> 'yes') active, SUM(user_group = 1) admins FROM dle_users",
  );
  return { total: Number(row?.total) || 0, active: Number(row?.active) || 0, admins: Number(row?.admins) || 0 };
}

export async function listAdminUsers(term: string, groupId = 0, status = ""): Promise<AdminUser[]> {
  const q = term.trim();
  const parts: string[] = [];
  const params: unknown[] = [];
  if (q) {
    parts.push("(u.name LIKE ? OR u.email LIKE ?)");
    params.push(like(q), like(q));
  }
  if (groupId > 0) {
    parts.push("u.user_group = ?");
    params.push(groupId);
  }
  if (status === "active") parts.push("IFNULL(u.banned, '') <> 'yes'");
  if (status === "banned") parts.push("u.banned = 'yes'");
  const where = parts.length ? `WHERE ${parts.join(" AND ")}` : "";
  const rows = await query<{ user_id: number; name: string; email: string; user_group: number; group_name: string | null; banned: string; foto: string | null; reg_date: string }>(
    `SELECT u.user_id, u.name, u.email, u.user_group, g.group_name, u.banned, u.foto, u.reg_date
     FROM dle_users u LEFT JOIN dle_usergroups g ON g.id = u.user_group
     ${where} ORDER BY u.user_id DESC LIMIT 40`,
    params,
  );
  return rows.map((row) => {
    const date = new Date(Number(row.reg_date) * 1000);
    return {
      id: row.user_id,
      name: row.name,
      email: row.email,
      group: row.user_group,
      groupName: row.group_name ?? "",
      banned: row.banned === "yes",
      avatar: avatarUrl(row.foto) ?? "",
      joined: Number.isFinite(date.getTime()) ? date.toLocaleDateString("ka-GE") : "",
    };
  });
}

export async function setUserBanned(id: number, banned: boolean, actorId: number) {
  if (!Number.isInteger(id) || id <= 0 || id === actorId) return;
  await execute("UPDATE dle_users SET banned = ? WHERE user_id = ?", [banned ? "yes" : "", id]);
}

export async function setUserGroup(id: number, groupId: number, actorId: number) {
  if (!Number.isInteger(id) || id <= 0 || id === actorId) return;
  const [group] = await query<{ id: number }>("SELECT id FROM dle_usergroups WHERE id = ? LIMIT 1", [groupId]);
  if (!group) return;
  await execute("UPDATE dle_users SET user_group = ? WHERE user_id = ?", [groupId, id]);
}

export async function listAdminComments(term: string, status = "") {
  const q = term.trim();
  const parts: string[] = [];
  const params: unknown[] = [];
  if (q) {
    parts.push("(c.autor LIKE ? OR c.text LIKE ? OR p.title LIKE ?)");
    params.push(like(q), like(q), like(q));
  }
  if (status === "visible") parts.push("c.approve = 1");
  if (status === "hidden") parts.push("c.approve <> 1");
  if (status === "pinned") parts.push("c.is_pinned = 1");
  const where = parts.length ? `WHERE ${parts.join(" AND ")}` : "";
  const [rows, stats] = await Promise.all([
    query<{ id: number; autor: string; post_id: number | null; title: string | null; slug: string | null; text: string; approve: number; is_pinned: number; date: string }>(
      `SELECT c.id, c.autor, c.post_id, p.title, p.alt_name slug, c.text, c.approve, c.is_pinned, c.date
       FROM dle_comments c LEFT JOIN dle_post p ON p.id = c.post_id
       ${where} ORDER BY c.id DESC LIMIT 40`,
      params,
    ),
    query<{ total: number; hidden: number; pinned: number }>("SELECT COUNT(*) total, SUM(approve <> 1) hidden, SUM(is_pinned = 1) pinned FROM dle_comments"),
  ]);
  const tally = stats[0];
  return {
    total: Number(tally?.total) || 0,
    hidden: Number(tally?.hidden) || 0,
    pinned: Number(tally?.pinned) || 0,
    rows: rows.map((row) => {
      const date = new Date(String(row.date).replace(" ", "T"));
      return {
        id: row.id,
        author: row.autor,
        anime: row.title ?? "",
        postId: Number(row.post_id) || 0,
        slug: row.slug ?? "",
        text: htmlToText(row.text).slice(0, 2000),
        visible: row.approve === 1,
        pinned: !!row.is_pinned,
        at: Number.isFinite(date.getTime()) ? date.toLocaleString("ka-GE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "",
      };
    }),
  };
}

export async function updateAdminComment(id: number, text: string) {
  if (!Number.isInteger(id) || id <= 0) return;
  const clean = text.trim().slice(0, 2000);
  if (!clean) return;
  await execute("UPDATE dle_comments SET text = ? WHERE id = ?", [escapeHtml(clean).replace(/\r?\n/g, "<br>"), id]);
}

export async function setCommentVisible(id: number, visible: boolean) {
  if (!Number.isInteger(id) || id <= 0) return;
  await execute("UPDATE dle_comments SET approve = ? WHERE id = ?", [visible ? 1 : 0, id]);
}

export async function setCommentPinned(id: number, pinned: boolean) {
  if (!Number.isInteger(id) || id <= 0) return;
  await execute("UPDATE dle_comments SET is_pinned = ? WHERE id = ?", [pinned ? 1 : 0, id]);
}

export async function deleteAdminComment(id: number) {
  if (!Number.isInteger(id) || id <= 0) return;
  await execute("DELETE FROM dle_comments WHERE parent = ?", [id]);
  await execute("DELETE FROM dle_comments WHERE id = ?", [id]);
}

export async function listAdminCommunity(term: string, category = "", pinnedOnly = false) {
  const q = term.trim();
  try {
    const parts: string[] = [];
    const params: unknown[] = [];
    if (q) {
      parts.push("(p.title LIKE ? OR u.name LIKE ?)");
      params.push(like(q), like(q));
    }
    if (category) {
      parts.push("p.category = ?");
      params.push(category);
    }
    if (pinnedOnly) parts.push("p.pinned = 1");
    const where = parts.length ? `WHERE ${parts.join(" AND ")}` : "";
    const [rows, stats] = await Promise.all([
      query<{ id: number; title: string; category: string; pinned: number; body: string; created_at: string; name: string | null; replies: number }>(
        `SELECT p.id, p.title, p.category, p.pinned, p.body, p.created_at, u.name,
          (SELECT COUNT(*) FROM site_community_replies r WHERE r.post_id = p.id) replies
         FROM site_community_posts p LEFT JOIN dle_users u ON u.user_id = p.user_id
         ${where} ORDER BY p.id DESC LIMIT 40`,
        params,
      ),
      query<{ total: number; pinned: number }>("SELECT COUNT(*) total, SUM(pinned = 1) pinned FROM site_community_posts"),
    ]);
    const ids = rows.map((row) => row.id);
    const messages = ids.length
      ? await query<{ id: number; post_id: number; body: string; name: string | null }>(
        `SELECT r.id, r.post_id, r.body, u.name FROM site_community_replies r LEFT JOIN dle_users u ON u.user_id = r.user_id WHERE r.post_id IN (${ids.map(() => "?").join(",")}) ORDER BY r.id DESC`,
        ids,
      )
      : [];
    const tally = stats[0];
    return {
      total: Number(tally?.total) || 0,
      pinned: Number(tally?.pinned) || 0,
      rows: rows.map((row) => {
        const date = new Date(String(row.created_at).replace(" ", "T"));
        return {
          id: row.id,
          author: row.name ?? "",
          title: row.title,
          category: row.category,
          pinned: !!row.pinned,
          body: visibleBody(row.body).slice(0, 4000),
          at: Number.isFinite(date.getTime()) ? date.toLocaleString("ka-GE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "",
          replyCount: Number(row.replies) || 0,
          messages: messages.filter((item) => item.post_id === row.id).slice(0, 8).map((item) => ({ id: item.id, author: item.name ?? "", body: item.body.trim().slice(0, 300) })),
        };
      }),
    };
  } catch {
    return { total: 0, pinned: 0, rows: [] };
  }
}

export async function toggleAdminCommunityPin(id: number) {
  if (!Number.isInteger(id) || id <= 0) return;
  await pinCommunityPost(id);
}

export async function removeAdminCommunity(id: number) {
  if (!Number.isInteger(id) || id <= 0) return;
  await deleteCommunityPost(id);
}

export async function saveAdminCommunity(id: number, title: string, category: string, text: string) {
  await updateCommunityPost(id, title, category, text);
}

export async function removeAdminCommunityReply(id: number) {
  await deleteCommunityReply(id);
}

export async function listAdminRooms(term = "", status = "") {
  const q = term.trim();
  try {
    const parts: string[] = [];
    const params: unknown[] = [];
    if (q) {
      parts.push("(r.title LIKE ? OR u.name LIKE ? OR r.code LIKE ?)");
      params.push(like(q), like(q), like(q));
    }
    if (status === "open") parts.push("r.closed_at IS NULL");
    if (status === "closed") parts.push("r.closed_at IS NOT NULL");
    const where = parts.length ? `WHERE ${parts.join(" AND ")}` : "";
    const [rows, stats] = await Promise.all([
      query<{ code: string; title: string; slug: string; episode: number; visibility: string; closed_at: string | null; updated_at: string; name: string | null }>(
        `SELECT r.code, r.title, r.slug, r.episode, r.visibility, r.closed_at, r.updated_at, u.name
         FROM site_rooms r LEFT JOIN dle_users u ON u.user_id = r.host_id
         ${where} ORDER BY r.updated_at DESC LIMIT 40`,
        params,
      ),
      query<{ total: number; open: number }>("SELECT COUNT(*) total, SUM(closed_at IS NULL) open FROM site_rooms"),
    ]);
    const tally = stats[0];
    return {
      total: Number(tally?.total) || 0,
      open: Number(tally?.open) || 0,
      rows: rows.map((row) => {
        const date = new Date(String(row.updated_at).replace(" ", "T"));
        return {
          code: row.code,
          host: row.name ?? "",
          title: row.title,
          slug: row.slug,
          episode: row.episode,
          visibility: row.visibility === "link" || row.visibility === "friends" ? row.visibility : "public",
          closed: !!row.closed_at,
          at: Number.isFinite(date.getTime()) ? date.toLocaleString("ka-GE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "",
        };
      }),
    };
  } catch {
    return { total: 0, open: 0, rows: [] };
  }
}

export async function saveAdminRoom(code: string, title: string, visibility: string) {
  const room = code.trim();
  if (!/^[a-zA-Z0-9]{4,16}$/.test(room)) return;
  const name = title.trim().slice(0, 255);
  if (!name) return;
  const access = visibility === "link" || visibility === "friends" ? visibility : "public";
  await execute("UPDATE site_rooms SET title = ?, visibility = ?, updated_at = NOW() WHERE code = ?", [name, access, room]);
}

export async function closeAdminRoom(code: string) {
  const room = code.trim();
  if (!/^[a-zA-Z0-9]{4,16}$/.test(room)) return;
  await execute("UPDATE site_rooms SET closed_at = NOW(), updated_at = NOW() WHERE code = ? AND closed_at IS NULL", [room]);
}

export async function listAdminFolders(term: string, visibility = "") {
  const q = term.trim();
  try {
    const parts: string[] = [];
    const params: unknown[] = [];
    if (q) {
      parts.push("(f.name LIKE ? OR u.name LIKE ?)");
      params.push(like(q), like(q));
    }
    if (visibility === "public" || visibility === "unlisted" || visibility === "private") {
      parts.push("f.visibility = ?");
      params.push(visibility);
    }
    const where = parts.length ? `WHERE ${parts.join(" AND ")}` : "";
    const [rows, stats] = await Promise.all([
      query<{ id: number; name: string; description: string; visibility: string; updated_at: string; owner: string | null; count: number }>(
        `SELECT f.id, f.name, f.description, f.visibility, f.updated_at, u.name owner, COUNT(i.post_id) count
         FROM site_folders f LEFT JOIN dle_users u ON u.user_id = f.user_id
         LEFT JOIN site_folder_items i ON i.folder_id = f.id
         ${where} GROUP BY f.id, f.name, f.description, f.visibility, f.updated_at, u.name
         ORDER BY f.id DESC LIMIT 40`,
        params,
      ),
      query<{ total: number; public: number; private: number }>("SELECT COUNT(*) total, SUM(visibility = 'public') public, SUM(visibility = 'private') private FROM site_folders"),
    ]);
    const tally = stats[0];
    return {
      total: Number(tally?.total) || 0,
      public: Number(tally?.public) || 0,
      private: Number(tally?.private) || 0,
      rows: rows.map((row) => {
        const date = new Date(String(row.updated_at).replace(" ", "T"));
        return {
          id: row.id,
          name: row.name,
          owner: row.owner ?? "",
          description: row.description.trim().slice(0, 160),
          visibility: row.visibility === "unlisted" || row.visibility === "private" ? row.visibility : "public",
          count: Number(row.count) || 0,
          at: Number.isFinite(date.getTime()) ? date.toLocaleString("ka-GE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "",
        };
      }),
    };
  } catch {
    return { total: 0, public: 0, private: 0, rows: [] };
  }
}

export async function saveAdminFolder(id: number, name: string, description: string) {
  if (!Number.isInteger(id) || id <= 0) return;
  const clean = name.trim().slice(0, 60);
  if (!clean) return;
  await execute("UPDATE site_folders SET name = ?, description = ? WHERE id = ?", [clean, description.trim().slice(0, 500), id]);
}

export async function setFolderVisibility(id: number, visibility: string) {
  if (!Number.isInteger(id) || id <= 0) return;
  if (visibility !== "public" && visibility !== "unlisted" && visibility !== "private") return;
  await execute("UPDATE site_folders SET visibility = ? WHERE id = ?", [visibility, id]);
}

export async function deleteAdminFolder(id: number) {
  if (!Number.isInteger(id) || id <= 0) return;
  await execute("DELETE FROM site_folder_items WHERE folder_id = ?", [id]);
  await execute("DELETE FROM site_folders WHERE id = ?", [id]);
}

export async function listAdminGenres(): Promise<AdminGenre[]> {
  const rows = await query<{ id: number; name: string; total: number }>(
    `SELECT c.id, c.name, COUNT(p.id) total
     FROM dle_category c
     LEFT JOIN dle_post p ON FIND_IN_SET(c.id, p.category)
     GROUP BY c.id, c.name
     ORDER BY c.name`,
  );
  return rows.filter((row) => !TYPE.has(row.id)).map((row) => ({ id: row.id, name: row.name, count: Number(row.total) || 0 }));
}

export async function renameAdminGenre(id: number, name: string) {
  if (!Number.isInteger(id) || TYPE.has(id)) return;
  const clean = name.trim().slice(0, 50);
  if (!clean) return;
  await execute("UPDATE dle_category SET name = ? WHERE id = ?", [clean, id]);
  clearCatalogCache();
}

export async function addAdminGenre(name: string) {
  const clean = name.trim().slice(0, 50);
  if (clean.length < 2) return "სახელი მინიმუმ 2 სიმბოლო უნდა იყოს.";
  const [taken] = await query<{ id: number }>("SELECT id FROM dle_category WHERE name = ? LIMIT 1", [clean]);
  if (taken) return "ასეთი ჟანრი უკვე არის.";
  const alt = `g${Date.now().toString(36)}`.slice(0, 50);
  await execute(
    `INSERT INTO dle_category (parentid, posi, name, alt_name, icon, skin, descr, keywords, news_sort, news_msort, news_number, short_tpl, full_tpl, metatitle, show_sub, allow_rss, fulldescr, disable_search, disable_main, disable_rating, disable_comments, enable_dzen, enable_turbo, active, rating_type, schema_org)
     VALUES (0, 1, ?, ?, '', '', '', '', '', '', 0, '', '', '', 0, 1, '', 0, 0, 0, 0, 1, 1, 1, -1, '1')`,
    [clean, alt],
  );
  clearCatalogCache();
  return "";
}

export async function deleteAdminGenre(id: number) {
  if (!Number.isInteger(id) || id <= 0 || TYPE.has(id)) return "ამ ჟანრს ვერ წაშლი.";
  const [row] = await query<{ id: number }>("SELECT id FROM dle_category WHERE id = ? LIMIT 1", [id]);
  if (!row) return "ჟანრი ვერ მოიძებნა.";
  await execute(
    "UPDATE dle_post SET category = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', category, ','), CONCAT(',', ?, ','), ',')) WHERE FIND_IN_SET(?, category)",
    [String(id), String(id)],
  );
  await execute("DELETE FROM dle_category WHERE id = ?", [id]);
  clearCatalogCache();
  return "";
}

export async function deleteAdminUser(actorId: number, id: number) {
  if (!Number.isInteger(id) || id <= 0) return "მომხმარებელი ვერ მოიძებნა.";
  if (id === actorId) return "საკუთარ ანგარიშს ვერ წაშლი.";
  const [row] = await query<{ name: string }>("SELECT name FROM dle_users WHERE user_id = ? LIMIT 1", [id]);
  if (!row) return "მომხმარებელი ვერ მოიძებნა.";
  try {
    const folders = await query<{ id: number }>("SELECT id FROM site_folders WHERE user_id = ?", [id]);
    for (const folder of folders) await execute("DELETE FROM site_folder_items WHERE folder_id = ?", [folder.id]);
  } catch { /* საქაღალდე შეიძლება არ იყოს */ }
  const optional = [
    "DELETE FROM site_folders WHERE user_id = ?",
    "DELETE FROM site_coins WHERE user_id = ?",
    "DELETE FROM site_coin_ledger WHERE user_id = ?",
    "DELETE FROM site_xp_events WHERE user_id = ?",
    "DELETE FROM site_resets WHERE user_id = ?",
    "DELETE FROM site_shop_owned WHERE user_id = ?",
    "DELETE FROM site_watch_credit WHERE user_id = ?",
    "DELETE FROM site_notifications WHERE user_id = ?",
    "DELETE FROM dle_watch_history WHERE user_id = ?",
    "DELETE FROM dle_mylists_entries WHERE user_id = ?",
    "UPDATE site_rooms SET closed_at = NOW() WHERE host_id = ? AND closed_at IS NULL",
  ];
  for (const sql of optional) {
    try { await execute(sql, [id]); } catch { /* ცხრილი შეიძლება არ იყოს */ }
  }
  await execute("DELETE FROM dle_users WHERE user_id = ?", [id]);
  return "";
}
