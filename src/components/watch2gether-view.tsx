"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/avatar";
import type { WatchRoomCard } from "@/lib/watch-room-types";

const tabs = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "waiting", label: "Waiting" },
  { id: "ended", label: "Ended" },
  { id: "friends", label: "Friends' Rooms" },
  { id: "mine", label: "My Rooms" },
] as const;

type Tab = (typeof tabs)[number]["id"];

const pageSize = 12;

function createdAgo(value: string) {
  const then = new Date(value.replace(" ", "T")).getTime();
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (!Number.isFinite(minutes) || minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function Watch2GetherView({
  viewerId,
  rooms,
  friendIds,
}: {
  viewerId?: number;
  rooms: WatchRoomCard[];
  friendIds: number[];
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const friends = useMemo(() => new Set(friendIds), [friendIds]);
  const filtered = useMemo(() => {
    return rooms.filter((room) => {
      if (tab === "live" || tab === "waiting" || tab === "ended") return room.status === tab;
      if (tab === "mine") return viewerId != null && room.hostId === viewerId;
      if (tab === "friends") return friends.has(room.hostId);
      return true;
    });
  }, [rooms, tab, viewerId, friends]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const slice = filtered.slice((current - 1) * pageSize, current * pageSize);

  return (
    <div className="rise min-h-screen bg-[#06070a] text-white">
      <div className="relative h-[176px] overflow-hidden bg-[#0a0b10]">
        <div className="absolute inset-x-0 bottom-0 h-[240px] bg-gradient-to-t from-[#06070a] via-[#06070a]/70 to-[#06070a]/30" />
        <div className="absolute inset-x-0 bottom-6 flex items-end justify-center px-8">
          <h1 className="flex items-center gap-[10px] text-[36px] leading-10 font-extrabold tracking-[-0.9px]">
            <img src="/assets/watch2gether/users.svg" alt="" width={32} height={32} />
            Watch2Gether
          </h1>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1280px] px-4 pt-6 pb-12">
        <div className="relative flex h-8 items-start justify-center gap-6 overflow-hidden border-b border-white/[0.07]">
          {tabs.map((item) => (
            <button key={item.id} type="button" onClick={() => { setTab(item.id); setPage(1); }} className={`relative h-full pb-[11px] text-[13.6px] leading-5 font-semibold ${tab === item.id ? "text-[#e93748]" : "text-[#8b929e]"}`}>
              {item.label}
              {tab === item.id && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#e93748] shadow-[0_0_8px_rgba(233,55,72,0.55)]" />}
            </button>
          ))}
        </div>

        {slice.length === 0 ? (
          <p className="py-16 text-center text-[14px] text-[#8b929e]">No rooms in this list.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {slice.map((room) => {
              const minutes = Math.max(0, Math.round(room.position / 60));
              const href = `/watch2gether/${room.code}`;
              const badge = room.status === "live" ? "LIVE" : room.status === "waiting" ? "WAIT" : "END";
              return (
                <a key={room.code} href={href} className="overflow-hidden rounded-[12px] border border-white/[0.06] bg-[#0d0e15]">
                  <div className="relative h-[123px] overflow-hidden bg-[radial-gradient(circle_at_100%_0%,rgba(233,55,72,0.1),transparent_55%)]">
                    <div className="flex h-full gap-[14px] p-[14px]">
                      <div className="h-24 w-16 shrink-0 overflow-hidden rounded-[7px] border border-white/[0.08] bg-[#101219] shadow-[0_6px_16px_rgba(0,0,0,0.5)]">
                        {room.poster ? <img src={room.poster} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center gap-[5px] px-[10px] py-[3px] text-[10px] font-extrabold tracking-[0.08em] ${room.status === "live" ? "bg-[#e93748] text-white" : "bg-white/10 text-[#9ca3af]"}`}>
                            <span className={`size-[5px] rounded-full ${room.status === "live" ? "bg-white" : "bg-[#9ca3af]"}`} />
                            {badge}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#9ca3af]">
                            <img src="/assets/watch2gether/viewers.svg" alt="" width={12} height={12} />
                            1
                          </span>
                        </div>
                        <h3 className="mt-1 line-clamp-2 text-[15.2px] leading-[18px] font-extrabold">{room.title || "Waiting for an anime"}</h3>
                        <p className="mt-1.5 text-[11.5px] font-medium text-[#9ca3af]">
                          EP {room.episode || 1} <span className="text-[#4b5563]">·</span> {minutes}m
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-[10px] border-t border-white/[0.05] bg-[#0a0b10] px-[14px] py-[10px]">
                    <span className="grid size-[30px] shrink-0 place-items-center">
                      {room.avatar || room.frame ? <Avatar src={room.avatar} frame={room.frame} size={30} /> : <span className="grid size-full place-items-center rounded-[7px] border border-white/[0.08] bg-[#16181f]"><img src="/assets/watch2gether/user.svg" alt="" width={14} height={14} /></span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] leading-4 font-bold text-[#e5e7eb]">{room.host}</span>
                      <span className="block text-[10px] leading-3 text-[#6b7280]">Created · {createdAgo(room.updated)}</span>
                    </span>
                    <span className="text-[11.5px] font-bold text-[#6b7280]">Join →</span>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {pages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-1.5">
            <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)} className="min-w-[35px] rounded-[6px] bg-white/[0.04] px-[10px] py-1.5 text-[12.8px] font-semibold text-[#9ca3af] disabled:opacity-40">Prev</button>
            {Array.from({ length: pages }, (_, index) => index + 1).slice(0, 8).map((number) => (
              <button key={number} type="button" onClick={() => setPage(number)} className={`min-w-[35px] rounded-[6px] px-[10px] py-1.5 text-[12.8px] font-semibold ${number === current ? "bg-[#e93748] text-white" : "bg-white/[0.04] text-[#9ca3af]"}`}>{number}</button>
            ))}
            <button type="button" disabled={current === pages} onClick={() => setPage(current + 1)} className="min-w-[35px] rounded-[6px] bg-white/[0.04] px-[10px] py-1.5 text-[12.8px] font-semibold text-[#9ca3af] disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
