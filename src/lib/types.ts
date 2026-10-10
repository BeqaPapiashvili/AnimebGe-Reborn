export type Anime = {
  id?: number;
  slug: string;
  title: string;
  score?: string;
  type?: string;
  year?: string;
  poster?: string;
  banner?: string;
  logo?: string;
  desc?: string;
  rating?: string;
  sub?: string;
  dub?: string;
  total?: string;
  meta?: string;
  episode?: string;
  progress?: string;
  progressPct?: number;
};

export type ScheduleItem = {
  slug: string;
  time: string;
  title: string;
  format: string;
  ep: string;
  poster?: string;
  weekday: number;
};

export type SiteData = {
  slides: Anime[];
  latest: Anime[];
  fresh: Anime[];
  upcoming: Anime[];
  trending: Anime[];
  schedule: ScheduleItem[];
};

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  frame?: string;
  group: number;
  groupName?: string;
  joinedAt: number;
};
