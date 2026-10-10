import { getSession } from "@/lib/auth";
import { addRoomChat, canEnterRoom, closeRoom, createRoom, listNewRoomChat, listRoomChat, readRoom, syncRoom, touchRoomPresence } from "@/lib/hub";
import { limited } from "@/lib/limit";
import { query } from "@/lib/db";
import { notifyUsers } from "@/lib/notifications";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";
  const room = code ? await readRoom(code) : null;
  const viewer = await getSession();
  if (!room || !(await canEnterRoom(room, viewer?.id))) return Response.json({ room: null, messages: [], viewers: 0 });
  const since = Number(url.searchParams.get("since") ?? "0");
  if (url.searchParams.get("chat") === "1") {
    const messages = await listNewRoomChat(room.code, Number.isFinite(since) && since > 0 ? since : 0);
    return Response.json({ messages });
  }
  const token = url.searchParams.get("token") ?? "";
  const [messages, viewers] = await Promise.all([listRoomChat(room.code), token ? touchRoomPresence(room.code, token) : Promise.resolve(0)]);
  return Response.json({ room, messages, viewers });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { action?: string; code?: string; slug?: string; title?: string; episode?: number; position?: number; text?: string; token?: string; visibility?: string; voice?: boolean; startsAt?: string | null; invite?: number[] };
  if (body.action === "presence") {
    const room = await readRoom(String(body.code ?? ""));
    const viewer = await getSession();
    if (!room || !(await canEnterRoom(room, viewer?.id))) return Response.json({ viewers: 0 });
    const viewers = await touchRoomPresence(room.code, String(body.token ?? ""));
    return Response.json({ viewers });
  }
  const user = await getSession();
  if (!user) return Response.json({ error: "შესვლა სჭირდება." }, { status: 401 });
  if (body.action === "invite") {
    const room = await readRoom(String(body.code ?? ""));
    if (!room || !(await canEnterRoom(room, user.id))) return Response.json({ error: "ოთახი ვერ მოიძებნა." }, { status: 404 });
    const invite = Array.isArray(body.invite) ? body.invite.map(Number).filter((id) => id > 0 && id !== user.id) : [];
    const [me] = await query<{ friends: string }>("SELECT friends FROM dle_users WHERE user_id = ? LIMIT 1", [user.id]);
    const friends = new Set((me?.friends ?? "").split(",").map((id) => Number(id)));
    const allowed = invite.filter((id) => friends.has(id));
    if (!allowed.length) return Response.json({ error: "აირჩიე მეგობარი." }, { status: 400 });
    await notifyUsers(allowed, { title: "Watch2Gether", message: `${user.name} გიწვევს ოთახში`, link: `/watch2gether/${room.code}` });
    return Response.json({ ok: true });
  }
  if (body.action === "close") {
    const ok = await closeRoom(user.id, String(body.code ?? ""));
    if (!ok) return Response.json({ error: "ოთახს მხოლოდ შემქმნელი ხურავს." }, { status: 403 });
    return Response.json({ ok: true });
  }
  if (body.action === "chat") {
    if (await limited(`chat:${user.id}`, 1, 2000)) return Response.json({ error: "ცოტა მოიცადე." }, { status: 429 });
    const room = await readRoom(String(body.code ?? ""));
    if (!room || !(await canEnterRoom(room, user.id))) return Response.json({ error: "შეტყობინება ვერ გაიგზავნა." }, { status: 400 });
    const saved = await addRoomChat(user.id, String(body.code ?? ""), String(body.text ?? ""));
    if (!saved) return Response.json({ error: "შეტყობინება ვერ გაიგზავნა." }, { status: 400 });
    return Response.json({ ok: true, message: { id: saved.id, userId: user.id, name: user.name, avatar: user.avatar, frame: user.frame, body: saved.body } });
  }
  if (body.action === "create") {
    const visibility = body.visibility === "link" || body.visibility === "friends" ? body.visibility : "public";
    const code = await createRoom(user.id, {
      title: String(body.title ?? ""),
      visibility,
      voice: body.voice === true,
      startsAt: body.startsAt ? String(body.startsAt) : null,
    });
    if (!code) return Response.json({ error: "ოთახი ვერ შეიქმნა." }, { status: 500 });
    if (body.slug) {
      await syncRoom(user.id, code, {
        slug: String(body.slug),
        title: String(body.title ?? ""),
        episode: Number(body.episode) || 1,
        position: Math.floor(Number(body.position) || 0),
      });
    }
    const invite = Array.isArray(body.invite) ? body.invite.map(Number).filter((id) => id > 0 && id !== user.id) : [];
    const [me] = await query<{ friends: string }>("SELECT friends FROM dle_users WHERE user_id = ? LIMIT 1", [user.id]);
    const friends = new Set((me?.friends ?? "").split(",").map((id) => Number(id)));
    const allowed = invite.filter((id) => friends.has(id));
    if (allowed.length) await notifyUsers(allowed, { title: "Watch2Gether", message: `${user.name} გიწვევს ოთახში`, link: `/watch2gether/${code}` });
    return Response.json({ code });
  }
  const ok = await syncRoom(user.id, String(body.code ?? ""), {
    slug: String(body.slug ?? ""),
    title: String(body.title ?? ""),
    episode: Number(body.episode) || 1,
    position: Math.floor(Number(body.position) || 0),
  });
  if (!ok) return Response.json({ error: "ოთახს მხოლოდ შემქმნელი მართავს." }, { status: 403 });
  return Response.json({ ok: true });
}
