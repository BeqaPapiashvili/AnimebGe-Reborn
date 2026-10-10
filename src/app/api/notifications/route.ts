import { getSession } from "@/lib/auth";
import { deleteNotifications, listNotifications, markNotificationsRead, visitNotification } from "@/lib/notifications";
import { awardVisit } from "@/lib/xp";

export async function GET() {
  const user = await getSession();
  if (!user) return Response.json({ count: 0, items: [] });
  await awardVisit(user.id);
  return Response.json(await listNotifications(user.id));
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ ok: false }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { action?: string; id?: number; ids?: number[]; types?: string[] };
  if (body.action === "read") {
    await markNotificationsRead(user.id, body.types);
    return Response.json({ ok: true });
  }
  if (body.action === "delete" && Array.isArray(body.ids)) {
    await deleteNotifications(user.id, body.ids.map(Number));
    return Response.json({ ok: true });
  }
  const id = Number(body.id);
  if (body.action === "visit" && Number.isInteger(id) && id > 0) {
    await visitNotification(user.id, id);
    return Response.json({ ok: true });
  }
  return Response.json({ ok: false }, { status: 400 });
}
