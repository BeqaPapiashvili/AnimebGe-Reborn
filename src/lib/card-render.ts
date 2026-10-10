import "server-only";
import { access } from "node:fs/promises";
import { storageFile } from "@/lib/storage";

type Sharp = {
  (input?: Buffer | string | { text: Record<string, unknown> } | { create: Record<string, unknown> }): SharpChain;
};
type SharpChain = {
  rotate(): SharpChain;
  resize(width: number, height: number, options: { fit: "cover"; position?: string }): SharpChain;
  composite(layers: { input: Buffer | string; top?: number; left?: number }[]): SharpChain;
  png(options?: { compressionLevel?: number }): SharpChain;
  metadata(): Promise<{ width?: number; height?: number }>;
  toBuffer(options: { resolveWithObject: true }): Promise<{ data: Buffer; info: { width: number; height: number } }>;
  toBuffer(): Promise<Buffer>;
};

export const CARD_FRAMES: Record<string, string> = { E: "E", D: "D", C: "C", B: "B", A: "A", S: "S", "S+": "SSS" };

const FONT_FAMILY = "TBC Din Mtavruli Bold";
const DPI = 82;

async function loadSharp() {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore sharp ლოკალურად შეიძლება არ იყოს დაყენებული
  return (await import("sharp")).default as Sharp;
}

function escape(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function fitText(sharp: Sharp, fontfile: string, text: string, size: number, maxWidth: number, minSize = 8) {
  let value = text.trim();
  let current = size;
  for (let step = 0; step < 200; step += 1) {
    const out = await sharp({ text: { text: `<span foreground="white">${escape(value)}</span>`, font: `${FONT_FAMILY} ${current}`, fontfile, dpi: DPI, rgba: true } }).png().toBuffer({ resolveWithObject: true });
    if (out.info.width <= maxWidth) return out;
    if (current > minSize) {
      current -= 1;
      continue;
    }
    const chars = [...value.replace(/\.\.\.$/, "")];
    if (chars.length <= 4) return out;
    value = `${chars.slice(0, -1).join("").trimEnd()}...`;
  }
  return null;
}

async function fitName(sharp: Sharp, fontfile: string, text: string, maxWidth: number) {
  const value = text.trim();
  const draw = (size: number, wrap: boolean) => sharp({ text: { text: `<span foreground="white">${escape(value)}</span>`, font: `${FONT_FAMILY} ${size}`, fontfile, dpi: DPI, rgba: true, ...(wrap ? { width: maxWidth, wrap: "word", align: "centre" } : {}) } }).png().toBuffer({ resolveWithObject: true });
  for (let size = 23; size >= 12; size -= 1) {
    const single = await draw(size, false);
    if (single.info.width <= maxWidth) return single;
    if (!/\s/.test(value)) continue;
    const wrapped = await draw(size, true);
    if (wrapped.info.height <= single.info.height * 3.2 && wrapped.info.width <= maxWidth) return wrapped;
  }
  return fitText(sharp, fontfile, value, 12, maxWidth);
}

export async function renderCard(input: { image: Buffer; rarity: string; name: string; anime: string; withText: boolean }) {
  const frame = CARD_FRAMES[input.rarity];
  const framePath = frame ? storageFile("uploads", "card_borders", `${frame}.png`) : null;
  if (!framePath) return null;
  await access(framePath);
  const sharp = await loadSharp();
  const meta = await sharp(framePath).metadata();
  const w = meta.width ?? 288;
  const h = meta.height ?? 432;
  const base = await sharp(input.image).rotate().resize(w, h, { fit: "cover" }).png().toBuffer();
  const fontfile = input.withText ? storageFile("uploads", "fonts", "font.ttf") : "";
  const name = fontfile && input.name.trim() ? await fitName(sharp, fontfile, input.name, w - 40) : null;
  const anime = fontfile && input.anime.trim() ? await fitText(sharp, fontfile, input.anime, 12, w - 60, 11) : null;
  const animeTop = anime ? Math.round(h - 24 - anime.info.height / 2) : h - 16;
  const nameTop = name ? animeTop - (anime ? 14 : 0) - name.info.height : animeTop;
  const layers: { input: Buffer | string; top?: number; left?: number }[] = [];
  if (fontfile) {
    const tall = Math.min(h, Math.max(140, h - nameTop + 60));
    const shade = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${tall}"><defs><linearGradient id="g" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity="1"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient></defs><rect width="${w}" height="${tall}" fill="url(#g)"/></svg>`);
    layers.push({ input: shade, top: h - tall, left: 0 });
  }
  layers.push({ input: framePath, top: 0, left: 0 });
  if (name) layers.push({ input: name.data, left: Math.round((w - name.info.width) / 2), top: nameTop });
  if (anime) layers.push({ input: anime.data, left: Math.round((w - anime.info.width) / 2), top: animeTop });
  return sharp(base).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}
