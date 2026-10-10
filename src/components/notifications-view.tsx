"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

export type InboxItem = {
  id: number;
  type: string;
  title: string;
  message: string;
  link?: string;
  icon?: string;
  read: boolean;
  createdAt: string;
};

const tabs = [
  { id: "community", label: "საზოგადოება" },
  { id: "anime", label: "ანიმე" },
  { id: "system", label: "სისტემა" },
] as const;

type Tab = (typeof tabs)[number]["id"];

const groups: Record<Tab, string[]> = {
  community: ["friend", "comment", "community"],
  anime: ["anime"],
  system: ["system"],
};

function groupOf(type: string): Tab {
  if (groups.community.includes(type)) return "community";
  if (type === "anime") return "anime";
  return "system";
}

function ago(value: string) {
  const then = new Date(value.replace(" ", "T"));
  const minutes = Math.max(0, Math.round((Date.now() - then.getTime()) / 60000));
  if (!Number.isFinite(minutes) || minutes < 1) return "ახლა";
  if (minutes < 60) return `${minutes} წუთის წინ`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} საათის წინ`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} დღის წინ`;
  return value.slice(0, 10);
}

function badge(type: string) {
  if (type === "anime") return "სერია";
  if (type === "friend") return "მეგობარი";
  if (type === "comment") return "კომენტარი";
  return "სისტემა";
}

export function NotificationsView({ items }: { items: InboxItem[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("community");
  const [rows, setRows] = useState(items);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const [leaving, setLeaving] = useState<number[]>([]);
  const [exitTab, setExitTab] = useState<Tab | null>(null);
  const [dir, setDir] = useState(1);
  const [lineFrom, setLineFrom] = useState(0);
  const [lineTo, setLineTo] = useState(0);
  const [stretched, setStretched] = useState(false);

  const index = tabs.findIndex((item) => item.id === tab);
  const visible = rows.filter((item) => groupOf(item.type) === tab);

  useEffect(() => {
    if (!stretched) return;
    const id = window.setTimeout(() => setStretched(false), 170);
    return () => window.clearTimeout(id);
  }, [stretched, lineTo]);

  useEffect(() => {
    if (!exitTab) return;
    const id = window.setTimeout(() => setExitTab(null), 340);
    return () => window.clearTimeout(id);
  }, [exitTab, tab]);

  function switchTab(next: Tab) {
    const nextIndex = tabs.findIndex((item) => item.id === next);
    if (nextIndex === index) return;
    setDir(nextIndex > index ? 1 : -1);
    setExitTab(tab);
    setLineFrom(index);
    setLineTo(nextIndex);
    setStretched(true);
    setTab(next);
    setSelecting(false);
    setPicked([]);
  }

  const pill = 52;
  const fromCenter = (lineFrom + 0.5) / 3;
  const toCenter = (lineTo + 0.5) / 3;
  const lineStyle: CSSProperties = stretched && lineFrom !== lineTo
    ? { left: `calc(${Math.min(fromCenter, toCenter) * 100}% - ${pill / 2}px)`, width: `calc(${Math.abs(toCenter - fromCenter) * 100}% + ${pill}px)` }
    : { left: `calc(${toCenter * 100}% - ${pill / 2}px)`, width: `${pill}px` };

  function toggle(id: number) {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function markRead() {
    const ids = visible.filter((item) => !item.read).map((item) => item.id);
    if (!ids.length) return;
    setRows((current) => current.map((item) => (ids.includes(item.id) ? { ...item, read: true } : item)));
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "read", types: groups[tab] }) });
  }

  async function remove() {
    if (!picked.length) return;
    const ids = picked;
    setLeaving(ids);
    window.setTimeout(() => {
      setRows((current) => current.filter((item) => !ids.includes(item.id)));
      setLeaving([]);
      setPicked([]);
      setSelecting(false);
    }, 180);
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", ids }) });
    router.refresh();
  }

  async function openItem(item: InboxItem) {
    if (selecting) return toggle(item.id);
    setRows((current) => current.map((row) => (row.id === item.id ? { ...row, read: true } : row)));
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "visit", id: item.id }) });
    if (item.link) window.location.href = item.link;
  }

  const allPicked = visible.length > 0 && visible.every((item) => picked.includes(item.id));

  function pane(which: Tab, live: boolean) {
    const list = rows.filter((item) => groupOf(item.type) === which);
    const fresh = list.filter((item) => !item.read).length;
    const label = tabs.find((item) => item.id === which)?.label ?? "";
    const copy = which === "community"
      ? ["საზოგადოებაში ახალი პასუხი ან ხსენება არ არის.", "people"]
      : which === "anime"
        ? ["შენს სიაში ახალი სერია ან განცხადება არ არის.", "tv"]
        : ["ანგარიში წესრიგშია. სისტემა მუშაობს.", "gear"];
    const showSelect = live && selecting;
    return (
      <>
        <div className="mb-3 flex min-h-8 items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-[1px] text-[#9ca3af] uppercase">{label}</span>
            {fresh ? <span className="rounded-full bg-[#e93748] px-1.5 py-0.5 text-[10px] font-bold text-white">{fresh} ახალი</span> : null}
          </div>
          {live ? (
            <div className="flex items-center gap-1 text-[11px] font-bold tracking-[0.6px] text-[#9ca3af] uppercase">
              {showSelect ? (
                <>
                  <button type="button" className="notif-check inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 hover:text-white" onClick={() => setPicked(allPicked ? [] : list.map((item) => item.id))}>
                    {allPicked ? "მონიშვნის მოხსნა" : "ყველას მონიშვნა"}
                  </button>
                  <button type="button" disabled={!picked.length} className="notif-check inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[#e93748] px-2.5 py-1 text-white disabled:cursor-default disabled:bg-white/8 disabled:text-[#6a7282]" onClick={remove}>
                    წაშლა{picked.length ? ` (${picked.length})` : ""}
                  </button>
                  <button type="button" className="grid size-7 cursor-pointer place-items-center rounded-md hover:bg-white/8 hover:text-white" aria-label="მონიშვნის დახურვა" onClick={() => { setSelecting(false); setPicked([]); }}>×</button>
                </>
              ) : (
                <>
                  <button type="button" className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:text-white disabled:cursor-default disabled:opacity-40" disabled={!fresh} onClick={markRead}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 5 5L20 7" /></svg>
                    ყველას წაკითხვა
                  </button>
                  <button type="button" className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:text-white disabled:cursor-default disabled:opacity-40" disabled={!list.length} onClick={() => setSelecting(true)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
                    მონიშვნა
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
        {list.length ? (
          <ul className="overflow-hidden rounded-xl border border-white/8 bg-[#0c0c0c]">
            {list.map((item) => {
              const on = live && picked.includes(item.id);
              return (
                <li key={item.id} className={`notif-row border-b border-white/6 last:border-b-0 ${live && leaving.includes(item.id) ? "is-leaving" : ""}`}>
                  <div className={`group relative flex items-start gap-3 px-3 py-3 transition-colors duration-200 ${on ? "bg-[#e93748]/8" : "hover:bg-white/[0.035]"}`}>
                    <span className={`absolute inset-y-3 left-0 w-0.5 rounded-full bg-[#e93748] transition-opacity duration-200 ${item.read ? "opacity-0" : "opacity-100"}`} />
                    <span className={`grid shrink-0 place-items-center overflow-hidden transition-all duration-200 ${showSelect ? "ml-1 w-5 opacity-100" : "w-0 opacity-0"}`}>
                      <button type="button" aria-pressed={on} aria-label="მონიშვნა" className={`grid size-4 cursor-pointer place-items-center rounded border transition-colors ${on ? "border-[#e93748] bg-[#e93748] text-white" : "border-white/30 text-transparent hover:border-white/60"}`} onClick={() => toggle(item.id)}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 5 5L20 7" /></svg>
                      </button>
                    </span>
                    <button type="button" className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left" onClick={() => openItem(item)}>
                      {item.icon ? <img src={item.icon} alt="" className="size-12 shrink-0 rounded-md object-cover" /> : <span className="grid size-12 shrink-0 place-items-center rounded-md bg-white/6 text-[#9ca3af]"><TabIcon name={groupOf(item.type)} /></span>}
                      <span className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold tracking-[0.7px] text-[#e93748] uppercase">{badge(item.type)}</span>
                        {item.title && item.message && item.title !== item.message ? (
                          <>
                            <span className="mt-0.5 block text-sm font-semibold break-words text-white">{item.title}</span>
                            <span className="mt-1 block text-[13px] leading-5 break-words whitespace-pre-line text-[#9f9fa9]">{item.message}</span>
                          </>
                        ) : (
                          <span className="mt-0.5 block text-sm font-semibold break-words whitespace-pre-line text-white">{item.message || item.title}</span>
                        )}
                      </span>
                    </button>
                    <span className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="text-[11px] text-[#6a7282]">{ago(item.createdAt)}</span>
                      {item.link && !showSelect ? (
                        <a href={item.link} className="inline-flex h-7 items-center rounded-md border border-white/10 px-2.5 text-xs font-semibold text-[#c4c4c4] transition duration-200 group-hover:border-[#e93748] group-hover:bg-[#e93748] group-hover:text-white">ნახვა</a>
                      ) : null}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="grid min-h-[280px] place-items-center rounded-xl border border-white/8 bg-[#0c0c0c] px-6 text-center">
            <div className="notif-empty">
              <span className="mx-auto grid size-12 place-items-center rounded-xl border border-[#e93748]/35 bg-[#e93748]/10 text-[#e93748]">
                <EmptyIcon name={copy[1]} />
              </span>
              <p className="mt-4 text-base font-bold">ყველაფერი წაკითხულია</p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#9ca3af]">{copy[0]}</p>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="rise min-h-[70vh] bg-[#070707] px-4 pt-28 pb-16 text-white">
      <div className="mx-auto w-full max-w-[860px]">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-[-0.8px]">შეტყობინებები</h1>
          <p className="mt-2 text-sm text-[#9ca3af]">თვალი ადევნე საზოგადოებას და ანიმეს</p>
        </div>
        <div className="relative mt-8 grid grid-cols-3 border-b border-white/10">
          {tabs.map((item) => (
            <button key={item.id} type="button" className={`relative z-10 flex h-12 cursor-pointer items-center justify-center gap-2 text-sm font-semibold transition-colors duration-200 ${tab === item.id ? "text-[#e93748]" : "text-[#8b919a] hover:bg-white/[0.03] hover:text-white"}`} onClick={() => switchTab(item.id)}>
              <TabIcon name={item.id} />
              {item.label}
            </button>
          ))}
          <span className="notif-line pointer-events-none absolute bottom-0 h-0.5 rounded-full bg-[#e93748]" style={lineStyle} />
        </div>

        <div className="relative mt-4 overflow-hidden">
          {exitTab ? <div className="notif-leave" style={{ "--dir": dir } as CSSProperties}>{pane(exitTab, false)}</div> : null}
          <div key={tab} className={exitTab ? "notif-enter" : ""} style={{ "--dir": dir } as CSSProperties}>{pane(tab, true)}</div>
        </div>
      </div>
    </div>
  );
}

function TabIcon({ name }: { name: Tab }) {
  if (name === "community") return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="2.6" /><circle cx="16" cy="9" r="2" /><path d="M4.5 18c.8-2.2 2.4-3.3 4.5-3.3s3.7 1.1 4.5 3.3M14.2 14.8c1.2-.2 2.3.2 3.2 1.2" /></svg>;
  if (name === "anime") return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="m10 9 5 3-5 3z" /></svg>;
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" /></svg>;
}

function EmptyIcon({ name }: { name: string }) {
  if (name === "people") return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3" /><path d="M5.5 19c1.2-2.6 3.2-4 6.5-4s5.3 1.4 6.5 4" /></svg>;
  if (name === "tv") return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="m10 9 5 3-5 3z" /></svg>;
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" /></svg>;
}
