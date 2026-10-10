export type XFields = Record<string, string>;

export type EpisodeSource = { server: string; kind: "hls" | "embed"; url: string; language?: string };
export type Episode = { number: number; title?: string; sources: EpisodeSource[] };

const ORIGIN = "https://animeb.ge";

export function parseXFields(raw?: string | null): XFields {
  const fields: XFields = {};
  if (!raw) return fields;
  for (const pair of raw.split("||")) {
    const at = pair.indexOf("|");
    if (at > 0) fields[pair.slice(0, at)] = pair.slice(at + 1);
  }
  return fields;
}

export function absUrl(url?: string | null, base = `${ORIGIN}/uploads/`) {
  if (!url) return undefined;
  const value = url.trim();
  if (!value) return undefined;
  if (value.startsWith("//")) return `https:${value}`;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${ORIGIN}${value}`;
  return new URL(value, base).toString();
}

const localUpload = /^\/uploads\/(avatars|frames|covers|community)\//;

export function avatarUrl(foto?: string | null) {
  if (!foto) return undefined;
  const value = foto.trim();
  if (!value) return undefined;
  if (value.startsWith("/assets/")) return value;
  const upload = value.startsWith("/uploads/") ? value : value.startsWith("uploads/") ? `/${value}` : "";
  if (upload) return localUpload.test(upload) ? upload : `${ORIGIN}${upload}`;
  return absUrl(value, `${ORIGIN}/uploads/fotos/`);
}

export function stillSrc(src?: string) {
  if (!src) return undefined;
  const clean = src.split("?")[0];
  const match = clean.match(/^\/assets\/(avatars|covers)\/([^/]+)$/);
  if (!match || !/\.(gif|webp|apng|mp4|webm|mov|m4v)$/i.test(match[2])) return undefined;
  return `/assets/${match[1]}/posters/${match[2].replace(/\.[^.]+$/, "")}.jpg`;
}

export function imageSrc(src?: string | null) {
  if (!src) return undefined;
  const path = src.split(/[?#]/)[0] ?? "";
  return /\.(avif|gif|png|jpe?g|webp|svg)$/i.test(path) ? src : undefined;
}

export function portrait(foto?: string | null, decoration?: string | null, shopImage?: string | null) {
  const avatar = avatarUrl(foto);
  const id = decoration?.trim() ?? "";
  const shop = shopImage?.trim() ? absUrl(shopImage) : undefined;
  const own = id && id !== "0" && !/^\d+$/.test(id) ? avatarUrl(id) : undefined;
  return { avatar, frame: imageSrc(shop) || imageSrc(own) };
}

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#039": "'", apos: "'", nbsp: " " };

export function htmlToText(html = "") {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#?\w+);/g, (match, name: string) => {
      if (entities[name]) return entities[name];
      if (name.startsWith("#")) {
        const code = name[1] === "x" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      return match;
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function episodeNumber(title: string | undefined, index: number) {
  const match = title?.match(/(\d+)/);
  return match ? Number(match[1]) : index + 1;
}

type HlsItem = { title?: string; languages?: { label?: string; sources?: { file?: string }[] }[] };

function parseHls(raw: string): { title?: string; language?: string; url: string }[] {
  const body = raw.replace(/__NEWL__/g, "\n").trim().replace(/,\s*$/, "");
  const quoted = body.replace(/([{,]\s*)([A-Za-z_][\w]*)(\s*:)/g, '$1"$2"$3');
  let items: HlsItem[] = [];
  try {
    items = JSON.parse(`[${quoted}]`) as HlsItem[];
  } catch {
    const found: { title?: string; url: string }[] = [];
    const pattern = /title\s*:\s*"([^"]*)"[\s\S]*?file\s*:\s*"([^"]+)"/g;
    for (const match of body.matchAll(pattern)) found.push({ title: match[1], url: match[2] });
    return found;
  }
  return items.flatMap((item) =>
    (item.languages ?? []).flatMap((language) =>
      (language.sources ?? []).filter((source) => source.file).map((source) => ({ title: item.title, language: language.label, url: source.file! })),
    ),
  );
}

function parseEmbeds(raw: string) {
  const found: { title?: string; url: string }[] = [];
  const pattern = /"title"\s*:\s*['"]([^'"]*)['"]\s*,\s*"url"\s*:\s*['"]([^'"]+)['"]/g;
  for (const match of raw.matchAll(pattern)) found.push({ title: match[1], url: absUrl(match[2]) ?? match[2] });
  return found;
}

export function parseEpisodes(fields: XFields): Episode[] {
  const byNumber = new Map<number, Episode>();
  const add = (list: { title?: string; url: string; language?: string }[], server: string, kind: EpisodeSource["kind"]) => {
    list.forEach((item, index) => {
      const number = episodeNumber(item.title, index);
      const episode = byNumber.get(number) ?? { number, title: item.title, sources: [] };
      if (!episode.sources.some((source) => source.url === item.url)) episode.sources.push({ server, kind, url: item.url, language: item.language });
      byNumber.set(number, episode);
    });
  };
  if (fields.mp4link) add(parseHls(fields.mp4link), "AnimeB", "hls");
  const embedKeys = Object.keys(fields).filter((key) => key.startsWith("iframe")).sort();
  embedKeys.forEach((key, index) => add(parseEmbeds(fields[key]), `Server ${index + 1}`, "embed"));
  return [...byNumber.values()].sort((a, b) => a.number - b.number);
}

export function splitList(value?: string) {
  return (value ?? "")
    .split(/\s*,\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}
