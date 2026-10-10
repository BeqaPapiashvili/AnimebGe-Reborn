import "server-only";
import { query } from "@/lib/db";
import { absUrl, avatarUrl, htmlToText, imageSrc, parseEpisodes, parseXFields } from "@/lib/dle";
import { relationBetween } from "@/lib/friends";
import { parsePrefs } from "@/lib/settings-model";
import { folderColor, sortLists } from "@/lib/list-model";
import { getLists, getUserListMap } from "@/lib/lists";
import { rankName, type ActivityData, type ActivityEvent, type ActivityPoint, type ActivityWatch, type ProfileCard, type ProfileItem, type PublicProfile } from "@/lib/profile-types";
import { levelProgress } from "@/lib/xp";

const TYPE_CATEGORIES = new Set(["10", "11", "12", "44", "45", "47", "48", "49", "51", "52"]);
const months = ["იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი", "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"];

function progressOf(episodeIdx: number, watchTime: number, duration: number) {
  const index = Math.max(0, Number(episodeIdx) || 0);
  const position = Math.max(0, Number(watchTime) || 0);
  const length = Number(duration) > 60 && Number(duration) < 6 * 3600 ? Number(duration) : 0;
  const current = length ? Math.min(position, length) : Math.min(position, 6 * 3600);
  return { episode: index + 1, seconds: index * length + current };
}

type UserRow = {
  user_id: number;
  name: string;
  foto: string;
  decoration_id: string | null;
  reg_date: string;
  total_xp: number;
  login_streak: number;
  last_streak_date: string | null;
  xfields: string;
  friends: string;
  friends_temp: string;
};

function joinedParts(raw: string) {
  const date = new Date(Number(raw) * 1000);
  if (!Number.isFinite(date.getTime())) return { joined: "", joinedMonth: "" };
  return {
    joined: `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`,
    joinedMonth: `${months[date.getMonth()]} ${date.getFullYear()}`,
  };
}

function streakLive(raw: string | null) {
  if (!raw) return false;
  const day = raw.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return day === today || day === yesterday.toISOString().slice(0, 10);
}

function formatOf(category: string) {
  const ids = category.split(",");
  if (ids.includes("12")) return "ფილმი";
  if (ids.includes("44")) return "OVA";
  return "სერიალი";
}

export async function findProfile(name: string, viewerId?: number): Promise<PublicProfile | null> {
  const handle = name.trim();
  if (!handle || handle.length > 40) return null;
  const users = await query<UserRow>(
    "SELECT user_id, name, foto, decoration_id, reg_date, total_xp, login_streak, last_streak_date, xfields, friends, friends_temp FROM dle_users WHERE name = ? LIMIT 1",
    [handle],
  );
  const user = users[0];
  if (!user) return null;

  const friendIds = new Set(user.friends.split(",").map((part) => Number(part.trim())).filter((id) => id > 0));
  const [lists, listMap, relation] = await Promise.all([
    getLists(),
    getUserListMap(user.user_id),
    relationBetween(viewerId, { id: user.user_id, name: user.name, friends: user.friends, friendsTemp: user.friends_temp }),
  ]);

  const ids = [...listMap.keys()];
  const posts = ids.length
    ? await query<{ id: number; title: string; alt_name: string; category: string; xfields: string }>(
        `SELECT id, title, alt_name, category, xfields FROM dle_post WHERE approve = 1 AND id IN (${ids.map(() => "?").join(",")})`,
        ids,
      )
    : [];
  const history = ids.length
    ? await query<{ news_id: number; episode_idx: number }>(
        `SELECT news_id, episode_idx FROM dle_watch_history WHERE user_id = ? AND news_id IN (${ids.map(() => "?").join(",")})`,
        [user.user_id, ...ids],
      )
    : [];
  const seen = new Map(history.map((row) => [row.news_id, row.episode_idx + 1]));

  const items: ProfileItem[] = posts
    .map((row) => {
      const fields = parseXFields(row.xfields);
      const episodes = parseEpisodes(fields);
      const [done, totalRaw] = (fields.episodenum ?? "").split("/").map((part) => Number(part.replace(/\D/g, "")) || 0);
      const released = Number(fields["new-episode"]) || done || episodes.length || undefined;
      const total = totalRaw || undefined;
      const score = Number(fields.imdb);
      const duration = Number((fields.qronometraji ?? "").replace(/\D/g, "")) || undefined;
      return {
        id: row.id,
        slug: row.alt_name,
        title: row.title,
        poster: absUrl(fields.image),
        banner: absUrl(fields.cover) ?? absUrl(fields.playerimage),
        score: Number.isFinite(score) && score > 0 ? score : undefined,
        year: fields.year,
        rating: fields.asak1 || fields.asaki,
        format: formatOf(row.category),
        duration,
        listId: listMap.get(row.id) ?? 0,
        seen: seen.get(row.id),
        released,
        total,
      };
    })
    .filter((item) => item.listId > 0)
    .sort((a, b) => a.title.localeCompare(b.title, "ka"));

  const owner = viewerId === user.user_id;
  const visibility = parsePrefs(parseXFields(user.xfields).ab).list;
  let visibleItems = items;
  if (!owner && visibility !== "all" && relation !== "friends") visibleItems = [];

  const counts = new Map<number, number>();
  for (const item of visibleItems) counts.set(item.listId, (counts.get(item.listId) ?? 0) + 1);
  const labels = new Map(lists.map((list) => [list.id, list.short || list.label]));
  const profileLists = sortLists(lists.map((list) => ({ id: list.id, label: labels.get(list.id) ?? list.label, count: counts.get(list.id) ?? 0, color: folderColor(list.id) })));
  const decoration = user.decoration_id ?? "";
  const shopFrame = /^\d+$/.test(decoration)
    ? (await query<{ image_url: string | null }>("SELECT image_url FROM shop_items WHERE id = ? AND type = 'frame' LIMIT 1", [Number(decoration)]))[0]?.image_url
    : "";
  const progress = levelProgress(Number(user.total_xp) || 0);
  const live = streakLive(user.last_streak_date);
  const dates = joinedParts(user.reg_date);

  return {
    id: user.user_id,
    name: user.name,
    avatar: avatarUrl(user.foto),
    frame: imageSrc(avatarUrl(shopFrame)) || (/^\d+$/.test(decoration) ? undefined : imageSrc(avatarUrl(decoration))),
    cover: avatarUrl(parseXFields(user.xfields).cover),
    joined: dates.joined,
    joinedMonth: dates.joinedMonth,
    friends: friendIds.size,
    level: progress.level,
    rank: rankName(progress.level),
    xp: progress.xp,
    xpStep: progress.xpStep,
    totalXp: progress.total,
    streak: live ? Number(user.login_streak) || 0 : 0,
    streakLive: live,
    owner,
    relation,
    lists: profileLists,
    items: visibleItems,
    stats: { completed: counts.get(2) ?? 0, watching: counts.get(1) ?? 0, planning: counts.get(3) ?? 0 },
  };
}

export async function profileCard(userId: number): Promise<ProfileCard | null> {
  const [user] = await query<UserRow>(
    "SELECT user_id, name, foto, decoration_id, reg_date, total_xp, login_streak, last_streak_date, xfields, friends, friends_temp FROM dle_users WHERE user_id = ? LIMIT 1",
    [userId],
  );
  if (!user) return null;
  const decoration = user.decoration_id ?? "";
  const [shopFrame, counts] = await Promise.all([
    /^\d+$/.test(decoration)
      ? query<{ image_url: string | null }>("SELECT image_url FROM shop_items WHERE id = ? AND type = 'frame' LIMIT 1", [Number(decoration)])
      : Promise.resolve([]),
    query<{ list_id: number; n: number }>("SELECT list_id, COUNT(*) n FROM dle_mylists_entries WHERE user_id = ? AND list_id IN (1, 2, 3) GROUP BY list_id", [userId]),
  ]);
  const progress = levelProgress(Number(user.total_xp) || 0);
  const live = streakLive(user.last_streak_date);
  const tally = new Map(counts.map((row) => [row.list_id, Number(row.n) || 0]));
  return {
    name: user.name,
    avatar: avatarUrl(user.foto),
    frame: imageSrc(avatarUrl(shopFrame[0]?.image_url)) || (/^\d+$/.test(decoration) ? undefined : imageSrc(avatarUrl(decoration))),
    cover: avatarUrl(parseXFields(user.xfields).cover),
    joined: joinedParts(user.reg_date).joined,
    friends: user.friends.split(",").map((part) => Number(part.trim())).filter((id) => id > 0).length,
    level: progress.level,
    rank: rankName(progress.level),
    xp: progress.xp,
    xpStep: progress.xpStep,
    totalXp: progress.total,
    streak: live ? Number(user.login_streak) || 0 : 0,
    stats: { completed: tally.get(2) ?? 0, watching: tally.get(1) ?? 0, planning: tally.get(3) ?? 0 },
  };
}

export async function getActivity(name: string, viewerId?: number): Promise<ActivityData | null> {
  const profile = await findProfile(name, viewerId);
  if (!profile) return null;

  const [commentDays, watches, comments, commentCount, names] = await Promise.all([
    query<{ day: string; hour: number; n: number }>(
      "SELECT DATE(`date`) day, HOUR(`date`) hour, COUNT(*) n FROM dle_comments WHERE user_id = ? AND approve = 1 GROUP BY day, hour",
      [profile.id],
    ),
    query<{ id: number; title: string; alt_name: string; category: string; xfields: string; episode_idx: number; watch_time: number; duration: number; last_update: string }>(
      `SELECT p.id, p.title, p.alt_name, p.category, p.xfields, w.episode_idx, w.watch_time, w.duration, w.last_update
       FROM dle_watch_history w JOIN dle_post p ON p.id = w.news_id
       WHERE w.user_id = ? ORDER BY w.last_update DESC`,
      [profile.id],
    ),
    query<{ id: number; date: string; text: string; title: string | null; alt_name: string | null }>(
      `SELECT c.id, c.date, c.text, p.title, p.alt_name
       FROM dle_comments c LEFT JOIN dle_post p ON p.id = c.post_id
       WHERE c.user_id = ? AND c.approve = 1 ORDER BY c.date DESC LIMIT 40`,
      [profile.id],
    ),
    query<{ n: number }>("SELECT COUNT(*) n FROM dle_comments WHERE user_id = ? AND approve = 1", [profile.id]),
    query<{ id: number; name: string }>("SELECT id, name FROM dle_category"),
  ]);

  const points = new Map<string, ActivityPoint>();
  const touch = (day: string, hour: number) => {
    const key = `${day}|${hour}`;
    const point = points.get(key) ?? { day: String(day).slice(0, 10), hour, episodes: 0, comments: 0, seconds: 0 };
    points.set(key, point);
    return point;
  };
  const activityWatches: ActivityWatch[] = watches.map((row) => {
    const progress = progressOf(row.episode_idx, row.watch_time, row.duration);
    const stamp = String(row.last_update);
    const watch = { day: stamp.slice(0, 10), hour: Number(stamp.slice(11, 13)) || 0, episode: progress.episode, seconds: progress.seconds, slug: row.alt_name };
    const point = touch(watch.day, watch.hour);
    point.episodes += 1;
    point.seconds += progress.seconds;
    return watch;
  });
  for (const row of commentDays) {
    const point = touch(row.day, Number(row.hour) || 0);
    point.comments += Number(row.n) || 0;
  }

  const genres = new Map<string, number>();
  const categoryName = new Map(names.map((row) => [String(row.id), row.name]));
  for (const row of watches) {
    for (const id of row.category.split(",")) {
      if (TYPE_CATEGORIES.has(id)) continue;
      const name = categoryName.get(id);
      if (name) genres.set(name, (genres.get(name) ?? 0) + 1);
    }
  }

  const watchEvents: ActivityEvent[] = watches.map((row) => ({
    id: `w${row.id}`,
    at: String(row.last_update),
    day: String(row.last_update).slice(0, 10),
    kind: "watch",
    title: row.title,
    slug: row.alt_name,
    episode: row.episode_idx + 1,
  }));
  const commentEvents: ActivityEvent[] = comments.map((row) => ({
    id: `c${row.id}`,
    at: String(row.date),
    day: String(row.date).slice(0, 10),
    kind: "comment",
    title: row.title ?? "კომენტარი",
    slug: row.alt_name ?? undefined,
    text: htmlToText(row.text).replace(/\s+/g, " ").slice(0, 140),
  }));

  const episodeTotal = activityWatches.reduce((sum, row) => sum + row.episode, 0);
  const watchedSeconds = activityWatches.reduce((sum, row) => sum + row.seconds, 0);
  const seasonStart = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const inSeason = (day: string) => new Date(day).getTime() >= seasonStart;
  const seasonRows = watches.filter((row) => inSeason(String(row.last_update).slice(0, 10)));
  const seasonSeconds = seasonRows.reduce((sum, row) => {
    const length = Number(row.duration) > 60 && Number(row.duration) < 6 * 3600 ? Number(row.duration) : 0;
    const position = Math.max(0, Number(row.watch_time) || 0);
    return sum + (length ? Math.min(position, length) : Math.min(position, 6 * 3600));
  }, 0);
  const seasonComments = commentDays.reduce((sum, row) => sum + (inSeason(String(row.day).slice(0, 10)) ? Number(row.n) || 0 : 0), 0);

  return {
    profile,
    points: [...points.values()],
    watches: activityWatches,
    events: [...watchEvents, ...commentEvents].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60),
    genres: [...genres.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6),
    titles: watches.slice(0, 30).map((row) => {
      const fields = parseXFields(row.xfields);
      const genreNames = row.category.split(",").filter((id) => !TYPE_CATEGORIES.has(id)).map((id) => categoryName.get(id)).filter((name): name is string => !!name);
      return { title: row.title, slug: row.alt_name, poster: absUrl(fields.image), day: String(row.last_update).slice(0, 10), seconds: progressOf(row.episode_idx, row.watch_time, row.duration).seconds, genres: genreNames };
    }),
    totals: {
      minutes: Math.round(watchedSeconds / 60),
      episodes: episodeTotal,
      anime: activityWatches.length,
      comments: Number(commentCount[0]?.n) || 0,
    },
    season: {
      minutes: Math.round(seasonSeconds / 60),
      episodes: seasonRows.length,
      comments: seasonComments,
    },
  };
}
