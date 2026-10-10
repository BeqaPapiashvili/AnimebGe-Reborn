import "server-only";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import avatars from "@/data/avatars.json";
import { xpPath } from "@/lib/site-config";
import covers from "@/data/covers.json";
import frames from "@/data/frames.json";
import { db, execute, query } from "@/lib/db";
import { stillSrc } from "@/lib/dle";

export type ShopKind = "avatar" | "frame" | "cover";

export type ShopItem = {
  id: number;
  type: ShopKind;
  name: string;
  image: string;
  poster: string;
  price: number;
  owned: boolean;
  worn: boolean;
  limited: boolean;
  stock: number;
  taken: boolean;
};

const prices: Record<ShopKind, number> = { avatar: 1200, frame: 2500, cover: 6000 };

let ready: Promise<void> | null = null;

export function readyShop() {
  return ensureShop();
}

function ensureShop() {
  ready ??= (async () => {
    await execute(`CREATE TABLE IF NOT EXISTS site_coins (
      user_id INT NOT NULL PRIMARY KEY,
      balance INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await execute(`CREATE TABLE IF NOT EXISTS site_coin_ledger (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      amount INT NOT NULL,
      reason VARCHAR(24) NOT NULL,
      ref VARCHAR(80) NOT NULL,
      created_at DATETIME NOT NULL,
      UNIQUE KEY user_reason_ref (user_id, reason, ref)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await execute(`CREATE TABLE IF NOT EXISTS site_shop_items (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(12) NOT NULL,
      name VARCHAR(80) NOT NULL,
      image VARCHAR(255) NOT NULL,
      price INT NOT NULL,
      active TINYINT NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL,
      UNIQUE KEY image (image)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await execute(`CREATE TABLE IF NOT EXISTS site_shop_owned (
      user_id INT NOT NULL,
      item_id INT NOT NULL,
      bought_at DATETIME NOT NULL,
      PRIMARY KEY (user_id, item_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    const [count] = await query<{ total: number }>("SELECT COUNT(*) total FROM site_shop_items");
    if (!Number(count?.total)) {
      const rows: [ShopKind, string, string, number][] = [];
      for (const item of avatars.flatMap((group) => group.items)) rows.push(["avatar", item.name, `/assets/avatars/${item.file}`, prices.avatar]);
      for (const item of frames.flatMap((group) => group.items)) rows.push(["frame", item.name, `/assets/frames/${item.file}`, prices.frame]);
      for (const item of covers.flatMap((group) => group.items)) rows.push(["cover", item.name, `/assets/covers/${item.file}`, prices.cover]);
      for (let index = 0; index < rows.length; index += 80) {
        const chunk = rows.slice(index, index + 80);
        await execute(
          `INSERT IGNORE INTO site_shop_items (type, name, image, price, active, created_at) VALUES ${chunk.map(() => "(?, ?, ?, ?, 1, UTC_TIMESTAMP())").join(",")}`,
          chunk.flat(),
        );
      }
    }
    const [cols] = await db.query<RowDataPacket[]>("SHOW COLUMNS FROM site_shop_items");
    if (!cols.some((col) => String(col.Field) === "limited")) await execute("ALTER TABLE site_shop_items ADD COLUMN limited TINYINT NOT NULL DEFAULT 0");
    if (!cols.some((col) => String(col.Field) === "stock")) await execute("ALTER TABLE site_shop_items ADD COLUMN stock INT NOT NULL DEFAULT 1");
    await varyPrices();
  })();
  return ready;
}

function spread(image: string) {
  let n = 2166136261;
  for (let index = 0; index < image.length; index += 1) n = Math.imul(n ^ image.charCodeAt(index), 16777619);
  return n >>> 0;
}

function offer(type: ShopKind, image: string) {
  const n = spread(image);
  const step = n % 9;
  if (type === "cover") {
    const limited = n % 100 < 43;
    return { price: Math.round((limited ? 11000 + step * 900 : 4200 + (n % 6) * 650) / 50) * 50, limited };
  }
  if (type === "frame") {
    const limited = n % 100 < 8;
    return { price: Math.round((limited ? 5200 + step * 350 : 1600 + (n % 12) * 180) / 50) * 50, limited };
  }
  const limited = n % 100 < 14;
  return { price: Math.round((limited ? 3200 + step * 250 : 800 + (n % 10) * 140) / 50) * 50, limited };
}

async function varyPrices() {
  const rows = await query<{ id: number; type: string; image: string }>(
    `SELECT id, type, image FROM site_shop_items WHERE
      (type = 'avatar' AND price IN (40, 250, 800, 1200)) OR
      (type = 'frame' AND price IN (60, 450, 1600, 2500)) OR
      (type = 'cover' AND price IN (100, 900, 4000, 6000))`,
  );
  if (!rows.length) return;
  const owners = await query<{ item_id: number; n: number }>(
    `SELECT item_id, COUNT(*) n FROM site_shop_owned WHERE item_id IN (${rows.map(() => "?").join(",")}) GROUP BY item_id`,
    rows.map((row) => row.id),
  );
  const shared = new Set(owners.filter((row) => Number(row.n) > 1).map((row) => row.item_id));
  for (const row of rows) {
    const type = kindOf(row.type);
    if (!type) continue;
    const next = offer(type, row.image);
    await execute("UPDATE site_shop_items SET price = ?, limited = ? WHERE id = ?", [next.price, next.limited && !shared.has(row.id) ? 1 : 0, row.id]);
  }
}

export function coinsFor(kind: string, xp: number, ref = "") {
  if (kind === "episode") {
    const path = xpPath("episode");
    if (!path) return 0;
    return xp >= path.amount ? path.coins : path.coinsSmall;
  }
  if (kind === "series") return xpPath("series")?.coins ?? 0;
  if (kind === "social") {
    const id = ref.startsWith("post:") ? "post" : ref.startsWith("comment:") ? "comment" : ref.startsWith("rate:") ? "rate" : ref.startsWith("reply:") ? "reply" : "";
    return id ? xpPath(id)?.coins ?? 0 : 0;
  }
  return 0;
}

export async function addCoins(conn: PoolConnection, userId: number, amount: number, reason: string, ref: string) {
  if (amount <= 0) return false;
  const [inserted] = await conn.query<ResultSetHeader>(
    "INSERT IGNORE INTO site_coin_ledger (user_id, amount, reason, ref, created_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP())",
    [userId, amount, reason.slice(0, 24), ref.slice(0, 80)],
  );
  if (!inserted.affectedRows) return false;
  await conn.query(
    "INSERT INTO site_coins (user_id, balance) VALUES (?, ?) ON DUPLICATE KEY UPDATE balance = balance + VALUES(balance)",
    [userId, amount],
  );
  return true;
}

export async function grantCoins(userId: number, amount: number, reason: string, ref: string, cap = 0) {
  await readyShop();
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    if (cap > 0) {
      const [counted] = await conn.query<RowDataPacket[]>("SELECT COUNT(*) n FROM site_coin_ledger WHERE user_id = ? AND reason = ? AND created_at >= UTC_DATE()", [userId, reason]);
      if ((Number(counted[0]?.n) || 0) >= cap) {
        await conn.commit();
        return false;
      }
    }
    const paid = await addCoins(conn, userId, amount, reason, ref);
    await conn.commit();
    return paid;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function takeCoins(conn: PoolConnection, userId: number, reason: string, ref: string) {
  const [rows] = await conn.query<RowDataPacket[]>("SELECT amount FROM site_coin_ledger WHERE user_id = ? AND reason = ? AND ref = ? LIMIT 1", [userId, reason, ref.slice(0, 80)]);
  const paid = Math.abs(Number(rows[0]?.amount) || 0);
  if (!paid) return;
  const [removed] = await conn.query<ResultSetHeader>("DELETE FROM site_coin_ledger WHERE user_id = ? AND reason = ? AND ref = ?", [userId, reason, ref.slice(0, 80)]);
  if (!removed.affectedRows) return;
  await conn.query("UPDATE site_coins SET balance = GREATEST(balance - ?, 0) WHERE user_id = ?", [paid, userId]);
}

function kindOf(value: string): ShopKind | "" {
  return value === "avatar" || value === "frame" || value === "cover" ? value : "";
}

function card(row: { id: number; type: string; name: string; image: string; price: number; owned: number; limited: number; stock: number; taken: number }, worn: Record<ShopKind, string>): ShopItem {
  const type = kindOf(row.type) || "avatar";
  return {
    id: row.id,
    type,
    name: row.name,
    image: row.image,
    poster: stillSrc(row.image) || row.image,
    price: Number(row.price) || 0,
    owned: !!row.owned,
    worn: worn[type] === row.image,
    limited: !!row.limited,
    stock: Math.max(1, Number(row.stock) || 1),
    taken: !!row.taken && !row.owned,
  };
}

async function wornOf(userId?: number) {
  if (!userId) return { avatar: "", frame: "", cover: "" };
  const [row] = await query<{ foto: string | null; decoration_id: string | null; xfields: string }>("SELECT foto, decoration_id, xfields FROM dle_users WHERE user_id = ? LIMIT 1", [userId]);
  const cover = row?.xfields.split("||").find((part) => part.startsWith("cover|"))?.slice(6) ?? "";
  return { avatar: row?.foto ?? "", frame: row?.decoration_id ?? "", cover };
}

const raritySql = `CASE
  WHEN i.limited = 1 AND i.price >= CASE i.type WHEN 'cover' THEN 13200 WHEN 'frame' THEN 6600 ELSE 4200 END THEN 'legend'
  WHEN i.limited = 1 THEN 'epic'
  WHEN i.price >= CASE i.type WHEN 'cover' THEN 6500 WHEN 'frame' THEN 2600 ELSE 1450 END THEN 'rare'
  ELSE 'common'
END`;

export type ShopFilters = {
  sort: "" | "cheap" | "rich" | "name";
  rarity: Array<"common" | "rare" | "epic" | "legend">;
  min: number | null;
  max: number | null;
  afford: boolean;
  hide: boolean;
  anim: boolean;
};

export const emptyShopFilters: ShopFilters = { sort: "", rarity: [], min: null, max: null, afford: false, hide: false, anim: false };

export function shopFilters(params: URLSearchParams): ShopFilters {
  const sort = params.get("sort");
  const min = params.get("min");
  const max = params.get("max");
  return {
    sort: sort === "cheap" || sort === "rich" || sort === "name" ? sort : "",
    rarity: (params.get("rare") ?? "").split(",").filter((item): item is ShopFilters["rarity"][number] => item === "common" || item === "rare" || item === "epic" || item === "legend"),
    min: min && /^\d+$/.test(min) ? Number(min) : null,
    max: max && /^\d+$/.test(max) ? Number(max) : null,
    afford: params.get("afford") === "1",
    hide: params.get("hide") === "1",
    anim: params.get("anim") === "1",
  };
}

export async function getShop(userId: number | undefined, type: ShopKind | "all", page: number, filters: ShopFilters = emptyShopFilters) {
  await ensureShop();
  if (userId) await keepWorn(userId);
  const limit = 25;
  const offset = Math.max(0, page - 1) * limit;
  const worn = await wornOf(userId);
  const parts = ["i.active = 1"];
  const params: unknown[] = [userId ?? 0];
  if (type !== "all") {
    parts.push("i.type = ?");
    params.push(type);
  }
  if (filters.hide) parts.push("o.user_id IS NULL");
  if (filters.min != null) {
    parts.push("i.price >= ?");
    params.push(filters.min);
  }
  if (filters.max != null) {
    parts.push("i.price <= ?");
    params.push(filters.max);
  }
  if (filters.afford) {
    parts.push("i.price <= COALESCE((SELECT balance FROM site_coins WHERE user_id = ?), 0)");
    params.push(userId ?? 0);
  }
  if (filters.anim) parts.push("(i.image LIKE '%.gif' OR i.image LIKE '%.webp' OR i.image LIKE '%.apng' OR i.image LIKE '%.mp4' OR i.image LIKE '%.webm' OR i.image LIKE '%.mov' OR i.image LIKE '%.m4v')");
  if (filters.rarity.length) {
    parts.push(`(${raritySql}) IN (${filters.rarity.map(() => "?").join(",")})`);
    params.push(...filters.rarity);
  }
  const order = filters.sort === "cheap" ? "i.price ASC, i.id" : filters.sort === "rich" ? "i.price DESC, i.id" : filters.sort === "name" ? "i.name ASC, i.id" : "i.id";
  const where = parts.join(" AND ");
  const [count, balanceRow, rows] = await Promise.all([
    query<{ total: number }>(`SELECT COUNT(*) total FROM site_shop_items i LEFT JOIN site_shop_owned o ON o.item_id = i.id AND o.user_id = ? WHERE ${where}`, params),
    userId ? query<{ balance: number }>("SELECT balance FROM site_coins WHERE user_id = ? LIMIT 1", [userId]) : Promise.resolve([]),
    query<{ id: number; type: string; name: string; image: string; price: number; owned: number; limited: number; stock: number; taken: number }>(
      `SELECT i.id, i.type, i.name, i.image, i.price, i.limited, i.stock, IF(o.user_id IS NULL, 0, 1) owned,
        IF(i.limited = 1 AND (SELECT COUNT(*) FROM site_shop_owned x WHERE x.item_id = i.id) >= GREATEST(i.stock, 1) AND o.user_id IS NULL, 1, 0) taken
       FROM site_shop_items i
       LEFT JOIN site_shop_owned o ON o.item_id = i.id AND o.user_id = ?
       WHERE ${where}
       ORDER BY ${order} LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    ),
  ]);
  const total = Number(count[0]?.total) || 0;
  return {
    balance: Number(balanceRow[0]?.balance) || 0,
    pages: Math.max(1, Math.ceil(total / limit)),
    total,
    items: rows.map((row) => card(row, worn)),
  };
}

async function keepWorn(userId: number) {
  const worn = await wornOf(userId);
  const paths = [worn.avatar, worn.frame, worn.cover].filter(Boolean);
  if (!paths.length) return;
  const items = await query<{ id: number }>(
    `SELECT id FROM site_shop_items WHERE image IN (${paths.map(() => "?").join(",")})`,
    paths,
  );
  for (const item of items) {
    await execute("INSERT IGNORE INTO site_shop_owned (user_id, item_id, bought_at) VALUES (?, ?, UTC_TIMESTAMP())", [userId, item.id]);
  }
}

export async function unownedShopFiles(userId: number) {
  await ensureShop();
  const rows = await query<{ image: string }>(
    `SELECT i.image FROM site_shop_items i
     LEFT JOIN site_shop_owned o ON o.item_id = i.id AND o.user_id = ?
     WHERE i.active = 1 AND o.user_id IS NULL`,
    [userId],
  );
  return rows.map((row) => row.image.split("/").pop() ?? "").filter(Boolean);
}

export async function buyShopItem(userId: number, id: number) {
  await ensureShop();
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("SELECT user_id FROM dle_users WHERE user_id = ? FOR UPDATE", [userId]);
    const [items] = await conn.query<RowDataPacket[]>("SELECT id, type, image, price, active, limited, stock FROM site_shop_items WHERE id = ? LIMIT 1 FOR UPDATE", [id]);
    const item = items[0];
    if (!item || !item.active) {
      await conn.rollback();
      return "ნივთი ვერ მოიძებნა.";
    }
    const [owned] = await conn.query<RowDataPacket[]>("SELECT item_id FROM site_shop_owned WHERE user_id = ? AND item_id = ? LIMIT 1", [userId, id]);
    if (!owned.length) {
      if (item.limited) {
        const stock = Math.max(1, Number(item.stock) || 1);
        const [holders] = await conn.query<RowDataPacket[]>("SELECT COUNT(*) n FROM site_shop_owned WHERE item_id = ?", [id]);
        if (Number(holders[0]?.n) >= stock) {
          await conn.rollback();
          return stock === 1 ? "ეს უკვე სხვამ იყიდა." : "ეს რაოდენობა უკვე გაიყიდა.";
        }
      }
      const price = Number(item.price) || 0;
      const [coins] = await conn.query<RowDataPacket[]>("SELECT balance FROM site_coins WHERE user_id = ? LIMIT 1 FOR UPDATE", [userId]);
      const balance = Number(coins[0]?.balance) || 0;
      if (balance < price) {
        await conn.rollback();
        return "მონეტა არ გყოფნის.";
      }
      await conn.query("INSERT INTO site_shop_owned (user_id, item_id, bought_at) VALUES (?, ?, UTC_TIMESTAMP())", [userId, id]);
      await conn.query("UPDATE site_coins SET balance = balance - ? WHERE user_id = ?", [price, userId]);
      await conn.query("INSERT IGNORE INTO site_coin_ledger (user_id, amount, reason, ref, created_at) VALUES (?, ?, 'buy', ?, UTC_TIMESTAMP())", [userId, -price, String(id)]);
    }
    await wear(conn, userId, String(item.type), String(item.image));
    await conn.commit();
    return "";
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function wearShopItem(userId: number, id: number) {
  await ensureShop();
  const [item] = await query<{ type: string; image: string }>(
    `SELECT i.type, i.image FROM site_shop_items i JOIN site_shop_owned o ON o.item_id = i.id AND o.user_id = ? WHERE i.id = ? LIMIT 1`,
    [userId, id],
  );
  if (!item) return "ჯერ იყიდე.";
  const conn = await db.getConnection();
  try {
    await wear(conn, userId, item.type, item.image);
    return "";
  } finally {
    conn.release();
  }
}

async function wear(conn: PoolConnection, userId: number, type: string, image: string) {
  if (type === "avatar") await conn.query("UPDATE dle_users SET foto = ? WHERE user_id = ?", [image, userId]);
  if (type === "frame") await conn.query("UPDATE dle_users SET decoration_id = ? WHERE user_id = ?", [image, userId]);
  if (type === "cover") {
    const [rows] = await conn.query<RowDataPacket[]>("SELECT xfields FROM dle_users WHERE user_id = ? LIMIT 1", [userId]);
    const fields = String(rows[0]?.xfields ?? "").split("||").filter((part) => part && !part.startsWith("cover|"));
    fields.push(`cover|${image}`);
    await conn.query("UPDATE dle_users SET xfields = ? WHERE user_id = ?", [fields.join("||"), userId]);
  }
}

export async function userOwnsFile(userId: number, file: string) {
  await ensureShop();
  const [row] = await query<{ id: number }>(
    `SELECT i.id FROM site_shop_items i JOIN site_shop_owned o ON o.item_id = i.id AND o.user_id = ? WHERE i.image LIKE ? LIMIT 1`,
    [userId, `%/${file}`],
  );
  return !!row;
}

export async function shopFileExists(file: string) {
  await ensureShop();
  const [row] = await query<{ id: number }>("SELECT id FROM site_shop_items WHERE active = 1 AND image LIKE ? LIMIT 1", [`%/${file}`]);
  return !!row;
}

export async function listAdminShop(type: ShopKind, term: string, page = 1) {
  await ensureShop();
  const q = term.trim();
  const limit = 24;
  const offset = Math.max(0, page - 1) * limit;
  const filter = q ? "AND name LIKE ?" : "";
  const args = q ? [type, `%${q}%`] : [type];
  const [rows, filtered, stats, counts] = await Promise.all([
    query<{ id: number; name: string; image: string; price: number; active: number; limited: number; stock: number }>(
      `SELECT id, name, image, price, active, limited, stock FROM site_shop_items WHERE type = ? ${filter} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...args, limit, offset],
    ),
    query<{ total: number }>(`SELECT COUNT(*) total FROM site_shop_items WHERE type = ? ${filter}`, args),
    query<{ total: number; active: number }>("SELECT COUNT(*) total, SUM(active = 1) active FROM site_shop_items"),
    query<{ type: string; n: number }>("SELECT type, COUNT(*) n FROM site_shop_items GROUP BY type"),
  ]);
  const found = Number(filtered[0]?.total) || 0;
  return {
    total: Number(stats[0]?.total) || 0,
    active: Number(stats[0]?.active) || 0,
    found,
    pages: Math.max(1, Math.ceil(found / limit)),
    counts: Object.fromEntries(counts.map((row) => [row.type, Number(row.n) || 0])) as Partial<Record<ShopKind, number>>,
    rows: rows.map((row) => ({ id: row.id, name: row.name, image: row.image, poster: stillSrc(row.image) || row.image, price: Number(row.price) || 0, active: !!row.active, limited: !!row.limited, stock: Math.max(1, Number(row.stock) || 1) })),
  };
}

export async function saveAdminShopItem(input: { id: number; type: string; name: string; image: string; price: number; active: boolean; limited: boolean; stock: number }) {
  await ensureShop();
  const type = kindOf(input.type);
  const name = input.name.trim().slice(0, 80);
  const image = input.image.trim().slice(0, 255);
  const price = Math.max(1, Math.min(100000, Math.floor(input.price) || 0));
  const stock = Math.max(1, Math.min(9999, Math.floor(input.stock) || 1));
  if (!type || name.length < 2 || !/^(\/|https?:\/\/)/.test(image)) return;
  if (input.id > 0) {
    await execute("UPDATE site_shop_items SET type = ?, name = ?, image = ?, price = ?, active = ?, limited = ?, stock = ? WHERE id = ?", [type, name, image, price, input.active ? 1 : 0, input.limited ? 1 : 0, stock, input.id]);
    return;
  }
  await execute("INSERT INTO site_shop_items (type, name, image, price, active, limited, stock, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())", [type, name, image, price, input.active ? 1 : 0, input.limited ? 1 : 0, stock]);
}

export async function setAdminShopActive(id: number, active: boolean) {
  if (!Number.isInteger(id) || id <= 0) return;
  await ensureShop();
  await execute("UPDATE site_shop_items SET active = ? WHERE id = ?", [active ? 1 : 0, id]);
}
