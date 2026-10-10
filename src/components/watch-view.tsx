"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveListStatus } from "@/components/anime-detail";
import { Avatar } from "@/components/avatar";
import { Player } from "@/components/player";
import { Watch2GetherCreate } from "@/components/watch2gether-create";
import type { AnimeDetail, CommentItem, UserAnimeState } from "@/lib/catalog";
import type { EmoteId, EmoteState } from "@/lib/emote";
import { animeHref, formatCount } from "@/lib/data";
import type { SiteList } from "@/lib/list-model";
import type { Prefs } from "@/lib/settings-model";
import type { SessionUser } from "@/lib/types";

type Comment = CommentItem & { myVote: number };

const sorts = ["საუკეთესო", "უახლესი", "ძველი"] as const;

function commentSort(name: (typeof sorts)[number]) {
  if (name === "საუკეთესო") return "best";
  if (name === "ძველი") return "old";
  return "new";
}
const autos = [
  { name: "ავტო დაკვრა", icon: "autoplay" },
  { name: "შემდეგი ავტომატურად", icon: "autonext" },
] as const;
const shortcuts = [
  ["Space", "დაკვრა / პაუზა"],
  ["← →", "5 წამით გადახვევა"],
  ["↑ ↓", "ხმა"],
  ["M", "დადუმება"],
  ["F", "სრული ეკრანი"],
  ["N", "შემდეგი ეპიზოდი"],
  ["P", "წინა ეპიზოდი"],
  ["T", "თეატრის რეჟიმი"],
  ["Esc", "მენიუს დახურვა"],
];

const reportReasons = [
  { id: "episode", label: "არასწორი ეპიზოდი", icon: "/assets/report/episode.svg" },
  { id: "video", label: "ვიდეო არ მუშაობს", icon: "/assets/report/video.svg" },
  { id: "audio", label: "ხმის პრობლემა", icon: "/assets/report/audio.svg" },
  { id: "else", label: "სხვა რამ", icon: "/assets/report/else.svg" },
] as const;

function safeUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {}
  return "";
}

function commentNodes(text: string, key: string): React.ReactNode[] {
  const rules: Array<{ re: RegExp; node: (match: RegExpExecArray, id: string) => React.ReactNode }> = [
    { re: /\[(b|i|s|spoiler)\]([\s\S]*?)\[\/\1\]/, node: (match, id) => {
      const inner = commentNodes(match[2], id);
      if (match[1] === "b") return <strong key={id}>{inner}</strong>;
      if (match[1] === "i") return <em key={id}>{inner}</em>;
      if (match[1] === "s") return <s key={id}>{inner}</s>;
      return <Spoiler key={id}>{inner}</Spoiler>;
    } },
    { re: /\[url=(https?:\/\/[^\]]+)\]([\s\S]*?)\[\/url\]/, node: (match, id) => <a key={id} href={match[1]} target="_blank" rel="noreferrer" className="text-[#e93748] underline">{commentNodes(match[2], id)}</a> },
    { re: /\[img\](https?:\/\/[^\]]+)\[\/img\]/, node: (match, id) => <img key={id} src={match[1]} alt="" className="my-2 max-h-64 max-w-full rounded-[7px]" /> },
    { re: /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/, node: (match, id) => <img key={id} src={match[1]} alt="" className="my-2 max-h-64 max-w-full rounded-[7px]" /> },
    { re: /\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/, node: (match, id) => <a key={id} href={match[2]} target="_blank" rel="noreferrer" className="text-[#e93748] underline">{commentNodes(match[1], id)}</a> },
    { re: /\*\*([^*\n]+?)\*\*/, node: (match, id) => <strong key={id}>{commentNodes(match[1], id)}</strong> },
    { re: /_([^_\n]+?)_/, node: (match, id) => <em key={id}>{commentNodes(match[1], id)}</em> },
    { re: /\|\|([^|\n]+?)\|\|/, node: (match, id) => <Spoiler key={id}>{commentNodes(match[1], id)}</Spoiler> },
    { re: /~~([^~\n]+?)~~/, node: (match, id) => <s key={id}>{commentNodes(match[1], id)}</s> },
  ];
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let index = 0;
  while (cursor < text.length) {
    let best: { start: number; end: number; node: React.ReactNode } | null = null;
    const slice = text.slice(cursor);
    for (const rule of rules) {
      const match = rule.re.exec(slice);
      if (!match) continue;
      const start = cursor + match.index;
      const end = start + match[0].length;
      if (end <= start || (best && start >= best.start)) continue;
      best = { start, end, node: rule.node(match, `${key}-${index}`) };
    }
    if (!best) {
      nodes.push(text.slice(cursor));
      break;
    }
    if (best.start > cursor) nodes.push(text.slice(cursor, best.start));
    nodes.push(best.node);
    cursor = best.end;
    index += 1;
  }
  return nodes;
}

function CommentText({ text, id }: { text: string; id: string }) {
  const block = text.match(/^\|\|\n([\s\S]*)\n\|\|$/);
  if (block) return <BlockSpoiler>{commentNodes(block[1], id)}</BlockSpoiler>;
  return <>{commentNodes(text, id)}</>;
}

function Spoiler({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <button type="button" className={`inline cursor-pointer rounded bg-white/10 px-1 ${open ? "" : "blur-[6px] select-none"}`} onClick={() => setOpen((value) => !value)}>
      {children}
    </button>
  );
}

function BlockSpoiler({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" className="cursor-pointer rounded-md bg-white/8 px-3 py-2 text-sm text-[#9f9fa9]" onClick={() => setOpen(true)}>
        სპოილერი — დააჭირე სანახავად
      </button>
    );
  }
  return <div>{children}</div>;
}

function Mask({ name, size = 16 }: { name: string; size?: number }) {
  return <span className="watch-mask" style={{ "--icon": `url(/assets/watch/${name}.svg)`, width: size, height: size } as React.CSSProperties} />;
}

function stamp(date: string) {
  return new Date(date.replace(" ", "T")).getTime();
}

function ago(date: string) {
  const minutes = Math.floor((Date.now() - stamp(date)) / 60000);
  if (minutes < 1) return "ახლახანს";
  if (minutes < 60) return `${minutes} წთ-ის წინ`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} საათის წინ`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} დღის წინ`;
  const shown = new Date(stamp(date));
  const months = ["იან", "თებ", "მარ", "აპრ", "მაი", "ივნ", "ივლ", "აგვ", "სექ", "ოქტ", "ნოე", "დეკ"];
  return `${shown.getDate()} ${months[shown.getMonth()]} ${shown.getFullYear()}`;
}

async function postJson<T>(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { ok?: boolean; error?: string };
  return { ok: res.ok && data.ok !== false, data };
}

type Props = {
  detail: AnimeDetail;
  initialEpisode: number;
  user: SessionUser | null;
  state?: UserAnimeState;
  initialComments: CommentItem[];
  commentStats?: { total: number; roots: number };
  lists?: SiteList[];
  prefs?: Prefs;
  room?: string;
  emotes?: EmoteState;
  onAuth: () => void;
};

function InfoLine({ label, value }: { label: string; value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    if (open) return;
    const node = ref.current;
    if (!node) return;
    const measure = () => setOverflow(node.scrollWidth > node.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [value, open]);

  return (
    <div className="col-span-2 grid grid-cols-subgrid items-start">
      <dt className="pt-px font-medium whitespace-nowrap text-[#71717b]">{label}:</dt>
      <dd className="min-w-0 text-[#e4e4e7]">
        <button type="button" className={`flex w-full items-start gap-1 text-left ${overflow ? "cursor-pointer" : "cursor-default"}`} aria-expanded={overflow ? open : undefined} onClick={() => { if (overflow) setOpen((current) => !current); }}>
          <span ref={ref} className={`min-w-0 flex-1 ${open ? "break-words" : "truncate"}`}>{value}</span>
          {overflow ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={`mt-1 shrink-0 text-[#71717b] transition ${open ? "rotate-180" : ""}`} aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg> : null}
        </button>
      </dd>
    </div>
  );
}

export function WatchView({ detail, initialEpisode, user, state, initialComments, commentStats, lists = [], prefs, room, emotes, onAuth }: Props) {
  const router = useRouter();
  const episodes = detail.episodeList.length ? detail.episodeList : [{ number: 1, sources: [] }];
  const [episode, setEpisode] = useState(Math.min(Math.max(initialEpisode, 1), episodes.length));
  const [serverIndex, setServerIndex] = useState(0);
  const [enabled, setEnabled] = useState<string[]>(() => [prefs?.autoplay ? "ავტო დაკვრა" : "", prefs?.autoNext !== false ? "შემდეგი ავტომატურად" : ""].filter(Boolean));
  const [theater, setTheater] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [status, setStatus] = useState<number | null>(state?.list ?? null);
  const [reported, setReported] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportText, setReportText] = useState("");
  const [reportError, setReportError] = useState("");
  const [sendingReport, setSendingReport] = useState(false);
  const [follow, setFollow] = useState<{ nonce: number; time: number } | null>(null);
  const roomHost = useRef(false);
  const [epQuery, setEpQuery] = useState("");
  const [grid, setGrid] = useState(false);
  const [spoilers, setSpoilers] = useState(false);
  const [emoteItems, setEmoteItems] = useState(emotes?.items ?? []);
  const [myEmote, setMyEmote] = useState<EmoteId | null>(emotes?.mine ?? null);
  const [sort, setSort] = useState<(typeof sorts)[number]>("უახლესი");
  const [draft, setDraft] = useState("");
  const [writing, setWriting] = useState(false);
  const [preview, setPreview] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageValue, setImageValue] = useState("");
  const [imageError, setImageError] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyError, setReplyError] = useState("");
  const [replyPreview, setReplyPreview] = useState(false);
  const [imageFor, setImageFor] = useState<"main" | "reply">("main");
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const [posting, setPosting] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [comments, setComments] = useState<Comment[]>(() => initialComments.map((item) => ({ ...item, myVote: item.myVote ?? 0 })));
  const [commentTotal, setCommentTotal] = useState(commentStats?.total ?? initialComments.length);
  const [rootTotal, setRootTotal] = useState(commentStats?.roots ?? initialComments.filter((item) => !item.parent).length);
  const [fresh, setFresh] = useState<Record<number, number>>({});
  const [loadingMore, setLoadingMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const loadingLock = useRef(false);
  const commentsRef = useRef(comments);
  const sortRef = useRef(sort);
  const rootTotalRef = useRef(rootTotal);
  commentsRef.current = comments;
  sortRef.current = sort;
  rootTotalRef.current = rootTotal;
  const [showAllRecs, setShowAllRecs] = useState(false);
  const [w2gOpen, setW2gOpen] = useState(false);
  const [history, setHistory] = useState(state?.history ?? []);
  const listRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);

  const current = episodes[episode - 1];
  const sources = current.sources;
  const source = sources[Math.min(serverIndex, sources.length - 1)];
  useEffect(() => {
    if (!user || source?.kind !== "embed") return;
    void fetch("/api/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: detail.id, episode, time: 1, duration: 0 }) });
  }, [user, source?.kind, detail.id, episode]);
  function toggleAuto(name: string) {
    setEnabled((list) => {
      const next = list.includes(name) ? list.filter((item) => item !== name) : [...list, name];
      if (user && prefs) {
        void fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "prefs", prefs: { ...prefs, autoplay: next.includes("ავტო დაკვრა"), autoNext: next.includes("შემდეგი ავტომატურად") } }),
        });
      }
      return next;
    });
  }
  const resume = useMemo(() => history.find((item) => item.episode === episode)?.time ?? 0, [history, episode]);
  const currentStatus = lists.find((item) => item.id === status);
  const shown = episodes.filter((item) => {
    const q = epQuery.trim().toLowerCase();
    return !q || String(item.number).includes(q) || item.title?.toLowerCase().includes(q);
  });
  const roots = comments.filter((item) => !item.parent || !comments.some((other) => other.id === item.parent));
  const sorted = [...roots].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (sort === "საუკეთესო") return b.rating - a.rating || stamp(b.date) - stamp(a.date);
    return sort === "უახლესი" ? stamp(b.date) - stamp(a.date) : stamp(a.date) - stamp(b.date);
  });
  const repliesOf = (id: number) => comments.filter((item) => item.parent === id).sort((a, b) => stamp(a.date) - stamp(b.date));
  const recs = showAllRecs ? detail.recommendations : detail.recommendations.slice(0, 5);
  const info = [
    ["წელი", detail.startDate],
    ["ჟანრი", detail.genres.join(", ")],
    ["სეზონი", detail.season],
    ["ხანგრძლივობა", detail.duration ? `${detail.duration} წთ` : null],
    ["IMDb", detail.score ? (detail.score / 10).toFixed(1) : null],
    ["სტუდია", detail.studios.join(", ")],
    ["გახმოვანება", detail.dubbers.join(", ")],
  ].filter(([, value]) => value) as [string, string][];

  async function pullComments(offset: number, name: (typeof sorts)[number]) {
    const res = await fetch(`/api/comments?postId=${detail.id}&offset=${offset}&limit=10&sort=${commentSort(name)}`);
    return (await res.json().catch(() => null)) as { comments?: CommentItem[]; total?: number; roots?: number } | null;
  }

  async function loadMore() {
    if (loadingLock.current) return;
    const loaded = commentsRef.current.filter((item) => !item.parent).length;
    if (loaded >= rootTotalRef.current) return;
    loadingLock.current = true;
    setLoadingMore(true);
    const data = await pullComments(loaded, sortRef.current);
    const incoming = data?.comments ?? [];
    const roots = incoming.filter((item) => !item.parent);
    if (!roots.length) setRootTotal(loaded);
    else {
      setFresh(Object.fromEntries(roots.map((item, index) => [item.id, index * 70])));
      setComments((list) => {
        const have = new Set(list.map((item) => item.id));
        return [...list, ...incoming.filter((item) => !have.has(item.id)).map((item) => ({ ...item, myVote: item.myVote ?? 0 }))];
      });
    }
    if (typeof data?.total === "number") setCommentTotal(data.total);
    if (typeof data?.roots === "number" && roots.length) setRootTotal(data.roots);
    setLoadingMore(false);
    window.setTimeout(() => {
      loadingLock.current = false;
      const node = moreRef.current;
      if (node && node.getBoundingClientRect().top < window.innerHeight + 240) void loadMore();
    }, 480);
  }

  async function changeSort(name: (typeof sorts)[number]) {
    if (name === sortRef.current || loadingLock.current) return;
    setSort(name);
    sortRef.current = name;
    loadingLock.current = true;
    setLoadingMore(true);
    const data = await pullComments(0, name);
    const incoming = data?.comments ?? [];
    const roots = incoming.filter((item) => !item.parent);
    setFresh(Object.fromEntries(roots.map((item, index) => [item.id, index * 50])));
    setComments(incoming.map((item) => ({ ...item, myVote: item.myVote ?? 0 })));
    if (typeof data?.total === "number") setCommentTotal(data.total);
    if (typeof data?.roots === "number") setRootTotal(data.roots);
    setLoadingMore(false);
    loadingLock.current = false;
  }

  const loadedRoots = comments.filter((item) => !item.parent).length;
  useEffect(() => {
    const node = moreRef.current;
    if (!node || loadedRoots >= rootTotal) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void loadMore();
    }, { rootMargin: "240px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadedRoots, rootTotal, sort]);

  useEffect(() => {
    window.history.replaceState(null, "", `?ep=${episode}`);
    listRef.current?.querySelector(".is-current")?.scrollIntoView({ block: "nearest" });
    setServerIndex(0);
  }, [episode]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea")) return;
      if (event.key === "Escape") {
        setListOpen(false);
        setKeysOpen(false);
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "n") setEpisode((value) => Math.min(value + 1, episodes.length));
      if (key === "p") setEpisode((value) => Math.max(value - 1, 1));
      if (key === "t") setTheater((value) => !value);
    }
    function onDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target)) setListOpen(false);
      if (!keysRef.current?.contains(target)) setKeysOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [episodes.length]);

  function saveProgress(time: number, duration: number) {
    if (!user || time < 5) return;
    const ep = episode;
    setHistory((list) => [...list.filter((item) => item.episode !== ep), { episode: ep, time, duration }]);
    postJson("/api/history", { postId: detail.id, episode: ep, time: Math.floor(time), duration: Math.floor(duration) });
    if (room && roomHost.current) {
      fetch("/api/room", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync", code: room, slug: detail.slug, title: detail.title, episode: ep, position: Math.floor(time) }) }).catch(() => {});
    }
  }

  useEffect(() => {
    if (!room) return;
    let stop = false;
    async function tick() {
      const res = await fetch(`/api/room?code=${encodeURIComponent(room!)}`);
      const data = (await res.json().catch(() => null)) as { room?: { hostId: number; slug: string; episode: number; position: number; updated: string } } | null;
      const remote = data?.room;
      if (stop || !remote) return;
      roomHost.current = remote.hostId === user?.id;
      if (remote.hostId === user?.id) return;
      if (remote.slug && remote.slug !== detail.slug) {
        router.push(`${animeHref(remote.slug)}/watch?ep=${remote.episode}&room=${room}`);
        return;
      }
      if (remote.episode !== episode) setEpisode(remote.episode);
      setFollow({ nonce: Date.now(), time: remote.position });
    }
    void tick();
    const id = window.setInterval(() => void tick(), 2000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [room, episode, detail.slug, user?.id, router]);

  function onEnded() {
    if (enabled.includes("შემდეგი ავტომატურად")) setEpisode((value) => Math.min(value + 1, episodes.length));
  }

  async function pickStatus(next: number | null) {
    setListOpen(false);
    if (!user) return onAuth();
    const previous = status;
    setStatus(next);
    if (!(await saveListStatus(detail.id, next))) setStatus(previous);
  }

  async function pickEmote(id: EmoteId) {
    if (!user) return onAuth();
    const { ok, data } = await postJson<EmoteState>("/api/emote", { postId: detail.id, emote: id });
    if (!ok || !data.items) return;
    setEmoteItems(data.items);
    setMyEmote(data.mine);
  }

  async function send(raw: string, target: Comment | null, fail: (message: string) => void) {
    if (!user) { onAuth(); return false; }
    const text = raw.trim();
    if (!text || posting) return false;
    setPosting(true);
    fail("");
    const parent = target ? target.parent || target.id : 0;
    const { ok, data } = await postJson<{ comment?: CommentItem }>("/api/comments", { postId: detail.id, text, parent });
    setPosting(false);
    if (!ok || !data.comment) { fail(data.error ?? "კომენტარი ვერ გაიგზავნა."); return false; }
    setComments((list) => [{ ...data.comment!, myVote: 0 }, ...list]);
    setCommentTotal((value) => value + 1);
    if (!parent) {
      setRootTotal((value) => value + 1);
      setFresh({ [data.comment!.id]: 0 });
    }
    return true;
  }

  async function post(event?: React.FormEvent) {
    event?.preventDefault();
    if (!(await send(draft, null, setCommentError))) return;
    setDraft("");
    setPreview(false);
    setImageOpen(false);
    setWriting(false);
  }

  async function sendReply() {
    if (!(await send(replyDraft, replyTo, setReplyError))) return;
    setReplyDraft("");
    setReplyPreview(false);
    setReplyTo(null);
  }

  function wrapReply(before: string, after: string) {
    const field = replyRef.current;
    const start = field?.selectionStart ?? replyDraft.length;
    const end = field?.selectionEnd ?? start;
    const selected = replyDraft.slice(start, end);
    setReplyDraft(`${replyDraft.slice(0, start)}${before}${selected}${after}${replyDraft.slice(end)}`);
    const from = start + before.length;
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(from, from + selected.length);
    });
  }

  function wrap(before: string, after: string) {
    const field = draftRef.current;
    const start = field?.selectionStart ?? draft.length;
    const end = field?.selectionEnd ?? start;
    const selected = draft.slice(start, end);
    const next = `${draft.slice(0, start)}${before}${selected}${after}${draft.slice(end)}`;
    setDraft(next);
    const from = start + before.length;
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(from, from + selected.length);
    });
  }

  function toggleWholeSpoiler() {
    setDraft((value) => (/^\|\|\n[\s\S]*\n\|\|$/.test(value) ? value.slice(3, -3) : `||\n${value}\n||`));
    requestAnimationFrame(() => draftRef.current?.focus());
  }

  function toggleReplySpoiler() {
    setReplyDraft((value) => (/^\|\|\n[\s\S]*\n\|\|$/.test(value) ? value.slice(3, -3) : `||\n${value}\n||`));
    requestAnimationFrame(() => replyRef.current?.focus());
  }

  function openImage(target: "main" | "reply") {
    setImageFor(target);
    setImageValue("");
    setImageError("");
    setImageOpen(true);
  }

  function insertImage() {
    const url = safeUrl(imageValue);
    if (!url) return setImageError("მისამართი არასწორია.");
    const ext = new URL(url).pathname.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
    if (ext && !["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return setImageError("მხოლოდ PNG, JPG, GIF და WEBP.");
    const toReply = imageFor === "reply";
    const field = toReply ? replyRef.current : draftRef.current;
    const text = toReply ? replyDraft : draft;
    const start = field?.selectionStart ?? text.length;
    const end = field?.selectionEnd ?? start;
    (toReply ? setReplyDraft : setDraft)(`${text.slice(0, start)}![](${url})${text.slice(end)}`);
    setImageOpen(false);
    setImageValue("");
    setImageError("");
    requestAnimationFrame(() => field?.focus());
  }

  async function voteComment(comment: Comment, value: 1 | -1) {
    if (!user) return onAuth();
    const next = comment.myVote === value ? 0 : value;
    const { ok, data } = await postJson<{ rating: number; votes: number }>(`/api/comments/${comment.id}/vote`, { value: next });
    if (!ok) return;
    setComments((list) => list.map((item) => (item.id === comment.id ? { ...item, myVote: next, rating: data.rating, votes: data.votes } : item)));
  }

  async function removeComment(comment: Comment) {
    const res = await fetch(`/api/comments/${comment.id}`, { method: "DELETE" });
    if (res.ok) {
      const removed = comments.filter((item) => item.id === comment.id || item.parent === comment.id).length;
      setComments((list) => list.filter((item) => item.id !== comment.id && item.parent !== comment.id));
      setCommentTotal((value) => Math.max(0, value - removed));
      if (!comment.parent) setRootTotal((value) => Math.max(0, value - 1));
    }
  }

  const [editing, setEditing] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  async function saveEdit(comment: Comment) {
    const text = editText.trim();
    if (!text) return;
    const { ok, data } = await postJson<{ text: string }>(`/api/comments/${comment.id}`, { text }, "PATCH");
    if (!ok) return;
    setComments((list) => list.map((item) => (item.id === comment.id ? { ...item, text: data.text } : item)));
    setEditing(null);
  }

  function reply(comment: Comment) {
    if (!user) return onAuth();
    if (replyTo?.id === comment.id) {
      setReplyTo(null);
      return;
    }
    setReplyTo(comment);
    setReplyError("");
    setReplyPreview(false);
    setReplyDraft("");
    requestAnimationFrame(() => {
      const field = replyRef.current;
      if (!field) return;
      field.focus();
      field.setSelectionRange(field.value.length, field.value.length);
    });
  }

  function replyBox(comment: Comment) {
    return (
      <div className="comment-rise mt-3 flex gap-3">
        <Avatar src={user?.avatar} frame={user?.frame} size={28} faceClass="bg-[#27272a]" />
        <div className="min-w-0 flex-1">
          {replyPreview ? (
            <div className="min-h-[88px] w-full rounded-[7.2px] border border-[#3f3f47]/50 bg-white/4 p-3 text-sm leading-5 break-words whitespace-pre-line text-white">
              {replyDraft.trim() ? <CommentText text={replyDraft} id={`reply-preview-${comment.id}`} /> : <span className="text-[#71717b]">არაფერია საჩვენებელი</span>}
            </div>
          ) : (
          <textarea
            ref={replyRef}
            value={replyDraft}
            onChange={(event) => setReplyDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) void sendReply();
              if (event.key === "Escape") setReplyTo(null);
            }}
            maxLength={2000}
            placeholder={`უპასუხე ${comment.author}-ს...`}
            aria-label="პასუხი"
            className="folder-input h-[88px] w-full resize-none rounded-[7.2px] border border-[#3f3f47]/50 bg-white/4 p-3 text-sm leading-5 text-white outline-none placeholder:text-[#71717b]"
          />
          )}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center">
              {([
                { icon: "bold", label: "მუქი", on: false, action: () => wrapReply("**", "**") },
                { icon: "italic", label: "დახრილი", on: false, action: () => wrapReply("_", "_") },
                { icon: "strike", label: "სტრიქონული სპოილერი", on: false, action: () => wrapReply("||", "||") },
                { icon: "link", label: "სურათის ჩასმა", on: imageOpen && imageFor === "reply", action: () => openImage("reply") },
                { icon: "spoiler", label: "მთელი პასუხის სპოილერი", on: /^\|\|\n[\s\S]*\n\|\|$/.test(replyDraft), action: toggleReplySpoiler },
                { icon: "image", label: "გადახედვა", on: replyPreview, action: () => setReplyPreview((value) => { if (value) requestAnimationFrame(() => replyRef.current?.focus()); return !value; }) },
              ] as const).map((item) => (
                <button key={item.icon} type="button" aria-label={item.label} title={item.label} aria-pressed={item.on} disabled={replyPreview && item.icon !== "image"} className={`grid cursor-pointer place-items-center rounded text-[#9f9fa9] hover:bg-white/8 hover:text-white disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent ${item.on ? "bg-white/10 text-white" : ""} ${item.icon === "spoiler" || item.icon === "image" ? "p-1.5" : "p-0.5"}`} onMouseDown={(event) => event.preventDefault()} onClick={item.action}>
                  <img src={`/assets/comments/${item.icon}.svg`} alt="" width={14} height={14} />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button type="button" className="cursor-pointer px-2 text-[11px] leading-[16.5px] font-bold text-[#9f9fa9] hover:text-white" onClick={() => setReplyTo(null)}>გაუქმება</button>
              <button type="button" disabled={posting || !replyDraft.trim()} onClick={() => void sendReply()} className="flex h-7 min-w-[70px] cursor-pointer items-center justify-center rounded-[5.76px] bg-[#e93748] px-3 text-[11px] leading-[16.5px] font-bold text-white disabled:cursor-default disabled:opacity-50">{posting ? "..." : "პასუხი"}</button>
            </div>
          </div>
          {replyError ? <p className="pt-2 text-xs text-[#e93748]">{replyError}</p> : null}
        </div>
      </div>
    );
  }

  function renderComment(comment: Comment, nested = false) {
    const own = user?.id === comment.userId;
    const delay = nested ? undefined : fresh[comment.id];
    return (
      <article key={comment.id} className={`flex gap-3 ${delay != null ? "comment-rise" : ""}`} style={delay != null ? { animationDelay: `${delay}ms` } : undefined}>
        <Avatar src={comment.avatar} frame={comment.frame} size={nested ? 28 : 32} faceClass="bg-[#27272a]" />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="flex flex-wrap items-center gap-1.5">
            <a href={`/@${encodeURIComponent(comment.author)}`} className="cursor-pointer text-[13px] leading-[19.5px] font-bold text-[#e93748] hover:underline">{comment.author}</a>
            {comment.group ? <span className="rounded-[4px] bg-white/6 px-1.5 text-[10px] leading-4 font-semibold text-[#9f9fa9]">{comment.group}</span> : null}
            {comment.pinned ? <span className="text-[10px] leading-4 font-bold tracking-[0.8px] text-[#e93748] uppercase">მიმაგრებული</span> : null}
            <span className="text-[11px] leading-[16.5px] text-[#71717b]" suppressHydrationWarning>{ago(comment.date)}</span>
          </p>
          {editing === comment.id ? (
            <div className="max-w-[578px] pt-1">
              <textarea value={editText} onChange={(event) => setEditText(event.target.value)} rows={3} className="w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none" />
              <div className="mt-2 flex gap-3">
                <button type="button" className="cursor-pointer text-xs font-bold text-[#e93748]" onClick={() => saveEdit(comment)}>შენახვა</button>
                <button type="button" className="cursor-pointer text-xs text-[#71717b]" onClick={() => setEditing(null)}>გაუქმება</button>
              </div>
            </div>
          ) : (
            <div className="site-comment max-w-[578px] pt-1 text-base leading-7 break-words whitespace-pre-line text-[#d1d5dc]"><CommentText text={comment.text} id={String(comment.id)} /></div>
          )}
          <div className="flex items-center gap-4 pt-2">
            <button type="button" disabled={own} className={`watch-vote ${comment.myVote === 1 ? "is-on" : ""}`} aria-label="მოწონება" onClick={() => voteComment(comment, 1)}><Mask name="like" size={14} /></button>
            <button type="button" disabled={own} className={`watch-vote ${comment.myVote === -1 ? "is-on" : ""}`} aria-label="არმოწონება" onClick={() => voteComment(comment, -1)}><Mask name="dislike" size={14} /></button>
            {comment.rating ? <span className="text-xs font-bold text-[#9f9fa9]">{comment.rating}</span> : null}
            <button type="button" className={`watch-reply ${replyTo?.id === comment.id ? "text-[#e93748]" : ""}`} aria-expanded={replyTo?.id === comment.id} onClick={() => reply(comment)}><Mask name="reply" size={14} />პასუხი</button>
            {own ? (
              <span className="ml-auto flex gap-3">
                <button type="button" className="watch-reply font-medium tracking-[1.2px]" onClick={() => { setEditing(comment.id); setEditText(comment.text); }}>შეცვლა</button>
                <button type="button" className="watch-reply font-medium tracking-[1.2px]" onClick={() => removeComment(comment)}>წაშლა</button>
              </span>
            ) : null}
          </div>
          {replyTo?.id === comment.id ? replyBox(comment) : null}
          {!nested && repliesOf(comment.id).length ? (
            <div className="mt-4 flex flex-col gap-4 border-l border-white/6 pl-4">
              {repliesOf(comment.id).map((item) => renderComment(item, true))}
            </div>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <div className="relative mx-auto max-w-[1920px] pt-24 pr-8 pl-[100px] max-[900px]:pl-4 max-[900px]:pr-4">
      {w2gOpen ? <Watch2GetherCreate title={detail.title} original={detail.romaji} poster={detail.poster} episode={episode} slug={detail.slug} position={resume} onClose={() => setW2gOpen(false)} /> : null}
      <div className="grid grid-cols-[320px_minmax(0,1fr)_420px] gap-4 max-[1400px]:grid-cols-[minmax(0,1fr)_380px] max-[900px]:grid-cols-1">
        <aside className={`watch-from-left watch-info relative overflow-hidden rounded-[10px] border border-white/5 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] max-[1400px]:order-3 max-[1400px]:col-span-2 max-[900px]:col-span-1 ${theater ? "row-start-2" : ""}`}>
          {detail.poster ? <img src={detail.poster} alt="" className="pointer-events-none absolute -top-4 -left-4 h-[352px] w-[350px] object-cover opacity-40 blur-[17.6px]" /> : null}
          <div className="relative flex flex-col gap-4 p-5">
            <div className="flex flex-col items-center gap-4">
              <a href={animeHref(detail.slug)} className="block h-[300px] w-[200px] overflow-hidden rounded-[7.2px] border border-white/10 bg-[#141414] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
                {detail.poster ? <img src={detail.poster} alt={detail.title} className="h-full w-full object-cover" /> : null}
              </a>
              <div className="w-full text-center">
                <h1 className="font-bog line-clamp-2 text-xl leading-[25px] font-bold text-white">{detail.title}</h1>
                {detail.romaji ? <p className="line-clamp-2 pt-1.5 text-xs leading-4 font-medium text-[#9f9fa9]">{detail.romaji}</p> : null}
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2 border-b border-white/5 pb-4">
              <span className="watch-chip"><span className="watch-chip-in"><img src="/assets/watch/info-dub.svg" alt="" width={14} height={14} />{episodes.length}{detail.episodes && detail.episodes !== episodes.length ? ` / ${detail.episodes}` : ""}</span></span>
              {detail.format ? <span className="watch-chip"><span className="watch-chip-in">{detail.format}</span></span> : null}
              {detail.status ? <span className="watch-chip"><span className="watch-chip-in">{detail.status}</span></span> : null}
            </div>

            {detail.description ? <p className="font-mkhedruli line-clamp-3 text-[13px] leading-[21.125px] font-normal tracking-[0.325px] text-[#e4e4e7]/90">{detail.description}</p> : null}

            <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-2.5 border-t border-white/5 pt-4 text-[13px] leading-5">
              {info.map(([label, value]) => <InfoLine key={label} label={label} value={value} />)}
            </dl>

            <div className="grid grid-cols-3 overflow-hidden rounded-[8px] border border-white/8">
              {emoteItems.map((item, index) => (
                <button key={item.id} type="button" aria-pressed={myEmote === item.id} className={`relative flex cursor-pointer flex-col items-center gap-1 px-1 py-2 ${myEmote === item.id ? "bg-[#e93748]/14 text-white before:absolute before:inset-x-3 before:bottom-0 before:h-0.5 before:rounded-full before:bg-[#e93748]" : "text-[#c5cad3] hover:bg-white/[0.04]"} ${index ? "border-l border-white/8" : ""}`} onClick={() => pickEmote(item.id)}>
                  <span className="text-base leading-none">{item.emoji}</span>
                  <span className="text-center text-[11px] leading-[13px] font-medium">{item.label}</span>
                  <span className="text-xs leading-4 font-medium tabular-nums text-[#d4d4d8]">{formatCount(item.count)}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className={`watch-from-bottom flex min-w-0 flex-col ${theater ? "col-span-full row-start-1" : ""}`}>
          <nav className="flex h-[27px] min-w-0 items-center gap-1.5 px-0.5 pb-2.5 text-[11px] leading-[16.5px] font-medium tracking-[0.275px]" aria-label="გზა">
            <a href="/" className="detail-link shrink-0 text-[#71717b]">მთავარი</a>
            <img src="/assets/watch/crumb.svg" alt="" width={12} height={12} />
            <a href={animeHref(detail.slug)} className="font-bog detail-link truncate font-normal text-[#d4d4d8]">{detail.title}</a>
            <img src="/assets/watch/crumb.svg" alt="" width={12} height={12} />
            <span className="shrink-0 text-[#e93748]">სერია {episode}</span>
          </nav>

          <div className="relative aspect-[1084/609.75] overflow-hidden rounded-[7.2px] bg-black">
            <Player key={`${episode}-${serverIndex}`} source={source} poster={detail.banner} autoPlay={enabled.includes("ავტო დაკვრა")} startAt={resume} progressEvery={room ? 3000 : 15000} follow={room && !roomHost.current ? follow : null} onProgress={saveProgress} onEnded={onEnded} />
          </div>

          <div className="flex flex-col pt-1.5">
            <div className="pt-1 pb-2.5">
              <p className="flex items-center gap-2 rounded-[5.76px] bg-[#e93748]/30 px-3 py-2 text-sm leading-5 text-white opacity-90">
                <img src="/assets/watch/notice.svg" alt="" width={16} height={16} />
                თუ ეპიზოდი არ მუშაობს, გვაცნობე და რაც შეიძლება მალე გავასწორებთ.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-y-2">
              <div className="relative flex h-[25px] items-center gap-2 overflow-hidden rounded-[5.76px] px-3 py-1 font-mono tracking-[0.8px]">
                <span className="relative size-1.5"><span className="absolute -inset-[0.67px] animate-ping bg-[#e93748] opacity-50" /><span className="absolute inset-px bg-[#e93748]" /></span>
                <b className="text-xs leading-4 text-[#e93748]">{formatCount(detail.views)}</b>
                <span className="text-[10px] leading-[15px] font-semibold text-[#a1a1aa] uppercase">ნახვა</span>
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-linear-to-r from-transparent via-[#e93748]/60 to-transparent" />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button type="button" className={`watch-act ${theater ? "is-on" : ""}`} aria-pressed={theater} onClick={() => setTheater((value) => !value)}><Mask name="theater" />თეატრი</button>
                <div ref={keysRef} className="relative">
                  <button type="button" className={`watch-act ${keysOpen ? "is-on" : ""}`} aria-expanded={keysOpen} onClick={() => setKeysOpen((value) => !value)}><Mask name="shortcuts" />ღილაკები</button>
                  {keysOpen ? (
                    <div className="list-menu absolute top-full right-0 z-30 mt-2 w-[250px] overflow-hidden rounded-[10px] border border-white/8 bg-[#0a0a0a] p-3 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]">
                      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#e93748] to-transparent" />
                      {source?.kind === "embed" ? <p className="pb-2 text-[12px] leading-4 text-[#a1a1aa]">ეს სერვერი ჩაშენებულია. კლავიშები და ზუსტი პროგრესი მხოლოდ საკუთარ ვიდეოზე მუშაობს.</p> : null}
                      {shortcuts.map(([key, label]) => (
                        <p key={key} className="flex items-center justify-between py-1 text-[13px] text-[#d1d5db]">{label}<kbd className="search-kbd">{key}</kbd></p>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button type="button" className={`watch-act ${w2gOpen || room ? "is-on" : ""}`} onClick={() => (user ? setW2gOpen(true) : onAuth())}><Mask name="w2g" />W2G</button>
                {autos.map((item) => (
                  <button key={item.name} type="button" className={`watch-act ${enabled.includes(item.name) ? "is-on" : ""}`} aria-pressed={enabled.includes(item.name)} onClick={() => toggleAuto(item.name)}>
                    <Mask name={item.icon} />
                    {item.name}
                  </button>
                ))}
                <div ref={menuRef} className="relative">
                  <button type="button" className="watch-act is-on" aria-haspopup="menu" aria-expanded={listOpen} onClick={() => (user ? setListOpen((value) => !value) : onAuth())}>
                    {currentStatus ? <span className="list-icon" style={{ "--icon": `url(${currentStatus.icon})` } as React.CSSProperties} /> : <img src="/assets/watch/watchlist.svg" alt="" width={16} height={16} />}
                    {currentStatus?.label ?? "სიაში დამატება"}
                    <img src="/assets/watch/watchlist-chevron.svg" alt="" width={12} height={12} className={`transition-transform duration-200 ${listOpen ? "rotate-180" : ""}`} />
                  </button>
                  {listOpen ? (
                    <div className="list-menu absolute top-full right-0 z-30 mt-2 w-[248px] overflow-hidden rounded-[10px] border border-white/8 bg-[#0a0a0a] p-1.5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]" role="menu">
                      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#e93748] to-transparent" />
                      <div className="flex flex-col gap-0.5">
                        {lists.map((item) => (
                          <button key={item.id} type="button" role="menuitemradio" aria-checked={status === item.id} className={`list-item ${status === item.id ? "is-on" : ""}`} onClick={() => pickStatus(status === item.id ? null : item.id)}>
                            <span className="list-icon" style={{ "--icon": `url(${item.icon})` } as React.CSSProperties} />
                            {item.label}
                            {status === item.id ? <img src="/assets/detail/list/check.svg" alt="" width={16} height={16} className="ml-auto" /> : null}
                          </button>
                        ))}
                      </div>
                      {status ? (
                        <>
                          <div className="px-2 pt-1"><div className="h-px bg-white/6" /></div>
                          <button type="button" role="menuitem" className="list-item list-remove mt-1" onClick={() => pickStatus(null)}>
                            <img src="/assets/detail/list/remove.svg" alt="" width={16} height={16} />
                            სიიდან ამოღება
                          </button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <button type="button" className={`watch-act ${reported ? "is-on" : ""}`} onClick={() => {
                  if (!user) return onAuth();
                  setReportReason("");
                  setReportText("");
                  setReportError("");
                  setReportOpen(true);
                }}><Mask name="report" />{reported ? "გაგზავნილია" : "შეტყობინება"}</button>
              </div>
            </div>

            <div className="py-3"><div className="h-px border-t border-[#d1d5dc]/10" /></div>

            <div className="flex min-h-[134px] items-center gap-2 max-[700px]:flex-col">
              <div className="flex w-[361px] max-w-full flex-col items-center justify-center p-4 text-center text-sm">
                <p className="leading-5 text-[#9f9fa9]">ახლა უყურებ</p>
                <p className="pt-0.5 leading-5 font-medium text-white">სერია {episode}</p>
                <p className="max-w-[330px] pt-1 leading-[17.5px] text-[#71717b]">თუ ეს სერვერი არ მუშაობს, სცადე გვერდით მდგომი სხვა სერვერი.</p>
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5 px-8 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-8 shrink-0 items-center gap-1.5 text-xs leading-4 font-bold tracking-[0.6px] whitespace-nowrap text-[#9f9fa9] uppercase">
                    <img src="/assets/watch/server-dub.svg" alt="" width={16} height={16} />
                    სერვერი:
                  </span>
                  <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                    {sources.map((item, index) => (
                      <button key={`${item.server}-${index}`} type="button" className={`watch-server ${source === item ? "is-on" : ""}`} onClick={() => setServerIndex(index)}>
                        {item.server}
                      </button>
                    ))}
                    {!sources.length ? <span className="flex h-8 items-center text-xs text-[#71717b]">სერვერი ჯერ არ არის</span> : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className={`watch-from-right relative min-h-[520px] max-[1400px]:col-start-2 max-[1400px]:row-start-1 max-[900px]:col-start-1 max-[900px]:row-start-auto max-[900px]:h-[640px] ${theater ? "col-[2/-1] row-start-2" : ""}`}>
          <div className="absolute inset-0 flex flex-col">
            <div className="flex flex-col gap-3 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl leading-7 font-medium text-white">ეპიზოდები</h2>
                  <span className="rounded-[5.76px] border border-white/7 bg-white/5 px-2 py-0.5 text-xs leading-4 font-semibold text-white/70">{episodes.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className={`watch-icon-btn ${grid ? "is-on" : ""}`} aria-label="ეპიზოდების ხედი" aria-pressed={grid} onClick={() => setGrid((value) => !value)}><img src="/assets/watch/view-grid.svg" alt="" width={20} height={20} /></button>
                  <button type="button" className={`watch-icon-btn ${spoilers ? "is-on" : ""}`} aria-label="სპოილერის დამალვა" aria-pressed={spoilers} onClick={() => setSpoilers((value) => !value)}><img src="/assets/watch/spoiler.svg" alt="" width={20} height={20} /></button>
                </div>
              </div>
              <label className="search-field relative flex h-[34px] items-center rounded-[7.2px] border border-white/8 bg-white/4 pr-10 pl-3">
                <input value={epQuery} onChange={(event) => setEpQuery(event.target.value)} placeholder="ეპიზოდის ძებნა..." aria-label="ეპიზოდის ძებნა" className="min-w-0 flex-1 bg-transparent text-xs font-medium text-white outline-none placeholder:text-[#9f9fa9]" />
                <img src="/assets/watch/search.svg" alt="" width={16} height={16} className="absolute top-[9px] right-3" />
              </label>
            </div>

            <div ref={listRef} className={`detail-scroll min-h-0 flex-1 overflow-y-auto pr-1 ${grid ? "grid grid-cols-5 content-start gap-2" : "flex flex-col gap-2"}`}>
              {shown.map((item) => {
                const active = item.number === episode;
                const seen = history.find((entry) => entry.episode === item.number);
                const progress = seen?.duration ? Math.min(seen.time / seen.duration, 1) : 0;
                if (grid) {
                  return (
                    <button key={item.number} type="button" className={`watch-ep-tile ${active ? "is-current" : ""}`} onClick={() => setEpisode(item.number)}>
                      {item.number}
                    </button>
                  );
                }
                return (
                  <button key={item.number} type="button" className={`watch-ep ${active ? "is-current" : ""} ${prefs?.dimWatched && seen && !active ? "opacity-45" : ""}`} onClick={() => setEpisode(item.number)}>
                    <div className="relative h-[63px] w-28 shrink-0 overflow-hidden rounded-[7px] border border-white/8 bg-[#0a0a0c] shadow-[0_6px_16px_rgba(0,0,0,0.5)]">
                      {item.thumbnail || detail.banner || detail.poster ? <img src={item.thumbnail || detail.banner || detail.poster} alt="" className={`h-full w-full object-cover ${active ? "" : "opacity-80"} ${spoilers ? "blur-md" : ""}`} /> : null}
                      {active ? (
                        <span className="absolute inset-0 grid place-items-center bg-[#050609]/45">
                          <span className="grid size-8 place-items-center border border-[#e93748]/50 bg-black/70"><img src="/assets/watch/ep-play.svg" alt="" width={16} height={16} /></span>
                        </span>
                      ) : null}
                      {progress ? <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/15"><span className="block h-full bg-[#e93748]" style={{ width: `${progress * 100}%` }} /></span> : null}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col self-stretch text-left">
                      <p className={`font-mono text-[9.92px] leading-4 font-extrabold tracking-[1.3888px] ${active ? "text-[#e93748]" : "text-[#8b929e]"}`}>ეპ {String(item.number).padStart(2, "0")}</p>
                      <p className={`line-clamp-2 pt-1 text-[13px] leading-5 font-bold ${active ? "text-[#e93748]" : "text-[#e5e7eb]"} ${spoilers ? "blur-[5px] select-none" : ""}`}>{item.title || `${item.number}-ე ეპიზოდი`}</p>
                      <div className="mt-auto flex items-end justify-between pt-1.5">
                        <div className="flex flex-wrap gap-1">
                          <span className="watch-badge bg-[#e93748] text-white"><img src="/assets/watch/badge-dub.svg" alt="" width={10} height={10} />დაბ</span>
                          {item.sources.length > 1 ? <span className="watch-badge bg-[#3f3f46] text-[#e4e4e7]">{item.sources.length} სერვერი</span> : null}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
              {!shown.length ? <p className="col-span-full py-6 text-center text-sm text-[#71717b]">ეპიზოდი ვერ მოიძებნა</p> : null}
            </div>
          </div>
        </section>
      </div>

      <div className="mt-5 border-t border-white/6" />

      <div className="grid grid-cols-[minmax(0,1fr)_440px] gap-5 pt-5 max-[1100px]:grid-cols-1">
        {prefs?.comments === false ? <div /> : <section className="watch-from-left">
          <div className="flex items-center justify-between border-b border-[#27272a]/50 bg-black p-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl leading-7 font-bold text-[#f4f4f5]">კომენტარები</h2>
              <span className="rounded-full bg-[#e93748] px-2 py-0.5 text-xs leading-4 font-bold text-white">{commentTotal}</span>
            </div>
            <div className="flex gap-2">
              {sorts.map((name) => (
                <button key={name} type="button" className={`watch-sort ${sort === name ? "is-on" : ""}`} onClick={() => void changeSort(name)}>{name}</button>
              ))}
            </div>
          </div>

          <form className="flex flex-col p-4" onSubmit={post}>
            <p className="rounded-[7.2px] bg-[#18181b]/50 p-2 text-xs leading-4 text-[#71717b] italic">
              დატოვე კომენტარი და გაგვიზიარე აზრი — ასე საიტი უფრო ცოცხალია. ჯერ წაიკითხე <a href="/guide" className="text-[#e93748]/80 underline">საზოგადოების წესები</a>. 😊
            </p>
            <p className="pt-4 text-sm leading-5 text-[#9f9fa9]">{commentTotal} კომენტარი</p>
            <div className="flex items-start gap-3 pt-4">
              <Avatar src={user?.avatar} frame={user?.frame} size={40} faceClass="bg-[#27272a]" />
              <div className="flex min-w-0 flex-1 flex-col">
                {preview ? (
                  <div className="min-h-[100px] w-full rounded-[7.2px] border border-[#3f3f47]/50 bg-white/4 p-3 text-sm leading-5 break-words whitespace-pre-line text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                    {draft.trim() ? <CommentText text={draft} id="preview" /> : <span className="text-[#71717b]">არაფერია საჩვენებელი</span>}
                  </div>
                ) : (
                  <textarea ref={draftRef} value={draft} onFocus={() => { setWriting(true); if (!user) onAuth(); }} onBlur={() => setWriting(false)} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) post(); }} maxLength={2000} placeholder={user ? "დაწერე კომენტარი..." : "კომენტარისთვის შედი"} aria-label="კომენტარი" className="folder-input h-[100px] w-full resize-none rounded-[7.2px] border border-[#3f3f47]/50 bg-white/4 p-3 text-sm leading-5 text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] outline-none placeholder:text-[#71717b]" />
                )}
                {writing || preview || imageOpen || Boolean(draft.trim()) ? (
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center">
                      {([
                        { icon: "bold", label: "მუქი", on: false, action: () => wrap("**", "**") },
                        { icon: "italic", label: "დახრილი", on: false, action: () => wrap("_", "_") },
                        { icon: "strike", label: "სტრიქონული სპოილერი", on: false, action: () => wrap("||", "||") },
                        { icon: "link", label: "სურათის ჩასმა", on: imageOpen && imageFor === "main", action: () => openImage("main") },
                        { icon: "spoiler", label: "მთელი კომენტარის სპოილერი", on: /^\|\|\n[\s\S]*\n\|\|$/.test(draft), action: toggleWholeSpoiler },
                        { icon: "image", label: "გადახედვა", on: preview, action: () => setPreview((value) => { if (value) requestAnimationFrame(() => draftRef.current?.focus()); return !value; }) },
                      ] as const).map((item) => (
                        <button key={item.icon} type="button" aria-label={item.label} title={item.label} aria-pressed={item.on} className={`grid cursor-pointer place-items-center rounded text-[#9f9fa9] hover:bg-white/8 hover:text-white ${item.on ? "bg-white/10 text-white" : ""} ${item.icon === "spoiler" || item.icon === "image" ? "p-1.5" : "p-0.5"}`} onMouseDown={(event) => event.preventDefault()} onClick={item.action}>
                          <img src={`/assets/comments/${item.icon}.svg`} alt="" width={14} height={14} />
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" className="cursor-pointer px-2 text-[11px] leading-[16.5px] font-bold text-[#9f9fa9]" onClick={() => { setDraft(""); setPreview(false); setImageOpen(false); setWriting(false); draftRef.current?.blur(); }}>გაუქმება</button>
                      <button type="submit" disabled={posting || !draft.trim()} className="flex h-7 min-w-[70px] cursor-pointer items-center justify-center rounded-[5.76px] bg-[#e93748] px-3 text-[11px] leading-[16.5px] font-bold text-white disabled:cursor-default disabled:opacity-50">{posting ? "..." : "გაგზავნა"}</button>
                    </div>
                  </div>
                ) : null}
                {commentError ? <p className="pt-2 text-xs text-[#e93748]">{commentError}</p> : null}
              </div>
            </div>
          </form>

          <div className="flex flex-col gap-6 px-4 pt-2 pb-4">
            {sorted.map((comment) => renderComment(comment))}
            {!comments.length ? <p className="py-8 text-center text-sm text-[#71717b]">კომენტარი ჯერ არ არის. პირველი შენ იყავი.</p> : null}
            {comments.some((item) => !item.parent) && comments.filter((item) => !item.parent).length < rootTotal ? (
              <div ref={moreRef} className="grid h-8 place-items-center">
                {loadingMore ? <span className="comment-more" /> : null}
              </div>
            ) : null}
          </div>
        </section>}

        <aside className="watch-from-right flex flex-col gap-5">
          {detail.related.length > 1 ? (
            <section>
              <h2 className="flex items-center gap-2 pb-3 text-xl leading-7 font-medium text-white"><span className="ml-0.5 h-6 w-[4.8px] rounded-[5.76px] bg-white" />მსგავსი ანიმე</h2>
              <div className="flex flex-col gap-3">
                {detail.related.map((item) => (
                  <a key={item.slug} href={item.current ? undefined : `${animeHref(item.slug)}/watch?ep=1`} className="watch-side group flex h-[86px] gap-3 rounded-[7.2px] pr-1">
                    <div className="h-[86px] w-[65px] shrink-0 overflow-hidden rounded-[7.2px] bg-[#141414]">{item.poster ? <img src={item.poster} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}</div>
                    <div className="flex min-w-0 flex-col justify-center gap-0.5">
                      <p className={`font-bog line-clamp-2 text-sm leading-5 font-normal opacity-90 transition-colors ${item.current ? "text-[#e93748]" : "text-white group-hover:text-[#e93748]"}`}>{item.title}</p>
                      <p className="flex items-center pt-1 text-[10px] leading-[15px] font-medium">
                        <span className="tracking-[1px] text-[#e93748] uppercase">{item.relation}</span>
                        <span className="px-1.5 text-[#9f9fa9] opacity-40">•</span>
                        <span className="text-[#9f9fa9]">{[item.format, item.year].filter(Boolean).join(" • ")}</span>
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          {detail.recommendations.length ? (
            <section>
              <h2 className="flex items-center gap-2 text-xl leading-7 font-medium text-white"><span className="ml-0.5 h-6 w-[4.8px] rounded-[5.76px] bg-white" />რეკომენდაციები</h2>
              <div className="flex flex-col gap-3 pt-3">
                {recs.map((item) => (
                  <a key={item.slug} href={`${animeHref(item.slug)}/watch?ep=1`} className="watch-side group flex h-[86px] gap-3 rounded-[7.2px] pr-1">
                    <div className="h-[86px] w-[65px] shrink-0 overflow-hidden rounded-[7.2px] bg-[#141414]">{item.image ? <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}</div>
                    <div className="flex min-w-0 flex-col justify-center gap-0.5">
                      <p className="font-bog line-clamp-2 text-sm leading-5 font-normal text-white opacity-90 transition-colors group-hover:text-[#e93748]">{item.title}</p>
                      <p className="flex items-center text-xs leading-4 text-white/70">
                        {item.format}
                        {item.score ? (
                          <>
                            <span className="px-1">•</span>
                            <img src="/assets/watch/rec-star.svg" alt="" width={12} height={12} className="mr-0.5" />
                            {(item.score / 10).toFixed(1)}
                          </>
                        ) : null}
                      </p>
                    </div>
                  </a>
                ))}
                {detail.recommendations.length > 5 ? (
                  <button type="button" className="watch-side rounded-[7.2px] py-2.5 text-sm leading-5 font-medium text-white/70" onClick={() => setShowAllRecs((value) => !value)}>
                    {showAllRecs ? "ნაკლების ჩვენება" : `კიდევ ${detail.recommendations.length - 5}`}
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
      {imageOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4" onMouseDown={() => { setImageOpen(false); setImageError(""); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="insert-image-title" className="w-full max-w-[440px] rounded-xl border border-white/10 bg-[#161618] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]" onMouseDown={(event) => event.stopPropagation()}>
            <h3 id="insert-image-title" className="text-[22px] leading-7 font-bold text-white">სურათის ჩასმა</h3>
            <p className="pt-2 text-sm leading-5 text-[#a1a1aa]">ჩასვი იმ სურათის მისამართი, რომელიც კომენტარში გინდა.</p>
            <input autoFocus value={imageValue} onChange={(event) => { setImageValue(event.target.value); setImageError(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); insertImage(); } if (event.key === "Escape") { setImageOpen(false); setImageError(""); } }} placeholder="https://example.com/image.png" aria-label="სურათის მისამართი" className="folder-input mt-4 h-11 w-full rounded-lg border border-white/10 bg-[#111113] px-3 text-sm text-white outline-none placeholder:text-[#71717b]" />
            <p className="pt-3 text-[11px] leading-4 font-medium tracking-[0.8px] text-[#71717b] uppercase">მხარდაჭერილია PNG, JPG, GIF, WEBP</p>
            {imageError ? <p className="pt-2 text-xs text-[#e93748]">{imageError}</p> : null}
            <div className="flex justify-end gap-3 pt-6">
              <button type="button" className="h-10 cursor-pointer rounded-lg border border-white/15 bg-white/5 px-4 text-xs font-bold tracking-[0.6px] text-[#d4d4d8] uppercase" onClick={() => { setImageOpen(false); setImageError(""); }}>გაუქმება</button>
              <button type="button" className="h-10 cursor-pointer rounded-lg bg-[#7ccf00] px-4 text-xs font-bold tracking-[0.6px] text-black uppercase" onClick={insertImage}>სურათის ჩასმა</button>
            </div>
          </div>
        </div>
      ) : null}
      {reportOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4" onMouseDown={() => setReportOpen(false)}>
          <form className="relative w-full max-w-[438px] overflow-hidden rounded-[14px] border border-white/6 bg-black shadow-[0_24px_60px_-12px_rgba(0,0,0,0.9)]" onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "Escape") setReportOpen(false); }} onSubmit={async (event) => {
            event.preventDefault();
            if (!reportReason || sendingReport) return;
            const reason = reportReasons.find((item) => item.id === reportReason);
            const note = reportText.trim();
            const server = [source?.server, source?.language ? `(${source.language})` : ""].filter(Boolean).join(" ");
            const lines = [`მიზეზი: ${reason?.label ?? reportReason}`, `სერია ${episode}`, server ? `სერვერი: ${server}` : "", note ? `შენიშვნა: ${note}` : ""].filter(Boolean);
            setSendingReport(true);
            const res = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: detail.id, episode, message: lines.join("\n") }) });
            const data = (await res.json().catch(() => null)) as { error?: string } | null;
            setSendingReport(false);
            if (!res.ok) return setReportError(data?.error || "ვერ გაიგზავნა");
            setReported(true);
            setReportOpen(false);
            setReportReason("");
            setReportText("");
            setReportError("");
          }}>
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#e93748] to-transparent" />
            <div className="flex max-h-[calc(100vh-32px)] flex-col gap-4 overflow-y-auto px-[22px] pt-6 pb-[22px]">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-[#e93748]/30 bg-[#e93748]/12">
                  <img src="/assets/report/warn.svg" alt="" width={15} height={15} />
                </span>
                <div>
                  <h3 className="text-[18px] leading-[23px] font-extrabold tracking-[-0.18px] text-white">პრობლემის შეტყობინება</h3>
                  <p className="pt-1 text-[13px] leading-[19.5px] text-[#9ca3af]">ამ ეპიზოდზე რაღაც გაფუჭდა? შეტყობინება პირდაპირ ადმინისტრაციას მისდის.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-white/7 bg-white/4 px-3 py-2.5">
                {detail.poster ? <img src={detail.poster} alt="" className="h-[50px] w-9 shrink-0 rounded-[6px] object-cover" /> : <span className="h-[50px] w-9 shrink-0 rounded-[6px] bg-white/6" />}
                <span className="min-w-0">
                  <span className="block truncate text-[13px] leading-[19.5px] font-bold text-[#e5e8ee]">{detail.title}</span>
                  <span className="block text-xs leading-[18px] text-[#8b929e]">სერია {episode}</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="პრობლემის ტიპი">
                {reportReasons.map((item) => {
                  const on = reportReason === item.id;
                  return (
                    <button key={item.id} type="button" role="radio" aria-checked={on} className={`relative flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-[13px] leading-[19.5px] font-semibold ${on ? "border-[#e93748] bg-[#e93748]/14 text-white before:absolute before:top-2 before:bottom-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-[#e93748]" : "border-white/7 bg-white/4 text-[#b6bcc6]"}`} onClick={() => { setReportReason(item.id); setReportError(""); }}>
                      <img src={item.icon} alt="" width={15} height={15} className={on ? "brightness-0 invert" : ""} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <textarea value={reportText} onChange={(event) => setReportText(event.target.value)} maxLength={400} placeholder="კიდევ რამე უნდა ვიცოდეთ? (არასავალდებულო)" aria-label="დამატებითი შენიშვნა" className="h-[80px] w-full resize-none rounded-lg border border-white/7 bg-white/4 px-3 py-2.5 text-[13px] leading-[19.5px] text-white outline-none placeholder:text-[#6b7280]" />
              {reportError ? <p className="text-xs text-[#e93748]">{reportError}</p> : null}
              <div className="flex gap-2.5">
                <button type="button" className="h-[42px] flex-1 cursor-pointer rounded-lg border border-white/9 bg-[#0f1118] text-[13px] font-bold tracking-[0.26px] text-[#d6dae2]" onClick={() => setReportOpen(false)}>გაუქმება</button>
                <button type="submit" disabled={!reportReason || sendingReport} className="h-[42px] flex-1 rounded-lg bg-[#e93748] text-[13px] font-bold tracking-[0.26px] text-white shadow-[0_4px_10px_rgba(0,0,0,0.5)] enabled:cursor-pointer disabled:opacity-55">{sendingReport ? "იგზავნება" : "გაგზავნა"}</button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
