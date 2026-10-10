"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { Player } from "@/components/player";
import { RoomEmojiPicker } from "@/components/room-emoji-picker";
import { toast } from "@/components/toast";
import type { RoomChatMessage, RoomPlay } from "@/lib/watch-room-types";

function mergeChat(current: RoomChatMessage[], incoming: RoomChatMessage[]) {
  const map = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) map.set(item.id, item);
  return [...map.values()].sort((a, b) => a.id - b.id).slice(-80);
}

type Remote = { hostId: number; host?: string; slug: string; episode: number; position: number; closed?: boolean; startsAt?: string | null };

export function Watch2GetherRoom({
  code,
  hostId,
  host: hostName,
  title,
  episode: initialEpisode,
  position,
  slug,
  play,
  viewerId,
  signedIn,
  closed: initiallyClosed,
  startsAt,
  onAuth,
}: {
  code: string;
  hostId: number;
  host: string;
  title: string;
  episode: number;
  position: number;
  slug: string;
  play: RoomPlay | null;
  viewerId?: number;
  signedIn: boolean;
  closed: boolean;
  startsAt?: string | null;
  onAuth: () => void;
}) {
  const router = useRouter();
  const host = useRef(viewerId === hostId);
  const [isHost, setIsHost] = useState(viewerId === hostId);
  const [hostLabel, setHostLabel] = useState(hostName);
  const [closed, setClosed] = useState(initiallyClosed);
  const [opensAt, setOpensAt] = useState(startsAt ?? null);
  const [live, setLive] = useState(() => !startsAt || Date.parse(startsAt) <= Date.now());
  useEffect(() => {
    if (live || !opensAt) return;
    const wait = Date.parse(opensAt) - Date.now();
    const id = window.setTimeout(() => setLive(true), Math.max(0, wait));
    return () => window.clearTimeout(id);
  }, [live, opensAt]);
  const [closing, setClosing] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const told = useRef(false);
  const seen = useRef(false);
  const [episode, setEpisode] = useState(initialEpisode || 1);
  const [follow, setFollow] = useState<{ nonce: number; time: number } | null>(null);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<RoomChatMessage[]>([]);
  const [viewers, setViewers] = useState(0);
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [panel, setPanel] = useState<"episodes" | "invite" | null>(null);
  const [episodeQuery, setEpisodeQuery] = useState("");
  const [friendQuery, setFriendQuery] = useState("");
  const [startAt, setStartAt] = useState(position);
  const [friends, setFriends] = useState<{ id: number; name: string; avatar?: string; frame?: string }[] | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [inviting, setInviting] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const lastId = useRef(0);
  const field = useRef<HTMLInputElement>(null);
  const emojiBox = useRef<HTMLDivElement>(null);
  const actions = useRef<HTMLDivElement>(null);
  const token = useRef("");

  const current = play?.episodes.find((item) => item.number === episode) ?? play?.episodes[episode - 1];
  const source = current?.sources[0];
  const shownTitle = play?.title || title || "Watch Party";
  const bits = [
    { icon: true, green: false, text: `Ep ${episode || 1}` },
    play?.format ? { icon: false, green: true, text: play.format } : null,
    play?.duration ? { icon: false, green: false, text: `${play.duration}m` } : null,
    play?.year ? { icon: false, green: false, text: play.year } : null,
  ].filter((item): item is { icon: boolean; green: boolean; text: string } => !!item);

  useEffect(() => {
    let value = "";
    try {
      value = sessionStorage.getItem("animeb.room") ?? "";
      if (!value) {
        value = Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
        sessionStorage.setItem("animeb.room", value);
      }
    } catch {
      value = "guestroom1";
    }
    token.current = value;
  }, []);

  useEffect(() => {
    let stop = false;
    async function tick() {
      const res = await fetch(`/api/room?code=${encodeURIComponent(code)}&token=${encodeURIComponent(token.current)}`);
      const data = (await res.json().catch(() => null)) as { room?: Remote; messages?: RoomChatMessage[]; viewers?: number } | null;
      if (stop || !data?.room) return;
      host.current = data.room.hostId === viewerId;
      setIsHost(data.room.hostId === viewerId);
      if (data.room.host) setHostLabel(data.room.host);
      setMessages((list) => mergeChat(list, data.messages ?? []));
      setViewers(data.viewers ?? 0);
      if (data.room.startsAt && Date.parse(data.room.startsAt) > Date.now()) setOpensAt(data.room.startsAt);
      else setLive(true);
      if (data.room.closed) {
        setPanel(null);
        setClosed(true);
        if (seen.current && !told.current) {
          told.current = true;
          toast("ოთახი დასრულდა.");
        }
        seen.current = true;
        return;
      }
      seen.current = true;
      if (data.room.hostId === viewerId) return;
      if (data.room.slug && data.room.slug !== slug) {
        router.refresh();
        return;
      }
      if (data.room.episode && data.room.episode !== episode) {
        setEpisode(data.room.episode);
        setStartAt(data.room.position || 0);
      }
      setFollow({ nonce: Date.now(), time: data.room.position });
    }
    void tick();
    const id = window.setInterval(() => void tick(), 2000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [code, episode, slug, viewerId, router]);

  useEffect(() => {
    const max = messages.reduce((highest, item) => Math.max(highest, item.id), 0);
    if (max > lastId.current) lastId.current = max;
    const node = box.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  useEffect(() => {
    let stop = false;
    async function pull() {
      const res = await fetch(`/api/room?code=${encodeURIComponent(code)}&chat=1&since=${lastId.current}`);
      const data = (await res.json().catch(() => null)) as { messages?: RoomChatMessage[] } | null;
      if (stop || !data?.messages?.length) return;
      setMessages((list) => mergeChat(list, data.messages ?? []));
    }
    const id = window.setInterval(() => void pull(), 1000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [code]);

  async function endRoom() {
    if (!isHost || closed || closing) return;
    setClosing(true);
    const res = await fetch("/api/room", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "close", code }) });
    setClosing(false);
    if (!res.ok) return;
    told.current = true;
    setPanel(null);
    setClosed(true);
    setConfirmEnd(false);
    toast("ოთახი დასრულდა.");
  }

  async function chooseEpisode(number: number) {
    if (closed) return toast("ოთახი დასრულებულია.");
    if (!isHost) return toast("ეპიზოდს მხოლოდ შემქმნელი ცვლის.");
    setEpisode(number);
    setStartAt(0);
    setPanel(null);
    const res = await fetch("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, slug, title: shownTitle, episode: number, position: 0 }),
    });
    if (!res.ok) toast("ეპიზოდი ვერ შეიცვალა.");
  }

  async function openInvite() {
    if (!signedIn) return onAuth();
    setPanel((current) => (current === "invite" ? null : "invite"));
    if (friends) return;
    const res = await fetch("/api/friends?mine=1");
    const data = (await res.json().catch(() => null)) as { items?: { id: number; name: string; avatar?: string; frame?: string }[] } | null;
    setFriends(data?.items ?? []);
  }

  async function sendInvites() {
    if (!picked.length || inviting) return;
    setInviting(true);
    const res = await fetch("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "invite", code, invite: picked }),
    });
    setInviting(false);
    if (!res.ok) return toast("მოწვევა ვერ გაიგზავნა.");
    setPicked([]);
    setPanel(null);
    toast("მოწვევა გაეგზავნა.");
  }

  function saveProgress(time: number) {
    if (!host.current || !play || closed) return;
    fetch("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync", code, slug: play.slug, title: play.title, episode, position: Math.floor(time) }),
    }).catch(() => {});
  }

  function insertEmoji(emoji: string) {
    const input = field.current;
    const start = input?.selectionStart ?? draft.length;
    const end = input?.selectionEnd ?? start;
    const next = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`.slice(0, 500);
    setDraft(next);
    const caret = Math.min(start + emoji.length, next.length);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(caret, caret);
    });
  }

  useEffect(() => {
    if (!emojiOpen) return;
    function onDown(event: MouseEvent) {
      if (!emojiBox.current?.contains(event.target as Node)) setEmojiOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setEmojiOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [emojiOpen]);

  useEffect(() => {
    if (!panel) return;
    function onDown(event: MouseEvent) {
      if (!actions.current?.contains(event.target as Node)) setPanel(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPanel(null);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [panel]);

  useEffect(() => {
    if (!confirmEnd) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !closing) setConfirmEnd(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmEnd, closing]);

  async function send(text: string) {
    const body = text.trim();
    if (!body || sending) return;
    if (!signedIn) return onAuth();
    setSending(true);
    const res = await fetch("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "chat", code, text: body }),
    });
    const data = (await res.json().catch(() => null)) as { message?: RoomChatMessage } | null;
    setSending(false);
    if (!res.ok || !data?.message) return;
    setMessages((list) => mergeChat(list, [data.message!]));
    setDraft("");
  }

  return (
    <div className="h-dvh overflow-hidden bg-[#06070a] pt-20 text-white">
      <div className="flex h-full flex-col overflow-hidden">
        <nav className="flex h-[37px] shrink-0 items-center gap-[10px] border-b border-white/5 bg-[#08080a] px-4 text-[12px] leading-4 font-medium">
          <a href="/" className="text-[#99a1af]">Home</a>
          <span className="text-[#4a5565]">/</span>
          <a href="/watch2gether" className="text-[#99a1af]">Lobbies</a>
          <span className="text-[#4a5565]">/</span>
          <span className="text-[#e5e7eb]">Watch Party</span>
        </nav>
        <div className="flex min-h-0 flex-1 flex-col min-[901px]:flex-row">
          <section className="flex w-full shrink-0 flex-col border-b border-white/5 bg-black min-[901px]:min-h-0 min-[901px]:flex-1 min-[901px]:border-r min-[901px]:border-b-0">
            <div className="relative aspect-video w-full bg-black shadow-[0_25px_25px_rgba(0,0,0,0.25)] min-[901px]:aspect-auto min-[901px]:min-h-0 min-[901px]:flex-1">
              {closed ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[#06070a] bg-[linear-gradient(180deg,rgba(6,7,10,0.55),rgba(6,7,10,0.9))] px-6">
                  <div className="flex max-w-[512px] flex-col items-center gap-[8.8px] p-5 text-center">
                    <p className="flex items-center gap-[6.4px] text-[9.92px] leading-[14.88px] font-bold tracking-[2.18px] text-[#9ca3af]">
                      <span className="size-[7px] rounded-full bg-[#9ca3af]" />
                      STREAM ENDED
                    </p>
                    <span className="mt-[5.6px] grid size-16 place-items-center rounded-full border-2 border-[rgba(233,55,72,0.55)] bg-[#261113] shadow-[0_0_0_4px_rgba(6,7,10,0.6),0_0_26px_rgba(233,55,72,0.35)]">
                      <img src="/assets/watch2gether/ended.svg" alt="" width={24} height={24} />
                    </span>
                    <h2 className="max-w-[472px] text-[24px] leading-8 font-extrabold tracking-[-0.32px] min-[901px]:text-[32px] min-[901px]:leading-[35.2px]">{shownTitle}</h2>
                    <p className="pt-[6.4px] text-[11.52px] leading-[17.28px] text-[#9aa4b2]">This watch party has ended{hostLabel ? ` · hosted by ${hostLabel}` : ""}.</p>
                    <a href="/watch2gether" className="mt-[14.4px] border border-[rgba(233,55,72,0.4)] bg-[rgba(32,15,16,0.91)] px-[17.6px] py-[9.6px] text-[12.16px] leading-[18.24px] font-bold tracking-[0.36px] text-[#e93748]">Back to lobby</a>
                  </div>
                </div>
              ) : !live ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[#06070a] px-6 text-center">
                  <div>
                    <p className="text-[11px] font-bold tracking-[2px] text-[#e93748] uppercase">დაგეგმილია</p>
                    <h2 className="mt-3 text-[28px] font-extrabold">{shownTitle}</h2>
                    <p className="mt-2 text-sm text-[#9aa4b2]">ოთახი იწყება {opensAt ? new Date(opensAt).toLocaleString("ka-GE", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }) : "მალე"}</p>
                  </div>
                </div>
              ) : (
              <Player key={`${episode}-${source?.url ?? "empty"}`} source={source} poster={play?.banner} autoPlay startAt={startAt} progressEvery={3000} follow={host.current ? null : follow} onProgress={saveProgress} />
              )}
              {!closed && !isHost && (
                <div className="pointer-events-none absolute top-3 left-3 flex h-[26.5px] items-center gap-1.5 border border-[#d1d5dc] bg-[#06070a]/90 px-2.5 py-1">
                  <img src="/assets/watch2gether/sync.svg" alt="" width={12} height={12} />
                  <span className="text-[11px] leading-[16.5px] font-semibold text-[#d1d5dc]">Synced to host</span>
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-[linear-gradient(90deg,#e93748_0%,rgba(233,55,72,0.55)_45%,rgba(233,55,72,0)_55%,rgba(233,55,72,0.28)_70%,rgba(233,55,72,0)_78%,rgba(233,55,72,0.45)_100%)]" />
            </div>
            <div className="relative shrink-0 border-t border-white/5 px-4 py-3 min-[901px]:h-[126px] min-[901px]:p-6">
              <div className="flex flex-col items-start gap-3 min-[901px]:flex-row min-[901px]:gap-4 min-[901px]:border-b min-[901px]:border-white/5 min-[901px]:pb-5">
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-[18px] leading-7 font-bold tracking-[-0.4px] min-[901px]:text-[24px] min-[901px]:leading-8 min-[901px]:tracking-[-0.6px]">{shownTitle}</h1>
                  <p className="mt-2 flex items-center gap-3 text-[12px] leading-4 text-[#99a1af]">
                    {bits.map((item, index) => (
                      <span key={item.text} className="flex items-center gap-3">
                        {index > 0 && <span>•</span>}
                        <span className={`flex items-center gap-1 ${item.green ? "font-medium text-[#e93748]" : ""}`}>
                          {item.icon ? <img src="/assets/watch2gether/ep.svg" alt="" width={14} height={14} /> : null}
                          {item.text}
                        </span>
                      </span>
                    ))}
                  </p>
                </div>
                <div ref={actions} className="relative flex shrink-0 flex-wrap items-center gap-3">
                  {!closed && panel === "episodes" ? (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4" onMouseDown={() => setPanel(null)}>
                      <div className="relative w-full max-w-[544px] shadow-[0_20px_40px_rgba(0,0,0,0.9),0_0_100px_rgba(233,55,72,0.15)]" onMouseDown={(event) => event.stopPropagation()}>
                        <span className="pointer-events-none absolute -inset-px bg-[linear-gradient(154deg,rgba(233,55,72,0.45)_0%,rgba(233,55,72,0.26)_17.5%,rgba(233,55,72,0.16)_26%,rgba(255,255,255,0.06)_35%,rgba(255,255,255,0.02)_100%)]" />
                        <div className="relative bg-[rgba(10,11,16,0.96)]">
                          <span className="pointer-events-none absolute top-0 left-[18px] h-px w-[calc(100%-36px)] bg-gradient-to-r from-transparent via-[rgba(233,55,72,0.6)] to-transparent" />
                          <span className="pointer-events-none absolute top-[5px] left-[5px] size-[5px] bg-[rgba(233,55,72,0.8)] shadow-[0_0_8px_#e93748]" />
                          <span className="pointer-events-none absolute right-[5px] bottom-[5px] size-[5px] bg-[rgba(233,55,72,0.8)] shadow-[0_0_8px_#e93748]" />
                          <div className="flex items-center justify-between px-5 pt-4 pb-3">
                            <div className="flex items-center gap-[10px]">
                              <img src="/assets/watch2gether/ep-select.svg" alt="" width={16} height={16} />
                              <div>
                                <p className="text-[12.8px] leading-[19.2px] font-bold tracking-[1.792px] text-white">SELECT EPISODE</p>
                                <p className="text-[10.4px] leading-[15.6px] tracking-[0.208px] text-[#7d8590]">Switches playback for everyone in the room</p>
                              </div>
                            </div>
                            <button type="button" className="cursor-pointer p-1.5" aria-label="დახურვა" onClick={() => setPanel(null)}>
                              <img src="/assets/watch2gether/ep-close.svg" alt="" width={16} height={16} />
                            </button>
                          </div>
                          <div className="mx-5 h-px bg-[linear-gradient(90deg,rgba(233,55,72,0.4)_0%,rgba(233,55,72,0.22)_20%,rgba(255,255,255,0.05)_40%,transparent_100%)]" />
                          <label className="mx-5 mt-[14.5px] flex items-center gap-[8.8px] border border-[rgba(233,55,72,0.2)] bg-[rgba(10,11,16,0.6)] px-3 py-2">
                            <img src="/assets/watch2gether/ep-search.svg" alt="" width={16} height={16} />
                            <input
                              value={episodeQuery}
                              onChange={(event) => setEpisodeQuery(event.target.value)}
                              placeholder="Search episode number or title…"
                              className="min-w-0 flex-1 bg-transparent text-[13.12px] tracking-[0.13px] text-white outline-none placeholder:text-[#6b7280]"
                            />
                            <span className="text-[10.56px] leading-[15.84px] font-bold tracking-[0.42px] text-[#c48993]">
                              {(play?.episodes.filter((item) => String(item.number).includes(episodeQuery.trim())).length ?? 0)}/{play?.episodes.length ?? 0}
                            </span>
                          </label>
                          <div className="max-h-[168px] overflow-y-auto px-5 py-[18px]">
                            <div className="grid grid-cols-4 gap-2 min-[520px]:grid-cols-7">
                              {(play?.episodes ?? []).filter((item) => String(item.number).includes(episodeQuery.trim())).map((item) => {
                                const on = item.number === episode;
                                return (
                                  <button
                                    key={item.number}
                                    type="button"
                                    className={`relative flex h-[41.6px] cursor-pointer items-center justify-center border text-[12.48px] leading-[18.72px] font-semibold ${on ? "border-[rgba(233,55,72,0.6)] bg-[rgba(233,55,72,0.16)] text-[#e93748] shadow-[inset_0_0_14px_rgba(233,55,72,0.28)]" : "border-white/[0.08] bg-white/[0.03] text-[#cbd5e1]"}`}
                                    onClick={() => void chooseEpisode(item.number)}
                                  >
                                    {item.number}
                                    <span className={`absolute top-[3px] right-[3px] size-[3px] ${on ? "bg-[#e93748] shadow-[0_0_6px_#e93748]" : "bg-white/25"}`} />
                                  </button>
                                );
                              })}
                            </div>
                            {play?.episodes.length && !(play.episodes.filter((item) => String(item.number).includes(episodeQuery.trim())).length) ? <p className="py-2 text-center text-[13px] text-[#7d8590]">ეპიზოდი ვერ მოიძებნა.</p> : null}
                            {!play?.episodes.length ? <p className="py-2 text-center text-[13px] text-[#7d8590]">ეპიზოდები არ არის.</p> : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {!closed && panel === "invite" ? (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4" onMouseDown={() => setPanel(null)}>
                      <div className="relative w-full max-w-[544px] shadow-[0_20px_40px_rgba(0,0,0,0.9),0_0_100px_rgba(233,55,72,0.15)]" onMouseDown={(event) => event.stopPropagation()}>
                        <span className="pointer-events-none absolute -inset-px bg-[linear-gradient(154deg,rgba(233,55,72,0.45)_0%,rgba(233,55,72,0.26)_17.5%,rgba(233,55,72,0.16)_26%,rgba(255,255,255,0.06)_35%,rgba(255,255,255,0.02)_100%)]" />
                        <div className="relative bg-[rgba(10,11,16,0.96)]">
                          <span className="pointer-events-none absolute top-0 left-[18px] h-px w-[calc(100%-36px)] bg-gradient-to-r from-transparent via-[rgba(233,55,72,0.6)] to-transparent" />
                          <span className="pointer-events-none absolute top-[5px] left-[5px] size-[5px] bg-[rgba(233,55,72,0.8)] shadow-[0_0_8px_#e93748]" />
                          <span className="pointer-events-none absolute right-[5px] bottom-[5px] size-[5px] bg-[rgba(233,55,72,0.8)] shadow-[0_0_8px_#e93748]" />
                          <div className="flex items-center justify-between px-5 pt-4 pb-3">
                            <div className="flex items-center gap-[10px]">
                              <img src="/assets/watch2gether/invite-head.svg" alt="" width={16} height={16} />
                              <div>
                                <p className="text-[12.8px] leading-[19.2px] font-bold tracking-[1.792px] text-white">INVITE FRIENDS</p>
                                <p className="text-[10.4px] leading-[15.6px] tracking-[0.208px] text-[#7d8590]">Sends a room link to selected friends</p>
                              </div>
                            </div>
                            <button type="button" className="cursor-pointer p-1.5" aria-label="დახურვა" onClick={() => setPanel(null)}>
                              <img src="/assets/watch2gether/ep-close.svg" alt="" width={16} height={16} />
                            </button>
                          </div>
                          <div className="mx-5 h-px bg-[linear-gradient(90deg,rgba(233,55,72,0.4)_0%,rgba(233,55,72,0.22)_20%,rgba(255,255,255,0.05)_40%,transparent_100%)]" />
                          <label className="mx-5 mt-[14.5px] flex items-center gap-[8.8px] border border-[rgba(233,55,72,0.2)] bg-[rgba(10,11,16,0.6)] px-3 py-2">
                            <img src="/assets/watch2gether/ep-search.svg" alt="" width={16} height={16} />
                            <input
                              value={friendQuery}
                              onChange={(event) => setFriendQuery(event.target.value)}
                              placeholder="Search friends…"
                              className="min-w-0 flex-1 bg-transparent text-[13.12px] tracking-[0.13px] text-white outline-none placeholder:text-[#6b7280]"
                            />
                            <span className="text-[10.56px] leading-[15.84px] font-bold tracking-[0.42px] text-[#c48993]">{picked.length}/{friends?.length ?? 0}</span>
                          </label>
                          <div className="max-h-[240px] overflow-y-auto px-5 py-[18px]">
                            {friends === null ? <p className="py-2 text-center text-[13px] text-[#7d8590]">...</p> : friends.length === 0 ? <p className="py-2 text-center text-[13px] text-[#7d8590]">მეგობრები არ გყავს.</p> : (
                              <div className="flex flex-col gap-2">
                                {friends.filter((friend) => friend.name.toLowerCase().includes(friendQuery.trim().toLowerCase())).map((friend) => {
                                  const on = picked.includes(friend.id);
                                  return (
                                    <button
                                      key={friend.id}
                                      type="button"
                                      className={`relative flex h-[52px] cursor-pointer items-center gap-3 border px-3 text-left ${on ? "border-[rgba(233,55,72,0.6)] bg-[rgba(233,55,72,0.16)] shadow-[inset_0_0_14px_rgba(233,55,72,0.28)]" : "border-white/[0.08] bg-white/[0.03]"}`}
                                      onClick={() => setPicked((list) => list.includes(friend.id) ? list.filter((id) => id !== friend.id) : [...list, friend.id])}
                                    >
                                      <Avatar src={friend.avatar} frame={friend.frame} size={32} />
                                      <span className={`min-w-0 flex-1 truncate text-[13px] font-semibold ${on ? "text-[#e93748]" : "text-[#cbd5e1]"}`}>{friend.name}</span>
                                      <span className={`grid size-4 shrink-0 place-items-center border ${on ? "border-[#e93748] bg-[#e93748]" : "border-white/25"}`}>
                                        {on ? <span className="mb-0.5 block h-[5px] w-[8px] -rotate-45 border-b-2 border-l-2 border-white" /> : null}
                                      </span>
                                      <span className={`absolute top-[3px] right-[3px] size-[3px] ${on ? "bg-[#e93748] shadow-[0_0_6px_#e93748]" : "bg-white/25"}`} />
                                    </button>
                                  );
                                })}
                                {friends.length > 0 && !friends.some((friend) => friend.name.toLowerCase().includes(friendQuery.trim().toLowerCase())) ? <p className="py-2 text-center text-[13px] text-[#7d8590]">მეგობარი ვერ მოიძებნა.</p> : null}
                              </div>
                            )}
                          </div>
                          <div className="px-5 pb-5">
                            <button type="button" disabled={!picked.length || inviting} className="relative h-10 w-full cursor-pointer disabled:cursor-wait disabled:opacity-40" onClick={() => void sendInvites()}>
                              <span className="absolute -inset-px bg-[#e93748]" />
                              <span className="relative flex h-10 items-center justify-center bg-[#1c1014] text-[14px] font-bold tracking-[0.35px] text-[#e93748]">{inviting ? "..." : "SEND INVITE"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {closed ? null : (
                  <button type="button" className="relative h-9 shrink-0 cursor-pointer" onClick={() => { setEpisodeQuery(""); setPanel((current) => (current === "episodes" ? null : "episodes")); }}>
                    <span className="absolute -inset-px bg-[#e93748]" />
                    <span className="relative flex h-9 items-center gap-2 bg-[#1c1014] px-5">
                      <img src="/assets/watch2gether/episodes.svg" alt="" width={16} height={16} />
                      <span className="text-[14px] leading-5 font-bold tracking-[0.35px] text-[#e93748]">EPISODES</span>
                    </span>
                    <span className="absolute top-1 right-1 size-[3px] bg-[#e93748]" />
                  </button>
                  )}
                  <button type="button" className="relative h-9 shrink-0 cursor-pointer" onClick={() => { navigator.clipboard.writeText(location.href).then(() => toast("Lobby share link copied to clipboard!")).catch(() => {}); }}>
                    <span className="absolute -inset-px bg-[linear-gradient(162deg,rgba(255,255,255,0.15),rgba(255,255,255,0.02))]" />
                    <span className="relative flex h-9 items-center gap-2 bg-[#0f0f12] px-5">
                      <img src="/assets/watch2gether/share.svg" alt="" width={16} height={16} />
                      <span className="text-[14px] leading-5 font-bold tracking-[0.35px] text-[#9ca3af]">SHARE</span>
                    </span>
                    <span className="absolute top-1 right-1 size-[3px] bg-white/30" />
                  </button>
                  {closed ? null : (
                  <button type="button" className="relative h-9 shrink-0 cursor-pointer" onClick={() => { setFriendQuery(""); void openInvite(); }}>
                    <span className="absolute -inset-px bg-[linear-gradient(162deg,rgba(255,255,255,0.15),rgba(255,255,255,0.02))]" />
                    <span className="relative flex h-9 items-center gap-2 bg-[#0f0f12] px-5">
                      <img src="/assets/watch2gether/invite-btn.svg" alt="" width={16} height={16} />
                      <span className="text-[14px] leading-5 font-bold tracking-[0.35px] text-[#9ca3af]">INVITE</span>
                    </span>
                    <span className="absolute top-1 right-1 size-[3px] bg-white/30" />
                  </button>
                  )}
                  {isHost && !closed ? (
                    <button type="button" className="relative h-9 shrink-0 cursor-pointer" onClick={() => setConfirmEnd(true)}>
                      <span className="absolute -inset-px bg-[linear-gradient(158deg,rgba(255,255,255,0.15),rgba(255,255,255,0.02))]" />
                      <span className="relative flex h-9 items-center gap-2 bg-[#0f0f12] px-5">
                        <img src="/assets/watch2gether/end.svg" alt="" width={16} height={16} />
                        <span className="text-[14px] leading-5 font-bold tracking-[0.35px] text-[#e93748]">END</span>
                      </span>
                      <span className="absolute top-1 right-1 size-[3px] bg-white/30" />
                    </button>
                  ) : null}
                  {confirmEnd ? (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-4" onMouseDown={() => { if (!closing) setConfirmEnd(false); }}>
                      <div className="relative w-full max-w-[460px] overflow-hidden rounded-[14px] border border-white/10 bg-[#0b0d12] px-6 pt-8 pb-6 shadow-[0_24px_60px_rgba(0,0,0,0.65)]" onMouseDown={(event) => event.stopPropagation()}>
                        <span className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
                        <span className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full border border-[rgba(233,55,72,0.18)]" />
                        <span className="pointer-events-none absolute -top-6 -right-2 size-36 rounded-full border border-[rgba(233,55,72,0.28)]" />
                        <span className="pointer-events-none absolute top-8 right-10 size-16 rounded-full border border-[rgba(233,55,72,0.4)]" />
                        <div className="relative">
                          <h2 className="text-center text-[22px] leading-7 font-extrabold tracking-[-0.3px] text-white">დავასრულო ეს ოთახი?</h2>
                          <p className="mx-auto mt-3 max-w-[360px] text-center text-[14px] leading-[22px] text-[#9aa3b2]">ოთახი ყველასთვის დაიხურება და ამას უკან ვერ დააბრუნებ. მაყურებლები დაინახავენ, რომ სტრიმი დასრულდა.</p>
                          <div className="mt-7 flex gap-3">
                            <button type="button" className="relative h-11 flex-1 cursor-pointer rounded-[8px] border border-white/10 bg-[#171a22] text-[14px] font-semibold text-[#e5e7eb]" onClick={() => setConfirmEnd(false)}>
                              გააგრძელე ყურება
                              <span className="pointer-events-none absolute bottom-1.5 left-1.5 flex gap-[3px]">
                                <span className="size-[3px] rounded-full bg-white/35" />
                                <span className="size-[3px] rounded-full bg-white/35" />
                                <span className="size-[3px] rounded-full bg-white/35" />
                                <span className="size-[3px] rounded-full bg-white/25" />
                              </span>
                            </button>
                            <button type="button" disabled={closing} className="relative h-11 flex-1 cursor-pointer overflow-hidden text-[14px] font-bold text-white disabled:cursor-wait" onClick={() => void endRoom()}>
                              <span className="absolute inset-0 -skew-x-6 bg-[#e93748]" />
                              <span className="relative">{closing ? "..." : "დაასრულე სტრიმი"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
          <aside className="flex min-h-0 w-full flex-1 flex-col bg-[#07080c] min-[901px]:w-[340px] min-[901px]:flex-none min-[901px]:border-l min-[901px]:border-white/5">
            <div className="relative flex items-center justify-between bg-[#0a0b10] px-4 py-3">
              <span className="flex items-center gap-1.5 border-b-2 border-[#e93748] bg-gradient-to-b from-transparent to-[rgba(233,55,72,0.15)] px-3 py-1.5">
                <img src="/assets/watch2gether/chat.svg" alt="" width={14} height={14} />
                <span className="text-[11px] leading-[16.5px] font-bold tracking-[1.1px] text-[#e93748]">CHAT</span>
              </span>
              <span className="relative flex items-center gap-2 bg-black/50 px-3 py-1.5">
                <img src="/assets/watch2gether/count.svg" alt="" width={14} height={14} />
                <span className="text-[12px] leading-4 font-bold tracking-[-0.3px] text-[#e5e7eb]">{viewers}</span>
                <span className="pointer-events-none absolute inset-0 border border-white/10" />
              </span>
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <span className="pointer-events-none absolute bottom-0 left-0 h-px w-1/2 bg-gradient-to-r from-[rgba(233,55,72,0.5)] to-transparent" />
            </div>
            <div ref={box} className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-gradient-to-b from-transparent to-black/20 p-4">
              {messages.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center opacity-60">
                  <span className="mb-3 grid size-12 place-items-center rounded-full bg-white/5">
                    <img src="/assets/watch2gether/ghost.svg" alt="" width={24} height={24} />
                  </span>
                  <p className="text-[14px] leading-5 font-bold text-[#d1d5dc]">It&apos;s a ghost town in here</p>
                  <p className="mt-1 max-w-[200px] text-center text-[12px] leading-4 text-[#6a7282]">Be the first to say something.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {messages.map((message) => (
                    <div key={message.id} className="flex gap-2">
                      <span className="mt-0.5">
                        <Avatar src={message.avatar} frame={message.frame} size={24} />
                      </span>
                      <p className="min-w-0 text-[12px] leading-4">
                        <span className="font-bold text-[#e93748]">{message.name}</span>
                        <span className="block break-words whitespace-pre-wrap text-[#e5e7eb]">{message.body}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <form className="relative flex items-center gap-3 border-t border-white/5 bg-[#050608] p-4" onSubmit={(event) => { event.preventDefault(); void send(draft); }}>
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div ref={emojiBox} className="relative min-w-0 flex-1">
              {emojiOpen ? (
                <div className="absolute bottom-12 left-0 z-20 w-[calc(100%+52px)]">
                  <RoomEmojiPicker onPick={insertEmoji} />
                </div>
              ) : null}
              <label className="relative block">
                <input
                  ref={field}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="TRANSMIT MESSAGE..."
                  aria-label="შეტყობინება"
                  maxLength={500}
                  className="h-[38px] w-full border border-white/[0.08] bg-[#0d0e15] pr-10 pl-4 text-[12px] tracking-[0.3px] text-white outline-none placeholder:text-[#4a5565]"
                />
                <button type="button" className="absolute top-[11px] right-3 cursor-pointer" aria-label="ემოჯი" aria-expanded={emojiOpen} onClick={() => setEmojiOpen((open) => !open)}>
                  <img src="/assets/watch2gether/emoji.svg" alt="" width={16} height={16} />
                </button>
              </label>
              </div>
              <button type="submit" className="grid size-10 shrink-0 cursor-pointer place-items-center bg-white/5" aria-label="გაგზავნა">
                <img src="/assets/watch2gether/send.svg" alt="" width={16} height={16} />
              </button>
            </form>
          </aside>
        </div>
      </div>
    </div>
  );
}
