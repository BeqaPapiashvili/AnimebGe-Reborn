"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Avatar as UserAvatar } from "@/components/avatar";
import type { FriendCard, FriendsPageData } from "@/lib/friends-types";

const tabs = [
  { id: "friends", label: "მეგობრები" },
  { id: "requests", label: "მოთხოვნები" },
  { id: "notices", label: "შეტყობინებები" },
  { id: "blocked", label: "დაბლოკილები" },
] as const;

type Tab = (typeof tabs)[number]["id"];

export function FriendsView({ page, tab }: { page: FriendsPageData; tab: Tab }) {
  const router = useRouter();
  const [current, setCurrent] = useState<Tab>(tab);
  const [name, setName] = useState("");
  const [hints, setHints] = useState<FriendCard[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<FriendCard | null>(null);

  useEffect(() => setCurrent(tab), [tab]);

  useEffect(() => {
    const q = name.trim();
    if (q.length < 1) {
      setHints([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/friends?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data = (await res.json()) as { items: FriendCard[] };
        setHints(data.items ?? []);
        setOpen(true);
      } catch {}
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [name]);

  useEffect(() => {
    if (current !== "notices") return;
    fetch("/api/friends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "read" }) }).catch(() => {});
  }, [current]);

  function pick(next: Tab) {
    setCurrent(next);
    router.replace(next === "friends" ? "/friends" : `/friends?tab=${next}`, { scroll: false });
  }

  async function act(action: string, payload: { name?: string; id?: number }) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/friends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!res.ok) {
      setError(data?.error || "მოქმედება ვერ შესრულდა");
      return;
    }
    setName("");
    setHints([]);
    setOpen(false);
    router.refresh();
  }

  const requestCount = page.incoming.length;

  return (
    <div className="rise min-h-[70vh] bg-[#070707] px-4 pt-28 pb-16 text-white">
      <div className="mx-auto w-full max-w-[760px] text-center">
        <h1 className="text-4xl font-extrabold tracking-[-0.8px]">მეგობრები</h1>
        <p className="mt-2 text-sm text-[#9ca3af]">{page.friends.length} / {page.limit} მეგობარი</p>
        <div className="mt-6 flex justify-center gap-6 border-b border-white/8 text-sm">
          {tabs.map((item) => (
            <button key={item.id} type="button" className={`relative cursor-pointer pb-3 font-semibold transition-colors ${current === item.id ? "text-white" : "text-[#9ca3af] hover:text-white"}`} onClick={() => pick(item.id)}>
              {item.label}
              {item.id === "requests" && requestCount ? <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e93748] px-1 text-[10px] text-white">{requestCount}</span> : null}
              <span className={`absolute inset-x-0 -bottom-px h-0.5 origin-center bg-[#e93748] transition-transform duration-200 ${current === item.id ? "scale-x-100" : "scale-x-0"}`} />
            </button>
          ))}
        </div>

        {current === "friends" ? (
          <form className="mx-auto mt-8 max-w-[520px]" onSubmit={(event) => { event.preventDefault(); if (name.trim()) act("request", { name }); }}>
            <div className="relative flex gap-2">
              <label className="relative min-w-0 flex-1">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute top-1/2 left-3 -translate-y-1/2 text-[#6a7282]"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
                <input value={name} onChange={(event) => setName(event.target.value)} onFocus={() => hints.length && setOpen(true)} placeholder="მომხმარებლის სახელი" aria-label="მომხმარებლის სახელი" className="h-11 w-full rounded-lg border border-white/8 bg-[#14141a] pr-3 pl-9 text-sm text-white outline-none placeholder:text-[#6a7282]" />
              </label>
              <button type="submit" disabled={busy || !name.trim()} className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-[#e93748] px-4 text-sm font-semibold text-white disabled:cursor-default disabled:opacity-50">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4z" /></svg>
                გაგზავნა
              </button>
              {open && hints.length ? (
                <div className="filter-pop absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-lg border border-white/8 bg-[#101014] text-left shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
                  {hints.map((item) => (
                    <button key={item.id} type="button" className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left hover:bg-white/5" onClick={() => act("request", { name: item.name })}>
                      <Avatar card={item} />
                      <span className="truncate text-sm">{item.name}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-[#6a7282]">ჩაწერე სახელი და დააჭირე Enter-ს, ან აირჩიე შემოთავაზება.</p>
            {error ? <p className="mt-2 text-sm text-[#e93748]">{error}</p> : null}
          </form>
        ) : null}

        <div className="mx-auto mt-10 max-w-[560px] text-left">
          {current === "friends" ? <People items={page.friends} empty="ჯერ მეგობრები არ გყავს" hint="დაამატე ვინმე სახელით. ამას სხვას არ ვეტყვით." actions={(item) => (
            <>
              <TextButton onClick={() => setConfirm(item)}>წაშლა</TextButton>
              <TextButton onClick={() => act("block", { id: item.id })}>დაბლოკვა</TextButton>
            </>
          )} /> : null}
          {current === "requests" ? (
            <div className="space-y-8">
              <People items={page.incoming} title="შემოსული" empty="შემოსული მოთხოვნა არ არის" actions={(item) => (
                <>
                  <button type="button" className="h-8 cursor-pointer rounded-md bg-[#e93748] px-3 text-xs font-semibold text-white" onClick={() => act("accept", { id: item.id })}>მიღება</button>
                  <TextButton onClick={() => act("decline", { id: item.id })}>უარყოფა</TextButton>
                </>
              )} />
              <People items={page.outgoing} title="გაგზავნილი" empty="გაგზავნილი მოთხოვნა არ არის" actions={(item) => <TextButton onClick={() => act("cancel", { id: item.id })}>გაუქმება</TextButton>} />
            </div>
          ) : null}
          {current === "notices" ? (
            page.notices.length ? (
              <ul className="divide-y divide-white/6 rounded-xl border border-white/8 bg-[#0c0c0c]">
                {page.notices.map((item) => (
                  <li key={item.id} className="px-4 py-3">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm text-[#c4c4c4]">{item.message}</p>
                  </li>
                ))}
              </ul>
            ) : <Empty title="შეტყობინება არ არის" hint="მეგობრობის მოთხოვნები აქ გამოჩნდება." />
          ) : null}
          {current === "blocked" ? <People items={page.blocked} empty="დაბლოკილი მომხმარებელი არ არის" actions={(item) => <TextButton onClick={() => act("unblock", { id: item.id })}>განბლოკვა</TextButton>} /> : null}
        </div>
      </div>
      {confirm ? (
        <div className="fixed inset-0 z-[80] grid place-items-center px-4">
          <button type="button" className="absolute inset-0 cursor-default bg-black/70" aria-label="დახურვა" onClick={() => setConfirm(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#101114] p-6 text-center shadow-[0_30px_80px_rgba(0,0,0,0.65)]" role="dialog" aria-labelledby="remove-friend-title">
            <h2 id="remove-friend-title" className="text-lg font-bold">მეგობრის წაშლა</h2>
            <p className="mt-2 text-sm leading-6 text-[#c4c4c4]"><b className="font-semibold text-white">{confirm.name}</b> მეგობრებიდან წაიშალოს?</p>
            <div className="mt-6 flex justify-center gap-2">
              <button type="button" className="h-10 cursor-pointer rounded-md border border-white/15 px-4 text-sm font-semibold text-white" onClick={() => setConfirm(null)}>გაუქმება</button>
              <button type="button" disabled={busy} className="h-10 cursor-pointer rounded-md bg-[#e93748] px-4 text-sm font-semibold text-white disabled:opacity-60" onClick={() => { const id = confirm.id; setConfirm(null); act("remove", { id }); }}>წაშლა</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function People({ items, title, empty, hint, actions }: { items: FriendCard[]; title?: string; empty: string; hint?: string; actions: (item: FriendCard) => ReactNode }) {
  return (
    <section>
      {title ? <h2 className="mb-3 text-xs font-bold tracking-[0.8px] text-[#9ca3af] uppercase">{title}</h2> : null}
      {items.length ? (
        <ul className="divide-y divide-white/6 rounded-xl border border-white/8 bg-[#0c0c0c]">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
              <a href={`/@${encodeURIComponent(item.name)}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar card={item} />
                <span className="truncate text-sm font-semibold">{item.name}</span>
              </a>
              <span className="flex shrink-0 items-center gap-2">{actions(item)}</span>
            </li>
          ))}
        </ul>
      ) : title ? <p className="text-sm text-[#6a7282]">{empty}</p> : <Empty title={empty} hint={hint} />}
    </section>
  );
}

function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-6 py-16 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full border border-white/10 text-[#9ca3af]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="3.2" /><path d="M5.2 19.2c1.5-3.1 3.7-4.5 6.8-4.5s5.3 1.4 6.8 4.5" /></svg>
      </span>
      <p className="mt-4 text-base font-bold">{title}</p>
      {hint ? <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#9ca3af]">{hint}</p> : null}
    </div>
  );
}

function Avatar({ card }: { card: FriendCard }) {
  return <UserAvatar src={card.avatar} frame={card.frame} size={40} />;
}

function TextButton({ children, onClick }: { children: string; onClick: () => void }) {
  return <button type="button" className="cursor-pointer text-xs font-semibold text-[#9ca3af] hover:text-white" onClick={onClick}>{children}</button>;
}
