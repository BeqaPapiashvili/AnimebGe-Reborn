import "server-only";
import { clearCatalogCache } from "@/lib/catalog";
import { execute, query } from "@/lib/db";
import { absUrl, parseXFields, type XFields } from "@/lib/dle";

const TYPE = new Set(["10", "11", "12", "44", "45", "47", "48", "49", "51", "52"]);
const FORMATS = new Set(["11", "12", "44"]);

export type AdminAnime = {
  id: number;
  title: string;
  slug: string;
  description: string;
  published: boolean;
  year: string;
  status: string;
  score: string;
  duration: string;
  studio: string;
  dubbers: string;
  director: string;
  romaji: string;
  japanese: string;
  poster: string;
  cover: string;
  logo: string;
  current: string;
  total: string;
  format: string;
  genres: string[];
};

export type GenreOption = { id: string; name: string };

function pack(fields: XFields) {
  return Object.entries(fields).filter(([, value]) => value !== "").map(([key, value]) => `${key}|${value}`).join("||");
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_-]+/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 180);
}

function counts(fields: XFields) {
  const [done, total] = (fields.episodenum ?? "").split("/").map((part) => part.replace(/\D/g, ""));
  return { current: fields["new-episode"] || done || "", total: total || "" };
}

export async function genres(): Promise<GenreOption[]> {
  const rows = await query<{ id: number; name: string }>("SELECT id, name FROM dle_category ORDER BY id");
  return rows.filter((row) => !TYPE.has(String(row.id))).map((row) => ({ id: String(row.id), name: row.name }));
}

export async function adminStats() {
  const [posts] = await query<{ published: number; hidden: number }>("SELECT SUM(approve = 1) published, SUM(approve = 0) hidden FROM dle_post");
  let reports = 0;
  try {
    const [row] = await query<{ total: number }>("SELECT COUNT(*) total FROM site_reports WHERE status = 'open'");
    reports = Number(row?.total) || 0;
  } catch {
    reports = 0;
  }
  return { published: Number(posts?.published) || 0, hidden: Number(posts?.hidden) || 0, reports };
}

export async function listAdminAnime(term: string, page: number, status = "") {
  const q = `%${term.trim()}%`;
  const limit = 24;
  const offset = Math.max(0, page - 1) * limit;
  const parts: string[] = [];
  const params: unknown[] = [];
  if (term.trim()) {
    parts.push("(p.title LIKE ? OR p.alt_name LIKE ?)");
    params.push(q, q);
  }
  if (status === "visible") parts.push("p.approve = 1");
  if (status === "hidden") parts.push("p.approve = 0");
  const where = parts.length ? `WHERE ${parts.join(" AND ")}` : "";
  const [count] = await query<{ total: number }>(`SELECT COUNT(*) total FROM dle_post p ${where}`, params);
  const rows = await query<{ id: number; title: string; alt_name: string; approve: number; date: string; xfields: string }>(
    `SELECT p.id, p.title, p.alt_name, p.approve, p.date, p.xfields FROM dle_post p ${where} ORDER BY p.date DESC, p.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return {
    total: Number(count?.total) || 0,
    pages: Math.max(1, Math.ceil((Number(count?.total) || 0) / limit)),
    items: rows.map((row) => {
      const fields = parseXFields(row.xfields);
      return { id: row.id, title: row.title, slug: row.alt_name, published: row.approve === 1, year: fields.year ?? "", poster: absUrl(fields.image) ?? "", date: row.date };
    }),
  };
}

export async function readAdminAnime(id: number): Promise<AdminAnime | null> {
  const [row] = await query<{ id: number; title: string; alt_name: string; short_story: string; approve: number; category: string; xfields: string }>(
    "SELECT id, title, alt_name, short_story, approve, category, xfields FROM dle_post WHERE id = ? LIMIT 1",
    [id],
  );
  if (!row) return null;
  const fields = parseXFields(row.xfields);
  const ids = row.category.split(",").map((item) => item.trim()).filter(Boolean);
  const episode = counts(fields);
  return {
    id: row.id,
    title: row.title,
    slug: row.alt_name,
    description: row.short_story.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""),
    published: row.approve === 1,
    year: fields.year ?? "",
    status: fields.statusi || fields.status || "დასრულებული",
    score: fields.imdb ?? "",
    duration: (fields.qronometraji ?? "").replace(/\D/g, ""),
    studio: fields.studio ?? "",
    dubbers: fields.gamxmovanebeli ?? "",
    director: fields.rejisori ?? "",
    romaji: fields.name ?? "",
    japanese: fields.japname ?? "",
    poster: fields.image ?? "",
    cover: fields.cover ?? "",
    logo: fields.logo ?? "",
    current: episode.current,
    total: episode.total,
    format: ids.find((item) => FORMATS.has(item)) ?? "11",
    genres: ids.filter((item) => !TYPE.has(item)),
  };
}

function blankAnime(): AdminAnime {
  return { id: 0, title: "", slug: "", description: "", published: true, year: "", status: "დასრულებული", score: "", duration: "", studio: "", dubbers: "", director: "", romaji: "", japanese: "", poster: "", cover: "", logo: "", current: "", total: "", format: "11", genres: [] };
}

export function emptyAdminAnime() {
  return blankAnime();
}

const sourceKey = /^(mp4link|iframe[a-z0-9_-]*)$/;

export async function readAdminSources(id: number) {
  const [row] = await query<{ xfields: string }>("SELECT xfields FROM dle_post WHERE id = ? LIMIT 1", [id]);
  if (!row) return [];
  const fields = parseXFields(row.xfields);
  return Object.entries(fields)
    .filter(([key]) => sourceKey.test(key))
    .map(([key, value]) => ({ key, value }));
}

export async function saveAdminAnime(input: AdminAnime, author: string, sources?: { key: string; value: string }[], bump = false) {
  const title = input.title.trim().slice(0, 255);
  if (title.length < 2) return { error: "სათაური მაინც 2 სიმბოლო უნდა იყოს." };
  let slug = slugify(input.slug || title);
  if (!slug) slug = `anime-${Date.now()}`;
  const [taken] = await query<{ id: number }>("SELECT id FROM dle_post WHERE alt_name = ? AND id <> ? LIMIT 1", [slug, input.id]);
  if (taken) return { error: "ეს მისამართი უკვე გამოყენებულია." };

  const genreIds = [...new Set(input.genres.filter((id) => !TYPE.has(id)))];
  const format = FORMATS.has(input.format) ? input.format : "11";
  const existing = input.id ? await query<{ category: string; xfields: string }>("SELECT category, xfields FROM dle_post WHERE id = ? LIMIT 1", [input.id]) : [];
  const previous = existing[0];
  const fields = parseXFields(previous?.xfields);
  const set = (key: string, value: string) => {
    const clean = value.trim().replaceAll("|", "/");
    if (clean) fields[key] = clean;
    else delete fields[key];
  };
  set("name", input.romaji);
  set("japname", input.japanese);
  set("image", input.poster);
  set("cover", input.cover);
  set("logo", input.logo);
  set("imdb", input.score.replace(",", "."));
  set("year", input.year.replace(/\D/g, "").slice(0, 4));
  set("studio", input.studio);
  set("gamxmovanebeli", input.dubbers);
  set("rejisori", input.director);
  set("statusi", input.status);
  set("qronometraji", input.duration.replace(/\D/g, "") ? `${input.duration.replace(/\D/g, "")} წუთი` : "");
  const current = input.current.replace(/\D/g, "");
  const total = input.total.replace(/\D/g, "");
  set("episodenum", current || total ? `${current || "0"} / ${total || current || "0"}` : "");
  set("new-episode", current);
  if (sources) {
    for (const key of Object.keys(fields)) {
      if (sourceKey.test(key)) delete fields[key];
    }
    for (const source of sources) {
      const key = source.key.trim().toLowerCase();
      const value = source.value.trim();
      if (sourceKey.test(key) && value) fields[key] = value;
    }
  }
  const story = input.description.trim().slice(0, 20000);
  const preserved = (previous?.category ?? "").split(",").map((item) => item.trim()).filter((id) => TYPE.has(id) && !FORMATS.has(id) && id !== "47");
  const category = [...new Set([...preserved, "10", format, ...(input.status === "ანონსი" ? ["47"] : []), ...genreIds])].join(",");

  if (input.id) {
    const result = await execute(
      "UPDATE dle_post SET title = ?, alt_name = ?, short_story = ?, xfields = ?, category = ?, approve = ?, date = IF(?, NOW(), date) WHERE id = ?",
      [title, slug, story, pack(fields), category, input.published ? 1 : 0, bump ? 1 : 0, input.id],
    );
    if (!result.affectedRows) return { error: "ანიმე ვერ მოიძებნა." };    clearCatalogCache();
    return { id: input.id };
  }

  const created = await execute(
    `INSERT INTO dle_post (autor, date, short_story, full_story, xfields, title, descr, keywords, category, selections, alt_name, allow_comm, approve, allow_br, symbol, tags, metatitle, actors)
     VALUES (?, NOW(), ?, '', ?, ?, '', '', ?, '', ?, 1, ?, 1, '', '', '', '')`,
    [author.slice(0, 40), story, pack(fields), title, category, slug, input.published ? 1 : 0],
  );
  await execute(
    "INSERT INTO dle_post_extras (news_id, emoteOne, emoteTwo, emoteThree, emoteFour, emoteFive, emoteSix, favFilmsSum, favWillLookSum, favFindWebSum, favWatchedSum) VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)",
    [created.insertId],
  );
  clearCatalogCache();
  return { id: created.insertId };
}

export async function deleteAdminAnime(id: number) {
  if (!Number.isInteger(id) || id <= 0) return;
  await execute("DELETE FROM dle_comments WHERE post_id = ?", [id]);
  await execute("DELETE FROM dle_post_extras WHERE news_id = ?", [id]);
  await execute("DELETE FROM dle_post WHERE id = ?", [id]);
  clearCatalogCache();
}

export async function listDuplicateSlugs() {
  const rows = await query<{ id: number; title: string; alt_name: string; approve: number; xfields: string }>(
    `SELECT p.id, p.title, p.alt_name, p.approve, p.xfields
     FROM dle_post p
     INNER JOIN (
       SELECT alt_name FROM dle_post WHERE alt_name <> '' GROUP BY alt_name HAVING COUNT(*) > 1
     ) d ON d.alt_name = p.alt_name
     ORDER BY p.alt_name, p.id`,
  );
  const taken = new Set(rows.map((row) => row.alt_name));
  const groups = new Map<string, { slug: string; items: { id: number; title: string; slug: string; suggestion: string; published: boolean; poster: string; year: string }[] }>();
  for (const row of rows) {
    const fields = parseXFields(row.xfields);
    let suggestion = slugify(`${row.alt_name}-${row.id}`) || `anime-${row.id}`;
    let extra = 2;
    while (taken.has(suggestion)) {
      suggestion = slugify(`${row.alt_name}-${row.id}-${extra}`) || `anime-${row.id}-${extra}`;
      extra += 1;
    }
    taken.add(suggestion);
    const item = { id: row.id, title: row.title, slug: row.alt_name, suggestion, published: row.approve === 1, poster: absUrl(fields.image) ?? "", year: fields.year ?? "" };
    const group = groups.get(row.alt_name) ?? { slug: row.alt_name, items: [] };
    group.items.push(item);
    groups.set(row.alt_name, group);
  }
  return [...groups.values()];
}

export async function renameAdminSlug(id: number, raw: string) {
  if (!Number.isInteger(id) || id <= 0) return { error: "ანიმე ვერ მოიძებნა." };
  const slug = slugify(raw);
  if (!slug) return { error: "მისამართი ცარიელია ან მხოლოდ ქართული ასოებია. გამოიყენე ლათინური." };
  const [post] = await query<{ alt_name: string }>("SELECT alt_name FROM dle_post WHERE id = ? LIMIT 1", [id]);
  if (!post) return { error: "ანიმე ვერ მოიძებნა." };
  if (post.alt_name === slug) return { error: "ეს იგივე მისამართია. შეცვალე, რომ მეორისგან განსხვავდებოდეს." };
  const [taken] = await query<{ id: number }>("SELECT id FROM dle_post WHERE alt_name = ? AND id <> ? LIMIT 1", [slug, id]);
  if (taken) return { error: "ეს მისამართი უკვე გამოყენებულია." };
  await execute("UPDATE dle_post SET alt_name = ? WHERE id = ?", [slug, id]);
  clearCatalogCache();
  return { from: post.alt_name, to: slug };
}
