import "server-only";
import { query } from "@/lib/db";
import { readSlideSetup, slideModes, type HomeBlock, type SlideMode } from "@/lib/site-config";
import { folderKey } from "@/lib/list-model";
import { getLists, getUserListMap } from "@/lib/lists";
import type { SearchFacets, SearchQuery } from "@/lib/search-query";
import { splitFilter, type WatchItem, type WatchPage, type WatchQuery } from "@/lib/watchlist";
import { getAnimeCharacters } from "@/lib/anilist";
import { hasFavorite } from "@/lib/favorites";
import { absUrl, htmlToText, parseEpisodes, parseXFields, portrait, splitList, type Episode, type XFields } from "@/lib/dle";
import { syncNewEpisodes } from "@/lib/hub";
import type { Anime, ScheduleItem, SiteData } from "@/lib/types";

export type AnimeDetail = {
  id: number;
  slug: string;
  title: string;
  romaji?: string;
  synonyms: string[];
  description: string;
  genres: string[];
  format?: string;
  episodes?: number;
  duration?: number;
  status?: string;
  season?: string;
  startDate?: string;
  score?: number;
  poster?: string;
  banner?: string;
  studios: string[];
  tags: { name: string; rank: number; spoiler: boolean }[];
  anilistUrl?: string;
  malUrl?: string;
  sub?: string;
  dub?: string;
  country?: string;
  ageRating?: string;
  director?: string;
  trailer?: string;
  views: number;
  likes: number;
  votes: number;
  commentCount: number;
  dubbers: string[];
  related: { title: string; slug: string; relation: string; format?: string; year?: number; image?: string; poster?: string; current?: boolean }[];
  cast: { name: string; role: string; image?: string; actor?: string; actorImage?: string }[];
  castTotal: number;
  castQuery?: string;
  recommendations: { title: string; slug: string; image?: string; format?: string; score?: number }[];
  episodeList: (Episode & { airedAt?: number; thumbnail?: string })[];
};

type PostRow = {
  id: number;
  title: string;
  alt_name: string;
  date: string;
  category: string;
  short_story: string;
  xfields: string;
  tags: string;
  actors: string;
  comm_num: number;
  news_read: number | null;
  day_read: number | null;
  rating: number | null;
  vote_num: number | null;
  related_ids: string | null;
};

const MANGA = ["45", "48"];
const ANONS = "47";
const TYPE_CATEGORIES = new Set(["10", "11", "12", "44", "45", "47", "48", "49", "51", "52"]);

const baseSelect = `SELECT p.id, p.title, p.alt_name, p.date, p.category, p.short_story, p.xfields, p.tags, p.actors, p.comm_num,
  e.news_read, e.day_read, e.rating, e.vote_num, e.related_ids
  FROM dle_post p LEFT JOIN dle_post_extras e ON e.news_id = p.id
  WHERE p.approve = 1 AND NOT FIND_IN_SET('${MANGA[0]}', p.category) AND NOT FIND_IN_SET('${MANGA[1]}', p.category)`;

const cats = (row: PostRow) => row.category.split(",").map((id) => id.trim()).filter(Boolean);
const isAnons = (row: PostRow) => cats(row).includes(ANONS);

function formatOf(row: PostRow) {
  const ids = cats(row);
  if (ids.includes("12")) return "ფილმი";
  if (ids.includes("44")) return "OVA";
  return "სერიალი";
}

function episodeCounts(fields: XFields, episodes: Episode[]) {
  const [done, total] = (fields.episodenum ?? "").split("/").map((part) => Number(part.replace(/\D/g, "")) || 0);
  const current = Number(fields["new-episode"]) || done || episodes.length;
  return { current, total: total || undefined };
}

function score(fields: XFields) {
  const value = Number(fields.imdb);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function toAnime(row: PostRow): Anime & { id: number; date: string; views: number; daily: number; ongoing: boolean } {
  const fields = parseXFields(row.xfields);
  const episodes = parseEpisodes(fields);
  const { current, total } = episodeCounts(fields, episodes);
  const format = formatOf(row);
  const value = score(fields);
  return {
    id: row.id,
    slug: row.alt_name,
    title: row.title,
    score: value ? value.toFixed(1) : undefined,
    type: format,
    year: fields.year,
    poster: absUrl(fields.image),
    banner: absUrl(fields.cover) ?? absUrl(fields.playerimage),
    logo: absUrl(fields.logo),
    desc: htmlToText(row.short_story).slice(0, 320),
    rating: fields.asak1 || fields.asaki,
    dub: current ? String(current) : undefined,
    total: total ? String(total) : undefined,
    meta: [format, fields.year, current ? `ეპ ${current}` : null].filter(Boolean).join(" · "),
    date: row.date,
    views: row.news_read ?? 0,
    daily: row.day_read ?? 0,
    ongoing: /მიმდინარე/.test(fields.statusi ?? fields.status ?? ""),
  };
}

let cache: { at: number; rows: PostRow[] } | null = null;
let categoryCache: Map<string, string> | null = null;

export function clearCatalogCache() {
  cache = null;
  categoryCache = null;
}

async function allPosts() {
  if (cache && Date.now() - cache.at < 60_000) return cache.rows;
  const rows = await query<PostRow>(`${baseSelect} ORDER BY p.date DESC`);
  cache = { at: Date.now(), rows };
  return rows;
}

async function categories() {
  if (categoryCache) return categoryCache;
  const rows = await query<{ id: number; name: string }>("SELECT id, name FROM dle_category");
  categoryCache = new Map(rows.map((row) => [String(row.id), row.name]));
  return categoryCache;
}

function daysAgo(date: string) {
  return (Date.now() - new Date(date.replace(" ", "T")).getTime()) / 86_400_000;
}

export type ContinueItem = Anime & { episode: string; episodeNumber: number; progress: string; progressPct: number };

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

type SlideRow = Anime & { id: number; date: string; views: number; daily: number; ongoing: boolean };

function takeSlides(list: SlideRow[], limit = 12) {
  const withBanner = list.filter((item) => item.banner);
  return (withBanner.length >= 4 ? withBanner : list).slice(0, limit);
}

function slidePool(mode: SlideMode, released: SlideRow[], upcoming: SlideRow[]) {
  const scoreOf = (item: SlideRow) => Number(item.score) || 0;
  const byViews = (list: SlideRow[]) => [...list].sort((a, b) => b.views - a.views);
  const recent = (days: number) => released.filter((item) => daysAgo(item.date) <= days);
  const pad = (list: SlideRow[]) => {
    const ids = new Set(list.map((item) => item.id));
    return [...list, ...byViews(released).filter((item) => !ids.has(item.id))];
  };
  if (mode === "manual") return [];
  if (mode === "auto") return released.filter((item) => item.banner).slice(0, 7);
  if (mode === "popular") return takeSlides(byViews(released));
  if (mode === "day") return takeSlides([...released].sort((a, b) => b.daily - a.daily || b.views - a.views));
  if (mode === "week") return takeSlides(pad(byViews(recent(7))));
  if (mode === "weekScore") return takeSlides(pad([...recent(7)].sort((a, b) => scoreOf(b) - scoreOf(a) || b.views - a.views)));
  if (mode === "month") return takeSlides(pad(byViews(recent(30))));
  if (mode === "fresh") return takeSlides([...released].sort((a, b) => b.id - a.id));
  if (mode === "updated") return takeSlides(released);
  if (mode === "rating") return takeSlides([...released].sort((a, b) => scoreOf(b) - scoreOf(a) || b.views - a.views));
  if (mode === "ongoing") return takeSlides(byViews(released.filter((item) => item.ongoing)));
  return takeSlides(upcoming);
}

async function pickSlides(released: SlideRow[], upcoming: SlideRow[]) {
  const setup = await readSlideSetup();
  if (setup.mode === "manual") {
    const byId = new Map([...released, ...upcoming].map((item) => [item.id, item]));
    return setup.ids.flatMap((id) => {
      const item = byId.get(id);
      return item ? [item] : [];
    });
  }
  return slidePool(setup.mode, released, upcoming);
}

export async function slideBoard() {
  const rows = await allPosts();
  const anime = rows.map(toAnime);
  const released = anime.filter((item, index) => !isAnons(rows[index]));
  const upcoming = anime.filter((item, index) => isAnons(rows[index]));
  const setup = await readSlideSetup();
  const byId = new Map(anime.map((item) => [item.id, item]));
  const card = (item: SlideRow) => ({
    id: item.id,
    title: item.title,
    poster: item.poster ?? "",
    banner: item.banner ?? "",
    note: [item.score ? `★ ${item.score}` : "", item.year, item.date.slice(0, 10)].filter(Boolean).join(" · "),
    noBanner: !item.banner,
  });
  return {
    mode: setup.mode,
    picks: setup.ids.flatMap((id) => {
      const item = byId.get(id);
      return item ? [card(item)] : [];
    }),
    pools: slideModes.filter((item) => item.id !== "manual").map((item) => ({
      id: item.id,
      label: item.label,
      hint: item.hint,
      items: slidePool(item.id, released, upcoming).map(card),
    })),
  };
}

export async function getHomeData(userId?: number): Promise<SiteData & { continue: ContinueItem[]; trendingBy: Record<string, Anime[]>; userLists: Record<number, number> }> {
  const rows = await allPosts();
  const anime = rows.map(toAnime);
  const released = anime.filter((item, index) => !isAnons(rows[index]));
  const upcoming = anime.filter((item, index) => isAnons(rows[index]));
  const byViews = (list: typeof anime) => [...list].sort((a, b) => b.views - a.views);

  const day = [...released].sort((a, b) => b.daily - a.daily || b.views - a.views).slice(0, 10);
  const week = byViews(released.filter((item) => daysAgo(item.date) <= 7));
  const month = byViews(released.filter((item) => daysAgo(item.date) <= 30));
  const fill = (list: typeof anime) => [...list, ...byViews(released).filter((item) => !list.includes(item))].slice(0, 10);

  const schedule: ScheduleItem[] = released
    .filter((item) => item.ongoing)
    .map((item) => {
      const date = new Date(item.date.replace(" ", "T"));
      return { slug: item.slug, title: item.title, poster: item.poster, format: item.type ?? "", ep: item.dub ? `ეპ ${item.dub}` : "", time: item.date.slice(11, 16), weekday: date.getDay() };
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  const continueItems: ContinueItem[] = [];
  const userLists: Record<number, number> = {};
  if (userId) {
    const [history, lists] = await Promise.all([
      query<{ news_id: number; episode_idx: number; watch_time: number; duration: number }>(
        "SELECT news_id, episode_idx, watch_time, duration FROM dle_watch_history WHERE user_id = ? ORDER BY last_update DESC LIMIT 24",
        [userId],
      ),
      getUserListMap(userId),
    ]);
    for (const [postId, listId] of lists) userLists[postId] = listId;
    const seen = new Set<number>();
    for (const row of history) {
      if (seen.has(row.news_id)) continue;
      const hit = anime.find((item) => item.id === row.news_id);
      if (!hit) continue;
      seen.add(row.news_id);
      const number = Math.max(row.episode_idx, 0) + 1;
      const duration = row.duration || 1;
      continueItems.push({ ...hit, episode: `ეპ ${number}`, episodeNumber: number, progress: `${clock(row.watch_time)}/${clock(row.duration)}`, progressPct: Math.min(100, (row.watch_time / duration) * 100) });
    }
  }

  await syncNewEpisodes(anime.map((item) => ({ id: item.id, title: item.title, slug: item.slug, episode: Number(item.dub) || 0 })));

  return {
    slides: await pickSlides(released, upcoming),
    continue: continueItems,
    latest: released.slice(0, 12),
    fresh: [...released].sort((a, b) => b.id - a.id).slice(0, 12),
    upcoming: upcoming.slice(0, 12),
    trending: day,
    trendingBy: { Day: day, Week: fill(week), Month: fill(month) },
    schedule,
    userLists,
  };
}

export async function homeSectionItems(blocks: HomeBlock[]) {
  const custom = blocks.filter((block) => block.on && block.source);
  if (!custom.length) return {};
  const rows = await allPosts();
  const anime = rows.map(toAnime);
  const byId = new Map(anime.map((item) => [item.id, item]));
  const released = anime.filter((item, index) => !isAnons(rows[index]));
  const byViews = (list: typeof anime) => [...list].sort((a, b) => b.views - a.views);
  const result: Record<string, Anime[]> = {};
  for (const block of custom) {
    const size = block.size ?? 12;
    const list =
      block.source === "pick" ? (block.picks ?? []).map((pick) => byId.get(pick.id)).filter((item) => item !== undefined)
      : block.source === "rating" ? [...released].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0) || b.views - a.views)
      : block.source === "popular" ? byViews(released)
      : block.source === "ongoing" ? byViews(released.filter((item) => item.ongoing))
      : byViews(released.filter((item) => item.type === "ფილმი"));
    result[block.id] = list.slice(0, size);
  }
  return result;
}

export async function searchAnime(term: string, limit = 8) {
  const clean = term.trim();
  if (!clean) return [];
  const like = `%${clean.replace(/[%_\\]/g, (char) => `\\${char}`)}%`;
  const rows = await query<PostRow>(
    `${baseSelect} AND (p.title LIKE ? OR p.alt_name LIKE ? OR SUBSTRING_INDEX(SUBSTRING_INDEX(p.xfields, 'name|', -1), '||', 1) LIKE ?) ORDER BY e.news_read DESC LIMIT ?`,
    [like, like, like, limit],
  );
  return rows.map(toAnime).map(({ id, slug, title, score, type, year, poster, banner, dub, total }) => ({ id, slug, title, score, type, year, poster, banner, dub, total }));
}

function characters(raw: string) {
  return splitList(raw)
    .map((item) => {
      const [name, idRaw] = item.split("||");
      const id = Number((idRaw ?? "").replace(/\D/g, ""));
      return { name: name?.trim() ?? "", id: Number.isInteger(id) && id > 0 ? id : undefined };
    })
    .filter((item) => item.name);
}

type KnownActor = { id: number; name: string; fullname: string; poster: number };

let knownActors: Promise<KnownActor[]> | undefined;

function actorRoster() {
  knownActors ??= query<KnownActor>("SELECT id, name, fullname, poster FROM dle_actors");
  return knownActors;
}

function actorTokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token && token !== "d");
}

function matchActor(name: string, roster: KnownActor[]) {
  const wanted = actorTokens(name);
  if (!wanted.length) return undefined;
  const wantedSet = new Set(wanted);
  let best: KnownActor | undefined;
  let bestScore = 0;
  for (const actor of roster) {
    const tokens = actorTokens(actor.fullname);
    if (!tokens.length) continue;
    const shared = tokens.filter((token) => wantedSet.has(token)).length;
    if (!shared) continue;
    const score = shared / Math.max(wanted.length, tokens.length);
    const reliable = shared >= 2 || wanted.length === 1 || tokens.length === 1;
    if (reliable && score > bestScore) {
      best = actor;
      bestScore = score;
    }
  }
  return bestScore >= 0.5 ? best : undefined;
}

function actorPoster(id: number) {
  return `https://animeb.ge/uploads/actors/posters/medium/${id}.webp`;
}

function voiceName(value?: string | null) {
  const name = value?.trim();
  if (!name || name.length < 3 || /\d/.test(name)) return undefined;
  return name;
}

function localizeCast(people: AnimeDetail["cast"], roster: KnownActor[]) {
  return people.map((person) => {
    const known = matchActor(person.name, roster);
    return known ? { ...person, name: known.name, image: known.poster ? actorPoster(known.id) : person.image } : person;
  });
}

export async function loadRemoteCast(search: string, page = 1) {
  const [remote, roster] = await Promise.all([getAnimeCharacters(search, page), actorRoster()]);
  return { cast: localizeCast(remote.people, roster), total: remote.total, hasNext: remote.hasNext };
}

async function castOf(raw: string, search: string) {
  const listed = characters(raw);
  if (listed.length) {
    const ids = listed.map((item) => item.id).filter((id): id is number => !!id);
    const rows = ids.length
      ? await query<{ id: number; name: string; birthplace: string; poster: number }>(
          `SELECT id, name, birthplace, poster FROM dle_actors WHERE id IN (${ids.map(() => "?").join(",")})`,
          ids,
        )
      : [];
    const byId = new Map(rows.map((row) => [row.id, row]));
    const cast = listed.map((item) => {
      const actor = item.id ? byId.get(item.id) : undefined;
      return {
        name: actor?.name || item.name,
        role: "პერსონაჟი",
        image: actor?.poster ? actorPoster(actor.id) : undefined,
        actor: voiceName(actor?.birthplace),
      };
    });
    return { cast, castTotal: cast.length };
  }
  const late = { cast: [] as AnimeDetail["cast"], total: 0, hasNext: false };
  const remote = await Promise.race([loadRemoteCast(search, 1), new Promise<typeof late>((resolve) => setTimeout(() => resolve(late), 1200))]);
  return { cast: remote.cast, castTotal: remote.total || remote.cast.length, castQuery: remote.hasNext ? search : undefined };
}

export async function getAnimeBySlug(slug: string): Promise<AnimeDetail | null> {
  const [row] = await query<PostRow>(`${baseSelect} AND p.alt_name = ? LIMIT 1`, [slug]);
  if (!row) return null;
  const fields = parseXFields(row.xfields);
  const episodes = parseEpisodes(fields);
  const { current, total } = episodeCounts(fields, episodes);
  const names = await categories();
  const ids = cats(row);
  const genres = ids.filter((id) => !TYPE_CATEGORIES.has(id)).map((id) => names.get(id)).filter((name): name is string => !!name);
  const all = (await allPosts()).map((post) => ({ post, anime: toAnime(post) }));

  const relatedIds = [...new Set(splitList(row.related_ids ?? "").map(Number).filter((id) => id > 0 && id !== row.id))];
  const seenSlugs = new Set<string>([row.alt_name]);
  const related = relatedIds
    .map((id) => all.find((item) => item.post.id === id))
    .filter((item): item is NonNullable<typeof item> => !!item)
    .filter(({ anime }) => {
      if (seenSlugs.has(anime.slug)) return false;
      seenSlugs.add(anime.slug);
      return true;
    })
    .map(({ anime }) => ({ title: anime.title, slug: anime.slug, relation: "დაკავშირებული", format: anime.type, year: Number(anime.year) || undefined, image: anime.banner ?? anime.poster, poster: anime.poster }));

  const genreSet = new Set(ids.filter((id) => !TYPE_CATEGORIES.has(id)));
  const recommendations = all
    .filter(({ post }) => post.id !== row.id && !relatedIds.includes(post.id) && !isAnons(post))
    .map(({ post, anime }) => ({ anime, shared: cats(post).filter((id) => genreSet.has(id)).length }))
    .filter((item) => item.shared > 0)
    .sort((a, b) => b.shared - a.shared || b.anime.views - a.anime.views)
    .slice(0, 12)
    .map(({ anime }) => ({ title: anime.title, slug: anime.slug, image: anime.poster, format: anime.type, score: anime.score ? Math.round(Number(anime.score) * 10) : undefined }));

  const dubbers = splitList(fields.gamxmovanebeli);
  const cast = await castOf(row.actors, fields.name || fields.japname || row.title);
  const format = formatOf(row);
  const value = score(fields);
  const year = fields.year;

  return {
    id: row.id,
    slug: row.alt_name,
    title: row.title,
    romaji: fields.name && fields.name !== row.title ? fields.name : undefined,
    synonyms: [fields.japname].filter((name): name is string => !!name),
    description: htmlToText(row.short_story),
    genres,
    format,
    episodes: total ?? (format === "ფილმი" ? 1 : undefined),
    duration: Number((fields.qronometraji ?? "").replace(/\D/g, "")) || undefined,
    status: fields.statusi || fields.status,
    season: [fields.season1, year].filter(Boolean).join(" ") || undefined,
    startDate: year,
    score: value ? Math.round(value * 10) : undefined,
    poster: absUrl(fields.image),
    banner: absUrl(fields.cover) ?? absUrl(fields.playerimage),
    studios: splitList(fields.studio),
    tags: splitList(row.tags).slice(0, 20).map((name) => ({ name, rank: 100, spoiler: false })),
    dub: current ? String(current) : undefined,
    ageRating: fields.asak1 || fields.asaki,
    director: fields.rejisori,
    trailer: fields.trailer,
    country: "JP",
    views: row.news_read ?? 0,
    likes: row.rating ?? 0,
    votes: row.vote_num ?? 0,
    commentCount: row.comm_num,
    dubbers,
    related: [...related, { title: row.title, slug: row.alt_name, relation: "მიმდინარე", format, year: Number(year) || undefined, image: absUrl(fields.cover) ?? absUrl(fields.image), poster: absUrl(fields.image), current: true }],
    ...cast,
    recommendations,
    episodeList: episodes,
  };
}

export type CommentItem = {
  id: number;
  userId: number;
  author: string;
  avatar?: string;
  frame?: string;
  group?: string;
  text: string;
  date: string;
  rating: number;
  votes: number;
  parent: number;
  pinned: boolean;
  myVote?: number;
};

type CommentRow = { id: number; user_id: number; autor: string; foto: string | null; decoration_id: string | null; shop_image: string | null; group_name: string | null; text: string; date: string; rating: number; vote_num: number; parent: number; is_pinned: number };

const commentSelect = `SELECT c.id, c.user_id, c.autor, u.foto, u.decoration_id, si.image_url AS shop_image, g.group_name, c.text, c.date, c.rating, c.vote_num, c.parent, c.is_pinned
     FROM dle_comments c
     LEFT JOIN dle_users u ON u.user_id = c.user_id
     LEFT JOIN dle_usergroups g ON g.id = u.user_group
     LEFT JOIN shop_items si ON u.decoration_id REGEXP '^[0-9]+$' AND si.id = u.decoration_id AND si.type = 'frame'`;

async function mapComments(rows: CommentRow[], viewer?: { id: number; name: string } | null): Promise<CommentItem[]> {
  const mine = new Map<number, number>();
  if (viewer && rows.length) {
    const votes = await query<{ c_id: number; rating: number }>(
      `SELECT c_id, rating FROM dle_comment_rating_log WHERE member IN (?, ?) AND c_id IN (${rows.map(() => "?").join(",")})`,
      [String(viewer.id), viewer.name, ...rows.map((row) => row.id)],
    );
    for (const vote of votes) mine.set(vote.c_id, Math.sign(vote.rating));
  }
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    author: row.autor,
    ...portrait(row.foto, row.decoration_id, row.shop_image),
    group: row.group_name ?? undefined,
    text: htmlToText(row.text),
    date: row.date,
    rating: row.rating,
    votes: row.vote_num,
    parent: row.parent,
    pinned: !!row.is_pinned,
    myVote: mine.get(row.id) ?? 0,
  }));
}

export async function getComment(postId: number, id: number, viewer?: { id: number; name: string } | null) {
  const rows = await query<CommentRow>(`${commentSelect} WHERE c.post_id = ? AND c.id = ? AND c.approve = 1 LIMIT 1`, [postId, id]);
  return (await mapComments(rows, viewer))[0];
}

export async function getCommentPage(postId: number, viewer?: { id: number; name: string } | null, options?: { offset?: number; limit?: number; sort?: "new" | "old" | "best" }) {
  const limit = Math.min(20, Math.max(1, Math.floor(options?.limit ?? 10)));
  const offset = Math.max(0, Math.floor(options?.offset ?? 0));
  const order = options?.sort === "best" ? "c.is_pinned DESC, c.rating DESC, c.date DESC" : options?.sort === "old" ? "c.is_pinned DESC, c.date ASC" : "c.is_pinned DESC, c.date DESC";
  const [roots, counts] = await Promise.all([
    query<CommentRow>(`${commentSelect} WHERE c.post_id = ? AND c.approve = 1 AND c.parent = 0 ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`, [postId]),
    query<{ total: number; roots: number }>("SELECT COUNT(*) total, SUM(parent = 0) roots FROM dle_comments WHERE post_id = ? AND approve = 1", [postId]),
  ]);
  const ids = roots.map((row) => row.id);
  const replies = ids.length
    ? await query<CommentRow>(`${commentSelect} WHERE c.approve = 1 AND c.parent IN (${ids.map(() => "?").join(",")}) ORDER BY c.date ASC`, ids)
    : [];
  return {
    comments: await mapComments([...roots, ...replies], viewer),
    total: Number(counts[0]?.total) || 0,
    roots: Number(counts[0]?.roots) || 0,
  };
}

export type UserAnimeState = { list: number | null; vote: number; favorite: boolean; history: { episode: number; time: number; duration: number }[] };

export async function getUserAnimeState(user: { id: number; name: string } | null, postId: number): Promise<UserAnimeState> {
  if (!user) return { list: null, vote: 0, favorite: false, history: [] };
  const [lists, votes, history, favorites] = await Promise.all([
    getUserListMap(user.id),
    query<{ rating: number }>("SELECT rating FROM dle_logs WHERE news_id = ? AND member IN (?, ?) LIMIT 1", [postId, String(user.id), user.name]),
    query<{ episode_idx: number; watch_time: number; duration: number }>("SELECT episode_idx, watch_time, duration FROM dle_watch_history WHERE user_id = ? AND news_id = ?", [user.id, postId]),
    query<{ favorites: string | null }>("SELECT favorites FROM dle_users WHERE user_id = ? LIMIT 1", [user.id]),
  ]);
  return {
    list: lists.get(postId) ?? null,
    vote: votes[0]?.rating ?? 0,
    favorite: hasFavorite(favorites[0]?.favorites, postId),
    history: history.map((row) => ({ episode: Math.max(row.episode_idx, 0) + 1, time: row.watch_time, duration: row.duration })),
  };
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "ka"));
}

export type SearchHit = {
  id: number;
  slug: string;
  title: string;
  poster?: string;
  format?: string;
  year?: string;
  duration?: string;
  score: number;
  dub?: string;
  total?: string;
};

const SEASON_ORDER = ["ზამთარი", "გაზაფხული", "ზაფხული", "შემოდგომა"];
const FORMAT_ORDER = ["სერიალი", "ფილმი", "OVA", "ONA"];
const STATUS_ORDER = ["დასრულებული", "მიმდინარე", "ანონსი", "შეჩერებული"];

function byOrder(order: string[], values: string[]) {
  const present = new Set(values);
  return order.filter((item) => present.has(item));
}

function characterNames(raw: string) {
  return splitList(raw)
    .map((item) => item.split("||")[0]?.trim() ?? "")
    .filter((name) => name && !/^id\d+$/i.test(name));
}

function peopleList(value?: string) {
  return splitList(value).filter((name) => name && name.toUpperCase() !== "N/A");
}

function directorName(value?: string) {
  const name = value?.trim();
  if (!name || name.toUpperCase() === "N/A") return [];
  return [name];
}

type CatalogHit = SearchHit & {
  views: number;
  added: string;
  genres: string[];
  characters: string[];
  staff: string[];
  studios: string[];
  status?: string;
  season?: string;
  hay: string;
};

export async function searchCatalog(filters: SearchQuery): Promise<{ items: SearchHit[]; total: number; facets: SearchFacets }> {
  const [rows, names] = await Promise.all([allPosts(), categories()]);
  const items: CatalogHit[] = [];
  for (const row of rows) {
    const fields = parseXFields(row.xfields);
    const episodes = parseEpisodes(fields);
    const counts = episodeCounts(fields, episodes);
    const ids = cats(row);
    const genres = ids.filter((id) => !TYPE_CATEGORIES.has(id)).map((id) => names.get(id)).filter((name): name is string => !!name);
    const value = score(fields);
    const minutes = Number((fields.qronometraji ?? "").replace(/\D/g, ""));
    const format = FORMAT_ORDER.includes(fields.typ3 ?? "") ? fields.typ3 : formatOf(row);
    const status = fields.statusi || fields.status;
    const staff = [...directorName(fields.rejisori), ...peopleList(fields.gamxmovanebeli)];
    const characters = characterNames(row.actors);
    items.push({
      id: row.id,
      slug: row.alt_name,
      title: row.title,
      poster: absUrl(fields.image),
      format,
      year: fields.year,
      duration: minutes > 0 ? `${minutes} წთ` : undefined,
      score: value ?? 0,
      dub: counts.current ? String(counts.current) : undefined,
      total: counts.total ? String(counts.total) : undefined,
      views: row.news_read ?? 0,
      added: row.date,
      genres,
      characters,
      staff,
      studios: peopleList(fields.studio),
      status: STATUS_ORDER.includes(status ?? "") ? status : undefined,
      season: SEASON_ORDER.includes(fields.season1 ?? "") ? fields.season1 : undefined,
      hay: [row.title, row.alt_name, fields.name, fields.japname].filter(Boolean).join(" ").toLowerCase(),
    });
  }
  const facets: SearchFacets = {
    genres: unique(items.flatMap((item) => item.genres)),
    years: unique(items.map((item) => item.year ?? "")).sort((a, b) => Number(b) - Number(a)),
    characters: unique(items.flatMap((item) => item.characters)),
    staff: unique(items.flatMap((item) => item.staff)),
    studios: unique(items.flatMap((item) => item.studios)),
    seasons: byOrder(SEASON_ORDER, items.map((item) => item.season ?? "")),
    formats: byOrder(FORMAT_ORDER, items.map((item) => item.format ?? "")),
    statuses: byOrder(STATUS_ORDER, items.map((item) => item.status ?? "")),
  };
  const genres = new Set(splitFilter(filters.genre));
  const q = filters.q.toLowerCase();
  const matched = items.filter((item) => {
    if (q && !item.hay.includes(q)) return false;
    if (genres.size && !item.genres.some((genre) => genres.has(genre))) return false;
    if (filters.year && item.year !== filters.year) return false;
    if (filters.character && !item.characters.includes(filters.character)) return false;
    if (filters.staff && !item.staff.includes(filters.staff)) return false;
    if (filters.studio && !item.studios.includes(filters.studio)) return false;
    if (filters.season && item.season !== filters.season) return false;
    if (filters.format && item.format !== filters.format) return false;
    if (filters.status && item.status !== filters.status) return false;
    return true;
  });
  matched.sort((a, b) => {
    if (filters.sort === "year") return Number(b.year ?? 0) - Number(a.year ?? 0) || b.added.localeCompare(a.added);
    if (filters.sort === "score") return b.score - a.score || b.added.localeCompare(a.added);
    if (filters.sort === "popular") return b.views - a.views || b.added.localeCompare(a.added);
    return b.added.localeCompare(a.added);
  });
  const page = matched.slice(filters.offset, filters.offset + filters.limit).map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    poster: item.poster,
    format: item.format,
    year: item.year,
    duration: item.duration,
    score: item.score,
    dub: item.dub,
    total: item.total,
  }));
  return { items: page, total: matched.length, facets };
}

export async function getWatchlist(userId: number, filters: WatchQuery): Promise<WatchPage> {
  const [rows, lists, names, listMap] = await Promise.all([allPosts(), getLists(), categories(), getUserListMap(userId)]);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const labels = new Map(lists.map((list) => [list.id, list.short || list.label]));
  const items: WatchItem[] = [];
  for (const [postId, listId] of listMap) {
    const row = byId.get(postId);
    if (!row || isAnons(row)) continue;
    const fields = parseXFields(row.xfields);
    const episodes = parseEpisodes(fields);
    const { current, total } = episodeCounts(fields, episodes);
    const ids = cats(row);
    const genres = ids.filter((id) => !TYPE_CATEGORIES.has(id)).map((id) => names.get(id)).filter((name): name is string => !!name);
    const value = score(fields);
    items.push({
      id: row.id,
      slug: row.alt_name,
      title: row.title,
      poster: absUrl(fields.image),
      format: formatOf(row),
      duration: Number((fields.qronometraji ?? "").replace(/\D/g, "")) || undefined,
      year: fields.year,
      status: fields.statusi || fields.status,
      season: fields.season1,
      genres,
      tags: splitList(row.tags),
      score: value ?? 0,
      dub: current ? String(current) : undefined,
      total: total ? String(total) : undefined,
      updated: row.date,
      listId,
      folder: folderKey(listId),
      folderLabel: labels.get(listId) ?? folderKey(listId),
    });
  }

  const facets = {
    genres: unique(items.flatMap((item) => item.genres)),
    tags: unique(items.flatMap((item) => item.tags)).slice(0, 80),
    years: unique(items.map((item) => item.year ?? "")).sort((a, b) => Number(b) - Number(a)),
    statuses: unique(items.map((item) => item.status ?? "")),
    seasons: unique(items.map((item) => item.season ?? "")),
    formats: unique(items.map((item) => item.format ?? "")),
  };

  const genres = new Set(splitFilter(filters.genre));
  const tags = new Set(splitFilter(filters.tag));
  const q = filters.q.toLowerCase();
  const matched = items.filter((item) => {
    if (q && !item.title.toLowerCase().includes(q)) return false;
    if (filters.folder && item.folder !== filters.folder) return false;
    if (genres.size && !item.genres.some((genre) => genres.has(genre))) return false;
    if (tags.size && !item.tags.some((tag) => tags.has(tag))) return false;
    if (filters.year && item.year !== filters.year) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.season && item.season !== filters.season) return false;
    if (filters.format && item.format !== filters.format) return false;
    return true;
  });
  matched.sort((a, b) => {
    if (filters.sort === "title") return a.title.localeCompare(b.title, "ka");
    if (filters.sort === "year") return Number(b.year ?? 0) - Number(a.year ?? 0) || b.updated.localeCompare(a.updated);
    if (filters.sort === "score") return b.score - a.score || b.updated.localeCompare(a.updated);
    return b.updated.localeCompare(a.updated);
  });

  return { items: matched.slice(filters.offset, filters.offset + filters.limit), total: matched.length, facets };
}
