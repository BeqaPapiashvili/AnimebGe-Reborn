import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { removeWishes } from "@/lib/play";

export async function DELETE(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "შესვლა სჭირდება." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? body.ids : [];
  if (!ids.length) return NextResponse.json({ error: "ქარდი არ არის მონიშნული." }, { status: 400 });
  return NextResponse.json({ removed: await removeWishes(user.id, ids) });
}
