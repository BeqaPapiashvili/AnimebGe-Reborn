import { clientIp, getSession } from "@/lib/auth";
import { setEmote, type EmoteId } from "@/lib/emote";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ error: "შესვლა სჭირდება." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { postId?: number; emote?: number };
  const postId = Number(body.postId);
  const emote = Number(body.emote);
  if (!Number.isInteger(postId) || postId <= 0 || !Number.isInteger(emote) || emote < 1 || emote > 6) return Response.json({ error: "ვერ მოიძებნა." }, { status: 400 });
  const state = await setEmote(user.id, postId, emote as EmoteId, await clientIp());
  return Response.json({ ok: true, ...state });
}
