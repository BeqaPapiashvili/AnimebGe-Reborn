import "server-only";
import { execute, query } from "@/lib/db";

const ranks = ["E", "D", "C", "B", "A", "S", "S+", "RE"];

export async function adminCards(q: string) {
  const rows = await query<{ id: number; name: string; rarity: string; news_id: number; copies: number }>(
    `SELECT c.id, c.name, c.rarity, c.news_id, (SELECT COUNT(*) FROM user_cards u WHERE u.card_id = c.id) copies
     FROM anime_cards c WHERE c.name LIKE ? ORDER BY c.id DESC LIMIT 40`,
    [`%${q}%`],
  );
  return rows;
}

export async function saveAdminCard(id: number, name: string, rarity: string) {
  const clean = name.trim().slice(0, 100);
  const rank = ranks.includes(rarity) ? rarity : "C";
  if (clean.length < 2) return "სახელი მოკლეა.";
  await execute("UPDATE anime_cards SET name = ?, rarity = ? WHERE id = ?", [clean, rank, id]);
  return "";
}

export async function addAdminCard(input: { name: string; rarity: string; newsId: number; description: string; image: string }) {
  const name = input.name.trim().slice(0, 100);
  if (name.length < 2 || !input.image.startsWith("/uploads/")) return "სახელი და სურათი სჭირდება.";
  const rank = ranks.includes(input.rarity) ? input.rarity : "C";
  await execute(
    "INSERT INTO anime_cards (name, image, rarity, description, points_value, author, news_id, likes_count, status) VALUES (?, ?, ?, ?, 0, '', ?, 0, 1)",
    [name, input.image, rank, input.description.trim().slice(0, 2000), input.newsId || 0],
  );
  return "";
}

export async function deleteAdminCard(id: number) {
  const [owned] = await query<{ n: number }>("SELECT COUNT(*) n FROM user_cards WHERE card_id = ?", [id]);
  if (Number(owned?.n ?? 0) > 0) return "ეს ბარათი ვიღაცას აქვს და ვერ წაიშლება.";
  await execute("DELETE FROM anime_cards WHERE id = ?", [id]);
  await execute("DELETE FROM case_items WHERE card_id = ?", [id]);
  return "";
}

export async function adminCases() {
  return query<{ id: number; name: string; price: number; coin_chance: number; coin_min: number; coin_max: number }>(
    "SELECT id, name, price, coin_chance, coin_min, coin_max FROM anime_cases ORDER BY price, id",
  );
}

export async function saveAdminCase(id: number, price: number, chance: number, min: number, max: number) {
  await execute(
    "UPDATE anime_cases SET price = ?, coin_chance = ?, coin_min = ?, coin_max = ? WHERE id = ?",
    [Math.max(0, price), Math.min(100, Math.max(0, chance)), Math.max(0, min), Math.max(min, max), id],
  );
}

export async function adminGiveaways() {
  return query<{ id: number; title: string; end_date: string; status: number; winners_json: string }>(
    "SELECT id, title, end_date, status, winners_json FROM dle_giveaways ORDER BY id DESC LIMIT 20",
  );
}

export async function addAdminGiveaway(title: string, text: string, end: string, winners: number) {
  const name = title.trim().slice(0, 255);
  const when = end.trim();
  if (name.length < 2 || !when) return "სახელი და დასასრული სჭირდება.";
  const prizes = Array.from({ length: Math.min(10, Math.max(1, winners)) }, () => "პრიზი");
  await execute(
    "INSERT INTO dle_giveaways (title, description, prizes_json, end_date, status, created_at, winners_json) VALUES (?, ?, ?, ?, 1, NOW(), '')",
    [name, text.trim().slice(0, 2000), JSON.stringify(prizes), when.replace("T", " ")],
  );
  return "";
}

export async function adminDubbers() {
  return query<{ id: number; name: string; alt_name: string }>("SELECT id, name, alt_name FROM dle_dubbers ORDER BY name");
}

export async function saveAdminDubber(id: number, name: string, bio: string) {
  const clean = name.trim().slice(0, 100);
  if (clean.length < 2) return "სახელი მოკლეა.";
  if (id) await execute("UPDATE dle_dubbers SET name = ?, bio = ? WHERE id = ?", [clean, bio.trim().slice(0, 4000), id]);
  else {
    const alt = `dub-${Date.now().toString(36)}`;
    await execute("INSERT INTO dle_dubbers (name, alt_name, photo, bio, total_anime, avg_rating, total_votes) VALUES (?, ?, '', ?, 0, 0, 0)", [clean, alt, bio.trim().slice(0, 4000)]);
  }
  return "";
}
