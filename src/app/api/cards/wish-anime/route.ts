import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { wishAnimeLeft } from "@/lib/play";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "შესვლა სჭირდება." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "ანიმე ვერ მოიძებნა." }, { status: 400 });
  return NextResponse.json(await wishAnimeLeft(user.id, id));
}
