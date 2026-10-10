import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { clientIp, getSession } from "@/lib/auth";
import { recordView } from "@/lib/views";

const VISITOR = "ab_vid";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ ok: false }, { status: 400 });
  const [user, jar] = await Promise.all([getSession(), cookies()]);
  let visitor = jar.get(VISITOR)?.value ?? "";
  if (!/^[\w-]{8,64}$/.test(visitor)) {
    visitor = randomUUID();
    jar.set(VISITOR, visitor, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  const ip = await clientIp();
  const key = user ? `u${user.id}` : ip !== "0.0.0.0" ? `i${ip}` : `v${visitor}`;
  return Response.json({ ok: await recordView(id, key) });
}
