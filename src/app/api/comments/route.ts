import { clientIp, getSession } from "@/lib/auth";
import { getComment, getCommentPage } from "@/lib/catalog";
import { execute, query } from "@/lib/db";
import { absUrl, escapeHtml, parseXFields } from "@/lib/dle";
import { animeHref } from "@/lib/data";
import { notifyFavorites } from "@/lib/notifications";
import { loadXpRules, xpPath } from "@/lib/site-config";
import { awardSocial } from "@/lib/xp";
import { limited } from "@/lib/limit";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const postId = Number(url.searchParams.get("postId"));
  if (!Number.isInteger(postId) || postId <= 0) return Response.json({ comments: [], total: 0, roots: 0 });
  const sort = url.searchParams.get("sort");
  const user = await getSession();
  const page = await getCommentPage(postId, user, {
    offset: Number(url.searchParams.get("offset")) || 0,
    limit: Number(url.searchParams.get("limit")) || 10,
    sort: sort === "old" || sort === "best" ? sort : "new",
  });
  return Response.json(page);
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ ok: false, error: "ჯერ შედი ანგარიშში." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { postId?: number; text?: string; parent?: number };
  const postId = Number(body.postId);
  const text = String(body.text ?? "").trim();
  const parent = Number(body.parent) || 0;
  if (!Number.isInteger(postId) || postId <= 0) return Response.json({ ok: false, error: "ანიმე ვერ მოიძებნა." }, { status: 400 });
  if (!text || text.length > 2000) return Response.json({ ok: false, error: "კომენტარი 1–2000 სიმბოლო უნდა იყოს." }, { status: 400 });
  if (await limited(`comment:${user.id}`, 1, 8000)) return Response.json({ ok: false, error: "ცოტა მოიცადე შემდეგ კომენტარამდე." }, { status: 429 });

  const [post] = await query<{ allow_comm: number; title: string; alt_name: string; xfields: string }>("SELECT allow_comm, title, alt_name, xfields FROM dle_post WHERE id = ? AND approve = 1", [postId]);
  if (!post) return Response.json({ ok: false, error: "ანიმე ვერ მოიძებნა." }, { status: 404 });
  if (!post.allow_comm) return Response.json({ ok: false, error: "ამ ანიმეზე კომენტარები დახურულია." }, { status: 403 });

  const html = escapeHtml(text).replace(/\r?\n/g, "<br>");
  const [same] = await query<{ id: number }>("SELECT id FROM dle_comments WHERE user_id = ? AND text = ? AND date > DATE_SUB(NOW(), INTERVAL 1 DAY) LIMIT 1", [user.id, html]);
  if (same) return Response.json({ ok: false, error: "იგივე კომენტარი დღეს უკვე დაწერე." }, { status: 400 });
  const result = await execute(
    "INSERT INTO dle_comments (post_id, user_id, date, autor, email, text, ip, is_register, approve, rating, vote_num, parent, is_pinned) VALUES (?, ?, NOW(), ?, ?, ?, ?, 1, 1, 0, 0, ?, 0)",
    [postId, user.id, user.name, user.email.slice(0, 40), html, await clientIp(), parent],
  );
  await execute("UPDATE dle_post SET comm_num = comm_num + 1 WHERE id = ?", [postId]);
  await execute("UPDATE dle_users SET comm_num = comm_num + 1 WHERE user_id = ?", [user.id]);
  await loadXpRules();
  const commentRule = xpPath("comment");
  if (commentRule && text.length >= commentRule.min) await awardSocial(user.id, `comment:${result.insertId}`);
  const snippet = text.replace(/\s+/g, " ").slice(0, 90);
  const poster = absUrl(parseXFields(post.xfields).image);
  await notifyFavorites(postId, user.id, {
    title: post.title,
    message: `${user.name}: ${snippet}`,
    link: animeHref(post.alt_name),
    icon: poster,
  });
  const comment = await getComment(postId, result.insertId, user);
  return Response.json({ ok: true, comment });
}
