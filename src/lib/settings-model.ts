export type Prefs = {
  comments: boolean;
  ads: boolean;
  push: boolean;
  friends: boolean;
  news: boolean;
  folders: Record<"1" | "3" | "2" | "5" | "4", boolean>;
  lang: "all" | "sub" | "dub";
  list: "all" | "friends" | "none";
  live: "all" | "friends" | "none";
  threshold: number;
  autoplay: boolean;
  autoNext: boolean;
  skipIntro: boolean;
  skipOutro: boolean;
  preferDub: boolean;
  dimWatched: boolean;
  chat: boolean;
  dock: boolean;
  romaji: boolean;
};

export const defaultPrefs: Prefs = {
  comments: true,
  ads: false,
  push: true,
  friends: true,
  news: true,
  folders: { "1": true, "3": true, "2": false, "5": true, "4": true },
  lang: "all",
  list: "all",
  live: "all",
  threshold: 80,
  autoplay: false,
  autoNext: true,
  skipIntro: false,
  skipOutro: false,
  preferDub: false,
  dimWatched: true,
  chat: true,
  dock: true,
  romaji: false,
};

export type AccountSettings = {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  frame?: string;
  cover?: string;
  displayName: string;
  bio: string;
  website: string;
  joined: string;
  joinedAt: number;
  prefs: Prefs;
  locked: string[];
};

export function parsePrefs(raw?: string | null): Prefs {
  if (!raw) return defaultPrefs;
  try {
    const data = JSON.parse(raw) as Partial<Prefs>;
    return {
      ...defaultPrefs,
      ...data,
      folders: { ...defaultPrefs.folders, ...(data.folders ?? {}) },
      threshold: Math.min(100, Math.max(50, Number(data.threshold) || 80)),
      lang: data.lang === "sub" || data.lang === "dub" ? data.lang : "all",
      list: data.list === "friends" || data.list === "none" ? data.list : "all",
      live: data.live === "friends" || data.live === "none" ? data.live : "all",
    };
  } catch {
    return defaultPrefs;
  }
}
