import "server-only";
import { unlink } from "node:fs/promises";
import { execute, query } from "@/lib/db";
import { portrait } from "@/lib/dle";
import type { CommunityAnimeTag, CommunityCategory, CommunityPageData, CommunityPoll, CommunityPost, CommunityReply } from "@/lib/community-types";
import { communityCategories } from "@/lib/community-types";
import { readExtra, writeExtra, type CommunityPollData } from "@/lib/community-body";
import { getAnimeBySlug } from "@/lib/catalog";
import { storageFile } from "@/lib/storage";

const categories = new Set(communityCategories.map((item) => item.id));

let ready: Promise<void> | null = null;

function ensure() {
  ready ??= (async () => {
    await execute(`CREATE TABLE IF NOT EXISTS site_community_posts (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      category VARCHAR(24) NOT NULL,
      title VARCHAR(160) NOT NULL,
      body TEXT NOT NULL,
      pinned TINYINT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL,
      KEY user_id (user_id),
      KEY created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await execute(`CREATE TABLE IF NOT EXISTS site_community_replies (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      post_id INT NOT NULL,
      user_id INT NOT NULL,
      body TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      KEY post_id (post_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await execute(`CREATE TABLE IF NOT EXISTS site_community_votes (
      post_id INT NOT NULL,
      user_id INT NOT NULL,
      value TINYINT NOT NULL,
      PRIMARY KEY (post_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    const postCols = await query<{ Field: string }>("SHOW COLUMNS FROM site_community_posts");
    if (!postCols.some((col) => col.Field === "pinned")) await execute("ALTER TABLE site_community_posts ADD COLUMN pinned TINYINT NOT NULL DEFAULT 0");
    const voteCols = await query<{ Field: string }>("SHOW COLUMNS FROM site_community_votes");
    if (!voteCols.some((col) => col.Field === "value")) await execute("ALTER TABLE site_community_votes ADD COLUMN value TINYINT NOT NULL DEFAULT 1");
    await execute(`CREATE TABLE IF NOT EXISTS site_community_reply_votes (
      reply_id INT NOT NULL,
      user_id INT NOT NULL,
      PRIMARY KEY (reply_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await execute(`CREATE TABLE IF NOT EXISTS site_community_poll_votes (
      post_id INT NOT NULL,
      user_id INT NOT NULL,
      option_index TINYINT NOT NULL,
      PRIMARY KEY (post_id, user_id, option_index)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  })();
  return ready;
}

function clean(value: string, max: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function imageUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    if (!/\.(png|jpe?g|gif|webp)$/i.test(url.pathname)) return "";
    return url.toString().slice(0, 500);
  } catch {
    return "";
  }
}

function pollState(body: string, votes: { user_id: number; option_index: number }[], userId?: number): { poll?: CommunityPoll; anime: CommunityAnimeTag[] } {
  const extra = readExtra(body);
  if (!extra.poll) return { anime: extra.anime };
  const counts = extra.poll.options.map(() => 0);
  const mine: number[] = [];
  for (const vote of votes) {
    const index = Number(vote.option_index);
    if (index < 0 || index >= counts.length) continue;
    counts[index] += 1;
    if (userId && vote.user_id === userId) mine.push(index);
  }
  return { poll: { options: extra.poll.options, multi: extra.poll.multi, ends: extra.poll.ends, counts, mine }, anime: extra.anime };
}

export async function getCommunityPage(userId?: number): Promise<CommunityPageData> {
  await ensure();
  const [posts, counts, members, contributors, grouped] = await Promise.all([
    query<{ id: number; user_id: number; category: string; title: string; body: string; pinned: number; created_at: string; name: string; foto: string | null; decoration_id: string | null; shop_image: string | null }>(
      `SELECT p.id, p.user_id, p.category, p.title, p.body, p.pinned, p.created_at, u.name, u.foto, u.decoration_id, si.image_url AS shop_image
       FROM site_community_posts p
       JOIN dle_users u ON u.user_id = p.user_id
       LEFT JOIN shop_items si ON u.decoration_id REGEXP '^[0-9]+$' AND si.id = u.decoration_id AND si.type = 'frame'
       ORDER BY p.pinned DESC, p.id DESC LIMIT 60`,
    ),
    query<{ users: number; anime: number; comments: number; posts: number }>(
      `SELECT
        (SELECT COUNT(*) FROM dle_users) users,
        (SELECT COUNT(*) FROM dle_post WHERE approve = 1) anime,
        (SELECT COUNT(*) FROM dle_comments WHERE approve = 1) comments,
        (SELECT COUNT(*) FROM site_community_posts) posts`,
    ),
    query<{ name: string; foto: string | null; decoration_id: string | null; shop_image: string | null; episodes: number }>(
      `SELECT u.name, u.foto, u.decoration_id, ANY_VALUE(si.image_url) shop_image, SUM(w.episode_idx + 1) episodes
       FROM dle_watch_history w
       JOIN dle_users u ON u.user_id = w.user_id
       LEFT JOIN shop_items si ON u.decoration_id REGEXP '^[0-9]+$' AND si.id = u.decoration_id AND si.type = 'frame'
       GROUP BY u.user_id, u.name, u.foto, u.decoration_id
       ORDER BY episodes DESC LIMIT 5`,
    ),
    query<{ name: string; foto: string | null; decoration_id: string | null; shop_image: string | null; comments: number }>(
      `SELECT u.name, u.foto, u.decoration_id, ANY_VALUE(si.image_url) shop_image, COUNT(*) comments
       FROM dle_comments c
       JOIN dle_users u ON u.user_id = c.user_id
       LEFT JOIN shop_items si ON u.decoration_id REGEXP '^[0-9]+$' AND si.id = u.decoration_id AND si.type = 'frame'
       WHERE c.approve = 1
       GROUP BY u.user_id, u.name, u.foto, u.decoration_id
       ORDER BY comments DESC LIMIT 5`,
    ),
    query<{ category: string; n: number }>("SELECT category, COUNT(*) n FROM site_community_posts GROUP BY category"),
  ]);

  const ids = posts.map((row) => row.id);
  const replies = ids.length
    ? await query<{ id: number; post_id: number; body: string; created_at: string; name: string; foto: string | null; decoration_id: string | null; shop_image: string | null }>(
        `SELECT r.id, r.post_id, r.body, r.created_at, u.name, u.foto, u.decoration_id, si.image_url AS shop_image
         FROM site_community_replies r
         JOIN dle_users u ON u.user_id = r.user_id
         LEFT JOIN shop_items si ON u.decoration_id REGEXP '^[0-9]+$' AND si.id = u.decoration_id AND si.type = 'frame'
         WHERE r.post_id IN (${ids.map(() => "?").join(",")})
         ORDER BY r.id ASC`,
        ids,
      )
    : [];
  const votes = ids.length
    ? await query<{ post_id: number; user_id: number; value: number }>(
        `SELECT post_id, user_id, value FROM site_community_votes WHERE post_id IN (${ids.map(() => "?").join(",")})`,
        ids,
      )
    : [];
  const pollVotes = ids.length
    ? await query<{ post_id: number; user_id: number; option_index: number }>(
        `SELECT post_id, user_id, option_index FROM site_community_poll_votes WHERE post_id IN (${ids.map(() => "?").join(",")})`,
        ids,
      )
    : [];

  const replyIds = replies.map((row) => row.id);
  const replyVotes = replyIds.length
    ? await query<{ reply_id: number; user_id: number }>(
        `SELECT reply_id, user_id FROM site_community_reply_votes WHERE reply_id IN (${replyIds.map(() => "?").join(",")})`,
        replyIds,
      )
    : [];
  const replyScore = new Map<number, number>();
  const replyMine = new Set<number>();
  for (const vote of replyVotes) {
    replyScore.set(vote.reply_id, (replyScore.get(vote.reply_id) ?? 0) + 1);
    if (userId && vote.user_id === userId) replyMine.add(vote.reply_id);
  }
  const byPost = new Map<number, CommunityReply[]>();
  for (const row of replies) {
    const list = byPost.get(row.post_id) ?? [];
    list.push({ id: row.id, name: row.name, ...portrait(row.foto, row.decoration_id, row.shop_image), body: row.body, at: String(row.created_at), votes: replyScore.get(row.id) ?? 0, mine: replyMine.has(row.id) });
    byPost.set(row.post_id, list);
  }
  const voteCount = new Map<number, number>();
  const mineVote = new Map<number, -1 | 0 | 1>();
  for (const vote of votes) {
    const value = vote.value > 0 ? 1 : -1;
    voteCount.set(vote.post_id, (voteCount.get(vote.post_id) ?? 0) + value);
    if (userId && vote.user_id === userId) mineVote.set(vote.post_id, value);
  }
  const categoryCounts: Record<string, number> = {};
  for (const row of grouped) categoryCounts[row.category] = Number(row.n) || 0;
  const pollsByPost = new Map<number, { user_id: number; option_index: number }[]>();
  for (const vote of pollVotes) {
    const list = pollsByPost.get(vote.post_id) ?? [];
    list.push(vote);
    pollsByPost.set(vote.post_id, list);
  }

  const count = counts[0];
  const items: CommunityPost[] = posts.map((row) => {
    const extra = pollState(row.body, pollsByPost.get(row.id) ?? [], userId);
    return {
      id: row.id,
      category: categories.has(row.category as CommunityCategory) ? (row.category as CommunityCategory) : "general",
      title: row.title,
      body: row.body,
      name: row.name,
      ...portrait(row.foto, row.decoration_id, row.shop_image),
      at: String(row.created_at),
      votes: voteCount.get(row.id) ?? 0,
      vote: mineVote.get(row.id) ?? 0,
      pinned: Number(row.pinned) === 1,
      mine: userId === row.user_id,
      replies: byPost.get(row.id) ?? [],
      poll: extra.poll,
      anime: extra.anime,
    };
  });

  return {
    posts: items,
    signedIn: !!userId,
    stats: {
      users: Number(count?.users) || 0,
      anime: Number(count?.anime) || 0,
      comments: Number(count?.comments) || 0,
      posts: Number(count?.posts) || 0,
    },
    members: members.map((row) => ({ name: row.name, ...portrait(row.foto, row.decoration_id, row.shop_image), value: Number(row.episodes) || 0, unit: "ეპ" })),
    contributors: contributors.map((row) => ({ name: row.name, ...portrait(row.foto, row.decoration_id, row.shop_image), value: Number(row.comments) || 0, unit: "კომენტ." })),
    counts: categoryCounts,
  };
}

export async function getCommunityPost(id: number, userId?: number) {
  if (!Number.isInteger(id) || id <= 0) return null;
  const page = await getCommunityPage(userId);
  const found = page.posts.find((item) => item.id === id);
  if (found) return { page, post: found };
  const [row] = await query<{ id: number; user_id: number; category: string; title: string; body: string; pinned: number; created_at: string; name: string; foto: string | null; decoration_id: string | null; shop_image: string | null }>(
    `SELECT p.id, p.user_id, p.category, p.title, p.body, p.pinned, p.created_at, u.name, u.foto, u.decoration_id, si.image_url AS shop_image
     FROM site_community_posts p
     JOIN dle_users u ON u.user_id = p.user_id
     LEFT JOIN shop_items si ON u.decoration_id REGEXP '^[0-9]+$' AND si.id = u.decoration_id AND si.type = 'frame'
     WHERE p.id = ? LIMIT 1`,
    [id],
  );
  if (!row) return null;
  const replies = await query<{ id: number; body: string; created_at: string; name: string; foto: string | null; decoration_id: string | null; shop_image: string | null; votes: number; mine: number }>(
    `SELECT r.id, r.body, r.created_at, u.name, u.foto, u.decoration_id, si.image_url AS shop_image,
            (SELECT COUNT(*) FROM site_community_reply_votes v WHERE v.reply_id = r.id) votes,
            EXISTS(SELECT 1 FROM site_community_reply_votes v WHERE v.reply_id = r.id AND v.user_id = ?) mine
     FROM site_community_replies r
     JOIN dle_users u ON u.user_id = r.user_id
     LEFT JOIN shop_items si ON u.decoration_id REGEXP '^[0-9]+$' AND si.id = u.decoration_id AND si.type = 'frame'
     WHERE r.post_id = ? ORDER BY r.id ASC`,
    [userId ?? 0, id],
  );
  const votes = await query<{ user_id: number; value: number }>("SELECT user_id, value FROM site_community_votes WHERE post_id = ?", [id]);
  const pollVotes = await query<{ user_id: number; option_index: number }>("SELECT user_id, option_index FROM site_community_poll_votes WHERE post_id = ?", [id]);
  let score = 0;
  let mine: -1 | 0 | 1 = 0;
  for (const vote of votes) {
    const value = vote.value > 0 ? 1 : -1;
    score += value;
    if (userId && vote.user_id === userId) mine = value;
  }
  const post: CommunityPost = {
    id: row.id,
    category: categories.has(row.category as CommunityCategory) ? (row.category as CommunityCategory) : "general",
    title: row.title,
    body: row.body,
    name: row.name,
    ...portrait(row.foto, row.decoration_id, row.shop_image),
    at: String(row.created_at),
    votes: score,
    vote: mine,
    pinned: Number(row.pinned) === 1,
    mine: userId === row.user_id,
    replies: replies.map((reply) => ({ id: reply.id, name: reply.name, ...portrait(reply.foto, reply.decoration_id, reply.shop_image), body: reply.body, at: String(reply.created_at), votes: Number(reply.votes) || 0, mine: Number(reply.mine) === 1 })),
    ...pollState(row.body, pollVotes, userId),
  };
  return { page, post };
}

export async function addCommunityPost(userId: number, draft: { category: string; title: string; body: string; images?: string[]; poll?: { options?: string[]; multi?: boolean; days?: number }; anime?: string[] }) {
  await ensure();
  if (!categories.has(draft.category as CommunityCategory)) return "აირჩიე კატეგორია.";
  const cleanTitle = clean(draft.title, 160);
  const prose = draft.body.trim().slice(0, 4000);
  if (cleanTitle.length < 2) return "სათაური მოკლეა.";
  const images = [...new Set((draft.images ?? []).map(imageUrl).filter(Boolean))].slice(0, 4);
  let poll: CommunityPollData | undefined;
  const rawOptions = (draft.poll?.options ?? []).map((item) => clean(String(item), 80)).filter(Boolean).slice(0, 6);
  if (rawOptions.length === 1) return "გამოკითხვას სჭირდება მინიმუმ 2 ვარიანტი.";
  if (rawOptions.length >= 2) {
    const days = Number(draft.poll?.days);
    if (![1, 3, 7, 30].includes(days)) return "აირჩიე გამოკითხვის ვადა.";
    poll = { options: rawOptions, multi: !!draft.poll?.multi, ends: new Date(Date.now() + days * 86400000).toISOString() };
  }
  const slugs = [...new Set((draft.anime ?? []).map((item) => String(item).trim()).filter(Boolean))].slice(0, 2);
  const anime: CommunityAnimeTag[] = [];
  for (const slug of slugs) {
    const detail = await getAnimeBySlug(slug);
    if (!detail) continue;
    anime.push({
      slug: detail.slug,
      title: detail.title,
      poster: detail.poster,
      type: detail.format,
      year: detail.startDate,
      episodes: detail.episodes ? String(detail.episodes) : undefined,
      score: detail.score ? (detail.score / 10).toFixed(1) : undefined,
    });
  }
  if (prose.length < 2 && images.length === 0 && !poll && anime.length === 0) return "ტექსტი მოკლეა.";
  const imageMd = images.map((url) => `![](${url})`).join("\n");
  let stored = [prose, imageMd].filter(Boolean).join("\n");
  if (poll || anime.length > 0) stored = `${stored}\n${writeExtra({ poll, anime })}`.trim();
  const [samePost] = await query<{ id: number }>("SELECT id FROM site_community_posts WHERE user_id = ? AND body = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY) LIMIT 1", [userId, stored]);
  if (samePost) return "იგივე პოსტი დღეს უკვე დაწერე.";
  const created = await execute("INSERT INTO site_community_posts (user_id, category, title, body, created_at) VALUES (?, ?, ?, ?, NOW())", [userId, draft.category, cleanTitle, stored]);
  const { loadXpRules, xpPath } = await import("@/lib/site-config");
  await loadXpRules();
  const postRule = xpPath("post");
  if (postRule && prose.length >= postRule.min) {
    const { awardSocial } = await import("@/lib/xp");
    await awardSocial(userId, `post:${created.insertId}`);
  }
  return "";
}

export async function addCommunityReply(userId: number, postId: number, body: string) {
  await ensure();
  const text = body.trim().slice(0, 2000);
  if (text.length < 1) return "პასუხი ცარიელია.";
  const [post] = await query<{ id: number }>("SELECT id FROM site_community_posts WHERE id = ? LIMIT 1", [postId]);
  if (!post) return "პოსტი ვერ მოიძებნა.";
  const [sameReply] = await query<{ id: number }>("SELECT id FROM site_community_replies WHERE user_id = ? AND body = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY) LIMIT 1", [userId, text]);
  if (sameReply) return "იგივე პასუხი დღეს უკვე დაწერე.";
  const created = await execute("INSERT INTO site_community_replies (post_id, user_id, body, created_at) VALUES (?, ?, ?, NOW())", [postId, userId, text]);
  const { loadXpRules, xpPath } = await import("@/lib/site-config");
  await loadXpRules();
  const replyRule = xpPath("reply");
  if (replyRule && text.length >= replyRule.min) {
    const { awardSocial } = await import("@/lib/xp");
    await awardSocial(userId, `reply:${created.insertId}`);
  }
  return "";
}

export async function voteCommunityReply(userId: number, replyId: number) {
  await ensure();
  const [reply] = await query<{ id: number }>("SELECT id FROM site_community_replies WHERE id = ? LIMIT 1", [replyId]);
  if (!reply) return "პასუხი ვერ მოიძებნა.";
  const [existing] = await query<{ user_id: number }>("SELECT user_id FROM site_community_reply_votes WHERE reply_id = ? AND user_id = ? LIMIT 1", [replyId, userId]);
  if (existing) await execute("DELETE FROM site_community_reply_votes WHERE reply_id = ? AND user_id = ?", [replyId, userId]);
  else await execute("INSERT INTO site_community_reply_votes (reply_id, user_id) VALUES (?, ?)", [replyId, userId]);
  return "";
}

export async function voteCommunityPost(userId: number, postId: number, direction: number) {
  await ensure();
  const value = direction < 0 ? -1 : 1;
  const [post] = await query<{ id: number }>("SELECT id FROM site_community_posts WHERE id = ? LIMIT 1", [postId]);
  if (!post) return;
  const [existing] = await query<{ value: number }>("SELECT value FROM site_community_votes WHERE post_id = ? AND user_id = ? LIMIT 1", [postId, userId]);
  if (existing && Number(existing.value) === value) await execute("DELETE FROM site_community_votes WHERE post_id = ? AND user_id = ?", [postId, userId]);
  else if (existing) await execute("UPDATE site_community_votes SET value = ? WHERE post_id = ? AND user_id = ?", [value, postId, userId]);
  else await execute("INSERT INTO site_community_votes (post_id, user_id, value) VALUES (?, ?, ?)", [postId, userId, value]);
}

export async function voteCommunityPoll(userId: number, postId: number, option: number) {
  await ensure();
  const [post] = await query<{ body: string }>("SELECT body FROM site_community_posts WHERE id = ? LIMIT 1", [postId]);
  if (!post) return "პოსტი ვერ მოიძებნა.";
  const extra = readExtra(post.body);
  if (!extra.poll) return "გამოკითხვა არ არის.";
  if (new Date(extra.poll.ends).getTime() <= Date.now()) return "გამოკითხვა დასრულდა.";
  if (!Number.isInteger(option) || option < 0 || option >= extra.poll.options.length) return "ვარიანტი არასწორია.";
  const [existing] = await query<{ option_index: number }>("SELECT option_index FROM site_community_poll_votes WHERE post_id = ? AND user_id = ? AND option_index = ? LIMIT 1", [postId, userId, option]);
  if (existing) {
    await execute("DELETE FROM site_community_poll_votes WHERE post_id = ? AND user_id = ? AND option_index = ?", [postId, userId, option]);
    return "";
  }
  if (!extra.poll.multi) await execute("DELETE FROM site_community_poll_votes WHERE post_id = ? AND user_id = ?", [postId, userId]);
  await execute("INSERT INTO site_community_poll_votes (post_id, user_id, option_index) VALUES (?, ?, ?)", [postId, userId, option]);
  return "";
}

export async function pinCommunityPost(postId: number) {
  await ensure();
  const [post] = await query<{ pinned: number }>("SELECT pinned FROM site_community_posts WHERE id = ? LIMIT 1", [postId]);
  if (!post) return "პოსტი ვერ მოიძებნა.";
  await execute("UPDATE site_community_posts SET pinned = ? WHERE id = ?", [post.pinned ? 0 : 1, postId]);
  return "";
}

export async function updateCommunityPost(postId: number, title: string, category: string, text: string) {
  await ensure();
  if (!categories.has(category as CommunityCategory)) return;
  const cleanTitle = clean(title, 160);
  const prose = text.trim().slice(0, 4000);
  if (cleanTitle.length < 2 || prose.length < 1) return;
  const [post] = await query<{ body: string }>("SELECT body FROM site_community_posts WHERE id = ? LIMIT 1", [postId]);
  if (!post) return;
  const extra = readExtra(post.body);
  const stored = extra.poll || extra.anime.length ? `${prose}\n${writeExtra({ poll: extra.poll, anime: extra.anime })}`.trim() : prose;
  await execute("UPDATE site_community_posts SET title = ?, category = ?, body = ? WHERE id = ?", [cleanTitle, category, stored, postId]);
}

export async function deleteCommunityReply(replyId: number) {
  await ensure();
  if (!Number.isInteger(replyId) || replyId <= 0) return;
  const [reply] = await query<{ body: string }>("SELECT body FROM site_community_replies WHERE id = ? LIMIT 1", [replyId]);
  if (!reply) return;
  const names = new Set<string>();
  for (const match of reply.body.matchAll(/\/uploads\/community\/([\w.-]+)/g)) names.add(match[1]);
  await execute("DELETE FROM site_community_reply_votes WHERE reply_id = ?", [replyId]);
  await execute("DELETE FROM site_community_replies WHERE id = ?", [replyId]);
  await Promise.all([...names].map((name) => unlink(storageFile("uploads", "community", name)).catch(() => undefined)));
}

export async function deleteCommunityPost(postId: number) {
  await ensure();
  const [post] = await query<{ body: string }>("SELECT body FROM site_community_posts WHERE id = ? LIMIT 1", [postId]);
  if (!post) return "პოსტი ვერ მოიძებნა.";
  const replies = await query<{ id: number; body: string }>("SELECT id, body FROM site_community_replies WHERE post_id = ?", [postId]);
  const names = new Set<string>();
  for (const row of [post, ...replies]) {
    for (const match of row.body.matchAll(/\/uploads\/community\/([\w.-]+)/g)) names.add(match[1]);
  }
  if (replies.length) await execute(`DELETE FROM site_community_reply_votes WHERE reply_id IN (${replies.map(() => "?").join(",")})`, replies.map((row) => row.id));
  await execute("DELETE FROM site_community_votes WHERE post_id = ?", [postId]);
  await execute("DELETE FROM site_community_poll_votes WHERE post_id = ?", [postId]);
  await execute("DELETE FROM site_community_replies WHERE post_id = ?", [postId]);
  await execute("DELETE FROM site_community_posts WHERE id = ?", [postId]);
  await Promise.all([...names].map((name) => unlink(storageFile("uploads", "community", name)).catch(() => undefined)));
  return "";
}
