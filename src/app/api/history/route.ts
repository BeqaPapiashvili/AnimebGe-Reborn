import { getSession } from "@/lib/auth";
import { execute } from "@/lib/db";
import { awardWatch } from "@/lib/xp";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ ok: false }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { postId?: number; episode?: number; time?: number; duration?: number };
  const postId = Number(body.postId);
  const episode = Number(body.episode);
  const time = Math.max(0, Math.floor(Number(body.time) || 0));
  const duration = Math.max(0, Math.floor(Number(body.duration) || 0));
  if (!Number.isInteger(postId) || postId <= 0 || !Number.isInteger(episode) || episode <= 0) return Response.json({ ok: false }, { status: 400 });
  await execute(
    `INSERT INTO dle_watch_history (user_id, news_id, episode_idx, watch_time, duration, last_update) VALUES (?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE episode_idx = VALUES(episode_idx), watch_time = VALUES(watch_time), duration = VALUES(duration), last_update = NOW()`,
    [user.id, postId, episode - 1, time, duration],
  );
  await awardWatch(user.id, postId, episode, time, duration);
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ ok: false }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { postId?: number };
  const postId = Number(body.postId);
  if (!Number.isInteger(postId) || postId <= 0) return Response.json({ ok: false }, { status: 400 });
  await execute("DELETE FROM dle_watch_history WHERE user_id = ? AND news_id = ?", [user.id, postId]);
  return Response.json({ ok: true });
}
