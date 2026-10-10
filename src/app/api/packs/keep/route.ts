import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { keepPackCard } from "@/lib/play";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "შესვლა სჭირდება." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const result = await keepPackCard(user.id, Number(body.offerId), Number(body.index));
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
