import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSession, isAdmin } from "@/lib/auth";
import { storageFile } from "@/lib/storage";
import { addCommunityPost, addCommunityReply, deleteCommunityPost, pinCommunityPost, voteCommunityPoll, voteCommunityPost, voteCommunityReply } from "@/lib/community";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ error: "შესვლა სჭირდება." }, { status: 401 });
  if ((request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "ფაილი არ არის." }, { status: 400 });
    if (file.size > 4 * 1024 * 1024) return Response.json({ error: "ფაილი 4 მბ-ზე დიდია." }, { status: 400 });
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/gif" ? "gif" : file.type === "image/jpeg" ? "jpg" : "";
    if (!ext) return Response.json({ error: "მხოლოდ JPEG, PNG, GIF ან WEBP." }, { status: 400 });
    const name = `${user.id}-${Date.now()}.${ext}`;
    const target = storageFile("uploads", "community", name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(await file.arrayBuffer()));
    return Response.json({ ok: true, url: `/uploads/community/${name}` });
  }
  const body = (await request.json().catch(() => ({}))) as { action?: string; category?: string; title?: string; body?: string; postId?: number; replyId?: number; value?: number; option?: number; images?: string[]; anime?: string[]; poll?: { options?: string[]; multi?: boolean; days?: number } };
  if (body.action === "reply-vote") {
    const replyId = Number(body.replyId);
    if (!Number.isInteger(replyId) || replyId <= 0) return Response.json({ error: "პასუხი ვერ მოიძებნა." }, { status: 400 });
    const error = await voteCommunityReply(user.id, replyId);
    if (error) return Response.json({ error }, { status: 400 });
    return Response.json({ ok: true });
  }
  if (body.action === "vote") {
    const postId = Number(body.postId);
    if (!Number.isInteger(postId) || postId <= 0) return Response.json({ error: "პოსტი ვერ მოიძებნა." }, { status: 400 });
    await voteCommunityPost(user.id, postId, Number(body.value) < 0 ? -1 : 1);
    return Response.json({ ok: true });
  }
  if (body.action === "pin") {
    if (!isAdmin(user)) return Response.json({ error: "ჩამაგრება მხოლოდ ადმინისტრატორს შეუძლია." }, { status: 403 });
    const postId = Number(body.postId);
    if (!Number.isInteger(postId) || postId <= 0) return Response.json({ error: "პოსტი ვერ მოიძებნა." }, { status: 400 });
    const error = await pinCommunityPost(postId);
    if (error) return Response.json({ error }, { status: 400 });
    return Response.json({ ok: true });
  }
  if (body.action === "delete") {
    if (!isAdmin(user)) return Response.json({ error: "წაშლა მხოლოდ ადმინისტრატორს შეუძლია." }, { status: 403 });
    const postId = Number(body.postId);
    if (!Number.isInteger(postId) || postId <= 0) return Response.json({ error: "პოსტი ვერ მოიძებნა." }, { status: 400 });
    const error = await deleteCommunityPost(postId);
    if (error) return Response.json({ error }, { status: 400 });
    return Response.json({ ok: true });
  }
  if (body.action === "poll") {
    const postId = Number(body.postId);
    if (!Number.isInteger(postId) || postId <= 0) return Response.json({ error: "პოსტი ვერ მოიძებნა." }, { status: 400 });
    const error = await voteCommunityPoll(user.id, postId, Number(body.option));
    if (error) return Response.json({ error }, { status: 400 });
    return Response.json({ ok: true });
  }
  if (body.action === "reply") {
    const postId = Number(body.postId);
    if (!Number.isInteger(postId) || postId <= 0) return Response.json({ error: "პოსტი ვერ მოიძებნა." }, { status: 400 });
    const error = await addCommunityReply(user.id, postId, String(body.body ?? ""));
    if (error) return Response.json({ error }, { status: 400 });
    return Response.json({ ok: true });
  }
  const error = await addCommunityPost(user.id, {
    category: String(body.category ?? ""),
    title: String(body.title ?? ""),
    body: String(body.body ?? ""),
    images: Array.isArray(body.images) ? body.images.map(String) : [],
    poll: body.poll,
    anime: Array.isArray(body.anime) ? body.anime.map(String) : [],
  });
  if (error) return Response.json({ error }, { status: 400 });
  return Response.json({ ok: true });
}
