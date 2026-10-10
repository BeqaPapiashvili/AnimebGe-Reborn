import { getSession } from "@/lib/auth";
import { execute, query } from "@/lib/db";
import { escapeHtml, htmlToText } from "@/lib/dle";
import { revokeSocial } from "@/lib/xp";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return Response.json({ ok: false }, { status: 401 });
  const id = Number((await params).id);
  const [comment] = await query<{ post_id: number; user_id: number }>("SELECT post_id, user_id FROM dle_comments WHERE id = ?", [id]);
  if (!comment) return Response.json({ ok: false }, { status: 404 });
  if (comment.user_id !== user.id) return Response.json({ ok: false, error: "მხოლოდ საკუთარი კომენტარის წაშლა შეიძლება." }, { status: 403 });
  await execute("DELETE FROM dle_comments WHERE id = ?", [id]);
  await execute("DELETE FROM dle_comment_rating_log WHERE c_id = ?", [id]);
  await execute("UPDATE dle_post SET comm_num = GREATEST(comm_num - 1, 0) WHERE id = ?", [comment.post_id]);
  await execute("UPDATE dle_users SET comm_num = GREATEST(comm_num - 1, 0) WHERE user_id = ?", [user.id]);
  await revokeSocial(user.id, `comment:${id}`);
  return Response.json({ ok: true });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return Response.json({ ok: false }, { status: 401 });
  const id = Number((await params).id);
  const text = String(((await request.json().catch(() => ({}))) as { text?: string }).text ?? "").trim();
  if (!text || text.length > 2000) return Response.json({ ok: false, error: "კომენტარი 1–2000 სიმბოლო უნდა იყოს." }, { status: 400 });
  const [comment] = await query<{ user_id: number }>("SELECT user_id FROM dle_comments WHERE id = ?", [id]);
  if (!comment) return Response.json({ ok: false }, { status: 404 });
  if (comment.user_id !== user.id) return Response.json({ ok: false, error: "მხოლოდ საკუთარი კომენტარის შეცვლა შეიძლება." }, { status: 403 });
  const html = escapeHtml(text).replace(/\r?\n/g, "<br>");
  await execute("UPDATE dle_comments SET text = ? WHERE id = ?", [html, id]);
  return Response.json({ ok: true, text: htmlToText(html) });
}
