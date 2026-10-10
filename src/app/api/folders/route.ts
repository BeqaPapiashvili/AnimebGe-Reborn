import { clientIp, getSession } from "@/lib/auth";
import { bumpFolder, createFolder, deleteFolder, foldersForPost, reorderFolder, toggleFolderItem, updateFolder } from "@/lib/folders";
import { limited } from "@/lib/limit";

export async function GET(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ folders: [] });
  const postId = Number(new URL(request.url).searchParams.get("postId"));
  if (!postId) return Response.json({ folders: [] });
  return Response.json({ folders: await foldersForPost(user.id, postId) });
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ error: "შესვლა სჭირდება." }, { status: 401 });
  const raw = await request.json().catch(() => ({})) as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === "string" ? value : undefined);
  const body = {
    action: text(raw.action),
    id: Math.max(0, Math.floor(Number(raw.id) || 0)),
    name: text(raw.name),
    description: text(raw.description),
    visibility: text(raw.visibility),
    pinned: typeof raw.pinned === "boolean" ? raw.pinned : undefined,
    sort: text(raw.sort),
    adult: typeof raw.adult === "boolean" ? raw.adult : undefined,
    postId: Math.max(0, Math.floor(Number(raw.postId) || 0)),
    postIds: Array.isArray(raw.postIds) ? raw.postIds : undefined,
  };
  if (body.action === "create") {
    const id = await createFolder(user.id, { ...body, name: body.name ?? "" });
    return Response.json(id ? { ok: true, id } : { error: "სახელი ცარიელია." });
  }
  if (body.action === "update" && body.id) return Response.json({ ok: await updateFolder(user.id, body.id, body) });
  if (body.action === "delete" && body.id) return Response.json({ ok: await deleteFolder(user.id, body.id) });
  if (body.action === "toggle" && body.id && body.postId) return Response.json({ ok: await toggleFolderItem(user.id, body.id, body.postId) });
  if (body.action === "reorder" && body.id && Array.isArray(body.postIds)) return Response.json({ ok: await reorderFolder(user.id, body.id, body.postIds.map(Number)) });
  if (body.action === "view" && body.id) {
    if (await limited(`folder-view:${body.id}:${await clientIp()}`, 1, 60 * 60 * 1000)) return Response.json({ ok: true });
    return Response.json({ ok: await bumpFolder(body.id, "views", user.id) });
  }
  if (body.action === "share" && body.id) {
    if (await limited(`folder-share:${body.id}:${user.id}`, 3, 60 * 60 * 1000)) return Response.json({ ok: true });
    return Response.json({ ok: await bumpFolder(body.id, "shares", user.id) });
  }
  return Response.json({ error: "მოთხოვნა არასწორია." }, { status: 400 });
}
