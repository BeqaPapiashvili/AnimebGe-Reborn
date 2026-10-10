import "server-only";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { storageFile } from "@/lib/storage";
import { CARD_THUMB_WIDTH } from "@/lib/thumbs";

type SharpChain = { resize(options: { width: number; withoutEnlargement: boolean }): SharpChain; webp(options: { quality: number }): SharpChain; toFile(file: string): Promise<unknown> };

export async function makeCardThumb(name: string, body: Buffer) {
  const match = name.match(/^([\w-]+)\.(png|jpe?g|webp)$/i);
  if (!match) return;
  const target = storageFile("uploads", "anime_cards", "thumbs", `${match[1]}.webp`);
  if (!target) return;
  try {
    // @ts-ignore sharp ლოკალურად შეიძლება არ იყოს დაყენებული
    const sharp = (await import("sharp")).default as (input: Buffer) => SharpChain;
    await mkdir(path.dirname(target), { recursive: true });
    await sharp(body).resize({ width: CARD_THUMB_WIDTH, withoutEnlargement: true }).webp({ quality: 78 }).toFile(target);
  } catch {
    /* thumb-ის გარეშე ორიგინალი გამოჩნდება */
  }
}
