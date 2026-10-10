"use client";

import { useEffect, useRef, useState } from "react";

type Notice = {
  id: number;
  title: string;
  message: string;
  link?: string;
  icon?: string;
  visited: boolean;
  createdAt: string;
};

function ago(value: string) {
  const then = new Date(value.replace(" ", "T"));
  const minutes = Math.max(0, Math.round((Date.now() - then.getTime()) / 60000));
  if (!Number.isFinite(minutes) || minutes < 1) return "ახლა";
  if (minutes < 60) return `${minutes} წთ`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} სთ`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} დღე`;
  return value.slice(0, 10);
}

const SHOWN_KEY = "ab-notice-shown";
const FRESH_MS = 7 * 24 * 60 * 60 * 1000;

function shownId() {
  try {
    const value = Number(localStorage.getItem(SHOWN_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function freshNotices(items: Notice[]) {
  const last = shownId();
  const top = items.reduce((max, item) => Math.max(max, item.id), last ?? 0);
  try {
    localStorage.setItem(SHOWN_KEY, String(top));
  } catch {}
  return items.filter((item) => {
    if (item.visited) return false;
    if (last !== null) return item.id > last;
    const raw = item.createdAt.replace(" ", "T");
    const at = new Date(/(Z|[+-]\d\d:?\d\d)$/.test(raw) ? raw : `${raw}Z`).getTime();
    return Number.isFinite(at) && Date.now() - at < FRESH_MS;
  });
}

export function Notifications() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Notice[]>([]);
  const [popup, setPopup] = useState<{ item: Notice; more: number } | null>(null);
  const seen = useRef<number | null>(null);
  const allowPush = useRef<boolean | null>(null);

  useEffect(() => {
    if (!popup) return;
    const timer = window.setTimeout(() => setPopup(null), 9000);
    return () => window.clearTimeout(timer);
  }, [popup]);

  async function load() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = (await res.json()) as { count?: number; items?: Notice[] };
    const next = Number(data.count) || 0;
    const incoming = freshNotices(data.items ?? []);
    if (incoming.length) setPopup({ item: incoming[0], more: incoming.length - 1 });
    if (allowPush.current === null) {
      const prefs = await fetch("/api/settings/me").then((item) => item.json()).catch(() => null) as { prefs?: { push?: boolean } } | null;
      allowPush.current = prefs?.prefs?.push !== false;
    }
    if (seen.current !== null && next > seen.current && allowPush.current && document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
      const fresh = data.items?.[0];
      new Notification(fresh?.title || "Animeb", { body: fresh?.message || "ახალი შეტყობინება" });
    }
    seen.current = next;
    setCount(next);
    setItems(data.items ?? []);
  }

  useEffect(() => {
    function onOpen() {
      setOpen(true);
      setCount(0);
      void fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "read" }) }).then(() => load());
    }
    window.addEventListener("animeb-open-notifications", onOpen);
    return () => window.removeEventListener("animeb-open-notifications", onOpen);
  }, []);

  useEffect(() => {
    if (open) return;
    const timer = window.setTimeout(() => void load(), 0);
    const id = window.setInterval(() => void load(), 20000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(id);
    };
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setCount(0);
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "read" }) });
    await load();
    setCount(0);
  }

  async function openItem(item: Notice) {
    setItems((current) => current.map((notice) => (notice.id === item.id ? { ...notice, visited: true } : notice)));
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "visit", id: item.id }) });
    if (item.link) window.location.href = item.link;
  }

  function openPopup() {
    if (!popup) return;
    const { item, more } = popup;
    setPopup(null);
    if (more > 0) {
      void toggle();
      return;
    }
    void openItem(item);
  }

  return (
    <div className="relative">
      {popup ? (
        <div className="fixed top-20 right-4 z-[95] w-[360px] max-w-[calc(100vw-32px)] animate-[notice-in_0.35s_ease-out] overflow-hidden rounded-[14px] bg-[#18181b] shadow-[0_24px_60px_rgba(0,0,0,0.6)]" role="status">
          <span className="absolute inset-y-0 left-0 w-[3px] bg-[#e93748]" />
          <button type="button" className="flex w-full cursor-pointer items-start gap-3 p-4 pr-10 text-left hover:bg-white/[0.03]" onClick={openPopup}>
            {popup.item.icon ? <img src={popup.item.icon} alt="" className="size-11 shrink-0 rounded-lg object-cover" /> : <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[#e93748] text-white"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" /><path d="M10 20a2 2 0 0 0 4 0" /></svg></span>}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-white">{popup.item.title || "შეტყობინება"}</span>
              {popup.item.message ? <span className="mt-1 block text-xs leading-[18px] break-words whitespace-pre-line text-[#9f9fa9]">{popup.item.message}</span> : null}
              {popup.more > 0 ? <span className="mt-2 block text-[11px] font-semibold text-[#ff8a95]">+{popup.more} სხვა შეტყობინება</span> : null}
            </span>
          </button>
          <button type="button" className="absolute top-3 right-3 grid size-7 cursor-pointer place-items-center rounded-full text-white/40 hover:bg-white/5 hover:text-white" aria-label="დახურვა" onClick={() => setPopup(null)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
      ) : null}
      <button type="button" className="relative grid h-9 w-11 cursor-pointer place-items-center text-[#d1d5dc] hover:text-white" aria-label="შეტყობინებები" aria-expanded={open} onClick={toggle}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
        {count > 0 ? (
          <span className="absolute top-0.5 right-0.5 grid min-w-[18px] place-items-center rounded-full bg-[#e93748] px-1 text-[10px] leading-[18px] font-bold text-white">{count > 99 ? "99+" : count}</span>
        ) : null}
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="შეტყობინებების დახურვა" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 z-20 mt-2 w-[340px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[12px] border border-white/10 bg-[#0a0a0a] shadow-[0_24px_60px_rgba(0,0,0,0.65)]" role="dialog" aria-label="შეტყობინებები">
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <p className="text-sm font-semibold text-white">შეტყობინებები</p>
              <a href="/notifications" className="text-xs font-bold text-[#e93748]" onClick={() => setOpen(false)}>ყველა</a>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {items.length ? items.map((item) => (
                <button key={item.id} type="button" className={`flex w-full cursor-pointer items-start gap-3 border-b border-white/6 px-3 py-3 text-left hover:bg-white/4 ${item.visited ? "" : "bg-[#e93748]/8"}`} onClick={() => openItem(item)}>
                  {item.icon ? <img src={item.icon} alt="" className="size-11 shrink-0 rounded-lg object-cover" /> : <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[#e93748] text-white"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" /><path d="M10 20a2 2 0 0 0 4 0" /></svg></span>}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 text-sm font-semibold break-words text-white">{item.title || "შეტყობინება"}</span>
                      {item.visited ? null : <span className="size-1.5 shrink-0 rounded-full bg-[#e93748]" />}
                    </span>
                    {item.message ? <span className="mt-0.5 block text-xs leading-[18px] break-words whitespace-pre-line text-[#9f9fa9]">{item.message}</span> : null}
                    <span className="mt-1 block text-[11px] text-[#71717b]">{ago(item.createdAt)}</span>
                  </span>
                </button>
              )) : <p className="px-4 py-8 text-center text-sm text-[#71717b]">შეტყობინება არ არის</p>}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
