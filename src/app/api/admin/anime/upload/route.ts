import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSession, isAdmin } from "@/lib/auth";
import { storageFile } from "@/lib/storage";

type SharpChain = { rotate(): SharpChain; resize(options: { width: number; withoutEnlargement: boolean }): SharpChain; webp(options: { quality: number; alphaQuality?: number }): SharpChain; toBuffer(): Promise<Buffer> };

const widths = { poster: 800, cover: 1920, logo: 1200 } as const;
const allowed = new Set(["webp", "png", "jpg", "jpeg", "avif", "gif"]);
const maxBytes = 20 * 1024 * 1024;

async function optimize(body: Buffer, width: number) {
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore sharp ლოკალურად შეიძლება არ იყოს დაყენებული
    const sharp = (await import("sharp")).default as (input: Buffer) => SharpChain;
    return await sharp(body).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 86, alphaQuality: 100 }).toBuffer();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user || !isAdmin(user)) return Response.json({ error: "წვდომა არ არის." }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const kind = String(form?.get("kind") ?? "") as keyof typeof widths;
  const file = form?.get("file");
  if (!(kind in widths) || !(file instanceof File)) return Response.json({ error: "ფაილი არ არის." }, { status: 400 });
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowed.has(ext)) return Response.json({ error: "ფორმატი: JPG, PNG, WEBP, AVIF ან GIF." }, { status: 400 });
  if (file.size <= 0 || file.size > maxBytes) return Response.json({ error: "ფაილი ცარიელია ან 20 მბ-ზე დიდია." }, { status: 400 });
  const raw = Buffer.from(await file.arrayBuffer());
  const small = ext === "gif" ? null : await optimize(raw, widths[kind]);
  const month = new Date().toISOString().slice(0, 7);
  const name = `${kind}_${Date.now().toString(36)}${randomBytes(3).toString("hex")}.${small ? "webp" : ext}`;
  const target = storageFile("uploads", "posts", month, name);
  if (!target) return Response.json({ error: "ვერ შეინახა." }, { status: 500 });
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, small ?? raw);
  return Response.json({ path: `/uploads/posts/${month}/${name}` });
}
