import "server-only";
import { execute, query } from "@/lib/db";
import { absUrl, avatarUrl, parseXFields } from "@/lib/dle";
import { readyShop } from "@/lib/shop";
import type { SessionUser } from "@/lib/types";

const sellPrice: Record<string, number> = { E: 8, D: 15, C: 30, B: 70, A: 160, S: 350, "S+": 700, RE: 1200 };
const burnEnergy: Record<string, number> = { E: 1, D: 1, C: 1, B: 2, A: 3, S: 8, "S+": 15, RE: 25 };
const weight: Record<string, number> = { E: 10, D: 20, C: 40, B: 80, A: 160, S: 320, "S+": 640, RE: 1000 };
const craftOrder = ["E", "D", "C", "B", "A"];
const clubXp: Record<string, number> = { E: 5, D: 10, C: 20, B: 40, A: 80, S: 160, "S+": 320, RE: 640 };
const clubCurve = { base: 1000, step: 35, max: 500 };

function clubXpFor(level: number) {
  const n = Math.max(0, Math.min(clubCurve.max, level) - 1);
  return n * clubCurve.base + (clubCurve.step * n * (n - 1)) / 2;
}

function clubLevelFor(xp: number) {
  let level = 1;
  while (level < clubCurve.max && xp >= clubXpFor(level + 1)) level += 1;
  return level;
}

export type CardFace = { id: number; name: string; image: string; rarity: string; anime: string; slug: string; owned: number; likes: number; liked: boolean; author: string; holders: number; drops: string };
export type ClubPage = {
  id: number; name: string; text: string; avatar: string; cover: string; badge: string; level: number; xp: number; max: number; tag: string; vault: number;
  owner: string; ownerAvatar: string; created: string; rank: number; total: number; boosted: boolean; role: string; pending: boolean; inClub: boolean; style: string;
  badges: { id: number; name: string; image: string; price: number; level: number }[];
  curve: { base: number; step: number; max: number }; rates: Record<string, number>;
  donations: { id: number; name: string; avatar: string; card: string; image: string; rarity: string; xp: number; date: string }[];
  donors: { id: number; name: string; avatar: string; xp: number; cards: number }[];
  requests: { id: number; name: string; avatar: string; joined: string; cards: number; uniq: number }[];
  friends: { id: number; name: string; avatar: string; level: number }[];
  people: { id: number; name: string; avatar: string; role: string; joined: string; cards: number; uniq: number }[];
};
export const clubStyles = ["none", "crimson", "rainbow", "galaxy", "fire", "gold", "ice", "neon"] as const;

function clubStyleOf(primary?: string | null, fallback?: string | null) {
  const value = [primary, fallback].find((item) => item && item !== "none" && (clubStyles as readonly string[]).includes(item));
  return value ?? "none";
}

function clubBadgeOf(value?: string | null) {
  return value && value !== "none" ? hosted(value) : "";
}

export type TradeCard = { id: number; name: string; image: string; rarity: string };
export type CopyFace = { id: number; cardId: number; name: string; image: string; rarity: string; stars: number; sale: boolean; featured: boolean };
export type PlayData = {
  section: string;
  me: number;
  meName: string;
  coins: number;
  energy: number;
  note: string;
  page: number;
  pages: number;
  total: number;
  q: string;
  title: string;
  author: string;
  rarity: string;
  exclude: string;
  sort: string;
  dir: string;
  cards: CardFace[];
  copies: CopyFace[];
  card: (CardFace & { description: string; author: string; wished: boolean; holderCount: number; wishCount: number; tradeCount: number; owners: { id: number; name: string; stars: number }[]; people: { id: number; name: string; avatar: string; text: string }[]; wishes: { id: number; name: string; avatar: string; text: string }[]; traders: { id: number; name: string; avatar: string; text: string }[] }) | null;
  cases: { id: number; name: string; image: string; price: number; text: string; count: number; chance: number; coinMin: number; coinMax: number; opened: number; pity: { limit: number; rarity: string }[]; cards: { id: number; name: string; image: string; rarity: string }[] }[];
  pulled: { id: number; name: string; image: string; rarity: string }[];
  offer: { id: number; step: number; total: number; cards: { cardId: number; name: string; image: string; rarity: string; coins: number; owned: number; wished: boolean; holders: number }[] } | null;
  packs: { aLeft: number; sLeft: number; aEvery: number; sEvery: number; daily: boolean; dailyCoins: number } | null;
  progress: { id: number; title: string; slug: string; poster: string; cards: { id: number; name: string; image: string; rarity: string; owned: number }[] }[];
  anime: { id: number; title: string; slug: string; poster: string; cards: { id: number; name: string; image: string; rarity: string; owned: number; wished: boolean }[] } | null;
  clubs: { id: number; name: string; text: string; avatar: string; cover: string; level: number; xp: number; members: number; max: number; tag: string; owner: string; mine: boolean; style: string; badge: string }[];
  collectors: { id: number; name: string; avatar: string; total: number; unique: number; score: number; top: string; me: boolean }[];
  market: { id: number; name: string; image: string; rarity: string; seller: string; price: number; bid: number; buy: number; mine: boolean }[];
  decks: { id: number; title: string; author: string; likes: number; count: number; image: string; avatar?: string; views?: number; created?: string; images?: string[] }[];
  club: ClubPage | null;
  deck: { id: number; title: string; text: string; author: string; avatar: string; likes: number; views: number; created: string; liked: boolean; mine: boolean; cards: CardFace[] } | null;
  trades: { id: number; incoming: boolean; sent: boolean; state: string; who: string; avatar: string; created: string; offer: string; want: string; status: string; give: TradeCard; get: TradeCard }[];
  wishes: CardFace[];
  giveaways: { id: number; title: string; text: string; end: string; joined: number; mine: boolean; open: boolean; winners: string }[];
  battle: { id: number; left: { id: number; title: string; image: string; votes: number }; right: { id: number; title: string; image: string; votes: number }; voted: number } | null;
  dubbers: { id: number; name: string; alt: string; image: string; anime: number; rating: number; votes: number }[];
  dubber: { id: number; name: string; image: string; bio: string; rating: number; votes: number; mine: boolean } | null;
  pet: { name: string; level: number; hunger: number; happiness: number; energy: number; xp: number; status: string; busy: string } | null;
  labyrinth: { x: number; y: number; moves: number; room: string; text: string; quiz: string; doors: { x: number; y: number; room: string }[] } | null;
  taste: { name: string; score: number; shared: { title: string; slug: string }[] } | null;
  showcase: { name: string; cards: CardFace[] } | null;
};

const empty = (section: string, me: number, note = ""): PlayData => ({
  section, me, meName: "", coins: 0, energy: 0, note, page: 1, pages: 1, total: 0, q: "", title: "", author: "", rarity: "", exclude: "", sort: "new", dir: "desc",
  cards: [], copies: [], card: null, cases: [], pulled: [], offer: null, packs: null, progress: [], anime: null, clubs: [], club: null, collectors: [], market: [], decks: [], deck: null, trades: [], wishes: [],
  giveaways: [], battle: null, dubbers: [], dubber: null, pet: null, labyrinth: null, taste: null, showcase: null,
});

function photo(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.includes("/")) return hosted(raw);
  return hosted(`/uploads/fotos/${raw}`);
}

function personPhoto(foto?: string | null) {
  const url = avatarUrl(foto);
  if (!url) return "";
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  return hosted(url);
}

function hosted(url?: string | null) {
  const value = absUrl(url);
  if (!value) return "";
  const path = value.replace(/^https?:\/\/animeb\.ge/i, "");
  if (path.startsWith("/uploads/")) return `/media${path}`;
  return value;
}

function face(row: { id: number; name: string; image: string; rarity: string; anime?: string; slug?: string; owned?: number; likes?: number; liked?: number | boolean; author?: string; holders?: number; drops?: string | null }): CardFace {
  return {
    id: row.id, name: row.name, image: hosted(row.image), rarity: row.rarity || "E", anime: row.anime ?? "", slug: row.slug ?? "",
    owned: Number(row.owned ?? 0), likes: Number(row.likes ?? 0), liked: Boolean(Number(row.liked ?? 0)), author: row.author ?? "", holders: Number(row.holders ?? 0), drops: row.drops ?? "",
  };
}

function cleanIds(values: unknown[]) {
  return [...new Set(values.map((value) => Number(value)).filter((id) => Number.isInteger(id) && id > 0))];
}

async function wallet(userId: number) {
  await readyShop();
  await execute("INSERT IGNORE INTO site_coins (user_id, balance) VALUES (?, 0)", [userId]);
  const [row] = await query<{ balance: number }>("SELECT balance FROM site_coins WHERE user_id = ? LIMIT 1", [userId]);
  return Number(row?.balance ?? 0);
}

async function takeCoins(userId: number, amount: number) {
  if (amount <= 0) return true;
  await wallet(userId);
  const result = await execute("UPDATE site_coins SET balance = balance - ? WHERE user_id = ? AND balance >= ?", [amount, userId, amount]);
  return result.affectedRows > 0;
}

async function giveCoins(userId: number, amount: number) {
  if (amount <= 0) return;
  await wallet(userId);
  await execute("UPDATE site_coins SET balance = balance + ? WHERE user_id = ?", [amount, userId]);
}

async function energyOf(userId: number) {
  const [row] = await query<{ sky_brick_energy: number }>("SELECT sky_brick_energy FROM dle_users WHERE user_id = ? LIMIT 1", [userId]);
  return Number(row?.sky_brick_energy ?? 0);
}

function winnerNames(raw: string) {
  try {
    const value = JSON.parse(raw || "[]");
    if (Array.isArray(value)) return value.map((item) => typeof item === "string" ? item : String((item as { name?: string }).name ?? "")).filter(Boolean).join(", ");
  } catch { /* ძველი ჩანაწერი */ }
  return "";
}

async function closeGiveaways() {
  const due = await query<{ id: number; prizes_json: string; winners_json: string }>(
    "SELECT id, prizes_json, winners_json FROM dle_giveaways WHERE status = 1 AND end_date <= NOW()",
  );
  for (const row of due) {
    if (winnerNames(row.winners_json)) {
      await execute("UPDATE dle_giveaways SET status = 0 WHERE id = ?", [row.id]);
      continue;
    }
    const people = await query<{ name: string }>(
      "SELECT u.name FROM dle_giveaway_participants p JOIN dle_users u ON u.user_id = p.user_id WHERE p.giveaway_id = ? ORDER BY RAND()",
      [row.id],
    );
    let count = 1;
    try {
      const prizes = JSON.parse(row.prizes_json || "[]");
      if (Array.isArray(prizes) && prizes.length) count = prizes.length;
    } catch { /* ერთი გამარჯვებული */ }
    const winners = people.slice(0, count).map((person) => person.name);
    await execute("UPDATE dle_giveaways SET winners_json = ?, status = 0 WHERE id = ?", [JSON.stringify(winners), row.id]);
  }
}

async function settleMarket() {
  const rows = await query<{ id: number; user_card_id: number; seller_id: number; current_bid: number; last_bidder_id: number }>(
    "SELECT id, user_card_id, seller_id, current_bid, last_bidder_id FROM cards_marketplace WHERE status = 0 AND end_date <= NOW()",
  );
  for (const row of rows) {
    const closed = await execute("UPDATE cards_marketplace SET status = 1 WHERE id = ? AND status = 0", [row.id]);
    if (!closed.affectedRows) continue;
    if (row.last_bidder_id) {
      await execute("UPDATE user_cards SET user_id = ?, is_on_sale = 0, is_featured = 0 WHERE id = ?", [row.last_bidder_id, row.user_card_id]);
      await giveCoins(row.seller_id, Number(row.current_bid) || 0);
    } else {
      await execute("UPDATE user_cards SET is_on_sale = 0 WHERE id = ?", [row.user_card_id]);
    }
  }
}

export async function cardsForAnime(newsId: number, userId = 0) {
  const rows = await query<{ id: number; name: string; image: string; rarity: string; owned: number; wished: number }>(
    `SELECT c.id, c.name, c.image, c.rarity, (SELECT COUNT(*) FROM user_cards uc WHERE uc.card_id = c.id AND uc.user_id = ?) owned,
       EXISTS (SELECT 1 FROM card_wishlist w WHERE w.card_id = c.id AND w.user_id = ?) wished
     FROM anime_cards c WHERE c.news_id = ? AND UPPER(c.rarity) NOT IN ('RE', 'S+')
     ORDER BY FIELD(UPPER(c.rarity), 'S', 'A', 'B', 'C', 'D', 'E'), c.id DESC LIMIT 300`,
    [userId, userId, newsId],
  );
  return rows.map((row) => ({ id: row.id, name: row.name, image: hosted(row.image), rarity: (row.rarity || "E").toUpperCase(), owned: Number(row.owned) || 0, wished: Boolean(Number(row.wished)) }));
}

const rankSet = new Set(["E", "D", "C", "B", "A", "S", "S+", "RE"]);
const animePost = "p.id = c.news_id AND p.approve = 1 AND FIND_IN_SET('10', p.category) > 0 AND FIND_IN_SET('48', p.category) = 0";
const linkedCard = `EXISTS (SELECT 1 FROM dle_post p WHERE ${animePost})`;

function cardExtras(userId: number) {
  const viewer = Math.max(0, Math.floor(Number(userId) || 0));
  return `c.author, c.likes_count likes,
    (SELECT COUNT(*) FROM card_likes cl WHERE cl.card_id = c.id AND cl.user_id = ${viewer}) liked,
    (SELECT COUNT(DISTINCT hu.user_id) FROM user_cards hu WHERE hu.card_id = c.id) holders,
    (SELECT GROUP_CONCAT(DISTINCT ac.name ORDER BY ac.name SEPARATOR ', ') FROM case_items ci JOIN anime_cases ac ON ac.id = ci.case_id WHERE ci.card_id = c.id) drops`;
}

const sortColumns: Record<string, string> = {
  name: "c.name",
  rank: "FIELD(UPPER(c.rarity), 'E','D','C','B','A','S','S+','RE')",
  likes: "c.likes_count",
  author: "c.author",
  new: "c.id",
};

function rankList(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim().toUpperCase()).filter((item) => rankSet.has(item)))];
}

async function catalog(input: { q: string; title: string; author: string; rarity: string; exclude: string; sort: string; dir: string; page: number; userId: number }) {
  const where = ["p.id IS NOT NULL"];
  const params: unknown[] = [];
  if (input.q) {
    where.push("c.name LIKE ?");
    params.push(`%${input.q}%`);
  }
  if (input.title) {
    where.push("p.title LIKE ?");
    params.push(`%${input.title}%`);
  }
  if (input.author) {
    where.push("c.author LIKE ?");
    params.push(`%${input.author}%`);
  }
  const ranks = rankList(input.rarity);
  const excluded = rankList(input.exclude).filter((rank) => !ranks.includes(rank));
  if (ranks.length) {
    where.push(`UPPER(c.rarity) IN (${ranks.map(() => "?").join(",")})`);
    params.push(...ranks);
  }
  if (excluded.length) {
    where.push(`UPPER(c.rarity) NOT IN (${excluded.map(() => "?").join(",")})`);
    params.push(...excluded);
  }
  const filter = where.join(" AND ");
  const [count] = await query<{ n: number }>(`SELECT COUNT(*) n FROM anime_cards c LEFT JOIN dle_post p ON ${animePost} WHERE ${filter}`, params);
  const pages = Math.max(1, Math.ceil(Number(count?.n ?? 0) / 28));
  const current = Math.min(input.page, pages);
  const order = sortColumns[input.sort] ?? sortColumns.name;
  const direction = input.dir === "desc" ? "DESC" : "ASC";
  const rows = await query<{ id: number; name: string; image: string; rarity: string; anime: string; slug: string; owned: number; likes: number; liked: number; author: string; holders: number; drops: string | null }>(
    `SELECT c.id, c.name, c.image, c.rarity, c.author, c.likes_count likes, COALESCE(p.title, '') anime, COALESCE(p.alt_name, '') slug,
      (SELECT COUNT(*) FROM user_cards uc WHERE uc.card_id = c.id AND uc.user_id = ?) owned,
      (SELECT COUNT(*) FROM card_likes l WHERE l.card_id = c.id AND l.user_id = ?) liked,
      (SELECT COUNT(DISTINCT uc.user_id) FROM user_cards uc WHERE uc.card_id = c.id) holders,
      (SELECT GROUP_CONCAT(DISTINCT ac.name ORDER BY ac.name SEPARATOR ', ') FROM case_items ci JOIN anime_cases ac ON ac.id = ci.case_id WHERE ci.card_id = c.id) drops
     FROM anime_cards c LEFT JOIN dle_post p ON ${animePost}
     WHERE ${filter}
     ORDER BY ${order} ${direction}, c.id DESC
     LIMIT 28 OFFSET ?`,
    [input.userId, input.userId, ...params, (current - 1) * 28],
  );
  return { cards: rows.map(face), page: current, pages };
}

async function myCopies(userId: number, limit = 120) {
  const rows = await query<{ id: number; card_id: number; name: string; image: string; rarity: string; stars: number; is_on_sale: number; is_featured: number }>(
    `SELECT uc.id, uc.card_id, c.name, c.image, c.rarity, uc.stars, uc.is_on_sale, uc.is_featured
     FROM user_cards uc JOIN anime_cards c ON c.id = uc.card_id
     WHERE uc.user_id = ? ORDER BY uc.is_featured DESC, uc.stars DESC, uc.id DESC${limit ? ` LIMIT ${Math.floor(limit)}` : ""}`,
    [userId],
  );
    return rows.map((row) => ({
    id: row.id, cardId: row.card_id, name: row.name, image: hosted(row.image), rarity: row.rarity,
    stars: Number(row.stars) || 0, sale: row.is_on_sale === 1, featured: row.is_featured === 1,
  }));
}

async function deckList(ownerId = 0): Promise<PlayData["decks"]> {
  const rows = await query<{ id: number; title: string; author: string; foto: string; likes: number; views: number; created: string; n: number; images: string | null }>(
    `SELECT d.id, d.title, u.name author, u.foto, d.likes, d.views, DATE_FORMAT(d.created_at, '%Y-%m-%d %H:%i:%s') created,
      (SELECT COUNT(*) FROM anime_collection_items i WHERE i.collection_id = d.id) n,
      (SELECT SUBSTRING_INDEX(GROUP_CONCAT(c.image ORDER BY FIELD(UPPER(c.rarity), 'RE', 'S+', 'S', 'A', 'B', 'C', 'D', 'E'), c.id SEPARATOR '|'), '|', 5)
         FROM anime_collection_items i JOIN anime_cards c ON c.id = i.card_id WHERE i.collection_id = d.id) images
     FROM anime_collections d JOIN dle_users u ON u.user_id = d.user_id
     ${ownerId ? "WHERE d.user_id = ?" : ""} ORDER BY d.id DESC`,
    ownerId ? [ownerId] : [],
  );
  return rows.map((row) => {
    const images = (row.images ?? "").split("|").filter(Boolean).map((image) => hosted(image));
    return { id: row.id, title: row.title, author: row.author, avatar: personPhoto(row.foto), likes: Number(row.likes) || 0, views: Number(row.views) || 0, created: row.created, count: Number(row.n) || 0, image: images[0] ?? "", images };
  });
}

export async function loadPlay(section: string, user: SessionUser | null, extra: { id?: number; name?: string; q?: string; title?: string; author?: string; rarity?: string; exclude?: string; sort?: string; dir?: string; page?: number; note?: string } = {}): Promise<PlayData> {
  const me = user?.id ?? 0;
  const data = empty(section, me, extra.note ?? "");
  data.meName = user?.name ?? "";
  data.q = extra.q ?? "";
  data.title = extra.title ?? "";
  data.author = extra.author ?? "";
  data.rarity = extra.rarity ?? "";
  data.exclude = extra.exclude ?? "";
  data.sort = sortColumns[extra.sort ?? ""] ? extra.sort! : "new";
  data.dir = extra.dir === "asc" || extra.dir === "desc" ? extra.dir : data.sort === "new" ? "desc" : "asc";
  data.page = extra.page || 1;
  if (me) {
    data.coins = await wallet(me);
    data.energy = await energyOf(me);
  }
  if (section === "catalog") {
    const found = await catalog({ q: data.q, title: data.title, author: data.author, rarity: data.rarity, exclude: data.exclude, sort: data.sort, dir: data.dir, page: data.page, userId: me });
    data.cards = found.cards;
    data.page = found.page;
    data.pages = found.pages;
  }
  if (section === "card" && extra.id) {
    const [row] = await query<{ id: number; name: string; image: string; rarity: string; description: string; author: string; anime: string; slug: string; owned: number; likes: number; liked: number; holders: number; drops: string | null }>(
      `SELECT c.id, c.name, c.image, c.rarity, c.description, c.author, c.likes_count likes, COALESCE(p.title,'') anime, COALESCE(p.alt_name,'') slug,
        (SELECT COUNT(*) FROM user_cards uc WHERE uc.card_id = c.id AND uc.user_id = ?) owned,
        (SELECT COUNT(*) FROM card_likes l WHERE l.card_id = c.id AND l.user_id = ?) liked,
        (SELECT COUNT(DISTINCT uc.user_id) FROM user_cards uc WHERE uc.card_id = c.id) holders,
        (SELECT GROUP_CONCAT(DISTINCT ac.name ORDER BY ac.name SEPARATOR ', ') FROM case_items ci JOIN anime_cases ac ON ac.id = ci.case_id WHERE ci.card_id = c.id) drops
       FROM anime_cards c LEFT JOIN dle_post p ON ${animePost} WHERE c.id = ? LIMIT 1`,
      [me, me, extra.id],
    );
    if (row) {
      const [owners, people, wishes, traders, holders, wishCount, tradeCount] = await Promise.all([
        query<{ id: number; name: string; stars: number }>(
          `SELECT uc.id, u.name, uc.stars FROM user_cards uc JOIN dle_users u ON u.user_id = uc.user_id
           WHERE uc.card_id = ? AND uc.user_id <> ? AND uc.is_on_sale = 0 ORDER BY uc.stars DESC LIMIT 8`,
          [row.id, me],
        ),
        query<{ id: number; name: string; foto: string | null; stars: number; copies: number }>(
          `SELECT u.user_id id, u.name, u.foto, MAX(uc.stars) stars, COUNT(*) copies
           FROM user_cards uc JOIN dle_users u ON u.user_id = uc.user_id
           WHERE uc.card_id = ? GROUP BY u.user_id, u.name, u.foto
           ORDER BY copies DESC, stars DESC LIMIT 72`,
          [row.id],
        ),
        query<{ id: number; name: string; foto: string | null }>(
          `SELECT u.user_id id, u.name, u.foto FROM card_wishlist w JOIN dle_users u ON u.user_id = w.user_id
           WHERE w.card_id = ? ORDER BY w.added_date DESC LIMIT 72`,
          [row.id],
        ),
        query<{ id: number; name: string; foto: string | null; copies: number }>(
          `SELECT u.user_id id, u.name, u.foto, COUNT(*) copies
           FROM user_cards uc JOIN dle_users u ON u.user_id = uc.user_id
           WHERE uc.card_id = ? AND uc.is_on_sale = 0 GROUP BY u.user_id, u.name, u.foto
           HAVING copies > 1 ORDER BY copies DESC LIMIT 72`,
          [row.id],
        ),
        query<{ n: number }>("SELECT COUNT(DISTINCT user_id) n FROM user_cards WHERE card_id = ?", [row.id]),
        query<{ n: number }>("SELECT COUNT(*) n FROM card_wishlist WHERE card_id = ?", [row.id]),
        query<{ n: number }>("SELECT COUNT(*) n FROM (SELECT user_id FROM user_cards WHERE card_id = ? AND is_on_sale = 0 GROUP BY user_id HAVING COUNT(*) > 1) extra", [row.id]),
      ]);
      const [wish] = me ? await query<{ id: number }>("SELECT id FROM card_wishlist WHERE user_id = ? AND card_id = ? LIMIT 1", [me, row.id]) : [];
      const faceOf = (person: { id: number; name: string; foto: string | null }, text: string) => ({ id: person.id, name: person.name, avatar: personPhoto(person.foto), text });
      data.card = {
        ...face(row), description: row.description || "", author: row.author || "", wished: Boolean(wish),
        holderCount: Number(holders[0]?.n ?? 0), wishCount: Number(wishCount[0]?.n ?? 0), tradeCount: Number(tradeCount[0]?.n ?? 0), owners,
        people: people.map((person) => faceOf(person, Number(person.copies) > 1 ? `${person.copies} ასლი` : "მფლობელი")),
        wishes: wishes.map((person) => faceOf(person, "უნდა")),
        traders: traders.map((person) => faceOf(person, `${person.copies} ასლი`)),
      };
      if (me) data.copies = (await myCopies(me)).filter((copy) => !copy.sale).slice(0, 40);
    }
  }
  if (section === "mine" && me) {
    const perPage = 42;
    const where = ["uc.user_id = ?"];
    const params: unknown[] = [me];
    if (data.q) {
      where.push("c.name LIKE ?");
      params.push(`%${data.q}%`);
    }
    if (data.title) {
      where.push("p.title LIKE ?");
      params.push(`%${data.title}%`);
    }
    if (data.author) {
      where.push("c.author LIKE ?");
      params.push(`%${data.author}%`);
    }
    const ranks = rankList(data.rarity);
    const excluded = rankList(data.exclude).filter((rank) => !ranks.includes(rank));
    if (ranks.length) {
      where.push(`UPPER(c.rarity) IN (${ranks.map(() => "?").join(",")})`);
      params.push(...ranks);
    }
    if (excluded.length) {
      where.push(`UPPER(c.rarity) NOT IN (${excluded.map(() => "?").join(",")})`);
      params.push(...excluded);
    }
    const order = `${data.sort === "new" ? "uc.id" : sortColumns[data.sort]} ${data.dir === "desc" ? "DESC" : "ASC"}, uc.id DESC`;
    const from = `FROM user_cards uc JOIN anime_cards c ON c.id = uc.card_id LEFT JOIN dle_post p ON ${animePost} WHERE ${where.join(" AND ")}`;
    const [count] = await query<{ n: number }>(`SELECT COUNT(*) n ${from}`, params);
    data.total = Number(count?.n) || 0;
    data.pages = Math.max(1, Math.ceil(data.total / perPage));
    data.page = Math.min(data.page, data.pages);
    const rows = await query<{ id: number; card_id: number; name: string; image: string; rarity: string; stars: number; is_on_sale: number; is_featured: number }>(
      `SELECT uc.id, uc.card_id, c.name, c.image, c.rarity, uc.stars, uc.is_on_sale, uc.is_featured ${from}
       ORDER BY ${order} LIMIT ? OFFSET ?`,
      [...params, perPage, (data.page - 1) * perPage],
    );
    data.copies = rows.map((row) => ({
      id: row.id, cardId: row.card_id, name: row.name, image: hosted(row.image), rarity: row.rarity,
      stars: Number(row.stars) || 0, sale: row.is_on_sale === 1, featured: row.is_featured === 1,
    }));
  }
  if (section === "cases") {
    const rows = await query<{ id: number; name: string; image: string; price: number; description: string; coin_chance: number; coin_min: number; coin_max: number; pity_data: string; n: number }>(
      `SELECT c.id, c.name, c.image, c.price, c.description, c.coin_chance, c.coin_min, c.coin_max, c.pity_data,
        (SELECT COUNT(*) FROM case_items i WHERE i.case_id = c.id) n
       FROM anime_cases c WHERE c.is_private = 0 ORDER BY c.price, c.id`,
    );
    const ids = rows.map((row) => row.id);
    const marks = ids.map(() => "?").join(",");
    const previews = ids.length ? await query<{ case_id: number; id: number; name: string; image: string; rarity: string }>(
      `SELECT i.case_id, c.id, c.name, c.image, c.rarity FROM case_items i JOIN anime_cards c ON c.id = i.card_id
       WHERE i.case_id IN (${marks}) AND ${linkedCard} ORDER BY FIELD(UPPER(c.rarity), 'RE', 'S+', 'S', 'A', 'B', 'C', 'D', 'E'), c.id`,
      ids,
    ) : [];
    const counts = me && ids.length ? await query<{ case_id: number; n: number }>(
      `SELECT case_id, COUNT(*) n FROM anime_case_history WHERE user_id = ? AND case_id IN (${marks}) GROUP BY case_id`,
      [me, ...ids],
    ) : [];
    const opened = new Map(counts.map((row) => [row.case_id, Number(row.n) || 0]));
    const cardsOf = new Map<number, { id: number; name: string; image: string; rarity: string }[]>();
    for (const card of previews) {
      const list = cardsOf.get(card.case_id) ?? [];
      if (list.length < 12) list.push({ id: card.id, name: card.name, image: hosted(card.image), rarity: card.rarity });
      cardsOf.set(card.case_id, list);
    }
    data.cases = rows.map((row) => ({
      id: row.id, name: row.name, image: hosted(row.image), price: Number(row.price) || 0, text: row.description || "", count: Number(row.n) || 0,
      chance: Number(row.coin_chance) || 0, coinMin: Number(row.coin_min) || 0, coinMax: Number(row.coin_max) || 0, opened: opened.get(row.id) ?? 0,
      pity: pityRules(row.pity_data), cards: cardsOf.get(row.id) ?? [],
    }));
    if (me) {
      data.pulled = (await query<{ id: number; name: string; image: string; rarity: string }>(
        `SELECT c.id, c.name, c.image, c.rarity FROM anime_case_history h JOIN anime_cards c ON c.id = h.card_id
         WHERE h.user_id = ? AND h.card_id > 0 ORDER BY h.id DESC LIMIT 3`,
        [me],
      )).map((row) => ({ id: row.id, name: row.name, image: hosted(row.image), rarity: row.rarity }));
      await readyOffers();
      const [pending] = await query<{ id: number; payload: string }>("SELECT id, payload FROM pack_offers WHERE user_id = ? LIMIT 1", [me]);
      if (pending) {
        const offer = parseOffer(pending.payload);
        if (offer.cards.length === 3) data.offer = { id: pending.id, step: offer.step, total: offer.total, cards: await decorate(me, offer.cards) };
      }
      data.packs = await packStatus(me);
    }
  }
  if (section === "market") {
    await settleMarket();
    const rows = await query<{ id: number; name: string; image: string; rarity: string; seller: string; start_price: number; current_bid: number; buy_now_price: number; seller_id: number }>(
      `SELECT m.id, c.name, c.image, c.rarity, u.name seller, m.start_price, m.current_bid, m.buy_now_price, m.seller_id
       FROM cards_marketplace m
       JOIN user_cards uc ON uc.id = m.user_card_id
       JOIN anime_cards c ON c.id = uc.card_id
       JOIN dle_users u ON u.user_id = m.seller_id
       WHERE m.status = 0 ORDER BY m.end_date LIMIT 48`,
    );
    data.market = rows.map((row) => ({
      id: row.id, name: row.name, image: hosted(row.image), rarity: row.rarity, seller: row.seller,
      price: Number(row.start_price) || 0, bid: Number(row.current_bid) || 0, buy: Number(row.buy_now_price) || 0, mine: row.seller_id === me,
    }));
    if (me) data.copies = (await myCopies(me)).filter((copy) => !copy.sale);
  }
  if (section === "progress") {
    const rows = me ? await query<{ news_id: number; title: string; slug: string; id: number; name: string; image: string; rarity: string; owned: number }>(
      `SELECT c.news_id, COALESCE(p.title, '') title, COALESCE(p.alt_name, '') slug, c.id, c.name, c.image, c.rarity, COALESCE(o.n, 0) owned
       FROM anime_cards c
       JOIN dle_post p ON ${animePost}
       LEFT JOIN (SELECT card_id, COUNT(*) n FROM user_cards WHERE user_id = ? GROUP BY card_id) o ON o.card_id = c.id
       WHERE c.news_id IN (SELECT DISTINCT c2.news_id FROM user_cards uc JOIN anime_cards c2 ON c2.id = uc.card_id WHERE uc.user_id = ? AND c2.news_id > 0)
       ORDER BY FIELD(UPPER(c.rarity), 'RE', 'S+', 'S', 'A', 'B', 'C', 'D', 'E'), c.id`,
      [me, me],
    ) : [];
    const byAnime = new Map<number, PlayData["progress"][number]>();
    for (const row of rows) {
      const anime = byAnime.get(row.news_id) ?? { id: row.news_id, title: row.title || "უცნობი ანიმე", slug: row.slug, poster: "", cards: [] };
      anime.cards.push({ id: row.id, name: row.name, image: hosted(row.image), rarity: row.rarity || "E", owned: Number(row.owned) || 0 });
      byAnime.set(row.news_id, anime);
    }
    data.progress = [...byAnime.values()].filter((anime) => anime.cards.length >= 10);
    const ids = data.progress.map((anime) => anime.id);
    if (ids.length) {
      const posts = await query<{ id: number; xfields: string }>(`SELECT id, xfields FROM dle_post WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
      const posters = new Map(posts.map((post) => [post.id, hosted(parseXFields(post.xfields).image)]));
      for (const anime of data.progress) anime.poster = posters.get(anime.id) ?? "";
    }
  }
  if (section === "animeprogress" && me && extra.id) {
    const [post] = await query<{ id: number; title: string; alt_name: string; xfields: string }>(
      "SELECT p.id, p.title, p.alt_name, p.xfields FROM dle_post p WHERE p.id = ? AND p.approve = 1 AND FIND_IN_SET('10', p.category) > 0 AND FIND_IN_SET('48', p.category) = 0 LIMIT 1",
      [extra.id],
    );
    if (post) {
      const cards = await query<{ id: number; name: string; image: string; rarity: string; owned: number; wished: number }>(
        `SELECT c.id, c.name, c.image, c.rarity, COALESCE(o.n, 0) owned,
           EXISTS (SELECT 1 FROM card_wishlist w WHERE w.card_id = c.id AND w.user_id = ?) wished
         FROM anime_cards c
         LEFT JOIN (SELECT card_id, COUNT(*) n FROM user_cards WHERE user_id = ? GROUP BY card_id) o ON o.card_id = c.id
         WHERE c.news_id = ?
         ORDER BY FIELD(UPPER(c.rarity), 'RE', 'S+', 'S', 'A', 'B', 'C', 'D', 'E'), c.id`,
        [me, me, post.id],
      );
      data.anime = {
        id: post.id,
        title: post.title,
        slug: post.alt_name,
        poster: hosted(parseXFields(post.xfields).image),
        cards: cards.map((card) => ({ id: card.id, name: card.name, image: hosted(card.image), rarity: (card.rarity || "E").toUpperCase(), owned: Number(card.owned) || 0, wished: Boolean(Number(card.wished)) })),
      };
    }
  }
  if (section === "newdeck" && me) {
    data.copies = (await myCopies(me, 0)).filter((copy) => !copy.sale);
  }
  if (section === "mydecks" && me) {
    data.copies = (await myCopies(me)).filter((copy) => !copy.sale);
    data.decks = await deckList(me);
  }
  if ((section === "liked" || section === "created") && me) {
    const rows = await query<{ id: number; name: string; image: string; rarity: string; anime: string; slug: string }>(
      section === "liked"
        ? `SELECT c.id, c.name, c.image, c.rarity, COALESCE(p.title,'') anime, COALESCE(p.alt_name,'') slug, ${cardExtras(me)}
           FROM card_likes l JOIN anime_cards c ON c.id = l.card_id LEFT JOIN dle_post p ON ${animePost}
           WHERE l.user_id = ? ORDER BY l.id DESC`
        : `SELECT c.id, c.name, c.image, c.rarity, COALESCE(p.title,'') anime, COALESCE(p.alt_name,'') slug, ${cardExtras(me)}
           FROM anime_cards c LEFT JOIN dle_post p ON ${animePost}
           WHERE c.author = ? ORDER BY c.id DESC`,
      [section === "liked" ? me : user?.name ?? ""],
    );
    data.wishes = rows.map(face);
  }
  if ((section === "craft" || section === "upgrade" || section === "awaken" || section === "skybrick") && me) {
    data.copies = (await myCopies(me, section === "skybrick" || section === "awaken" ? 0 : 120)).filter((copy) => !copy.sale);
  }
  if (section === "upgrade" && data.q) {
    const found = await catalog({ q: data.q, title: "", author: "", rarity: "", exclude: "", sort: "name", dir: "asc", page: 1, userId: me });
    data.cards = found.cards.slice(0, 12);
  }
  if (section === "clubs") {
    const rows = await query<{ id: number; name: string; description: string; avatar: string; cover: string; level: number; xp: number; n: number; max_members: number; club_tag: string; owner: string; mine: number; club_name_style: string | null; name_style: string | null; club_badge: string | null }>(
      `SELECT c.id, c.name, c.description, c.avatar, c.cover, c.level, c.xp, c.max_members, c.club_tag, COALESCE(u.name, '') owner,
        c.club_name_style, c.name_style, c.club_badge,
        (SELECT COUNT(*) FROM dle_club_members m WHERE m.club_id = c.id AND m.status = 1) n,
        (SELECT COUNT(*) FROM dle_club_members m WHERE m.club_id = c.id AND m.status = 1 AND m.user_id = ?) mine
       FROM dle_clubs c LEFT JOIN dle_users u ON u.user_id = c.owner_id
       ORDER BY c.level DESC, c.xp DESC, c.id`,
      [me],
    );
    const clubImage = (file: string) => (file ? hosted(file.includes("/") ? file : `/uploads/clubs/${file}`) : "");
    for (const row of rows) {
      const level = clubLevelFor(Number(row.xp) || 0);
      if (level > (Number(row.level) || 1)) {
        row.level = level;
        await execute("UPDATE dle_clubs SET level = ? WHERE id = ? AND level < ?", [level, row.id, level]);
      }
    }
    rows.sort((a, b) => b.level - a.level || b.xp - a.xp || a.id - b.id);
    data.clubs = rows.map((row) => ({
      id: row.id, name: row.name, text: row.description || "", avatar: clubImage(row.avatar), cover: clubImage(row.cover),
      level: Number(row.level) || 1, xp: Number(row.xp) || 0, members: Number(row.n) || 0, max: Number(row.max_members) || 0,
      tag: row.club_tag || "", owner: row.owner, mine: Number(row.mine) > 0,
      style: clubStyleOf(row.club_name_style, row.name_style), badge: clubBadgeOf(row.club_badge),
    }));
  }
  if (section === "collectors") {
    const rows = await query<{ id: number; name: string; foto: string | null; total: number; uniq: number; score: number; top: string }>(
      `SELECT u.user_id id, u.name, u.foto, s.total, s.uniq, s.score, s.top FROM (
         SELECT uc.user_id, COUNT(*) total, COUNT(DISTINCT uc.card_id) uniq,
           SUM(CASE UPPER(c.rarity) WHEN 'RE' THEN 1000 WHEN 'S+' THEN 640 WHEN 'S' THEN 320 WHEN 'A' THEN 160 WHEN 'B' THEN 80 WHEN 'C' THEN 40 WHEN 'D' THEN 20 ELSE 10 END) score,
           ELT(MAX(FIELD(UPPER(c.rarity), 'E', 'D', 'C', 'B', 'A', 'S', 'S+', 'RE')), 'E', 'D', 'C', 'B', 'A', 'S', 'S+', 'RE') top
         FROM user_cards uc JOIN anime_cards c ON c.id = uc.card_id GROUP BY uc.user_id
       ) s JOIN dle_users u ON u.user_id = s.user_id
       ORDER BY s.uniq DESC, s.score DESC LIMIT 50`,
    );
    data.collectors = rows.map((row) => ({
      id: row.id, name: row.name, avatar: personPhoto(row.foto), total: Number(row.total) || 0, unique: Number(row.uniq) || 0,
      score: Number(row.score) || 0, top: row.top || "E", me: row.id === me,
    }));
  }
  if (section === "decks") data.decks = await deckList();
  if (section === "deck" && extra.id) {
    const [row] = await query<{ id: number; title: string; description: string; user_id: number; author: string; foto: string; likes: number; views: number; created: string; liked: number }>(
      `SELECT d.id, d.title, d.description, d.user_id, u.name author, u.foto, d.likes, d.views, DATE_FORMAT(d.created_at, '%Y-%m-%d') created,
         EXISTS (SELECT 1 FROM anime_deck_likes l WHERE l.deck_id = d.id AND l.user_id = ?) liked
       FROM anime_collections d JOIN dle_users u ON u.user_id = d.user_id WHERE d.id = ? LIMIT 1`,
      [me, extra.id],
    );
    if (row) {
      if (row.user_id !== me) await execute("UPDATE anime_collections SET views = views + 1 WHERE id = ?", [row.id]);
      const cards = await query<{ id: number; name: string; image: string; rarity: string; anime: string; slug: string; owned: number }>(
        `SELECT c.id, c.name, c.image, c.rarity, COALESCE(p.title,'') anime, COALESCE(p.alt_name,'') slug,
           (SELECT COUNT(*) FROM user_cards uc WHERE uc.card_id = c.id AND uc.user_id = ?) owned
         FROM anime_collection_items i JOIN anime_cards c ON c.id = i.card_id LEFT JOIN dle_post p ON ${animePost}
         WHERE i.collection_id = ?
         ORDER BY FIELD(UPPER(c.rarity), 'RE', 'S+', 'S', 'A', 'B', 'C', 'D', 'E'), c.id`,
        [me, row.id],
      );
      data.deck = {
        id: row.id, title: row.title, text: row.description || "", author: row.author, avatar: personPhoto(row.foto), likes: Number(row.likes) || 0,
        views: (Number(row.views) || 0) + (row.user_id !== me ? 1 : 0), created: row.created, liked: Boolean(Number(row.liked)), mine: row.user_id === me, cards: cards.map(face),
      };
    }
  }
  if (section === "club" && extra.id) {
    const clubImage = (file: string | null) => (file ? hosted(file.includes("/") ? file : `/uploads/clubs/${file}`) : "");
    const [row] = await query<{ id: number; name: string; description: string; avatar: string; cover: string; club_badge: string | null; level: number; xp: number; max_members: number; club_tag: string; vault: string | null; owner: string | null; foto: string | null; created: string | null; boosted: number; club_name_style: string | null; name_style: string | null }>(
      `SELECT c.id, c.name, c.description, c.avatar, c.cover, c.club_badge, c.club_name_style, c.name_style, c.level, c.xp, c.max_members, c.club_tag, c.vault, u.name owner, u.foto,
         DATE_FORMAT(c.created_at, '%Y-%m-%d') created, (c.is_boosted = 1 AND c.boost_expire > NOW()) boosted
       FROM dle_clubs c LEFT JOIN dle_users u ON u.user_id = c.owner_id WHERE c.id = ? LIMIT 1`,
      [extra.id],
    );
    if (row) {
      const synced = clubLevelFor(Number(row.xp) || 0);
      if (synced > (Number(row.level) || 1)) {
        row.level = synced;
        await execute("UPDATE dle_clubs SET level = ? WHERE id = ? AND level < ?", [synced, row.id, synced]);
      }
      const [[place], people, friends, viewer, [pending]] = await Promise.all([
        query<{ place: number; total: number }>(
          `SELECT (SELECT COUNT(*) FROM dle_clubs o WHERE o.level > c.level OR (o.level = c.level AND (o.xp > c.xp OR (o.xp = c.xp AND o.id < c.id)))) + 1 place,
             (SELECT COUNT(*) FROM dle_clubs) total FROM dle_clubs c WHERE c.id = ?`,
          [row.id],
        ),
        query<{ id: number; name: string; foto: string | null; role: string; joined: string | null; cards: number; uniq: number }>(
          `SELECT u.user_id id, u.name, u.foto, m.role, DATE_FORMAT(m.joined_at, '%Y-%m-%d') joined,
             (SELECT COUNT(*) FROM user_cards uc WHERE uc.user_id = u.user_id) cards,
             (SELECT COUNT(DISTINCT uc.card_id) FROM user_cards uc WHERE uc.user_id = u.user_id) uniq
           FROM dle_club_members m JOIN dle_users u ON u.user_id = m.user_id
           WHERE m.club_id = ? AND m.status = 1
           ORDER BY FIELD(m.role, 'owner', 'moderator', 'member'), m.joined_at`,
          [row.id],
        ),
        query<{ id: number; name: string; avatar: string; level: number }>(
          `SELECT c.id, c.name, c.avatar, c.level FROM dle_club_relations r
           JOIN dle_clubs c ON c.id = CASE WHEN r.from_club_id = ? THEN r.to_club_id ELSE r.from_club_id END
           WHERE r.type = 'friend' AND r.status = 1 AND (r.from_club_id = ? OR r.to_club_id = ?)`,
          [row.id, row.id, row.id],
        ),
        me ? query<{ club_id: number; role: string; status: number }>("SELECT club_id, role, status FROM dle_club_members WHERE user_id = ?", [me]) : Promise.resolve([]),
        query<{ n: number }>("SELECT COUNT(*) n FROM dle_club_members WHERE club_id = ? AND status = 0", [row.id]),
      ]);
      const here = viewer.find((item) => item.club_id === row.id);
      const manager = Boolean(here && Number(here.status) === 1 && here.role !== "member");
      const requests = manager && Number(pending?.n) > 0
        ? await query<{ id: number; name: string; foto: string | null; joined: string | null; cards: number; uniq: number }>(
            `SELECT u.user_id id, u.name, u.foto, DATE_FORMAT(m.joined_at, '%Y-%m-%d %H:%i') joined,
               (SELECT COUNT(*) FROM user_cards uc WHERE uc.user_id = u.user_id) cards,
               (SELECT COUNT(DISTINCT uc.card_id) FROM user_cards uc WHERE uc.user_id = u.user_id) uniq
             FROM dle_club_members m JOIN dle_users u ON u.user_id = m.user_id
             WHERE m.club_id = ? AND m.status = 0 ORDER BY m.joined_at DESC`,
            [row.id],
          )
        : [];
      const member = Boolean(here && Number(here.status) === 1);
      const [donations, donors, copies] = await Promise.all([
        query<{ id: number; name: string; foto: string | null; card: string; image: string; rarity: string; xp_added: number; date: string }>(
          `SELECT d.id, u.name, u.foto, c.name card, c.image, UPPER(c.rarity) rarity, d.xp_added, DATE_FORMAT(d.date, '%Y-%m-%d %H:%i') date
           FROM dle_club_xp_donations d JOIN dle_users u ON u.user_id = d.user_id JOIN anime_cards c ON c.id = d.card_id
           WHERE d.club_id = ? ORDER BY d.id DESC LIMIT 12`,
          [row.id],
        ),
        query<{ id: number; name: string; foto: string | null; xp: number; n: number }>(
          `SELECT u.user_id id, u.name, u.foto, SUM(d.xp_added) xp, COUNT(*) n
           FROM dle_club_xp_donations d JOIN dle_users u ON u.user_id = d.user_id
           WHERE d.club_id = ? GROUP BY u.user_id, u.name, u.foto ORDER BY xp DESC LIMIT 5`,
          [row.id],
        ),
        member && me ? myCopies(me, 0) : Promise.resolve([]),
      ]);
      data.copies = copies.filter((copy) => !copy.sale && !copy.featured);
      const badges = here?.role === "owner" && Number(here.status) === 1
        ? await query<{ id: number; name: string; image: string; price: number; min_club_level: number }>("SELECT id, name, image, price, min_club_level FROM anime_badges ORDER BY min_club_level, price, id")
        : [];
      data.club = {
        id: row.id, name: row.name, text: row.description || "", avatar: clubImage(row.avatar), cover: clubImage(row.cover), badge: clubBadgeOf(row.club_badge),
        style: clubStyleOf(row.club_name_style, row.name_style),
        curve: clubCurve, rates: clubXp,
        donations: donations.map((item) => ({ id: item.id, name: item.name, avatar: personPhoto(item.foto), card: item.card, image: hosted(item.image), rarity: item.rarity, xp: Number(item.xp_added) || 0, date: item.date })),
        donors: donors.map((item) => ({ id: item.id, name: item.name, avatar: personPhoto(item.foto), xp: Number(item.xp) || 0, cards: Number(item.n) || 0 })),
        badges: badges.map((item) => ({ id: item.id, name: item.name, image: hosted(item.image), price: Number(item.price) || 0, level: Number(item.min_club_level) || 1 })),
        level: Number(row.level) || 1, xp: Number(row.xp) || 0, max: Number(row.max_members) || 0, tag: row.club_tag || "", vault: Number(row.vault) || 0,
        owner: row.owner ?? "", ownerAvatar: personPhoto(row.foto), created: row.created ?? "", rank: Number(place?.place) || 1, total: Number(place?.total) || 1, boosted: Boolean(Number(row.boosted)),
        role: here && Number(here.status) === 1 ? here.role : "", pending: Boolean(here && Number(here.status) === 0), inClub: viewer.some((item) => Number(item.status) === 1),
        requests: requests.map((item) => ({ id: item.id, name: item.name, avatar: personPhoto(item.foto), joined: item.joined ?? "", cards: Number(item.cards) || 0, uniq: Number(item.uniq) || 0 })),
        friends: friends.map((item) => ({ id: item.id, name: item.name, avatar: clubImage(item.avatar), level: Number(item.level) || 1 })),
        people: people.map((item) => ({ id: item.id, name: item.name, avatar: personPhoto(item.foto), role: item.role, joined: item.joined ?? "", cards: Number(item.cards) || 0, uniq: Number(item.uniq) || 0 })),
      };
    }
  }
  if (section === "trades" && me) {
    const rows = await query<{ id: number; sender_id: number; receiver_id: number; status: string; who: string; foto: string | null; created: string | null; offer_id: number | null; offer_name: string; offer_image: string | null; offer_rarity: string | null; want_id: number | null; want_name: string; want_image: string | null; want_rarity: string | null }>(
      `SELECT t.id, t.sender_id, t.receiver_id, t.status,
        CASE WHEN t.sender_id = ? THEN ru.name ELSE su.name END who,
        CASE WHEN t.sender_id = ? THEN ru.foto ELSE su.foto END foto,
        DATE_FORMAT(t.created_at, '%Y-%m-%d %H:%i') created,
        oc.id offer_id, COALESCE(oc.name, 'წაშლილი ბარათი') offer_name, oc.image offer_image, oc.rarity offer_rarity,
        wc.id want_id, COALESCE(wc.name, 'წაშლილი ბარათი') want_name, wc.image want_image, wc.rarity want_rarity
       FROM anime_trade_offers t
       JOIN dle_users su ON su.user_id = t.sender_id
       JOIN dle_users ru ON ru.user_id = t.receiver_id
       LEFT JOIN user_cards ou ON ou.id = CAST(t.offered_card_id AS UNSIGNED)
       LEFT JOIN anime_cards oc ON oc.id = ou.card_id
       LEFT JOIN user_cards wu ON wu.id = t.wanted_card_id
       LEFT JOIN anime_cards wc ON wc.id = wu.card_id
       WHERE t.sender_id = ? OR t.receiver_id = ? ORDER BY t.id DESC LIMIT 200`,
      [me, me, me, me],
    );
    const label = (status: string) => status === "pending" ? "ელოდება" : status === "accepted" ? "შედგა" : status === "declined" ? "უარყოფილი" : status === "cancelled" ? "გაუქმებული" : status;
    data.trades = rows.map((row) => {
      const sent = row.sender_id === me;
      const offer = { id: Number(row.offer_id ?? 0), name: row.offer_name, image: row.offer_image ? hosted(row.offer_image) : "", rarity: (row.offer_rarity || "E").toUpperCase() };
      const want = { id: Number(row.want_id ?? 0), name: row.want_name, image: row.want_image ? hosted(row.want_image) : "", rarity: (row.want_rarity || "E").toUpperCase() };
      return {
        id: row.id, incoming: !sent && row.status === "pending", sent, state: row.status, who: row.who, avatar: personPhoto(row.foto), created: row.created ?? "",
        offer: offer.name, want: want.name, status: label(row.status), give: sent ? offer : want, get: sent ? want : offer,
      };
    });
  }
  if (section === "wishlist" && me) {
    const rows = await query<{ id: number; name: string; image: string; rarity: string; anime: string; slug: string; owned: number }>(
      `SELECT c.id, c.name, c.image, c.rarity, COALESCE(p.title,'') anime, COALESCE(p.alt_name,'') slug, ${cardExtras(me)},
         (SELECT COUNT(*) FROM user_cards uc WHERE uc.card_id = c.id AND uc.user_id = ?) owned
       FROM card_wishlist w JOIN anime_cards c ON c.id = w.card_id LEFT JOIN dle_post p ON ${animePost}
       WHERE w.user_id = ? ORDER BY w.id DESC`,
      [me, me],
    );
    data.wishes = rows.map(face);
  }
  if (section === "giveaways") {
    await closeGiveaways();
    const rows = await query<{ id: number; title: string; description: string; end_date: string; status: number; winners_json: string; n: number; mine: number }>(
      `SELECT g.id, g.title, g.description, g.end_date, g.status, g.winners_json,
        (SELECT COUNT(*) FROM dle_giveaway_participants p WHERE p.giveaway_id = g.id) n,
        (SELECT COUNT(*) FROM dle_giveaway_participants p WHERE p.giveaway_id = g.id AND p.user_id = ?) mine
       FROM dle_giveaways g ORDER BY g.end_date DESC LIMIT 20`,
      [me],
    );
    data.giveaways = rows.map((row) => ({
      id: row.id, title: row.title, text: row.description || "", end: String(row.end_date).slice(0, 16),
      joined: Number(row.n) || 0, mine: Number(row.mine) > 0, open: row.status === 1 && new Date(String(row.end_date).replace(" ", "T")).getTime() > Date.now(),
      winners: winnerNames(row.winners_json),
    }));
  }
  if (section === "battle") data.battle = await todayBattle(me);
  if (section === "dubbers") {
    const rows = await query<{ id: number; name: string; alt_name: string; photo: string; total_anime: number; avg_rating: number; total_votes: number }>(
      "SELECT id, name, alt_name, photo, total_anime, avg_rating, total_votes FROM dle_dubbers ORDER BY total_votes DESC, name",
    );
    data.dubbers = rows.map((row) => ({ id: row.id, name: row.name, alt: row.alt_name || row.name, image: photo(row.photo), anime: Number(row.total_anime) || 0, rating: Number(row.avg_rating) || 0, votes: Number(row.total_votes) || 0 }));
  }
  if (section === "dubber" && extra.name) {
    const [row] = await query<{ id: number; name: string; photo: string; bio: string; avg_rating: number; total_votes: number }>(
      "SELECT id, name, photo, bio, avg_rating, total_votes FROM dle_dubbers WHERE alt_name = ? OR name = ? LIMIT 1",
      [extra.name, extra.name],
    );
    if (row) {
      const [mine] = me ? await query<{ id: number }>("SELECT id FROM dle_dubber_ratings WHERE dubber_id = ? AND user_id = ? LIMIT 1", [row.id, me]) : [];
      data.dubber = { id: row.id, name: row.name, image: photo(row.photo), bio: row.bio || "", rating: Number(row.avg_rating) || 0, votes: Number(row.total_votes) || 0, mine: Boolean(mine) };
    }
  }
  if (section === "pet" && me) {
    try { data.pet = await readPet(me); } catch { data.note = data.note || "ცხოველი ვერ გაიხსნა."; }
  }
  if (section === "labyrinth" && me) {
    try { data.labyrinth = await readLabyrinth(me); } catch { data.note = data.note || "ლაბირინთი ვერ გაიხსნა."; }
  }
  if (section === "taste" && extra.name && me) data.taste = await tasteOf(me, extra.name);
  if (section === "showcase" && extra.id) {
    const [owner] = await query<{ name: string }>("SELECT name FROM dle_users WHERE user_id = ? LIMIT 1", [extra.id]);
    const rows = await query<{ id: number; name: string; image: string; rarity: string }>(
      `SELECT c.id, c.name, c.image, c.rarity FROM user_cards uc JOIN anime_cards c ON c.id = uc.card_id
       WHERE uc.user_id = ? AND uc.is_featured = 1 ORDER BY uc.stars DESC LIMIT 12`,
      [extra.id],
    );
    data.showcase = { name: owner?.name ?? "", cards: rows.map(face) };
  }
  return data;
}

function pityRules(raw: string) {
  try {
    const rules = JSON.parse(raw || "[]");
    if (!Array.isArray(rules)) return [];
    return rules.flatMap((rule) => {
      const limit = Number(rule?.limit) || 0;
      const rarity = String(rule?.rarities ?? "").trim();
      return limit && rarity ? [{ limit, rarity }] : [];
    });
  } catch {
    return [];
  }
}

function pickWeighted<T extends { drop_chance: number }>(items: T[]) {
  const total = items.reduce((sum, item) => sum + Math.max(1, Number(item.drop_chance) || 0), 0);
  let roll = Math.floor(Math.random() * total);
  for (const item of items) {
    roll -= Math.max(1, Number(item.drop_chance) || 0);
    if (roll < 0) return item;
  }
  return items[0];
}

type PackDraw = { cardId: number; name: string; image: string; rarity: string; coins: number };

async function readyOffers() {
  await execute(
    `CREATE TABLE IF NOT EXISTS pack_offers (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      case_id INT NOT NULL,
      payload TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      UNIQUE KEY pack_offer_user (user_id)
    )`,
  );
}

function asDraws(rows: unknown): PackDraw[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    cardId: Number(row?.cardId) || 0,
    name: String(row?.name ?? ""),
    image: String(row?.image ?? ""),
    rarity: String(row?.rarity ?? ""),
    coins: Number(row?.coins) || 0,
  }));
}

function parseOffer(raw: string) {
  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return { total: 1, step: 1, cards: asDraws(data) };
    const total = Number(data?.total) || 1;
    const step = Number(data?.step) || 1;
    return { total, step, cards: asDraws(data?.cards) };
  } catch {
    return { total: 1, step: 1, cards: [] as PackDraw[] };
  }
}

function drawFace(draw: PackDraw): PackDraw {
  return { ...draw, image: draw.image ? hosted(draw.image) : "" };
}

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

type PoolCard = { card_id: number; drop_chance: number; name: string; image: string; rarity: string };

const rarityWeight: Record<string, number> = { E: 4500, D: 2600, C: 1600, B: 850, A: 335, S: 80, "S+": 25, RE: 10 };
const rarityLadder = ["E", "D", "C", "B", "A", "S", "S+", "RE"];
const packPrice = 150;

async function collectPool() {
  return query<PoolCard>(
    `SELECT c.id card_id, 1 drop_chance, c.name, c.image, c.rarity
     FROM anime_cards c
     WHERE ${linkedCard} AND c.id IN (
       SELECT DISTINCT i.card_id FROM case_items i
       JOIN anime_cases a ON a.id = i.case_id AND a.is_private = 0
     )`,
  );
}

function pickByRarity(pool: PoolCard[], used: Set<number>) {
  const groups = new Map<string, PoolCard[]>();
  for (const card of pool) {
    const rank = card.rarity.toUpperCase();
    const list = groups.get(rank) ?? [];
    list.push(card);
    groups.set(rank, list);
  }
  const total = rarityLadder.reduce((sum, rank) => sum + rarityWeight[rank], 0);
  let roll = Math.random() * total;
  let step = 0;
  for (; step < rarityLadder.length - 1; step += 1) {
    roll -= rarityWeight[rarityLadder[step]];
    if (roll < 0) break;
  }
  let group: PoolCard[] | undefined;
  for (let down = step; down >= 0 && !group; down -= 1) group = groups.get(rarityLadder[down]);
  for (let up = step + 1; up < rarityLadder.length && !group; up += 1) group = groups.get(rarityLadder[up]);
  group ??= pool;
  const fresh = group.filter((card) => !used.has(card.card_id));
  const source = fresh.length ? fresh : group;
  return source[Math.floor(Math.random() * source.length)];
}

async function rollTrio(rank = "") {
  const pool = await collectPool();
  if (!pool.length) return [];
  const forced = rank ? pool.filter((card) => card.rarity.toUpperCase() === rank) : [];
  const used = new Set<number>();
  const draws: PackDraw[] = [];
  for (let index = 0; index < 3; index += 1) {
    const card = forced.length ? pickByRarity(forced, used) : pickByRarity(pool, used);
    used.add(card.card_id);
    draws.push({ cardId: card.card_id, name: card.name, image: card.image, rarity: card.rarity, coins: 0 });
  }
  return shuffle(draws);
}

const bonusAEvery = 50;
const bonusSEvery = 200;
const dailyCoins = 100;

async function readyPity() {
  await execute(
    `CREATE TABLE IF NOT EXISTS pack_pity (
      user_id INT NOT NULL PRIMARY KEY,
      a_count INT NOT NULL DEFAULT 0,
      s_count INT NOT NULL DEFAULT 0,
      daily_at DATE NULL
    )`,
  );
}

export async function packStatus(userId: number) {
  await readyPity();
  const [row] = await query<{ a_count: number; s_count: number; daily: number }>(
    "SELECT a_count, s_count, IF(daily_at = CURDATE(), 1, 0) daily FROM pack_pity WHERE user_id = ? LIMIT 1",
    [userId],
  );
  return {
    aLeft: bonusAEvery - (Number(row?.a_count) || 0),
    sLeft: bonusSEvery - (Number(row?.s_count) || 0),
    aEvery: bonusAEvery,
    sEvery: bonusSEvery,
    daily: Number(row?.daily) === 1,
    dailyCoins,
  };
}

async function nextTrio(userId: number) {
  await readyPity();
  await execute("INSERT IGNORE INTO pack_pity (user_id) VALUES (?)", [userId]);
  await execute("UPDATE pack_pity SET a_count = a_count + 1, s_count = s_count + 1 WHERE user_id = ?", [userId]);
  const [row] = await query<{ a_count: number; s_count: number }>("SELECT a_count, s_count FROM pack_pity WHERE user_id = ? LIMIT 1", [userId]);
  const bonusA = Number(row?.a_count) >= bonusAEvery;
  const cards = await rollTrio(bonusA ? "A" : "");
  if (bonusA) await execute("UPDATE pack_pity SET a_count = 0 WHERE user_id = ?", [userId]);
  let gift: PackDraw | null = null;
  if (Number(row?.s_count) >= bonusSEvery) {
    await execute("UPDATE pack_pity SET s_count = 0 WHERE user_id = ?", [userId]);
    const [card] = await query<{ id: number; name: string; image: string; rarity: string }>(`SELECT id, name, image, rarity FROM anime_cards c WHERE UPPER(rarity) = 'S' AND ${linkedCard} ORDER BY RAND() LIMIT 1`);
    if (card) {
      await execute("INSERT INTO user_cards (user_id, card_id, get_date) VALUES (?, ?, NOW())", [userId, card.id]);
      gift = drawFace({ cardId: card.id, name: card.name, image: card.image, rarity: card.rarity, coins: 0 });
    }
  }
  return { cards, bonusA, gift };
}

async function decorate(userId: number, draws: PackDraw[]) {
  const ids = draws.map((draw) => draw.cardId).filter(Boolean);
  if (!ids.length) return draws.map((draw) => ({ ...drawFace(draw), owned: 0, wished: false, holders: 0 }));
  const marks = ids.map(() => "?").join(",");
  const [mine, wishes, holders] = await Promise.all([
    query<{ card_id: number; n: number }>(`SELECT card_id, COUNT(*) n FROM user_cards WHERE user_id = ? AND card_id IN (${marks}) GROUP BY card_id`, [userId, ...ids]),
    query<{ card_id: number }>(`SELECT card_id FROM card_wishlist WHERE user_id = ? AND card_id IN (${marks})`, [userId, ...ids]),
    query<{ card_id: number; n: number }>(`SELECT card_id, COUNT(DISTINCT user_id) n FROM user_cards WHERE card_id IN (${marks}) GROUP BY card_id`, ids),
  ]);
  const owned = new Map(mine.map((row) => [row.card_id, Number(row.n) || 0]));
  const wished = new Set(wishes.map((row) => row.card_id));
  const held = new Map(holders.map((row) => [row.card_id, Number(row.n) || 0]));
  return draws.map((draw) => ({ ...drawFace(draw), owned: owned.get(draw.cardId) ?? 0, wished: wished.has(draw.cardId), holders: held.get(draw.cardId) ?? 0 }));
}

export async function claimDaily(userId: number) {
  await readyPity();
  await execute("INSERT IGNORE INTO pack_pity (user_id) VALUES (?)", [userId]);
  const result = await execute("UPDATE pack_pity SET daily_at = CURDATE() WHERE user_id = ? AND (daily_at IS NULL OR daily_at < CURDATE())", [userId]);
  if (!result.affectedRows) return { error: "დღევანდელი ბონუსი უკვე აიღე." };
  await giveCoins(userId, dailyCoins);
  return { coins: await wallet(userId), status: await packStatus(userId) };
}

export async function beginPackOpen(userId: number, caseId: number, times = 1) {
  await readyOffers();
  const total = times === 6 || times === 20 ? times : 1;
  const [pending] = await query<{ id: number; payload: string }>("SELECT id, payload FROM pack_offers WHERE user_id = ? LIMIT 1", [userId]);
  if (pending) {
    const offer = parseOffer(pending.payload);
    if (offer.cards.length === 3) return { offerId: pending.id, coins: await wallet(userId), cards: await decorate(userId, offer.cards), step: offer.step, total: offer.total, bonusA: false, gift: null, status: await packStatus(userId) };
    await execute("DELETE FROM pack_offers WHERE id = ?", [pending.id]);
  }
  const price = packPrice * total;
  if (!(await takeCoins(userId, price))) return { error: "მონეტა არ გყოფნის." };
  if ((await collectPool()).length < 3) {
    await giveCoins(userId, price);
    return { error: "ქარდები ვერ მოიძებნა." };
  }
  const { cards, bonusA, gift } = await nextTrio(userId);
  const result = await execute(
    "INSERT INTO pack_offers (user_id, case_id, payload, created_at) VALUES (?, ?, ?, NOW())",
    [userId, caseId, JSON.stringify({ total, step: 1, cards })],
  );
  return { offerId: result.insertId, coins: await wallet(userId), cards: await decorate(userId, cards), step: 1, total, bonusA, gift, status: await packStatus(userId) };
}

export async function keepPackCard(userId: number, offerId: number, index: number) {
  await readyOffers();
  const [offer] = await query<{ id: number; case_id: number; payload: string }>("SELECT id, case_id, payload FROM pack_offers WHERE id = ? AND user_id = ? LIMIT 1", [offerId, userId]);
  if (!offer) return { error: "პაკი ვერ მოიძებნა." };
  const saved = parseOffer(offer.payload);
  const pick = saved.cards[index];
  if (!pick) return { error: "ქარდი ვერ მოიძებნა." };
  const claimed = await execute(
    "UPDATE pack_offers SET payload = ? WHERE id = ? AND user_id = ? AND payload = ?",
    [JSON.stringify({ total: saved.total, step: saved.step, cards: [] }), offer.id, userId, offer.payload],
  );
  if (!claimed.affectedRows) return { error: "ეს ქარდი უკვე აირჩიე." };
  if (pick.cardId) {
    await execute("INSERT INTO user_cards (user_id, card_id, get_date) VALUES (?, ?, NOW())", [userId, pick.cardId]);
    await execute("INSERT INTO anime_case_history (user_id, case_id, card_id, date) VALUES (?, ?, ?, NOW())", [userId, offer.case_id, pick.cardId]);
  } else {
    await giveCoins(userId, pick.coins);
    await execute("INSERT INTO anime_case_history (user_id, case_id, card_id, date) VALUES (?, ?, 0, NOW())", [userId, offer.case_id]);
  }
  if (saved.step < saved.total) {
    const { cards: next, bonusA, gift } = await nextTrio(userId);
    if (next.length < 3) {
      await execute("DELETE FROM pack_offers WHERE id = ? AND user_id = ?", [offer.id, userId]);
      return { coins: await wallet(userId), card: drawFace(pick), next: null, step: saved.step, total: saved.total, bonusA: false, gift, status: await packStatus(userId) };
    }
    const step = saved.step + 1;
    await execute("UPDATE pack_offers SET payload = ? WHERE id = ? AND user_id = ?", [JSON.stringify({ total: saved.total, step, cards: next }), offer.id, userId]);
    return { coins: await wallet(userId), card: drawFace(pick), next: await decorate(userId, next), step, total: saved.total, bonusA, gift, status: await packStatus(userId) };
  }
  await execute("DELETE FROM pack_offers WHERE id = ? AND user_id = ?", [offer.id, userId]);
  return { coins: await wallet(userId), card: drawFace(pick), next: null, step: saved.step, total: saved.total, bonusA: false, gift: null, status: await packStatus(userId) };
}

export async function openCaseFor(userId: number, caseId: number) {
  const [box] = await query<{ id: number; name: string; price: number; coin_chance: number; coin_min: number; coin_max: number; pity_data: string }>(
    "SELECT id, name, price, coin_chance, coin_min, coin_max, pity_data FROM anime_cases WHERE id = ? AND is_private = 0 LIMIT 1",
    [caseId],
  );
  if (!box) return "პაკი ვერ მოიძებნა.";
  const price = Number(box.price) || 0;
  if (!(await takeCoins(userId, price))) return "მონეტა არ გყოფნის.";
  const pool = await query<{ card_id: number; drop_chance: number; name: string; image: string; rarity: string }>(
    `SELECT i.card_id, i.drop_chance, c.name, c.image, c.rarity FROM case_items i JOIN anime_cards c ON c.id = i.card_id WHERE i.case_id = ? AND ${linkedCard}`,
    [caseId],
  );
  if (!pool.length) {
    await giveCoins(userId, price);
    return "პაკი ცარიელია.";
  }
  const [opened] = await query<{ n: number }>("SELECT COUNT(*) n FROM anime_case_history WHERE user_id = ? AND case_id = ?", [userId, caseId]);
  const count = Number(opened?.n ?? 0) + 1;
  let rules: { limit?: number; rarities?: string }[] = [];
  try { rules = JSON.parse(box.pity_data || "[]"); } catch { rules = []; }
  const forced = rules.find((rule) => Number(rule.limit) === count)?.rarities;
  const narrowed = forced ? pool.filter((item) => item.rarity.toUpperCase() === String(forced).toUpperCase()) : [];
  const chance = Number(box.coin_chance) || 0;
  if (chance > 0 && Math.floor(Math.random() * 100) + 1 <= chance) {
    const min = Number(box.coin_min) || 0;
    const max = Math.max(min, Number(box.coin_max) || min);
    const won = min + Math.floor(Math.random() * (max - min + 1));
    await giveCoins(userId, won);
    await execute("INSERT INTO anime_case_history (user_id, case_id, card_id, date) VALUES (?, ?, 0, NOW())", [userId, caseId]);
    return `${box.name}: ${won} მონეტა.`;
  }
  const card = pickWeighted(narrowed.length ? narrowed : pool);
  await execute("INSERT INTO user_cards (user_id, card_id, get_date) VALUES (?, ?, NOW())", [userId, card.card_id]);
  await execute("INSERT INTO anime_case_history (user_id, case_id, card_id, date) VALUES (?, ?, ?, NOW())", [userId, caseId, card.card_id]);
  return `${card.name} · ${card.rarity}`;
}

export async function sellCopy(userId: number, copyId: number) {
  const [row] = await query<{ id: number; rarity: string }>(
    "SELECT uc.id, c.rarity FROM user_cards uc JOIN anime_cards c ON c.id = uc.card_id WHERE uc.id = ? AND uc.user_id = ? AND uc.is_on_sale = 0 LIMIT 1",
    [copyId, userId],
  );
  if (!row) return "ბარათი ვერ მოიძებნა.";
  const price = sellPrice[row.rarity.toUpperCase()] ?? 10;
  const removed = await execute("DELETE FROM user_cards WHERE id = ? AND user_id = ? AND is_on_sale = 0", [copyId, userId]);
  if (!removed.affectedRows) return "ბარათი ვერ მოიძებნა.";
  await giveCoins(userId, price);
  return `გაიყიდა ${price} მონეტად.`;
}

export async function featureCopy(userId: number, copyId: number) {
  const [row] = await query<{ id: number; is_featured: number }>("SELECT id, is_featured FROM user_cards WHERE id = ? AND user_id = ? LIMIT 1", [copyId, userId]);
  if (!row) return "ბარათი ვერ მოიძებნა.";
  if (row.is_featured !== 1) {
    const [count] = await query<{ n: number }>("SELECT COUNT(*) n FROM user_cards WHERE user_id = ? AND is_featured = 1", [userId]);
    if (Number(count?.n ?? 0) >= 6) return "ვიტრინაზე 6 ბარათი ჭერია.";
  }
  await execute("UPDATE user_cards SET is_featured = IF(is_featured = 1, 0, 1) WHERE id = ? AND user_id = ?", [copyId, userId]);
  return row.is_featured === 1 ? "ვიტრინიდან მოიხსნა." : "ვიტრინაზე დადგა.";
}

export async function mergeStars(userId: number, cardId: number) {
  const rows = await query<{ id: number; stars: number }>(
    "SELECT id, stars FROM user_cards WHERE user_id = ? AND card_id = ? AND is_on_sale = 0 ORDER BY stars DESC, id LIMIT 2",
    [userId, cardId],
  );
  if (rows.length < 2) return "ორი თავისუფალი ასლი სჭირდება.";
  if (Number(rows[0].stars) >= 5) return "5 ვარსკვლავი ჭერია.";
  const removed = await execute("DELETE FROM user_cards WHERE id = ? AND user_id = ? AND is_on_sale = 0", [rows[1].id, userId]);
  if (!removed.affectedRows) return "ასლი ვერ მოიძებნა.";
  await execute("UPDATE user_cards SET stars = LEAST(stars + 1, 5) WHERE id = ?", [rows[0].id]);
  return "ასლი ვარსკვლავად იქცა.";
}

export async function listCopy(userId: number, copyId: number, price: number, buy: number) {
  if (price < 10) return "საწყისი ფასი მინიმუმ 10 მონეტაა.";
  const claimed = await execute("UPDATE user_cards SET is_on_sale = 1 WHERE id = ? AND user_id = ? AND is_on_sale = 0", [copyId, userId]);
  if (!claimed.affectedRows) return "ბარათი ვერ მოიძებნა.";
  await execute(
    "INSERT INTO cards_marketplace (user_card_id, seller_id, start_price, buy_now_price, current_bid, end_date, status) VALUES (?, ?, ?, ?, 0, DATE_ADD(NOW(), INTERVAL 24 HOUR), 0)",
    [copyId, userId, price, Math.max(0, buy)],
  );
  return "24 საათით მარკეტზე დადგა.";
}

export async function bidOn(userId: number, tradeId: number, amount: number, buyNow: boolean) {
  const [trade] = await query<{ id: number; seller_id: number; user_card_id: number; start_price: number; current_bid: number; buy_now_price: number; last_bidder_id: number }>(
    "SELECT id, seller_id, user_card_id, start_price, current_bid, buy_now_price, last_bidder_id FROM cards_marketplace WHERE id = ? AND status = 0 AND end_date > NOW() LIMIT 1",
    [tradeId],
  );
  if (!trade || trade.seller_id === userId) return "ამ ლოტზე ვერ დადებ.";
  const claim = (bid: number, close: number) =>
    execute(
      "UPDATE cards_marketplace SET current_bid = ?, last_bidder_id = ?, status = ? WHERE id = ? AND status = 0 AND current_bid = ? AND last_bidder_id <=> ?",
      [bid, userId, close, trade.id, trade.current_bid, trade.last_bidder_id],
    );
  if (buyNow && trade.buy_now_price > 0) {
    if (!(await takeCoins(userId, trade.buy_now_price))) return "მონეტა არ გყოფნის.";
    if (!(await claim(trade.buy_now_price, 1)).affectedRows) {
      await giveCoins(userId, trade.buy_now_price);
      return "ლოტი შეიცვალა, სცადე თავიდან.";
    }
    if (trade.last_bidder_id) await giveCoins(trade.last_bidder_id, trade.current_bid);
    await giveCoins(trade.seller_id, trade.buy_now_price);
    await execute("UPDATE user_cards SET user_id = ?, is_on_sale = 0 WHERE id = ?", [userId, trade.user_card_id]);
    return "ბარათი შენია.";
  }
  const min = trade.current_bid ? Number(trade.current_bid) + 10 : Number(trade.start_price);
  if (amount < min) return `მინიმუმ ${min} მონეტა.`;
  if (!(await takeCoins(userId, amount))) return "მონეტა არ გყოფნის.";
  if (!(await claim(amount, 0)).affectedRows) {
    await giveCoins(userId, amount);
    return "ვიღაცამ უფრო მაღალი ბიჯი დადო, სცადე თავიდან.";
  }
  if (trade.last_bidder_id) await giveCoins(trade.last_bidder_id, trade.current_bid);
  return "ბიჯი დადებულია.";
}

export async function craftCopies(userId: number, copyIds: number[]) {
  const ids = cleanIds(copyIds);
  if (ids.length !== 3) return "სამი ერთი რანგის ბარათი სჭირდება.";
  const rows = await query<{ id: number; rarity: string }>(
    `SELECT uc.id, UPPER(c.rarity) rarity FROM user_cards uc JOIN anime_cards c ON c.id = uc.card_id
     WHERE uc.user_id = ? AND uc.is_on_sale = 0 AND uc.id IN (${ids.map(() => "?").join(",")})`,
    [userId, ...ids],
  );
  if (rows.length !== 3 || new Set(rows.map((row) => row.rarity)).size !== 1) return "სამივე ერთი რანგის უნდა იყოს.";
  const index = craftOrder.indexOf(rows[0].rarity);
  if (index < 0) return "S და ზემოთ გადადნობით არ იცვლება.";
  const next = Math.random() < 0.8 && craftOrder[index + 1] ? craftOrder[index + 1] : rows[0].rarity;
  const [card] = await query<{ id: number; name: string; rarity: string }>(`SELECT id, name, rarity FROM anime_cards c WHERE UPPER(rarity) = ? AND ${linkedCard} ORDER BY RAND() LIMIT 1`, [next]);
  if (!card) return "ამ რანგის ბარათი ვერ მოიძებნა.";
  const removed = await execute(`DELETE FROM user_cards WHERE user_id = ? AND is_on_sale = 0 AND id IN (${ids.map(() => "?").join(",")})`, [userId, ...ids]);
  if (removed.affectedRows !== ids.length) return "ბარათები უკვე გამოყენებულია.";
  await execute("INSERT INTO user_cards (user_id, card_id, get_date) VALUES (?, ?, NOW())", [userId, card.id]);
  return `${card.name} · ${card.rarity}`;
}

export async function upgradeCopies(userId: number, copyIds: number[], targetId: number) {
  const ids = cleanIds(copyIds);
  if (!ids.length || !targetId) return "ბარათები და მიზანი აირჩიე.";
  const rows = await query<{ id: number; rarity: string }>(
    `SELECT uc.id, UPPER(c.rarity) rarity FROM user_cards uc JOIN anime_cards c ON c.id = uc.card_id
     WHERE uc.user_id = ? AND uc.is_on_sale = 0 AND uc.id IN (${ids.map(() => "?").join(",")})`,
    [userId, ...ids],
  );
  if (!rows.length) return "ბარათები ვერ მოიძებნა.";
  const [target] = await query<{ id: number; name: string; rarity: string }>("SELECT id, name, rarity FROM anime_cards WHERE id = ? LIMIT 1", [targetId]);
  if (!target) return "მიზანი ვერ მოიძებნა.";
  const have = rows.reduce((sum, row) => sum + (weight[row.rarity] ?? 10), 0);
  const need = weight[target.rarity.toUpperCase()] ?? 10;
  const chance = Math.min(95, Math.max(1, Math.round((have / need) * 100)));
  const removed = await execute(`DELETE FROM user_cards WHERE user_id = ? AND is_on_sale = 0 AND id IN (${rows.map(() => "?").join(",")})`, [userId, ...rows.map((row) => row.id)]);
  if (removed.affectedRows !== rows.length) return "ბარათები უკვე გამოყენებულია.";
  if (Math.floor(Math.random() * 100) + 1 <= chance) {
    await execute("INSERT INTO user_cards (user_id, card_id, get_date) VALUES (?, ?, NOW())", [userId, target.id]);
    return `${chance}% — ${target.name}`;
  }
  return `${chance}% — ჩავარდა, ბარათები დაიწვა.`;
}

export async function burnCopies(userId: number, copyIds: number[]) {
  const ids = cleanIds(copyIds);
  if (!ids.length) return "ბარათი აირჩიე.";
  const rows = await query<{ id: number; rarity: string }>(
    `SELECT uc.id, UPPER(c.rarity) rarity FROM user_cards uc JOIN anime_cards c ON c.id = uc.card_id
     WHERE uc.user_id = ? AND uc.is_on_sale = 0 AND uc.is_featured = 0 AND uc.id IN (${ids.map(() => "?").join(",")})`,
    [userId, ...ids],
  );
  if (!rows.length) return "ბარათი ვერ მოიძებნა.";
  const gain = rows.reduce((sum, row) => sum + (burnEnergy[row.rarity] ?? 1), 0);
  const removed = await execute(`DELETE FROM user_cards WHERE user_id = ? AND is_on_sale = 0 AND is_featured = 0 AND id IN (${rows.map(() => "?").join(",")})`, [userId, ...rows.map((row) => row.id)]);
  if (removed.affectedRows !== rows.length) return "ბარათები უკვე გამოყენებულია.";
  await execute("UPDATE dle_users SET sky_brick_energy = LEAST(1000, sky_brick_energy + ?) WHERE user_id = ?", [gain, userId]);
  return `+${gain} ენერგია.`;
}

export async function awakenCopies(userId: number, copyIds: number[]) {
  const result = await awakenRun(userId, copyIds);
  if (!result.ok) return result.error;
  if (!result.success) return "ჩავარდა. 40 მონეტა დარჩა.";
  return result.card ? `${result.card.name} · ${result.card.rarity}` : "ამ რანგის ბარათი ვერ მოიძებნა.";
}

export async function awakenRun(userId: number, copyIds: number[]) {
  const ids = cleanIds(copyIds);
  if ((await energyOf(userId)) < 1000) return { ok: false as const, error: "1000 ენერგია სჭირდება." };
  const rows = await query<{ id: number; rarity: string }>(
    `SELECT uc.id, UPPER(c.rarity) rarity FROM user_cards uc JOIN anime_cards c ON c.id = uc.card_id
     WHERE uc.user_id = ? AND uc.is_on_sale = 0 AND uc.is_featured = 0 AND uc.id IN (${ids.map(() => "?").join(",") || "0"})`,
    [userId, ...ids],
  );
  const rarity = rows[0]?.rarity;
  const valid = rows.length === 3 && rows.every((row) => row.rarity === rarity) && (rarity === "S" || rarity === "S+");
  if (!valid) return { ok: false as const, error: "სამი S ან სამი S+ სჭირდება." };
  const target = rarity === "S" ? "S+" : "RE";
  const paid = await execute("UPDATE dle_users SET sky_brick_energy = sky_brick_energy - 1000 WHERE user_id = ? AND sky_brick_energy >= 1000", [userId]);
  if (!paid.affectedRows) return { ok: false as const, error: "1000 ენერგია სჭირდება." };
  const removed = await execute(`DELETE FROM user_cards WHERE user_id = ? AND is_on_sale = 0 AND is_featured = 0 AND id IN (${rows.map(() => "?").join(",")})`, [userId, ...rows.map((row) => row.id)]);
  if (removed.affectedRows !== rows.length) {
    await execute("UPDATE dle_users SET sky_brick_energy = LEAST(1000, sky_brick_energy + 1000) WHERE user_id = ?", [userId]);
    return { ok: false as const, error: "ბარათები უკვე გამოყენებულია." };
  }
  const success = Math.random() < 0.95;
  let card: { id: number; copy: number; name: string; image: string; rarity: string } | null = null;
  if (success) {
    const [row] = await query<{ id: number; name: string; image: string; rarity: string }>(`SELECT id, name, image, rarity FROM anime_cards c WHERE UPPER(rarity) = ? AND ${linkedCard} ORDER BY RAND() LIMIT 1`, [target]);
    if (row) {
      const inserted = await execute("INSERT INTO user_cards (user_id, card_id, get_date) VALUES (?, ?, NOW())", [userId, row.id]);
      card = { id: row.id, copy: inserted.insertId, name: row.name, image: hosted(row.image), rarity: row.rarity.toUpperCase() };
    }
  }
  const reward = success ? 200 : 40;
  await giveCoins(userId, reward);
  return { ok: true as const, success, target, card, reward, used: rows.map((row) => row.id), energy: await energyOf(userId), coins: await wallet(userId) };
}

export async function createDeck(userId: number, title: string, cardIds: number[], description = "") {
  const name = title.trim().slice(0, 80);
  const text = description.trim().slice(0, 500);
  const ids = cleanIds(cardIds);
  if (name.length < 2 || ids.length < 3) return "სახელი და მინიმუმ 3 ბარათი სჭირდება.";
  const owned = await query<{ card_id: number }>(
    `SELECT DISTINCT card_id FROM user_cards WHERE user_id = ? AND card_id IN (${ids.map(() => "?").join(",")})`,
    [userId, ...ids],
  );
  if (owned.length !== ids.length) return "მხოლოდ შენი ბარათები ჩაჯდება.";
  const result = await execute("INSERT INTO anime_collections (user_id, title, description, views, likes, created_at) VALUES (?, ?, ?, 0, 0, NOW())", [userId, name, text]);
  await execute(`INSERT INTO anime_collection_items (collection_id, card_id) VALUES ${ids.map(() => "(?, ?)").join(",")}`, ids.flatMap((id) => [result.insertId, id]));
  return "კოლექცია შეიქმნა.";
}

export async function createDeckFromCopies(userId: number, title: string, copyIds: number[], description = "") {
  const name = title.trim().slice(0, 80);
  const text = description.trim().slice(0, 500);
  const ids = cleanIds(copyIds);
  if (name.length < 2 || ids.length < 3) return { error: "სახელი და მინიმუმ 3 ბარათი სჭირდება." };
  const copies = await query<{ card_id: number }>(
    `SELECT card_id FROM user_cards WHERE user_id = ? AND id IN (${ids.map(() => "?").join(",")}) ORDER BY id`,
    [userId, ...ids],
  );
  if (copies.length !== ids.length) return { error: "მხოლოდ შენი ბარათები ჩაჯდება." };
  const result = await execute("INSERT INTO anime_collections (user_id, title, description, views, likes, created_at) VALUES (?, ?, ?, 0, 0, NOW())", [userId, name, text]);
  await execute(`INSERT INTO anime_collection_items (collection_id, card_id) VALUES ${copies.map(() => "(?, ?)").join(",")}`, copies.flatMap((copy) => [result.insertId, copy.card_id]));
  return { id: result.insertId };
}

export async function toggleCardLike(userId: number, cardId: number) {
  const [card] = await query<{ id: number }>("SELECT id FROM anime_cards WHERE id = ? LIMIT 1", [cardId]);
  if (!card) return { ok: false as const, error: "ბარათი ვერ მოიძებნა." };
  const [have] = await query<{ id: number }>("SELECT id FROM card_likes WHERE user_id = ? AND card_id = ? LIMIT 1", [userId, cardId]);
  if (have) await execute("DELETE FROM card_likes WHERE id = ?", [have.id]);
  else await execute("INSERT INTO card_likes (user_id, card_id) VALUES (?, ?)", [userId, cardId]);
  await execute("UPDATE anime_cards c SET likes_count = (SELECT COUNT(*) FROM card_likes l WHERE l.card_id = c.id) WHERE c.id = ?", [cardId]);
  const [row] = await query<{ likes_count: number }>("SELECT likes_count FROM anime_cards WHERE id = ? LIMIT 1", [cardId]);
  return { ok: true as const, likes: Number(row?.likes_count ?? 0), liked: !have };
}

export async function toggleDeckLike(userId: number, deckId: number) {
  const [deck] = await query<{ id: number }>("SELECT id FROM anime_collections WHERE id = ? LIMIT 1", [deckId]);
  if (!deck) return null;
  const [have] = await query<{ id: number }>("SELECT id FROM anime_deck_likes WHERE deck_id = ? AND user_id = ? LIMIT 1", [deckId, userId]);
  if (have) {
    await execute("DELETE FROM anime_deck_likes WHERE id = ?", [have.id]);
    await execute("UPDATE anime_collections SET likes = GREATEST(likes - 1, 0) WHERE id = ?", [deckId]);
  } else {
    await execute("INSERT INTO anime_deck_likes (deck_id, user_id, user_ip) VALUES (?, ?, '')", [deckId, userId]);
    await execute("UPDATE anime_collections SET likes = likes + 1 WHERE id = ?", [deckId]);
  }
  const [row] = await query<{ likes: number }>("SELECT likes FROM anime_collections WHERE id = ? LIMIT 1", [deckId]);
  return { liked: !have, likes: Number(row?.likes) || 0 };
}

export async function removeDeck(userId: number, deckId: number) {
  const [deck] = await query<{ id: number }>("SELECT id FROM anime_collections WHERE id = ? AND user_id = ? LIMIT 1", [deckId, userId]);
  if (!deck) return false;
  await execute("DELETE FROM anime_collection_items WHERE collection_id = ?", [deckId]);
  await execute("DELETE FROM anime_deck_likes WHERE deck_id = ?", [deckId]);
  await execute("DELETE FROM anime_collections WHERE id = ?", [deckId]);
  return true;
}

export async function likeDeck(userId: number, deckId: number) {
  const [have] = await query<{ id: number }>("SELECT id FROM anime_deck_likes WHERE deck_id = ? AND user_id = ? LIMIT 1", [deckId, userId]);
  if (have) return "უკვე მოწონებულია.";
  await execute("INSERT INTO anime_deck_likes (deck_id, user_id, user_ip) VALUES (?, ?, '')", [deckId, userId]);
  await execute("UPDATE anime_collections SET likes = likes + 1 WHERE id = ?", [deckId]);
  return "მოგწონს.";
}

export async function sendTrade(userId: number, offerId: number, wantedId: number) {
  const [offer] = await query<{ id: number }>("SELECT id FROM user_cards WHERE id = ? AND user_id = ? AND is_on_sale = 0 LIMIT 1", [offerId, userId]);
  const [wanted] = await query<{ id: number; user_id: number }>("SELECT id, user_id FROM user_cards WHERE id = ? AND is_on_sale = 0 LIMIT 1", [wantedId]);
  if (!offer || !wanted || wanted.user_id === userId) return "გაცვლა ვერ შედგა.";
  await execute(
    "INSERT INTO anime_trade_offers (sender_id, receiver_id, offered_card_id, wanted_card_id, status, created_at) VALUES (?, ?, ?, ?, 'pending', NOW())",
    [userId, wanted.user_id, String(offerId), wantedId],
  );
  return "შეთავაზება გაგზავნილია.";
}

export async function answerTrade(userId: number, tradeId: number, accept: boolean) {
  const [trade] = await query<{ id: number; sender_id: number; receiver_id: number; offered_card_id: string; wanted_card_id: number; status: string }>(
    "SELECT id, sender_id, receiver_id, offered_card_id, wanted_card_id, status FROM anime_trade_offers WHERE id = ? LIMIT 1",
    [tradeId],
  );
  if (!trade || trade.receiver_id !== userId || trade.status !== "pending") return "შეთავაზება აღარ დევს.";
  const claimed = await execute("UPDATE anime_trade_offers SET status = ? WHERE id = ? AND status = 'pending'", [accept ? "accepted" : "declined", tradeId]);
  if (!claimed.affectedRows) return "შეთავაზება აღარ დევს.";
  if (!accept) return "უარი.";
  const offerId = Number(trade.offered_card_id);
  const lock = "UPDATE user_cards SET is_on_sale = 1 WHERE id = ? AND user_id = ? AND is_on_sale = 0";
  const mine = await execute(lock, [trade.wanted_card_id, userId]);
  const theirs = mine.affectedRows ? await execute(lock, [offerId, trade.sender_id]) : null;
  if (!theirs?.affectedRows) {
    if (mine.affectedRows) await execute("UPDATE user_cards SET is_on_sale = 0 WHERE id = ?", [trade.wanted_card_id]);
    await execute("UPDATE anime_trade_offers SET status = 'declined' WHERE id = ?", [tradeId]);
    return "ბარათი უკვე აღარ არის.";
  }
  await execute("UPDATE user_cards SET user_id = ?, is_on_sale = 0, is_featured = 0 WHERE id = ?", [userId, offerId]);
  await execute("UPDATE user_cards SET user_id = ?, is_on_sale = 0, is_featured = 0 WHERE id = ?", [trade.sender_id, trade.wanted_card_id]);
  return "გაცვალეთ.";
}

export async function clubMembership(userId: number, clubId: number, action: string) {
  const [club] = await query<{ id: number; max_members: number }>("SELECT id, max_members FROM dle_clubs WHERE id = ? LIMIT 1", [clubId]);
  if (!club) return { ok: false as const, error: "კლუბი ვერ მოიძებნა." };
  const mine = await query<{ club_id: number; role: string; status: number }>("SELECT club_id, role, status FROM dle_club_members WHERE user_id = ?", [userId]);
  const here = mine.find((item) => item.club_id === clubId);
  if (action === "join") {
    if (mine.some((item) => Number(item.status) === 1)) return { ok: false as const, error: "უკვე კლუბის წევრი ხარ." };
    if (here) return { ok: false as const, error: "განაცხადი უკვე გაგზავნილია." };
    const [count] = await query<{ n: number }>("SELECT COUNT(*) n FROM dle_club_members WHERE club_id = ? AND status = 1", [clubId]);
    if (Number(club.max_members) > 0 && Number(count?.n) >= Number(club.max_members)) return { ok: false as const, error: "კლუბში ადგილი აღარ არის." };
    await execute("INSERT INTO dle_club_members (club_id, user_id, role, status, joined_at) VALUES (?, ?, 'member', 0, NOW())", [clubId, userId]);
    return { ok: true as const, state: "pending", text: "განაცხადი გაიგზავნა." };
  }
  if (action === "cancel") {
    if (!here || Number(here.status) !== 0) return { ok: false as const, error: "განაცხადი ვერ მოიძებნა." };
    await execute("DELETE FROM dle_club_members WHERE club_id = ? AND user_id = ? AND status = 0", [clubId, userId]);
    return { ok: true as const, state: "", text: "განაცხადი გაუქმდა." };
  }
  if (action === "leave") {
    if (!here || Number(here.status) !== 1) return { ok: false as const, error: "ამ კლუბის წევრი არ ხარ." };
    if (here.role === "owner") return { ok: false as const, error: "მფლობელი კლუბს ვერ დატოვებს." };
    await execute("DELETE FROM dle_club_members WHERE club_id = ? AND user_id = ? AND status = 1", [clubId, userId]);
    return { ok: true as const, state: "", text: "კლუბი დატოვე." };
  }
  return { ok: false as const, error: "უცნობი მოქმედება." };
}

export async function clubRole(userId: number, clubId: number) {
  const [row] = await query<{ role: string }>("SELECT role FROM dle_club_members WHERE club_id = ? AND user_id = ? AND status = 1 LIMIT 1", [clubId, userId]);
  return row?.role ?? "";
}

export async function clubManage(userId: number, clubId: number, action: string, body: { user?: number; name?: string; text?: string; tag?: string; max?: number; badge?: number; style?: string }) {
  const role = await clubRole(userId, clubId);
  if (role !== "owner" && role !== "moderator") return { ok: false as const, error: "ამის უფლება არ გაქვს." };
  const target = Number(body.user) || 0;

  if (action === "badge") {
    if (role !== "owner") return { ok: false as const, error: "ბეჯს მხოლოდ მფლობელი ცვლის." };
    const id = Number(body.badge) || 0;
    if (!id) {
      await execute("UPDATE dle_clubs SET club_badge = 'none' WHERE id = ?", [clubId]);
      return { ok: true as const, text: "ბეჯი მოიხსნა.", badge: "", vault: null };
    }
    const [[badge], [club]] = await Promise.all([
      query<{ image: string; price: number; min_club_level: number }>("SELECT image, price, min_club_level FROM anime_badges WHERE id = ? LIMIT 1", [id]),
      query<{ level: number; vault: string | null; club_badge: string | null }>("SELECT level, vault, club_badge FROM dle_clubs WHERE id = ? LIMIT 1", [clubId]),
    ]);
    if (!badge || !club) return { ok: false as const, error: "ბეჯი ვერ მოიძებნა." };
    if (club.club_badge === badge.image) return { ok: false as const, error: "ეს ბეჯი უკვე დაყენებულია." };
    const price = Number(badge.price) || 0;
    const need = Number(badge.min_club_level) || 1;
    if ((Number(club.level) || 1) < need) return { ok: false as const, error: `ამ ბეჯისთვის საჭიროა ${need} დონე.` };
    if ((Number(club.vault) || 0) < price) return { ok: false as const, error: `ხაზინაში საკმარისი თანხა არ არის (${price}).` };
    const done = await execute(
      "UPDATE dle_clubs SET vault = CAST(vault AS UNSIGNED) - ?, club_badge = ? WHERE id = ? AND level >= ? AND CAST(vault AS UNSIGNED) >= ?",
      [price, badge.image, clubId, need, price],
    );
    if (!done.affectedRows) return { ok: false as const, error: "ბეჯის შეძენა ვერ მოხერხდა." };
    return { ok: true as const, text: "ბეჯი შეცვლილია.", badge: hosted(badge.image), vault: (Number(club.vault) || 0) - price };
  }

  if (action === "style") {
    if (role !== "owner") return { ok: false as const, error: "სტილს მხოლოდ მფლობელი ცვლის." };
    const style = String(body.style ?? "");
    if (!(clubStyles as readonly string[]).includes(style)) return { ok: false as const, error: "უცნობი სტილი." };
    await execute("UPDATE dle_clubs SET club_name_style = ?, name_style = ? WHERE id = ?", [style === "none" ? null : style, style, clubId]);
    return { ok: true as const, text: "სახელის სტილი შეცვლილია.", style };
  }

  if (action === "edit") {
    if (role !== "owner") return { ok: false as const, error: "რედაქტირება მხოლოდ მფლობელს შეუძლია." };
    const name = String(body.name ?? "").trim();
    const text = String(body.text ?? "").trim();
    const tag = String(body.tag ?? "").trim().toUpperCase();
    if (name.length < 2 || name.length > 40) return { ok: false as const, error: "სახელი 2-დან 40 სიმბოლომდე უნდა იყოს." };
    if (text.length > 1500) return { ok: false as const, error: "აღწერა 1500 სიმბოლოზე გრძელია." };
    if (tag && !/^[A-Z0-9]{2,6}$/.test(tag)) return { ok: false as const, error: "ტეგი 2–6 ლათინური ასო ან ციფრი უნდა იყოს." };
    const [taken] = await query<{ id: number }>("SELECT id FROM dle_clubs WHERE name = ? AND id <> ? LIMIT 1", [name, clubId]);
    if (taken) return { ok: false as const, error: "ასეთი სახელით კლუბი უკვე არსებობს." };
    await execute("UPDATE dle_clubs SET name = ?, description = ?, club_tag = ? WHERE id = ?", [name, text, tag, clubId]);
    return { ok: true as const, text: "ცვლილებები შენახულია." };
  }

  if (!target || target === userId) return { ok: false as const, error: "მომხმარებელი ვერ მოიძებნა." };
  const [member] = await query<{ role: string; status: number }>("SELECT role, status FROM dle_club_members WHERE club_id = ? AND user_id = ? LIMIT 1", [clubId, target]);
  if (!member) return { ok: false as const, error: "მომხმარებელი ვერ მოიძებნა." };

  if (action === "approve" || action === "reject") {
    if (Number(member.status) !== 0) return { ok: false as const, error: "განაცხადი აღარ არის." };
    if (action === "reject") {
      await execute("DELETE FROM dle_club_members WHERE club_id = ? AND user_id = ? AND status = 0", [clubId, target]);
      return { ok: true as const, text: "განაცხადი უარყოფილია." };
    }
    const [other] = await query<{ id: number }>("SELECT id FROM dle_club_members WHERE user_id = ? AND status = 1 LIMIT 1", [target]);
    if (other) {
      await execute("DELETE FROM dle_club_members WHERE club_id = ? AND user_id = ? AND status = 0", [clubId, target]);
      return { ok: false as const, error: "მომხმარებელი უკვე სხვა კლუბშია. განაცხადი წაიშალა." };
    }
    const [[club], [count]] = await Promise.all([
      query<{ max_members: number }>("SELECT max_members FROM dle_clubs WHERE id = ? LIMIT 1", [clubId]),
      query<{ n: number }>("SELECT COUNT(*) n FROM dle_club_members WHERE club_id = ? AND status = 1", [clubId]),
    ]);
    if (Number(club?.max_members) > 0 && Number(count?.n) >= Number(club?.max_members)) return { ok: false as const, error: "კლუბში ადგილი აღარ არის." };
    await execute("UPDATE dle_club_members SET status = 1, role = 'member', joined_at = NOW() WHERE club_id = ? AND user_id = ? AND status = 0", [clubId, target]);
    await execute("UPDATE dle_clubs SET member_count = (SELECT COUNT(*) FROM dle_club_members WHERE club_id = ? AND status = 1) WHERE id = ?", [clubId, clubId]);
    return { ok: true as const, text: "წევრი მიღებულია." };
  }

  if (Number(member.status) !== 1) return { ok: false as const, error: "ეს მომხმარებელი წევრი არ არის." };
  if (member.role === "owner") return { ok: false as const, error: "მფლობელზე ეს მოქმედება ვერ შესრულდება." };

  if (action === "kick") {
    if (role === "moderator" && member.role !== "member") return { ok: false as const, error: "მოდერატორს მხოლოდ წევრის გაგდება შეუძლია." };
    await execute("DELETE FROM dle_club_members WHERE club_id = ? AND user_id = ? AND status = 1", [clubId, target]);
    await execute("UPDATE dle_clubs SET member_count = (SELECT COUNT(*) FROM dle_club_members WHERE club_id = ? AND status = 1) WHERE id = ?", [clubId, clubId]);
    return { ok: true as const, text: "წევრი გაგდებულია." };
  }
  if (action === "promote" || action === "demote") {
    if (role !== "owner") return { ok: false as const, error: "როლს მხოლოდ მფლობელი ცვლის." };
    const next = action === "promote" ? "moderator" : "member";
    await execute("UPDATE dle_club_members SET role = ? WHERE club_id = ? AND user_id = ? AND status = 1", [next, clubId, target]);
    return { ok: true as const, text: action === "promote" ? "მოდერატორად დაინიშნა." : "მოდერატორობა მოხსნილია." };
  }
  return { ok: false as const, error: "უცნობი მოქმედება." };
}

export async function clubDonate(userId: number, clubId: number, copyIds: number[]) {
  if (!(await clubRole(userId, clubId))) return { ok: false as const, error: "შეწირვა მხოლოდ კლუბის წევრს შეუძლია." };
  const ids = cleanIds(copyIds).slice(0, 50);
  if (!ids.length) return { ok: false as const, error: "ბარათი აირჩიე." };
  const rows = await query<{ id: number; card_id: number; rarity: string }>(
    `SELECT uc.id, uc.card_id, UPPER(c.rarity) rarity FROM user_cards uc JOIN anime_cards c ON c.id = uc.card_id
     WHERE uc.user_id = ? AND uc.is_on_sale = 0 AND uc.is_featured = 0 AND uc.id IN (${ids.map(() => "?").join(",")})`,
    [userId, ...ids],
  );
  if (!rows.length) return { ok: false as const, error: "ბარათი ვერ მოიძებნა." };
  const removed = await execute(`DELETE FROM user_cards WHERE user_id = ? AND is_on_sale = 0 AND is_featured = 0 AND id IN (${rows.map(() => "?").join(",")})`, [userId, ...rows.map((row) => row.id)]);
  if (removed.affectedRows !== rows.length) return { ok: false as const, error: "ბარათები შეიცვალა, სცადე თავიდან." };
  const gain = rows.reduce((sum, row) => sum + (clubXp[row.rarity] ?? 5), 0);
  await execute(
    `INSERT INTO dle_club_xp_donations (club_id, user_id, card_id, xp_added) VALUES ${rows.map(() => "(?, ?, ?, ?)").join(", ")}`,
    rows.flatMap((row) => [clubId, userId, row.card_id, clubXp[row.rarity] ?? 5]),
  );
  await execute("UPDATE dle_clubs SET xp = xp + ? WHERE id = ?", [gain, clubId]);
  const [club] = await query<{ xp: number; level: number }>("SELECT xp, level FROM dle_clubs WHERE id = ? LIMIT 1", [clubId]);
  const xp = Number(club?.xp) || 0;
  const before = Number(club?.level) || 1;
  const level = Math.max(before, clubLevelFor(xp));
  if (level !== before) await execute("UPDATE dle_clubs SET level = ? WHERE id = ? AND level < ?", [level, clubId, level]);
  return { ok: true as const, text: level > before ? `+${gain} XP · კლუბმა ${level} დონე მიიღო!` : `+${gain} XP კლუბს.`, gain, xp, level, up: level > before, removed: rows.map((row) => row.id) };
}

export async function clubImageSave(userId: number, clubId: number, kind: "avatar" | "cover", file: string) {
  if ((await clubRole(userId, clubId)) !== "owner") return { ok: false as const, error: "სურათს მხოლოდ მფლობელი ცვლის." };
  await execute(`UPDATE dle_clubs SET ${kind === "avatar" ? "avatar" : "cover"} = ? WHERE id = ?`, [file, clubId]);
  return { ok: true as const, url: hosted(`/uploads/clubs/${file}`) };
}

export async function cancelTrade(userId: number, tradeId: number) {
  const result = await execute("UPDATE anime_trade_offers SET status = 'cancelled' WHERE id = ? AND sender_id = ? AND status = 'pending'", [tradeId, userId]);
  return result.affectedRows ? "შეთავაზება გაუქმდა." : "შეთავაზება აღარ დევს.";
}

export async function toggleWish(userId: number, cardId: number) {
  const [row] = await query<{ id: number }>("SELECT id FROM card_wishlist WHERE user_id = ? AND card_id = ? LIMIT 1", [userId, cardId]);
  if (row) {
    await execute("DELETE FROM card_wishlist WHERE id = ?", [row.id]);
    return "სურვილებიდან მოიხსნა.";
  }
  await execute("INSERT INTO card_wishlist (user_id, card_id, added_date) VALUES (?, ?, NOW())", [userId, cardId]);
  return "სურვილებში დაემატა.";
}

export async function removeWishes(userId: number, cardIds: unknown[]) {
  const ids = cleanIds(cardIds).slice(0, 500);
  if (!ids.length) return 0;
  const result = await execute(`DELETE FROM card_wishlist WHERE user_id = ? AND card_id IN (${ids.map(() => "?").join(",")})`, [userId, ...ids]);
  return result.affectedRows;
}

export async function wishAnimeLeft(userId: number, newsId: number) {
  const missing = await query<{ id: number }>(
    `SELECT c.id FROM anime_cards c
     WHERE c.news_id = ? AND ${linkedCard}
       AND NOT EXISTS (SELECT 1 FROM user_cards uc WHERE uc.card_id = c.id AND uc.user_id = ?)`,
    [newsId, userId],
  );
  if (!missing.length) return { ids: [] as number[], text: "ამ ანიმეს ყველა ქარდი უკვე გაქვს." };
  const ids = missing.map((row) => row.id);
  const marks = ids.map(() => "?").join(",");
  const wished = await query<{ card_id: number }>(`SELECT card_id FROM card_wishlist WHERE user_id = ? AND card_id IN (${marks})`, [userId, ...ids]);
  const have = new Set(wished.map((row) => row.card_id));
  if (have.size === ids.length) {
    await execute(`DELETE FROM card_wishlist WHERE user_id = ? AND card_id IN (${marks})`, [userId, ...ids]);
    return { ids: [] as number[], text: "დარჩენილი ქარდები სურვილებიდან მოიხსნა." };
  }
  const fresh = ids.filter((id) => !have.has(id));
  await execute(`INSERT INTO card_wishlist (user_id, card_id, added_date) VALUES ${fresh.map(() => "(?, ?, NOW())").join(",")}`, fresh.flatMap((id) => [userId, id]));
  return { ids, text: `${fresh.length} ქარდი სურვილებში დაემატა.` };
}

export async function joinGiveaway(userId: number, giveawayId: number) {
  const [row] = await query<{ id: number; status: number; end_date: string }>("SELECT id, status, end_date FROM dle_giveaways WHERE id = ? LIMIT 1", [giveawayId]);
  if (!row || row.status !== 1 || new Date(String(row.end_date).replace(" ", "T")).getTime() <= Date.now()) return "გათამაშება დახურულია.";
  const [have] = await query<{ id: number }>("SELECT id FROM dle_giveaway_participants WHERE giveaway_id = ? AND user_id = ? LIMIT 1", [giveawayId, userId]);
  if (have) return "უკვე ხარ სიაში.";
  await execute("INSERT INTO dle_giveaway_participants (giveaway_id, user_id, joined_at) VALUES (?, ?, NOW())", [giveawayId, userId]);
  return "ჩაემატე.";
}

async function todayBattle(userId: number) {
  await execute(`CREATE TABLE IF NOT EXISTS site_battle (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    day DATE NOT NULL,
    left_id INT NOT NULL,
    right_id INT NOT NULL,
    left_title VARCHAR(180) NOT NULL,
    right_title VARCHAR(180) NOT NULL,
    left_image VARCHAR(255) NOT NULL,
    right_image VARCHAR(255) NOT NULL,
    UNIQUE KEY day (day)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const [existing] = await query<{ id: number; left_id: number; right_id: number; left_title: string; right_title: string; left_image: string; right_image: string }>(
    "SELECT id, left_id, right_id, left_title, right_title, left_image, right_image FROM site_battle WHERE day = CURDATE() LIMIT 1",
  );
  let row = existing;
  if (!row) {
    const pair = await query<{ id: number; title: string; xfields: string }>(
      "SELECT p.id, p.title, p.xfields FROM dle_post p WHERE p.approve = 1 AND NOT FIND_IN_SET('45', p.category) AND NOT FIND_IN_SET('48', p.category) ORDER BY RAND() LIMIT 2",
    );
    if (pair.length < 2) return null;
    const leftImage = absUrl(parseXFields(pair[0].xfields).image) ?? "";
    const rightImage = absUrl(parseXFields(pair[1].xfields).image) ?? "";
    const inserted = await execute(
      "INSERT INTO site_battle (day, left_id, right_id, left_title, right_title, left_image, right_image) VALUES (CURDATE(), ?, ?, ?, ?, ?, ?)",
      [pair[0].id, pair[1].id, pair[0].title.slice(0, 180), pair[1].title.slice(0, 180), leftImage.slice(0, 255), rightImage.slice(0, 255)],
    );
    row = { id: inserted.insertId, left_id: pair[0].id, right_id: pair[1].id, left_title: pair[0].title, right_title: pair[1].title, left_image: leftImage, right_image: rightImage };
  }
  const votes = await query<{ voted_for: number; n: number }>("SELECT voted_for, COUNT(*) n FROM battle_votes WHERE battle_id = ? GROUP BY voted_for", [row.id]);
  const count = (id: number) => Number(votes.find((item) => Number(item.voted_for) === id)?.n ?? 0);
  const [mine] = userId ? await query<{ voted_for: number }>("SELECT voted_for FROM battle_votes WHERE battle_id = ? AND user_id = ? LIMIT 1", [row.id, userId]) : [];
  return {
    id: row.id,
    left: { id: row.left_id, title: row.left_title, image: row.left_image, votes: count(row.left_id) },
    right: { id: row.right_id, title: row.right_title, image: row.right_image, votes: count(row.right_id) },
    voted: Number(mine?.voted_for ?? 0),
  };
}

export async function voteBattle(userId: number, battleId: number, animeId: number) {
  const [row] = await query<{ left_id: number; right_id: number }>("SELECT left_id, right_id FROM site_battle WHERE id = ? AND day = CURDATE() LIMIT 1", [battleId]);
  if (!row || (animeId !== row.left_id && animeId !== row.right_id)) return "ბრძოლა აღარ არის.";
  const [have] = await query<{ id: number }>("SELECT id FROM battle_votes WHERE battle_id = ? AND user_id = ? LIMIT 1", [battleId, userId]);
  if (have) return "დღეს უკვე ხმა გაქვს.";
  await execute("INSERT INTO battle_votes (battle_id, user_id, voted_for) VALUES (?, ?, ?)", [battleId, userId, animeId]);
  return "ხმა ჩაითვალა.";
}

export async function rateDubber(userId: number, dubberId: number, voice: number, text: number, emotion: number) {
  const scores = [voice, text, emotion].map((value) => Math.min(10, Math.max(1, Math.round(value))));
  await execute("DELETE FROM dle_dubber_ratings WHERE dubber_id = ? AND user_id = ?", [dubberId, userId]);
  await execute(
    "INSERT INTO dle_dubber_ratings (dubber_id, user_id, voice_timbre, translation_quality, emotional_acting, rating_date) VALUES (?, ?, ?, ?, ?, NOW())",
    [dubberId, userId, scores[0], scores[1], scores[2]],
  );
  const [avg] = await query<{ rating: number; votes: number }>(
    "SELECT ROUND(AVG((voice_timbre + translation_quality + emotional_acting) / 3), 2) rating, COUNT(*) votes FROM dle_dubber_ratings WHERE dubber_id = ?",
    [dubberId],
  );
  await execute("UPDATE dle_dubbers SET avg_rating = ?, total_votes = ? WHERE id = ?", [avg?.rating ?? 0, avg?.votes ?? 0, dubberId]);
  return "შეფასება ჩაიწერა.";
}

async function readPet(userId: number) {
  let [pet] = await query<{ pet_name: string; level: number; hunger: number; happiness: number; energy: number; xp: number; status: string; expedition_end_time: number }>(
    "SELECT pet_name, level, hunger, happiness, energy, xp, status, expedition_end_time FROM dle_tamagotchi_pets WHERE user_id = ? LIMIT 1",
    [userId],
  );
  if (!pet) {
    await execute(
      "INSERT INTO dle_tamagotchi_pets (user_id, pet_name, pet_type, level, hunger, happiness, energy, xp, status, expedition_end_time, created_at) VALUES (?, 'ციცქნა', 'cat', 1, 70, 70, 80, 0, 'კარგადაა', 0, UNIX_TIMESTAMP())",
      [userId],
    );
    [pet] = await query("SELECT pet_name, level, hunger, happiness, energy, xp, status, expedition_end_time FROM dle_tamagotchi_pets WHERE user_id = ? LIMIT 1", [userId]);
  }
  if (!pet) return null;
  let busy = "";
  const ends = Number(pet.expedition_end_time) || 0;
  if (ends > Math.floor(Date.now() / 1000)) busy = "გზაშია";
  else if (ends > 0) {
    const back = await execute(
      "UPDATE dle_tamagotchi_pets SET expedition_end_time = 0, xp = xp + 30, pet_coins = pet_coins + 25, stat_expeditions_completed = stat_expeditions_completed + 1 WHERE user_id = ? AND expedition_end_time = ?",
      [userId, ends],
    );
    if (back.affectedRows) {
      await giveCoins(userId, 25);
      pet.xp = Number(pet.xp) + 30;
    }
  }
  const xp = Number(pet.xp) || 0;
  const level = Math.max(1, Math.floor(xp / 100) + 1);
  if (level !== Number(pet.level)) await execute("UPDATE dle_tamagotchi_pets SET level = ? WHERE user_id = ?", [level, userId]);
  return { name: pet.pet_name || "ციცქნა", level, hunger: Number(pet.hunger) || 0, happiness: Number(pet.happiness) || 0, energy: Number(pet.energy) || 0, xp, status: pet.status || "", busy };
}

export async function petAct(userId: number, action: string) {
  const pet = await readPet(userId);
  if (!pet) return "ცხოველი ვერ მოიძებნა.";
  if (action === "feed") {
    if (!(await takeCoins(userId, 20))) return "საჭმელს 20 მონეტა სჭირდება.";
    await execute("UPDATE dle_tamagotchi_pets SET hunger = LEAST(100, hunger + 25), stat_feed_count = stat_feed_count + 1, status = 'ჭამა' WHERE user_id = ?", [userId]);
    return "ჭამა.";
  }
  if (action === "play") {
    const [row] = await query<{ last_play_time: number; energy: number }>("SELECT last_play_time, energy FROM dle_tamagotchi_pets WHERE user_id = ? LIMIT 1", [userId]);
    if (Number(row?.energy ?? 0) < 10) return "ენერგია არ ყოფნის.";
    if (Math.floor(Date.now() / 1000) - Number(row?.last_play_time ?? 0) < 1800) return "თამაში 30 წუთში ერთხელ შეგიძლია.";
    const played = await execute(
      "UPDATE dle_tamagotchi_pets SET happiness = LEAST(100, happiness + 20), energy = energy - 10, last_play_time = UNIX_TIMESTAMP(), status = 'თამაშობს' WHERE user_id = ? AND energy >= 10 AND last_play_time <= UNIX_TIMESTAMP() - 1800",
      [userId],
    );
    if (!played.affectedRows) return "თამაში 30 წუთში ერთხელ შეგიძლია.";
    return "ითამაშეთ.";
  }
  if (action === "rest") {
    await execute("UPDATE dle_tamagotchi_pets SET energy = LEAST(100, energy + 30), status = 'ისვენებს' WHERE user_id = ?", [userId]);
    return "ისვენებს.";
  }
  if (action === "walk") {
    if (pet.busy) return "უკვე გზაშია.";
    if (pet.energy < 15) return "გასასვლელად ენერგია არ ყოფნის.";
    const left = await execute(
      "UPDATE dle_tamagotchi_pets SET energy = energy - 15, expedition_end_time = UNIX_TIMESTAMP() + 1200, status = 'გზაშია' WHERE user_id = ? AND expedition_end_time = 0 AND energy >= 15",
      [userId],
    );
    if (!left.affectedRows) return "უკვე გზაშია.";
    return "20 წუთით გავიდა. დაბრუნებაზე 25 მონეტას მოიტანს.";
  }
  return "ვერ მოხერხდა.";
}

const quiz = [
  ["რომელი სტუდია აკეთებს შინგეკი ნო კიოჯინს?", "ufotable"],
  ["რა ჰქვია ტიტანებზე შეტევის მთავარ გმირს?", "ერენი"],
  ["ნარუტო რომელი სოფლისაა?", "კონოჰა"],
];

async function readLabyrinth(userId: number) {
  let [profile] = await query<{ current_x: number; current_y: number; available_moves: number; last_move_at: number; choice_state: string }>(
    "SELECT current_x, current_y, available_moves, last_move_at, choice_state FROM dle_users_labyrinth WHERE user_id = ? LIMIT 1",
    [userId],
  );
  const [start] = await query<{ x: number; y: number }>("SELECT x, y FROM dle_labyrinth_map WHERE room_type = 'START' ORDER BY x, y LIMIT 1");
  if (!profile) {
    const x = start?.x ?? 0;
    const y = start?.y ?? 0;
    await execute(
      "INSERT INTO dle_users_labyrinth (user_id, daily_moves, available_moves, current_x, current_y, last_move_at, labyrinth_balance) VALUES (?, 20, 20, ?, ?, UNIX_TIMESTAMP(), 0)",
      [userId, x, y],
    );
    [profile] = await query("SELECT current_x, current_y, available_moves, last_move_at, choice_state FROM dle_users_labyrinth WHERE user_id = ? LIMIT 1", [userId]);
  }
  if (!profile) return null;
  const last = Number(profile.last_move_at) || 0;
  const sameDay = new Date(last * 1000).toDateString() === new Date().toDateString();
  let moves = Number(profile.available_moves) || 0;
  if (!sameDay) {
    moves = 20;
    await execute("UPDATE dle_users_labyrinth SET available_moves = 20, daily_moves = 20 WHERE user_id = ?", [userId]);
  }
  const rooms = await query<{ x: number; y: number; room_type: string }>("SELECT x, y, room_type FROM dle_labyrinth_map");
  const here = rooms.find((room) => room.x === profile.current_x && room.y === profile.current_y);
  const doors = rooms.filter((room) => Math.abs(room.x - profile.current_x) + Math.abs(room.y - profile.current_y) === 1).slice(0, 4);
  const pending = profile.choice_state || "";
  const question = pending.startsWith("quiz:") ? quiz[Number(pending.slice(5))]?.[0] ?? "" : "";
  return { x: profile.current_x, y: profile.current_y, moves, room: here?.room_type || "EMPTY", text: "", quiz: question, doors: doors.map((door) => ({ x: door.x, y: door.y, room: door.room_type })) };
}

function roomNote(type: string) {
  if (type === "REWARD" || type === "GIFT" || type === "JACKPOT") return "მონეტა იპოვე.";
  if (type === "CARD") return "ბარათი იპოვე.";
  if (type === "PENALTY") return "რაღაც დაგეკარგა.";
  if (type === "QUIZ") return "კითხვას თუ გასცემ, მონეტას მიიღებ.";
  if (type === "MINIBOSS" || type === "HARDBOSS") return "ძველი დახურული გასასვლელი. ბრძოლა არ არის, მონეტა დარჩა.";
  return "ცარიელი ოთახი.";
}

export async function moveLabyrinth(userId: number, x: number, y: number) {
  const state = await readLabyrinth(userId);
  if (!state) return "ლაბირინთი ვერ გაიხსნა.";
  if (state.moves <= 0) return "დღევანდელი სვლები ამოიწურა.";
  if (!state.doors.some((door) => door.x === x && door.y === y)) return "იქიდან გასასვლელი არ არის.";
  const [room] = await query<{ room_type: string }>("SELECT room_type FROM dle_labyrinth_map WHERE x = ? AND y = ? LIMIT 1", [x, y]);
  const type = room?.room_type || "EMPTY";
  const moved = await execute(
    "UPDATE dle_users_labyrinth SET current_x = ?, current_y = ?, prev_x = current_x, prev_y = current_y, available_moves = available_moves - 1, last_move_at = UNIX_TIMESTAMP() WHERE user_id = ? AND current_x = ? AND current_y = ? AND available_moves > 0",
    [x, y, userId, state.x, state.y],
  );
  if (!moved.affectedRows) return "სვლა უკვე გაკეთდა.";
  let note = roomNote(type);
  let choice = "";
  if (type === "REWARD" || type === "GIFT") await giveCoins(userId, 20);
  else if (type === "JACKPOT") await giveCoins(userId, 60);
  else if (type === "PENALTY") await takeCoins(userId, 10);
  else if (type === "CARD") {
    const [card] = await query<{ id: number; name: string }>(`SELECT id, name FROM anime_cards c WHERE UPPER(rarity) IN ('E','D','C') AND ${linkedCard} ORDER BY RAND() LIMIT 1`);
    if (card) {
      await execute("INSERT INTO user_cards (user_id, card_id, get_date) VALUES (?, ?, NOW())", [userId, card.id]);
      note = `${card.name} იპოვე.`;
    }
  } else if (type === "MINIBOSS" || type === "HARDBOSS") await giveCoins(userId, 15);
  else if (type === "QUIZ") {
    choice = `quiz:${Math.floor(Math.random() * quiz.length)}`;
    note = "კითხვა გელოდება.";
  }
  await execute(
    "UPDATE dle_users_labyrinth SET choice_state = ?, last_event_text = ? WHERE user_id = ?",
    [choice, note.slice(0, 240), userId],
  );
  await execute("UPDATE dle_labyrinth_map SET is_cleared = 1 WHERE x = ? AND y = ?", [x, y]);
  return note;
}

export async function answerLabyrinth(userId: number, answer: string) {
  const [profile] = await query<{ choice_state: string }>("SELECT choice_state FROM dle_users_labyrinth WHERE user_id = ? LIMIT 1", [userId]);
  const state = profile?.choice_state || "";
  if (!state.startsWith("quiz:")) return "კითხვა არ დგას.";
  const item = quiz[Number(state.slice(5))];
  const ok = item && answer.trim().toLowerCase() === item[1].toLowerCase();
  const claimed = await execute("UPDATE dle_users_labyrinth SET choice_state = '' WHERE user_id = ? AND choice_state = ?", [userId, state]);
  if (!claimed.affectedRows) return "კითხვა არ დგას.";
  if (!ok) return "არასწორია.";
  await giveCoins(userId, 30);
  return "სწორია. 30 მონეტა.";
}

async function tasteOf(userId: number, name: string) {
  const [other] = await query<{ user_id: number; name: string }>("SELECT user_id, name FROM dle_users WHERE name = ? LIMIT 1", [name]);
  if (!other || other.user_id === userId) return null;
  const mine = await query<{ newsId: number; emote: string }>("SELECT newsId, emote FROM dle_emote_rating_log WHERE userId = ?", [userId]);
  const theirs = await query<{ newsId: number; emote: string }>("SELECT newsId, emote FROM dle_emote_rating_log WHERE userId = ?", [other.user_id]);
  const myMap = new Map(mine.map((row) => [row.newsId, row.emote]));
  const theirMap = new Map(theirs.map((row) => [row.newsId, row.emote]));
  const sharedIds = [...myMap.keys()].filter((id) => theirMap.has(id) && theirMap.get(id) === myMap.get(id));
  const union = new Set([...myMap.keys(), ...theirMap.keys()]);
  const score = union.size ? Math.round((sharedIds.length / union.size) * 100) : 0;
  const ids = sharedIds.slice(0, 8);
  const posts = ids.length
    ? await query<{ id: number; title: string; alt_name: string }>(`SELECT id, title, alt_name FROM dle_post WHERE id IN (${ids.map(() => "?").join(",")})`, ids)
    : [];
  return { name: other.name, score, shared: posts.map((post) => ({ title: post.title, slug: post.alt_name })) };
}
