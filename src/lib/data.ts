const ratings = new Set(["PG-13", "PG", "G", "R-17+", "R", "R+", "17+", "13+", "18+", "16+"]);

export function art(item: { poster?: string; banner?: string }) {
  return item.poster || item.banner || "";
}

export function hasRating(value?: string) {
  return !!value && ratings.has(value);
}

export function formatCount(value: number) {
  return Math.trunc(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

export function animeHref(slug: string) {
  return `/anime/${encodeURIComponent(slug)}`;
}
