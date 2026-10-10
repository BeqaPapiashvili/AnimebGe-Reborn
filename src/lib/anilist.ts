export type AnimeDetail = {
  title: string;
  romaji?: string;
  synonyms: string[];
  description: string;
  genres: string[];
  format?: string;
  episodes?: number;
  duration?: number;
  status?: string;
  season?: string;
  startDate?: string;
  score?: number;
  poster?: string;
  banner?: string;
  studios: string[];
  tags: { name: string; rank: number; spoiler: boolean }[];
  anilistUrl?: string;
  malUrl?: string;
  sub?: string;
  dub?: string;
  country?: string;
  related: { title: string; relation: string; format?: string; year?: number; image?: string; poster?: string; current?: boolean }[];
  cast: { name: string; role: string; image?: string; actor?: string; actorImage?: string }[];
  recommendations: { title: string; image?: string; format?: string; score?: number }[];
  episodeList: { number: number; title?: string; thumbnail?: string; airedAt?: number }[];
};

const query = `query ($search: String) {
  Media(search: $search, type: ANIME) {
    idMal siteUrl
    title { romaji english }
    synonyms genres episodes duration status season seasonYear format averageScore description(asHtml: false)
    startDate { year month day }
    coverImage { extraLarge }
    bannerImage
    studios { nodes { name } }
    tags { name rank isMediaSpoiler }
    relations { edges { relationType node { type format seasonYear title { romaji english } coverImage { large } bannerImage } } }
    characters(sort: [ROLE, RELEVANCE], perPage: 12) { edges { role node { name { full } image { large } } voiceActors(language: JAPANESE) { name { full } image { large } } } }
    recommendations(perPage: 12, sort: RATING_DESC) { nodes { mediaRecommendation { title { romaji english } coverImage { large } format averageScore } } }
    streamingEpisodes { title thumbnail }
    nextAiringEpisode { episode }
    airingSchedule(perPage: 100) { nodes { episode airingAt } }
    countryOfOrigin
  }
}`;

type Title = { romaji?: string; english?: string | null };
type Media = {
  idMal?: number;
  siteUrl?: string;
  title: Title;
  synonyms?: string[];
  genres?: string[];
  episodes?: number;
  duration?: number;
  status?: string;
  season?: string;
  seasonYear?: number;
  format?: string;
  averageScore?: number;
  description?: string;
  startDate?: { year?: number; month?: number; day?: number };
  coverImage?: { extraLarge?: string };
  bannerImage?: string;
  studios?: { nodes: { name: string }[] };
  tags?: { name: string; rank: number; isMediaSpoiler: boolean }[];
  relations?: { edges: { relationType: string; node: { type: string; format?: string; seasonYear?: number; title: Title; coverImage?: { large?: string }; bannerImage?: string } }[] };
  characters?: { edges: { role: string; node: { name: { full: string }; image?: { large?: string } }; voiceActors: { name: { full: string }; image?: { large?: string } }[] }[] };
  recommendations?: { nodes: { mediaRecommendation: { title: Title; coverImage?: { large?: string }; format?: string; averageScore?: number } | null }[] };
  streamingEpisodes?: { title?: string; thumbnail?: string }[];
  nextAiringEpisode?: { episode: number } | null;
  airingSchedule?: { nodes: { episode: number; airingAt: number }[] };
  countryOfOrigin?: string;
};

function buildEpisodes(media: Media) {
  const streamed = new Map<number, { title?: string; thumbnail?: string }>();
  for (const item of media.streamingEpisodes ?? []) {
    const match = item.title?.match(/^Episode\s+(\d+)\s*[-–:]?\s*(.*)$/i);
    if (match) streamed.set(Number(match[1]), { title: match[2] || undefined, thumbnail: item.thumbnail });
  }
  const aired = media.nextAiringEpisode ? media.nextAiringEpisode.episode - 1 : undefined;
  const count = aired ?? media.episodes ?? (streamed.size ? Math.max(...streamed.keys()) : 12);
  const airDates = new Map((media.airingSchedule?.nodes ?? []).map((node) => [node.episode, node.airingAt * 1000]));
  return Array.from({ length: Math.max(count, 1) }, (_, index) => ({ number: index + 1, ...streamed.get(index + 1), airedAt: airDates.get(index + 1) }));
}

const pick = (title: Title) => title.english || title.romaji || "";
const cap = (value?: string) => (value ? value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ") : undefined);
const pad = (value?: number) => String(value ?? 1).padStart(2, "0");
const seriesRelations = new Set(["PREQUEL", "SEQUEL", "PARENT", "SIDE_STORY", "SPIN_OFF", "ALTERNATIVE"]);

function clean(text = "") {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const roles: Record<string, string> = { MAIN: "მთავარი", SUPPORTING: "მეორეხარისხოვანი", BACKGROUND: "ეპიზოდური" };

const charactersQuery = `query ($search: String, $page: Int, $withMain: Boolean!) {
  Media(search: $search, type: ANIME) {
    main: characters(role: MAIN, sort: [FAVOURITES_DESC], perPage: 25) @include(if: $withMain) {
      edges { role node { name { full } image { large } favourites } voiceActors(language: JAPANESE, sort: [RELEVANCE]) { name { full } image { large } } }
    }
    characters(role: SUPPORTING, sort: [FAVOURITES_DESC], page: $page, perPage: 25) {
      pageInfo { hasNextPage }
      edges { role node { name { full } image { large } favourites } voiceActors(language: JAPANESE, sort: [RELEVANCE]) { name { full } image { large } } }
    }
  }
}`;

type CastPerson = { name: string; role: string; image?: string; actor?: string; actorImage?: string; favourites: number };

function mapEdges(edges: { role: string; node: { name: { full: string }; image?: { large?: string }; favourites?: number }; voiceActors: { name: { full: string }; image?: { large?: string } }[] }[]): CastPerson[] {
  return edges
    .map((edge) => ({
      name: edge.node.name.full,
      role: roles[edge.role] ?? "პერსონაჟი",
      image: edge.node.image?.large,
      actor: edge.voiceActors[0]?.name.full,
      actorImage: edge.voiceActors[0]?.image?.large,
      favourites: edge.node.favourites ?? 0,
    }))
    .filter((person) => !/^narrator$/i.test(person.name));
}

async function characterPage(search: string, page: number) {
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: charactersQuery, variables: { search, page, withMain: page === 1 } }),
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`anilist ${res.status}`);
  const media = (await res.json())?.data?.Media;
  return {
    main: mapEdges(media?.main?.edges ?? []),
    support: mapEdges(media?.characters?.edges ?? []),
    hasNext: Boolean(media?.characters?.pageInfo?.hasNextPage),
  };
}

type CastResult = { people: Omit<CastPerson, "favourites">[]; total: number; hasNext: boolean };

const CAST_OK_MS = 24 * 60 * 60 * 1000;
const CAST_FAIL_MS = 10 * 60 * 1000;
const castStore = globalThis as typeof globalThis & { anilistCast?: Map<string, { at: number; ttl: number; value: Promise<CastResult> }> };
const castCache = (castStore.anilistCast ??= new Map());

export function getAnimeCharacters(search: string, page = 1): Promise<CastResult> {
  const term = search.trim();
  if (!term || page > 1) return Promise.resolve({ people: [], total: 0, hasNext: false });
  const key = term.toLowerCase();
  const hit = castCache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value;
  if (castCache.size > 2000) castCache.clear();
  const entry = { at: Date.now(), ttl: CAST_OK_MS, value: Promise.resolve<CastResult>({ people: [], total: 0, hasNext: false }) };
  entry.value = fetchCharacters(term).then((result) => {
    if (!result.people.length) entry.ttl = CAST_FAIL_MS;
    return result;
  });
  castCache.set(key, entry);
  return entry.value;
}

async function fetchCharacters(term: string): Promise<CastResult> {
  const empty: CastResult = { people: [], total: 0, hasNext: false };
  try {
    const first = await characterPage(term, 1);
    const support = [...first.support];
    let hasNext = first.hasNext;
    let current = 1;
    const lead = Math.max(0, ...first.main.map((person) => person.favourites), ...support.map((person) => person.favourites));
    const floor = Math.max(25, Math.round(lead * 0.012));
    while (hasNext && current < 4 && support.length > 0 && support[support.length - 1].favourites >= floor) {
      current += 1;
      const next = await characterPage(term, current).catch(() => null);
      if (!next) break;
      support.push(...next.support);
      hasNext = next.hasNext;
    }
    const seen = new Set<string>();
    const people = [...first.main, ...support.filter((person) => person.favourites >= floor)]
      .sort((a, b) => b.favourites - a.favourites)
      .filter((person) => {
        const key = person.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(({ favourites: _favourites, ...person }) => person);
    const picked = people.length ? people : support.slice(0, 25).map(({ favourites: _favourites, ...person }) => person);
    return { people: picked, total: picked.length, hasNext: false };
  } catch {
    return empty;
  }
}

export async function getAnimeDetail(search: string): Promise<AnimeDetail | null> {
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { search } }),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const media: Media | null = (await res.json())?.data?.Media;
    if (!media) return null;
    const title = pick(media.title);
    const start = media.startDate?.year ? `${media.startDate.year}-${pad(media.startDate.month)}-${pad(media.startDate.day)}` : undefined;
    const related = (media.relations?.edges ?? [])
      .filter((edge) => edge.node.type === "ANIME" && seriesRelations.has(edge.relationType))
      .map((edge) => ({
        title: pick(edge.node.title),
        relation: cap(edge.relationType) ?? "",
        format: edge.node.format,
        year: edge.node.seasonYear,
        image: edge.node.bannerImage || edge.node.coverImage?.large,
        poster: edge.node.coverImage?.large,
      }));
    return {
      title,
      romaji: media.title.romaji && media.title.romaji !== title ? media.title.romaji : undefined,
      synonyms: media.synonyms ?? [],
      description: clean(media.description),
      genres: media.genres ?? [],
      format: media.format?.replace(/_/g, " "),
      episodes: media.episodes,
      duration: media.duration,
      status: cap(media.status),
      season: media.season && media.seasonYear ? `${cap(media.season)} ${media.seasonYear}` : undefined,
      startDate: start,
      country: media.countryOfOrigin,
      score: media.averageScore,
      poster: media.coverImage?.extraLarge,
      banner: media.bannerImage,
      studios: media.studios?.nodes.map((node) => node.name) ?? [],
      tags: (media.tags ?? []).map((tag) => ({ name: tag.name, rank: tag.rank, spoiler: tag.isMediaSpoiler })),
      anilistUrl: media.siteUrl,
      malUrl: media.idMal ? `https://myanimelist.net/anime/${media.idMal}` : undefined,
      related: [...related, { title, relation: "Current", format: media.format, year: media.seasonYear, image: media.bannerImage || media.coverImage?.extraLarge, poster: media.coverImage?.extraLarge, current: true }].sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999)),
      cast: (media.characters?.edges ?? []).map((edge) => ({
        name: edge.node.name.full,
        role: cap(edge.role) ?? "",
        image: edge.node.image?.large,
        actor: edge.voiceActors[0]?.name.full,
        actorImage: edge.voiceActors[0]?.image?.large,
      })),
      recommendations: (media.recommendations?.nodes ?? [])
        .map((node) => node.mediaRecommendation)
        .filter((item): item is NonNullable<typeof item> => !!item)
        .map((item) => ({ title: pick(item.title), image: item.coverImage?.large, format: item.format?.replace(/_/g, " "), score: item.averageScore })),
      episodeList: buildEpisodes(media),
    };
  } catch {
    return null;
  }
}
