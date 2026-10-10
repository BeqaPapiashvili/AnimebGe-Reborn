import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { clubDonate, clubImageSave, clubManage, clubMembership, clubRole } from "@/lib/play";
import { storageFile } from "@/lib/storage";

const own = new Set(["join", "cancel", "leave"]);

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ ok: false, error: "შესვლა სჭირდება." }, { status: 401 });

  if ((request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    const form = await request.formData();
    const clubId = Number(form.get("id"));
    const kind = form.get("kind") === "cover" ? "cover" : "avatar";
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "ფაილი არ არის." }, { status: 400 });
    if (file.size > (kind === "cover" ? 4 : 2) * 1024 * 1024) return NextResponse.json({ ok: false, error: kind === "cover" ? "ფაილი 4 მბ-ზე დიდია." : "ფაილი 2 მბ-ზე დიდია." }, { status: 400 });
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/gif" ? "gif" : file.type === "image/jpeg" ? "jpg" : "";
    if (!ext) return NextResponse.json({ ok: false, error: "მხოლოდ JPEG, PNG, GIF ან WEBP." }, { status: 400 });
    if ((await clubRole(user.id, clubId)) !== "owner") return NextResponse.json({ ok: false, error: "სურათს მხოლოდ მფლობელი ცვლის." }, { status: 403 });
    const name = `${kind === "cover" ? "cov" : "ava"}_${clubId}_${Date.now()}.${ext}`;
    const target = storageFile("uploads", "clubs", name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(await file.arrayBuffer()));
    const saved = await clubImageSave(user.id, clubId, kind, name);
    if (!saved.ok) await unlink(target).catch(() => undefined);
    return NextResponse.json(saved, { status: saved.ok ? 200 : 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action ?? "");
  const clubId = Number(body?.id);
  if (action === "donate") {
    const donated = await clubDonate(user.id, clubId, Array.isArray(body?.ids) ? body.ids.map(Number) : []);
    return NextResponse.json(donated, { status: donated.ok ? 200 : 400 });
  }
  const result = own.has(action) ? await clubMembership(user.id, clubId, action) : await clubManage(user.id, clubId, action, body ?? {});
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
