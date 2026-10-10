import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { claimDaily } from "@/lib/play";

export async function POST() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "შესვლა სჭირდება." }, { status: 401 });
  const result = await claimDaily(user.id);
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
