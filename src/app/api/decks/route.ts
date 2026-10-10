import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { removeDeck, toggleDeckLike } from "@/lib/play";

async function deckId(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const id = Number(body?.id);
  return Number.isInteger(id) && id > 0 ? id : 0;
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "შესვლა სჭირდება." }, { status: 401 });
  const id = await deckId(request);
  const result = id ? await toggleDeckLike(user.id, id) : null;
  if (!result) return NextResponse.json({ error: "კოლექცია ვერ მოიძებნა." }, { status: 404 });
  return NextResponse.json(result);
}

export async function DELETE(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "შესვლა სჭირდება." }, { status: 401 });
  const id = await deckId(request);
  if (!id || !(await removeDeck(user.id, id))) return NextResponse.json({ error: "კოლექცია ვერ წაიშალა." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
