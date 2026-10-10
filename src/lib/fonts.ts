import "server-only";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { execute, query } from "@/lib/db";
import { storageFile } from "@/lib/storage";
import { builtInFonts, fontSlots, type FontRole, type SiteFont } from "@/lib/font-types";

const roles: FontRole[] = fontSlots.map((slot) => slot.role);

export type { FontRole, SiteFont };

let ready: Promise<void> | null = null;

function ensureFonts() {
  ready ??= (async () => {
    await execute(`CREATE TABLE IF NOT EXISTS site_fonts (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(80) NOT NULL,
      family VARCHAR(80) NOT NULL,
      file VARCHAR(255) NOT NULL,
      format VARCHAR(16) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY family (family)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await execute(`CREATE TABLE IF NOT EXISTS site_font_roles (
      role VARCHAR(16) NOT NULL,
      family VARCHAR(80) NOT NULL,
      PRIMARY KEY (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    const saved = new Map((await query<{ role: string; family: string }>("SELECT role, family FROM site_font_roles")).map((row) => [row.role, row.family]));
    if (!saved.has("_v")) {
      const body = saved.get("body") || "BOG";
      const heading = saved.get("heading") || body;
      const ui = saved.get("ui") || body;
      const seed: Record<FontRole, string> = {
        nav: ui, footer: body, page: heading, section: heading, card: heading,
        body, desc: body, comment: body, button: ui, field: ui,
      };
      for (const role of roles) {
        const family = seed[role];
        if (!saved.has(role)) await execute("INSERT INTO site_font_roles (role, family) VALUES (?, ?)", [role, family]);
        else if (family !== "BOG" && saved.get(role) === "BOG" && role !== "body") await execute("UPDATE site_font_roles SET family = ? WHERE role = ?", [family, role]);
      }
      await execute("INSERT INTO site_font_roles (role, family) VALUES ('_v', '1')");
    }
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

export function cleanFamily(value: string) {
  return value.replace(/[^\p{L}\p{N} _.-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 40);
}

function quote(family: string) {
  return `"${family.replace(/["\\]/g, "")}"`;
}

export async function listFonts() {
  await ensureFonts();
  const rows = await query<{ id: number; name: string; family: string; file: string }>(
    "SELECT id, name, family, file FROM site_fonts ORDER BY id DESC",
  );
  const fonts: SiteFont[] = [
    ...builtInFonts.map((family) => ({ id: 0, name: family, family, file: "", builtIn: true })),
    ...rows.map((row) => ({ id: row.id, name: row.name, family: row.family, file: row.file, builtIn: false })),
  ];
  const assigned = await query<{ role: string; family: string }>("SELECT role, family FROM site_font_roles");
  const saved = new Map(assigned.map((row) => [row.role, row.family]));
  const legacy = {
    body: saved.get("body") || "BOG",
    heading: saved.get("heading") || saved.get("body") || "BOG",
    ui: saved.get("ui") || saved.get("body") || "BOG",
  };
  const fallback: Record<FontRole, string> = {
    nav: legacy.ui,
    footer: legacy.body,
    page: legacy.heading,
    section: legacy.heading,
    card: legacy.heading,
    body: legacy.body,
    desc: legacy.body,
    comment: legacy.body,
    button: legacy.ui,
    field: legacy.ui,
  };
  const use = {} as Record<FontRole, string>;
  for (const role of roles) use[role] = saved.get(role) || fallback[role];
  return { fonts, use };
}

export async function addFont(name: string, file: string, format: string) {
  await ensureFonts();
  const family = cleanFamily(name);
  if (family.length < 2) return "სახელი მოკლეა.";
  if (builtInFonts.includes(family as (typeof builtInFonts)[number])) return "ეს სახელი უკვე დაკავებულია.";
  const taken = await query("SELECT id FROM site_fonts WHERE family = ? LIMIT 1", [family]);
  if (taken.length) return "ასეთი სახელით ფონტი უკვე არის.";
  await execute("INSERT INTO site_fonts (name, family, file, format) VALUES (?, ?, ?, ?)", [family, family, file, format]);
  return "";
}

export async function removeFont(id: number) {
  await ensureFonts();
  const rows = await query<{ family: string; file: string }>("SELECT family, file FROM site_fonts WHERE id = ? LIMIT 1", [id]);
  const row = rows[0];
  if (!row || !row.file.startsWith("/fonts/custom/")) return;
  const full = storageFile("fonts", "custom", path.basename(row.file));
  if (!full) return;
  await execute("UPDATE site_font_roles SET family = 'BOG' WHERE family = ?", [row.family]);
  await execute("DELETE FROM site_fonts WHERE id = ?", [id]);
  await unlink(full).catch(() => undefined);
}

export async function saveFontRoles(input: Record<FontRole, string>) {
  await ensureFonts();
  const known = new Set<string>(builtInFonts);
  const rows = await query<{ family: string }>("SELECT family FROM site_fonts");
  for (const row of rows) known.add(row.family);
  for (const role of roles) {
    const family = known.has(input[role]) ? input[role] : "BOG";
    await execute("INSERT INTO site_font_roles (role, family) VALUES (?, ?) ON DUPLICATE KEY UPDATE family = VALUES(family)", [role, family]);
  }
}

export async function fontStyle() {
  const { fonts, use } = await listFonts();
  const faces = fonts
    .filter((font) => !font.builtIn && font.file.startsWith("/fonts/custom/"))
    .map((font) => {
      const format = font.file.endsWith(".woff2") ? "woff2" : font.file.endsWith(".woff") ? "woff" : font.file.endsWith(".otf") ? "opentype" : "truetype";
      return `@font-face{font-family:${quote(font.family)};src:url("${font.file}") format("${format}");font-weight:100 900;font-style:normal;font-display:swap;}`;
    })
    .join("");
  const vars = roles.map((role) => `--font-${role}:${quote(use[role])},sans-serif`).join(";");
  return `${faces}:root{--font-sans:${quote(use.body)},sans-serif;${vars}}`;
}
