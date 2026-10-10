import type { CommunityAnimeTag } from "@/lib/community-types";

export type { CommunityAnimeTag };

export type CommunityPollData = {
  options: string[];
  multi: boolean;
  ends: string;
};

export type CommunityPoll = CommunityPollData & {
  counts: number[];
  mine: number[];
};

const marker = /<!--ab:([^>]*?)-->/;

export function writeExtra(extra: { poll?: CommunityPollData; anime?: CommunityAnimeTag[] }) {
  return `<!--ab:${encodeURIComponent(JSON.stringify({ poll: extra.poll, anime: extra.anime ?? [] }))}-->`;
}

export function readExtra(body: string): { poll?: CommunityPollData; anime: CommunityAnimeTag[] } {
  const match = body.match(marker);
  if (!match) return { anime: [] };
  try {
    const data = JSON.parse(decodeURIComponent(match[1])) as { poll?: CommunityPollData; anime?: CommunityAnimeTag[] };
    const options = Array.isArray(data.poll?.options) ? data.poll.options.map((item) => String(item)).filter(Boolean).slice(0, 6) : [];
    const poll = options.length >= 2 && data.poll?.ends
      ? { options, multi: !!data.poll.multi, ends: String(data.poll.ends) }
      : undefined;
    const anime = (Array.isArray(data.anime) ? data.anime : [])
      .filter((item) => item && typeof item.slug === "string" && typeof item.title === "string")
      .slice(0, 2)
      .map((item) => ({
        slug: item.slug,
        title: item.title,
        poster: item.poster || undefined,
        type: item.type || undefined,
        year: item.year || undefined,
        episodes: item.episodes || undefined,
        score: item.score || undefined,
      }));
    return { poll, anime };
  } catch {
    return { anime: [] };
  }
}

export function visibleBody(body: string) {
  return body.replace(marker, "").trim();
}
