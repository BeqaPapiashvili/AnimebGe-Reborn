import { cookies, headers } from "next/headers";
import { SESSION_COOKIE, getSession, isAdmin } from "@/lib/auth";
import { leavePresence, presenceSnapshot, touchPresence } from "@/lib/presence";
import type { SessionUser } from "@/lib/types";

export const dynamic = "force-dynamic";

const sessions = new Map<string, { user: SessionUser | null; until: number }>();

async function viewer() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  if (!token) return null;
  const now = Date.now();
  const cached = sessions.get(token);
  if (cached && cached.until > now) return cached.user;
  const user = await getSession().catch(() => null);
  if (sessions.size > 5000) sessions.clear();
  sessions.set(token, { user, until: now + 60_000 });
  return user;
}

const id = (value: unknown) => (typeof value === "string" && /^[\w-]{8,64}$/.test(value) ? value : "");
const text = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const tab = id(body.tab);
  const visitor = id(body.visitor);
  if (!tab || !visitor) return new Response(null, { status: 400 });
  if (body.leave) {
    leavePresence(tab);
    return new Response(null, { status: 204 });
  }
  const path = text(body.path, 300);
  if (!path.startsWith("/")) return new Response(null, { status: 400 });
  const user = await viewer();
  touchPresence({
    tab,
    visitor,
    path,
    title: text(body.title, 160).replace(/\s*\|\s*Animeb\s*$/i, ""),
    referrer: text(body.referrer, 300),
    hidden: body.hidden === true,
    agent: (await headers()).get("user-agent") ?? "",
    user: user ? { id: user.id, name: user.name, avatar: user.avatar } : null,
  });
  return new Response(null, { status: 204 });
}

export async function GET() {
  const user = await getSession();
  if (!user || !isAdmin(user)) return new Response(null, { status: 404 });
  return Response.json(presenceSnapshot(), { headers: { "cache-control": "no-store" } });
}
