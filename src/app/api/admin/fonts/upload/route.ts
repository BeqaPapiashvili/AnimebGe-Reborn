import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSession, isAdmin } from "@/lib/auth";
import { addFont, cleanFamily } from "@/lib/fonts";
import { storageFile } from "@/lib/storage";

const formats: Record<string, string> = { ttf: "truetype", otf: "opentype", woff: "woff", woff2: "woff2" };
const maxBytes = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getSession();
  if (!user || !isAdmin(user)) return Response.json({ error: "წვდომა არ არის." }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "ფაილი არ არის." }, { status: 400 });
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const format = formats[ext];
  if (!format) return Response.json({ error: "მხოლოდ ttf, otf, woff ან woff2." }, { status: 400 });
  if (file.size <= 0 || file.size > maxBytes) return Response.json({ error: "ფაილი ცარიელია ან 8 მბ-ზე დიდია." }, { status: 400 });
  const fromName = cleanFamily(String(form?.get("name") ?? ""));
  const fromFile = cleanFamily(file.name.replace(/\.[^.]+$/, ""));
  const name = fromName || fromFile;
  if (name.length < 2) return Response.json({ error: "სახელი მოკლეა." }, { status: 400 });
  const stored = `font_${Date.now()}_${randomBytes(3).toString("hex")}.${ext}`;
  const full = storageFile("fonts", "custom", stored);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, Buffer.from(await file.arrayBuffer()));
  const error = await addFont(name, `/fonts/custom/${stored}`, format);
  if (error) {
    await unlink(full).catch(() => undefined);
    return Response.json({ error }, { status: 400 });
  }
  return Response.json({ ok: true });
}
