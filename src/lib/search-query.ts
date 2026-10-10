export type SearchQuery = {
  q: string;
  genre: string;
  year: string;
  character: string;
  staff: string;
  studio: string;
  season: string;
  format: string;
  status: string;
  sort: "newest" | "popular" | "score" | "year";
  limit: number;
  offset: number;
};

export type SearchFacets = {
  genres: string[];
  years: string[];
  characters: string[];
  staff: string[];
  studios: string[];
  seasons: string[];
  formats: string[];
  statuses: string[];
};

const sorts = new Set<SearchQuery["sort"]>(["newest", "popular", "score", "year"]);

function one(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? "";
}

export function parseSearchQuery(params: Record<string, string | string[] | undefined>): SearchQuery {
  const limit = Number(one(params.limit));
  const offset = Number(one(params.offset));
  const sort = one(params.sort).toLowerCase();
  return {
    q: one(params.q),
    genre: one(params.genre),
    year: one(params.year),
    character: one(params.character),
    staff: one(params.staff),
    studio: one(params.studio),
    season: one(params.season),
    format: one(params.format),
    status: one(params.status),
    sort: sorts.has(sort as SearchQuery["sort"]) ? (sort as SearchQuery["sort"]) : "newest",
    limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, 60) : 32,
    offset: Number.isInteger(offset) && offset > 0 ? offset : 0,
  };
}

export function searchHref(query: SearchQuery) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.genre) params.set("genre", query.genre);
  if (query.year) params.set("year", query.year);
  if (query.character) params.set("character", query.character);
  if (query.staff) params.set("staff", query.staff);
  if (query.studio) params.set("studio", query.studio);
  if (query.season) params.set("season", query.season);
  if (query.format) params.set("format", query.format);
  if (query.status) params.set("status", query.status);
  if (query.sort !== "newest") params.set("sort", query.sort);
  if (query.offset) params.set("offset", String(query.offset));
  const text = params.toString();
  return text ? `/search?${text}` : "/search";
}
