export const communityCategories = [
  { id: "general", label: "ზოგადი" },
  { id: "talk", label: "განხილვა" },
  { id: "question", label: "დახმარება" },
  { id: "bug", label: "შეფასება" },
  { id: "idea", label: "სიახლე" },
] as const;

export type CommunityCategory = (typeof communityCategories)[number]["id"];

export type CommunityReply = {
  id: number;
  name: string;
  avatar?: string;
  frame?: string;
  body: string;
  at: string;
  votes: number;
  mine: boolean;
};

export type CommunityAnimeTag = {
  slug: string;
  title: string;
  poster?: string;
  type?: string;
  year?: string;
  episodes?: string;
  score?: string;
};

export type CommunityPoll = {
  options: string[];
  counts: number[];
  mine: number[];
  multi: boolean;
  ends: string;
};

export type CommunityPost = {
  id: number;
  category: CommunityCategory;
  title: string;
  body: string;
  name: string;
  avatar?: string;
  frame?: string;
  at: string;
  votes: number;
  vote: -1 | 0 | 1;
  pinned: boolean;
  mine: boolean;
  replies: CommunityReply[];
  poll?: CommunityPoll;
  anime?: CommunityAnimeTag[];
};

export type CommunityPerson = {
  name: string;
  avatar?: string;
  frame?: string;
  value: number;
  unit: string;
};

export type CommunityPageData = {
  posts: CommunityPost[];
  signedIn: boolean;
  admin?: boolean;
  viewer?: { name: string; avatar?: string; frame?: string };
  stats: { users: number; anime: number; comments: number; posts: number };
  counts: Record<string, number>;
  members: CommunityPerson[];
  contributors: CommunityPerson[];
};
