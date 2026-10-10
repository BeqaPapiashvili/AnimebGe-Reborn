import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { awakenRun } from "@/lib/play";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ ok: false, error: "შესვლა სჭირდება." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? body.ids.map(Number) : [];
  const result = await awakenRun(user.id, ids);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
