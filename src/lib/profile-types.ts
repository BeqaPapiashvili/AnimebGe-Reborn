import type { FriendRelation } from "@/lib/friends-types";

export const XP_STEP = 1000;

export function rankName(level: number) {
  if (level >= 80) return "Radiant";
  if (level >= 70) return "Diamond";
  if (level >= 60) return "Ruby";
  if (level >= 50) return "Emerald";
  if (level >= 40) return "Platinum";
  if (level >= 30) return "Gold";
  if (level >= 20) return "Silver";
  if (level >= 10) return "Bronze";
  return "Basic";
}

export type ProfileItem = {
  id: number;
  slug: string;
  title: string;
  poster?: string;
  banner?: string;
  score?: number;
  year?: string;
  rating?: string;
  format?: string;
  duration?: number;
  listId: number;
  seen?: number;
  released?: number;
  total?: number;
};

export type ProfileList = { id: number; label: string; count: number; color: string };

export type ProfileCard = {
  name: string;
  avatar?: string;
  frame?: string;
  cover?: string;
  joined: string;
  friends: number;
  level: number;
  rank: string;
  xp: number;
  xpStep: number;
  totalXp: number;
  streak: number;
  stats: { completed: number; watching: number; planning: number };
};

export type PublicProfile = {
  id: number;
  name: string;
  avatar?: string;
  frame?: string;
  cover?: string;
  joined: string;
  joinedMonth: string;
  friends: number;
  level: number;
  rank: string;
  xp: number;
  xpStep: number;
  totalXp: number;
  streak: number;
  streakLive: boolean;
  owner: boolean;
  relation: FriendRelation;
  lists: ProfileList[];
  items: ProfileItem[];
  stats: { completed: number; watching: number; planning: number };
};

export type ActivityPoint = {
  day: string;
  hour: number;
  episodes: number;
  comments: number;
  seconds: number;
};

export type ActivityWatch = {
  day: string;
  hour: number;
  episode: number;
  seconds: number;
  slug: string;
};

export type ActivityEvent = {
  id: string;
  at: string;
  day: string;
  kind: "watch" | "comment";
  title: string;
  slug?: string;
  text?: string;
  episode?: number;
};

export type ActivityGenre = { name: string; count: number };

export type ActivityTitle = { title: string; slug: string; poster?: string; day: string; seconds: number; genres: string[] };

export type ActivityData = {
  profile: PublicProfile;
  points: ActivityPoint[];
  watches: ActivityWatch[];
  events: ActivityEvent[];
  genres: ActivityGenre[];
  titles: ActivityTitle[];
  totals: { minutes: number; episodes: number; anime: number; comments: number };
  season: { minutes: number; episodes: number; comments: number };
};
