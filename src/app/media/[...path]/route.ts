import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isStorageRoot, storageFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

const types: Record<string, string> = {
  webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
  webm: "video/webm", mp4: "video/mp4", avif: "image/avif", apng: "image/apng", mov: "video/quicktime", m4v: "video/mp4",
  ttf: "font/ttf", otf: "font/otf", woff: "font/woff", woff2: "font/woff2",
};
const mutable = new Set(["avatars", "covers", "frames", "clubs"]);

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  if (parts.length < 2 || parts.some((part) => !/^[\w.-]+$/.test(part) || part === "." || part === "..")) return new Response(null, { status: 404 });
  const [root, ...rest] = parts;
  if (!isStorageRoot(root)) return new Response(null, { status: 404 });
  const file = storageFile(root, ...rest);
  if (!file) return new Response(null, { status: 404 });
  const ext = rest[rest.length - 1].split(".").pop()?.toLowerCase() ?? "";
  const type = types[ext] ?? "application/octet-stream";
  const cache = mutable.has(rest[0]) ? "public, max-age=300" : "public, max-age=31536000, immutable";
  try {
    const body = await readFile(file);
    return new Response(body, { headers: { "content-type": type, "cache-control": cache } });
  } catch { /* ჯერ ლოკალურად არ არის */ }
  if (root !== "uploads") return new Response(null, { status: 404 });
  const remote = await fetch(`https://animeb.ge/${parts.join("/")}`).catch(() => null);
  if (!remote?.ok) return new Response(null, { status: 404 });
  const body = Buffer.from(await remote.arrayBuffer());
  await mkdir(path.dirname(file), { recursive: true }).catch(() => undefined);
  await writeFile(file, body).catch(() => undefined);
  return new Response(body, { headers: { "content-type": remote.headers.get("content-type") || type, "cache-control": cache } });
}
