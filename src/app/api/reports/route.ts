import { getSession, isAdmin } from "@/lib/auth";
import { saveReport, setReportStatus } from "@/lib/hub";
import { limited } from "@/lib/limit";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ error: "შესვლა სჭირდება." }, { status: 401 });
  if (await limited(`report:${user.id}`, 5, 60 * 60 * 1000)) return Response.json({ error: "ძალიან ბევრი შეტყობინებაა. მოგვიანებით სცადე." }, { status: 429 });
  const body = (await request.json().catch(() => ({}))) as { postId?: number; episode?: number; message?: string };
  const postId = Number(body.postId);
  const episode = Number(body.episode);
  if (!Number.isInteger(postId) || postId <= 0 || !Number.isInteger(episode) || episode <= 0) return Response.json({ error: "ეპიზოდი ვერ მოიძებნა." }, { status: 400 });
  const error = await saveReport(user.id, postId, episode, String(body.message ?? ""));
  if (error) return Response.json({ error }, { status: 400 });
  return Response.json({ ok: true });
}

export async function PATCH(request: Request) {
  const user = await getSession();
  if (!user || !isAdmin(user)) return Response.json({ error: "არა." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { id?: number; status?: string };
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "ვერ მოიძებნა." }, { status: 400 });
  await setReportStatus(id, body.status === "done" ? "done" : "open");
  return Response.json({ ok: true });
}
