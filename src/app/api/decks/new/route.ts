import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createDeckFromCopies } from "@/lib/play";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "შესვლა სჭირდება." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const copies = Array.isArray(body?.copies) ? body.copies.map(Number) : [];
  const result = await createDeckFromCopies(user.id, String(body?.title ?? ""), copies, String(body?.text ?? ""));
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
