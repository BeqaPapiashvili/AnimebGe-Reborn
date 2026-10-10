import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { loadPlay } from "@/lib/play";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const one = (key: string) => params.get(key) ?? "";
  const user = await getSession();
  const data = await loadPlay("catalog", user, {
    q: one("q"),
    title: one("title"),
    author: one("author"),
    rarity: one("rarity"),
    exclude: one("exclude"),
    sort: one("sort"),
    dir: one("dir"),
    page: Math.max(1, Number(one("page")) || 1),
  });
  return NextResponse.json({ cards: data.cards, page: data.page, pages: data.pages });
}
