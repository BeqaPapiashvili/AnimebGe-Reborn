import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSession, isAdmin } from "@/lib/auth";
import { storageFile } from "@/lib/storage";

const folders = { avatar: "avatars", cover: "covers", frame: "frames" } as const;
const allowed = new Set(["gif", "webp", "png", "jpg", "jpeg", "avif", "apng", "mp4", "webm", "mov", "m4v"]);
const maxBytes = 20 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getSession();
  if (!user || !isAdmin(user)) return Response.json({ error: "წვდომა არ არის." }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const type = String(form?.get("type") ?? "");
  const folder = folders[type as keyof typeof folders];
  const file = form?.get("file");
  if (!folder || !(file instanceof File)) return Response.json({ error: "ფაილი არ არის." }, { status: 400 });
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowed.has(ext)) return Response.json({ error: "ეს ფორმატი არ იტვირთება." }, { status: 400 });
  if (file.size <= 0 || file.size > maxBytes) return Response.json({ error: "ფაილი ცარიელია ან 20 მბ-ზე დიდია." }, { status: 400 });
  const name = `item_${Date.now()}_${randomBytes(3).toString("hex")}.${ext}`;
  const target = storageFile("assets", folder, name);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await file.arrayBuffer()));
  return Response.json({ path: `/assets/${folder}/${name}` });
}
