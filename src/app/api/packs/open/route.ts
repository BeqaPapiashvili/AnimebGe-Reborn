import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { beginPackOpen } from "@/lib/play";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "შესვლა სჭირდება." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const times = Number(body.times) === 6 || Number(body.times) === 20 ? Number(body.times) : 1;
  const result = await beginPackOpen(user.id, 0, times);
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
