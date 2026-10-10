import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { loadPlay } from "@/lib/play";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "შესვლა სჭირდება." }, { status: 401 });
  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const text = (key: string) => params.get(key) ?? "";
  const data = await loadPlay("mine", user, { page, q: text("q"), title: text("title"), author: text("author"), rarity: text("rarity"), exclude: text("exclude"), sort: text("sort"), dir: text("dir") });
  return NextResponse.json({ copies: data.copies, page: data.page, pages: data.pages, total: data.total });
}
