import type { EpisodeSource } from "@/lib/dle";

export type RoomPlay = {
  slug: string;
  title: string;
  format?: string;
  year?: string;
  duration?: number;
  banner?: string;
  episodes: { number: number; sources: EpisodeSource[] }[];
};

export type RoomChatMessage = {
  id: number;
  userId: number;
  name: string;
  avatar?: string;
  frame?: string;
  body: string;
};

export type WatchRoomCard = {
  code: string;
  hostId: number;
  host: string;
  avatar?: string;
  frame?: string;
  slug: string;
  title: string;
  poster?: string;
  episode: number;
  position: number;
  updated: string;
  status: "live" | "waiting" | "ended";
  visibility: "public" | "link" | "friends";
};
