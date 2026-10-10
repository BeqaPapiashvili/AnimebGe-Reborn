export const FRIEND_LIMIT = 250;

export type FriendCard = { id: number; name: string; avatar?: string; frame?: string };
export type FriendNotice = { id: number; title: string; message: string; createdAt: string };
export type FriendRelation = "guest" | "self" | "none" | "outgoing" | "incoming" | "friends" | "blocked";

export type FriendsPageData = {
  limit: number;
  friends: FriendCard[];
  incoming: FriendCard[];
  outgoing: FriendCard[];
  blocked: FriendCard[];
  notices: FriendNotice[];
};
