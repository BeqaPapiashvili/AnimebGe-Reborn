export type SiteList = { id: number; label: string; short?: string; icon: string };

const folderKeys: Record<number, string> = {
  1: "WATCHING",
  2: "COMPLETED",
  3: "PLANNING",
  4: "DROPPED",
  5: "PAUSED",
};

const folderColors: Record<number, string> = {
  1: "#e93748",
  2: "#6ea8ff",
  3: "#f5a21a",
  4: "#9ca3af",
  5: "#d8b4fe",
};

export function folderKey(id: number) {
  return folderKeys[id] ?? String(id);
}

export function folderColor(id: number) {
  return folderColors[id] ?? "#e93748";
}

const icons: Record<number, string> = {
  1: "/assets/detail/list/watching.svg",
  2: "/assets/detail/list/completed.svg",
  3: "/assets/detail/list/plan.svg",
  4: "/assets/detail/list/dropped.svg",
  5: "/assets/detail/list/paused.svg",
};

export const listOrder = [1, 3, 2, 5, 4];

export function listIcon(id: number) {
  return icons[id] ?? "/assets/detail/bookmark.svg";
}

export function sortLists<T extends { id: number }>(lists: T[]) {
  const rank = (id: number) => {
    const index = listOrder.indexOf(id);
    return index < 0 ? 100 + id : index;
  };
  return [...lists].sort((a, b) => rank(a.id) - rank(b.id));
}

export function parseMylists(raw?: string | null) {
  const map = new Map<number, number>();
  for (const part of (raw ?? "").split("|")) {
    const [post, list] = part.split("/");
    const postId = Number(post);
    const listId = Number(list);
    if (Number.isInteger(postId) && postId > 0 && Number.isInteger(listId) && listId > 0) map.set(postId, listId);
  }
  return map;
}

export function serializeMylists(map: Map<number, number>) {
  if (!map.size) return "";
  return `|${[...map.entries()].map(([postId, listId]) => `${postId}/${listId}`).join("|")}|`;
}
