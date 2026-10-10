import "server-only";
import { createHash } from "crypto";
import { spawn } from "child_process";
import { access, mkdir, rename } from "fs/promises";
import path from "path";
import type { Episode } from "@/lib/dle";

const dir = path.join(process.cwd(), "data", "stills");

export function stillFile(url: string) {
  const id = createHash("sha1").update(url).digest("hex").slice(0, 20);
  return { id, file: path.join(dir, `${id}.jpg`), href: `/stills/${id}.jpg` };
}

async function exists(file: string) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function text(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(String(res.status));
  return res.text();
}

async function middleSegment(masterUrl: string) {
  const master = await text(masterUrl);
  const variant = master.split("\n").map((line) => line.trim()).find((line) => line && !line.startsWith("#"));
  if (!variant) return "";
  const mediaUrl = new URL(variant, masterUrl).toString();
  const media = await text(mediaUrl);
  const segments = media.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
  if (!segments.length) return "";
  const pick = segments[Math.min(segments.length - 1, Math.max(1, Math.floor(segments.length * 0.45)))];
  return new URL(pick, mediaUrl).toString();
}

function playlist(url: string) {
  return /\.m3u8?(?:$|[?#])/i.test(url);
}

function frame(input: string, output: string, offset = false) {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn(
      "ffmpeg",
      ["-y", ...(offset ? ["-ss", "90"] : []), "-i", input, "-frames:v", "1", "-vf", "scale=320:180", "-q:v", "5", output],
      { windowsHide: true },
    );
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error("timeout"));
    }, 12000);
    proc.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(String(code)));
    });
  });
}

const jobs = new Map<string, Promise<string | undefined>>();
const failed = new Map<string, number>();
const FAIL_MS = 6 * 60 * 60 * 1000;
let ffmpegReady: Promise<boolean> | undefined;

function hasFfmpeg() {
  ffmpegReady ??= new Promise<boolean>((resolve) => {
    const proc = spawn("ffmpeg", ["-version"], { windowsHide: true, stdio: "ignore" });
    proc.on("error", () => resolve(false));
    proc.on("close", (code) => resolve(code === 0));
  });
  return ffmpegReady;
}

function build(url: string) {
  const cached = jobs.get(url);
  if (cached) return cached;
  const job = (async () => {
    const { file, href } = stillFile(url);
    if (await exists(file)) return href;
    const direct = !playlist(url);
    const segment = direct ? url : await middleSegment(url);
    if (!segment) return undefined;
    await mkdir(dir, { recursive: true });
    const temp = file.replace(/\.jpg$/, ".tmp.jpg");
    await frame(segment, temp, direct);
    try {
      await rename(temp, file);
    } catch {
      if (!(await exists(file))) return undefined;
    }
    return href;
  })().catch(() => undefined).then((href) => {
    jobs.delete(url);
    if (!href) failed.set(url, Date.now());
    return href;
  });
  jobs.set(url, job);
  return job;
}

async function pool<T>(items: T[], limit: number, run: (item: T) => Promise<void>) {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index];
      index += 1;
      await run(item);
    }
  });
  await Promise.all(workers);
}

export async function warmAllStills() {
  if (!(await hasFfmpeg())) return;
  const { query } = await import("@/lib/db");
  const { parseEpisodes, parseXFields } = await import("@/lib/dle");
  const rows = await query<{ xfields: string }>("SELECT xfields FROM dle_post WHERE approve = 1 ORDER BY date DESC");
  const urls: string[] = [];
  for (const row of rows) {
    for (const episode of parseEpisodes(parseXFields(row.xfields))) {
      const url = episode.sources.find((source) => source.kind === "hls")?.url;
      if (url) urls.push(url);
    }
  }
  const missing: string[] = [];
  for (const url of urls) if (!(await exists(stillFile(url).file))) missing.push(url);
  let made = 0;
  await pool(missing, 2, async (url) => {
    if (await build(url)) made += 1;
  });
  console.log(`stills: ${urls.length} სერია, ${missing.length} აკლდა, ${made} შეიქმნა`);
}

export async function attachStills<T extends Episode>(episodes: T[]): Promise<T[]> {
  const ready = new Map<number, string>();
  const missing: string[] = [];
  await Promise.all(episodes.map(async (episode) => {
    const url = episode.sources.find((source) => source.kind === "hls")?.url;
    if (!url) return;
    const { file, href } = stillFile(url);
    if (await exists(file)) ready.set(episode.number, href);
    else missing.push(url);
  }));
  const now = Date.now();
  const todo = missing.filter((url) => !jobs.has(url) && now - (failed.get(url) ?? 0) > FAIL_MS);
  if (todo.length) {
    void hasFfmpeg().then((ok) => {
      if (ok) void pool(todo, 2, async (url) => { await build(url); });
      else for (const url of todo) failed.set(url, now);
    });
  }
  return episodes.map((episode) => (ready.has(episode.number) ? { ...episode, thumbnail: ready.get(episode.number) } : episode));
}
