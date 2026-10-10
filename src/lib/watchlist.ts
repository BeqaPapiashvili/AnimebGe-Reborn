export type WatchQuery = {
  q: string;
  folder: string;
  genre: string;
  tag: string;
  year: string;
  status: string;
  season: string;
  format: string;
  sort: string;
  limit: number;
  offset: number;
};

export type WatchItem = {
  id: number;
  slug: string;
  title: string;
  poster?: string;
  format?: string;
  duration?: number;
  year?: string;
  status?: string;
  season?: string;
  genres: string[];
  tags: string[];
  score: number;
  sub?: string;
  dub?: string;
  total?: string;
  updated: string;
  listId: number;
  folder: string;
  folderLabel: string;
};

export type WatchFacets = {
  genres: string[];
  tags: string[];
  years: string[];
  statuses: string[];
  seasons: string[];
  formats: string[];
};

export type WatchPage = {
  items: WatchItem[];
  total: number;
  facets: WatchFacets;
};

export const emptyFacets: WatchFacets = { genres: [], tags: [], years: [], statuses: [], seasons: [], formats: [] };

const sorts = new Set(["updated", "title", "year", "score"]);

function one(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? "";
}

export function parseWatchQuery(params: Record<string, string | string[] | undefined>): WatchQuery {
  const limit = Number(one(params.limit));
  const offset = Number(one(params.offset));
  const sort = one(params.sort).toLowerCase();
  return {
    q: one(params.q),
    folder: one(params.folder).toUpperCase(),
    genre: one(params.genre),
    tag: one(params.tag),
    year: one(params.year),
    status: one(params.status),
    season: one(params.season),
    format: one(params.format),
    sort: sorts.has(sort) ? sort : "updated",
    limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, 60) : 24,
    offset: Number.isInteger(offset) && offset > 0 ? offset : 0,
  };
}

export function splitFilter(value: string) {
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

export function watchlistHref(query: WatchQuery) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.folder) params.set("folder", query.folder);
  if (query.genre) params.set("genre", query.genre);
  if (query.tag) params.set("tag", query.tag);
  if (query.year) params.set("year", query.year);
  if (query.status) params.set("status", query.status);
  if (query.season) params.set("season", query.season);
  if (query.format) params.set("format", query.format);
  if (query.sort !== "updated") params.set("sort", query.sort);
  if (!params.toString() && query.limit === 24 && query.offset === 0) return "/watchlist";
  params.set("limit", String(query.limit));
  params.set("offset", String(query.offset));
  return `/watchlist?${params}`;
}
