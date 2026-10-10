import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import avatars from "@/data/avatars.json";
import covers from "@/data/covers.json";
import frames from "@/data/frames.json";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { getLists, getUserListMap, setUserList } from "@/lib/lists";
import { shopFileExists, userOwnsFile } from "@/lib/shop";
import { changeEmail, changePassword, getAccount, saveAccount, saveAvatar, saveCover, saveFrame, savePrefs } from "@/lib/settings";
import { parsePrefs, type Prefs } from "@/lib/settings-model";
import { storageFile } from "@/lib/storage";

export async function GET() {
  const user = await getSession();
  if (!user) return Response.json({ ok: false }, { status: 401 });
  const [map, lists] = await Promise.all([getUserListMap(user.id), getLists()]);
  const labels = new Map(lists.map((list) => [list.id, list.label]));
  const ids = [...map.keys()];
  const posts = ids.length
    ? await query<{ id: number; title: string; alt_name: string }>(`SELECT id, title, alt_name FROM dle_post WHERE id IN (${ids.map(() => "?").join(",")})`, ids)
    : [];
  const byId = new Map(posts.map((row) => [row.id, row]));
  const items = [...map.entries()].map(([postId, listId]) => ({ id: postId, title: byId.get(postId)?.title ?? "", slug: byId.get(postId)?.alt_name ?? "", listId, list: labels.get(listId) ?? "" }));
  return new Response(JSON.stringify({ name: user.name, items }, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${user.name}-watchlist.json"` },
  });
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ ok: false, error: "შესვლა სჭირდება." }, { status: 401 });
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("multipart/form-data")) {
    const form = await request.formData();
    const kind = String(form.get("kind") ?? "");
    if (kind === "avatar" || kind === "frame" || kind === "cover") {
      const file = form.get("file");
      if (!(file instanceof File)) return Response.json({ ok: false, error: "ფაილი არ არის." }, { status: 400 });
      const limit = kind === "cover" ? 3 * 1024 * 1024 : 1024 * 1024;
      if (file.size > limit) return Response.json({ ok: false, error: kind === "cover" ? "ფაილი 3 მბ-ზე დიდია." : "ფაილი 1 მბ-ზე დიდია." }, { status: 400 });
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/gif" ? "gif" : file.type === "image/jpeg" ? "jpg" : "";
      if (!ext) return Response.json({ ok: false, error: "მხოლოდ JPEG, PNG, GIF ან WEBP." }, { status: 400 });
      const folder = kind === "avatar" ? "avatars" : kind === "frame" ? "frames" : "covers";
      const name = `${user.id}.${ext}`;
      const target = storageFile("uploads", folder, name);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, Buffer.from(await file.arrayBuffer()));
      const url = `/uploads/${folder}/${name}?v=${Date.now()}`;
      const stored = `/uploads/${folder}/${name}`;
      if (kind === "avatar") await saveAvatar(user.id, stored);
      if (kind === "frame") await saveFrame(user.id, stored);
      if (kind === "cover") await saveCover(user.id, stored);
      return Response.json({ ok: true, [kind]: url });
    }
    if (kind === "import") {
      const file = form.get("file");
      if (!(file instanceof File)) return Response.json({ ok: false, error: "ფაილი არ არის." }, { status: 400 });
      const data = JSON.parse(await file.text()) as { items?: { id?: number; listId?: number }[] };
      let count = 0;
      for (const item of data.items ?? []) {
        const postId = Number(item.id);
        const listId = Number(item.listId);
        if (postId > 0 && listId > 0 && (await setUserList(user.id, postId, listId))) count += 1;
      }
      return Response.json({ ok: true, count });
    }
    return Response.json({ ok: false }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { action?: string; file?: string; name?: string; displayName?: string; bio?: string; website?: string; prefs?: Prefs; current?: string; next?: string; confirm?: string; email?: string; password?: string };
  if (body.action === "frame" || body.action === "avatar" || body.action === "cover") {
    const file = String(body.file ?? "");
    const kind = body.action;
    const catalog = kind === "avatar" ? avatars : kind === "cover" ? covers : frames;
    const folder = kind === "avatar" ? "avatars" : kind === "cover" ? "covers" : "frames";
    if (!file) {
      if (kind === "avatar") await saveAvatar(user.id, "");
      if (kind === "cover") await saveCover(user.id, "");
      if (kind === "frame") await saveFrame(user.id, "");
      return Response.json({ ok: true, [kind]: "" });
    }
    const known = catalog.some((group) => group.items.some((item) => item.file === file));
    if (!known || !/^[\w.-]+$/.test(file)) return Response.json({ ok: false, error: "ფაილი ვერ მოიძებნა." }, { status: 400 });
    try {
      await access(storageFile("assets", folder, file));
    } catch {
      return Response.json({ ok: false, error: "ფაილი ვერ მოიძებნა." }, { status: 400 });
    }
    const stored = `/assets/${folder}/${file}`;
    if (await shopFileExists(file) && !(await userOwnsFile(user.id, file))) return Response.json({ ok: false, error: "ეს მაღაზიაში იყიდება." }, { status: 400 });
    if (kind === "avatar") await saveAvatar(user.id, stored);
    if (kind === "cover") await saveCover(user.id, stored);
    if (kind === "frame") await saveFrame(user.id, stored);
    return Response.json({ ok: true, [kind]: stored });
  }
  if (body.action === "account") {
    const error = await saveAccount(user.id, { name: String(body.name ?? ""), displayName: String(body.displayName ?? ""), bio: String(body.bio ?? ""), website: String(body.website ?? "") });
    return Response.json(error ? { ok: false, error } : { ok: true, account: await getAccount(user.id) }, { status: error ? 400 : 200 });
  }
  if (body.action === "prefs") {
    const ok = await savePrefs(user.id, parsePrefs(JSON.stringify(body.prefs ?? {})));
    return Response.json({ ok });
  }
  if (body.action === "password") {
    if (body.next !== body.confirm) return Response.json({ ok: false, error: "პაროლები არ ემთხვევა." }, { status: 400 });
    const error = await changePassword(user.id, String(body.current ?? ""), String(body.next ?? ""));
    return Response.json(error ? { ok: false, error } : { ok: true }, { status: error ? 400 : 200 });
  }
  if (body.action === "email") {
    const error = await changeEmail(user.id, String(body.email ?? ""), String(body.password ?? ""));
    return Response.json(error ? { ok: false, error } : { ok: true, account: await getAccount(user.id) }, { status: error ? 400 : 200 });
  }
  return Response.json({ ok: false }, { status: 400 });
}
