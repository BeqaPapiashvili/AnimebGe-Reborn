import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get("kind") || "name";
  const q = (request.nextUrl.searchParams.get("q") || "").replace(/[%_]/g, "").trim().slice(0, 40);
  if (!q) return NextResponse.json({ items: [] });
  const like = `%${q}%`;
  const user = request.nextUrl.searchParams.get("mine") === "1" ? await getSession() : null;
  if (request.nextUrl.searchParams.get("mine") === "1" && !user) return NextResponse.json({ items: [] });
  const own = user
    ? "AND c.id IN (SELECT card_id FROM user_cards WHERE user_id = ?)"
    : "AND EXISTS (SELECT 1 FROM dle_post a WHERE a.id = c.news_id AND a.approve = 1 AND FIND_IN_SET('10', a.category) > 0 AND FIND_IN_SET('48', a.category) = 0)";
  const extra = user ? [user.id] : [];
  if (kind === "title") {
    const rows = await query<{ name: string }>(`SELECT DISTINCT p.title name FROM dle_post p JOIN anime_cards c ON c.news_id = p.id WHERE p.title LIKE ? AND p.approve = 1 AND FIND_IN_SET('10', p.category) > 0 AND FIND_IN_SET('48', p.category) = 0 ${own} ORDER BY p.title LIMIT 8`, [like, ...extra]);
    return NextResponse.json({ items: rows.map((row) => row.name) });
  }
  if (kind === "author") {
    const rows = await query<{ name: string }>(`SELECT DISTINCT c.author name FROM anime_cards c WHERE c.author <> '' AND c.author LIKE ? ${own} ORDER BY c.author LIMIT 8`, [like, ...extra]);
    return NextResponse.json({ items: rows.map((row) => row.name) });
  }
  const rows = await query<{ name: string }>(`SELECT DISTINCT c.name FROM anime_cards c WHERE c.name LIKE ? ${own} ORDER BY c.name LIMIT 8`, [like, ...extra]);
  return NextResponse.json({ items: rows.map((row) => row.name) });
}
