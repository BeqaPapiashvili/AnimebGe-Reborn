import { clientIp, getSession } from "@/lib/auth";
import { execute, query } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return Response.json({ ok: false, error: "ჯერ შედი ანგარიშში." }, { status: 401 });
  const id = Number((await params).id);
  const value = Math.sign(Number(((await request.json().catch(() => ({}))) as { value?: number }).value) || 0);
  const [comment] = await query<{ user_id: number }>("SELECT user_id FROM dle_comments WHERE id = ?", [id]);
  if (!comment) return Response.json({ ok: false }, { status: 404 });
  if (comment.user_id === user.id) return Response.json({ ok: false, error: "საკუთარ კომენტარს ვერ შეაფასებ." }, { status: 403 });

  const memberId = String(user.id);
  const [previous] = await query<{ id: number; rating: number }>("SELECT id, rating FROM dle_comment_rating_log WHERE c_id = ? AND member IN (?, ?) LIMIT 1", [id, memberId, user.name]);
  const old = previous ? Math.sign(previous.rating) : 0;
  if (old !== value) {
    if (!previous) {
      await execute("INSERT INTO dle_comment_rating_log (c_id, member, ip, rating) VALUES (?, ?, ?, ?)", [id, memberId, await clientIp(), value]);
      await execute("UPDATE dle_comments SET rating = rating + ?, vote_num = vote_num + 1 WHERE id = ?", [value, id]);
    } else if (value === 0) {
      await execute("DELETE FROM dle_comment_rating_log WHERE id = ?", [previous.id]);
      await execute("UPDATE dle_comments SET rating = rating - ?, vote_num = GREATEST(vote_num - 1, 0) WHERE id = ?", [old, id]);
    } else {
      await execute("UPDATE dle_comment_rating_log SET rating = ?, member = ? WHERE id = ?", [value, memberId, previous.id]);
      await execute("UPDATE dle_comments SET rating = rating + ? WHERE id = ?", [value - old, id]);
    }
  }
  const [updated] = await query<{ rating: number; vote_num: number }>("SELECT rating, vote_num FROM dle_comments WHERE id = ?", [id]);
  return Response.json({ ok: true, value, rating: updated?.rating ?? 0, votes: updated?.vote_num ?? 0 });
}
