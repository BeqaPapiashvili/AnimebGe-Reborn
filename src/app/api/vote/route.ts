import { clientIp, getSession } from "@/lib/auth";
import { execute, query } from "@/lib/db";
import { loadXpRules, xpPath } from "@/lib/site-config";
import { awardSocial } from "@/lib/xp";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ ok: false, error: "ჯერ შედი ანგარიშში." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { postId?: number; value?: number };
  const postId = Number(body.postId);
  const value = Math.sign(Number(body.value) || 0);
  if (!Number.isInteger(postId) || postId <= 0) return Response.json({ ok: false }, { status: 400 });

  const memberId = String(user.id);
  const [previous] = await query<{ id: number; rating: number }>("SELECT id, rating FROM dle_logs WHERE news_id = ? AND member IN (?, ?) LIMIT 1", [postId, memberId, user.name]);
  const old = previous ? Math.sign(previous.rating) : 0;
  if (old === value) return Response.json({ ok: true, value });

  if (!previous) {
    await execute("INSERT INTO dle_logs (news_id, member, ip, rating) VALUES (?, ?, ?, ?)", [postId, memberId, await clientIp(), value]);
    await execute("UPDATE dle_post_extras SET rating = rating + ?, vote_num = vote_num + 1 WHERE news_id = ?", [value, postId]);
    await loadXpRules();
    if (value !== 0 && xpPath("rate")) await awardSocial(user.id, `rate:${postId}`);
  } else if (value === 0) {
    await execute("DELETE FROM dle_logs WHERE id = ?", [previous.id]);
    await execute("UPDATE dle_post_extras SET rating = rating - ?, vote_num = GREATEST(vote_num - 1, 0) WHERE news_id = ?", [old, postId]);
  } else {
    await execute("UPDATE dle_logs SET rating = ?, member = ? WHERE id = ?", [value, memberId, previous.id]);
    await execute("UPDATE dle_post_extras SET rating = rating + ? WHERE news_id = ?", [value - old, postId]);
  }
  const [extras] = await query<{ rating: number; vote_num: number }>("SELECT rating, vote_num FROM dle_post_extras WHERE news_id = ?", [postId]);
  return Response.json({ ok: true, value, likes: extras?.rating ?? 0, votes: extras?.vote_num ?? 0 });
}
