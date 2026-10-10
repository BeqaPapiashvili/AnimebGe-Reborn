"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Friend = { id: number; name: string; avatar?: string };
type Kind = "public" | "link" | "friends";

function Diamond({ on }: { on: boolean }) {
  return (
    <span className="relative size-[10px] shrink-0">
      <span className={`absolute top-1/2 left-1/2 size-[10px] -translate-x-1/2 -translate-y-1/2 rotate-45 border ${on ? "border-[#e93748] bg-[#b42332]" : "border-white/30"}`} />
    </span>
  );
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`relative flex min-w-0 flex-1 items-center gap-2.5 border px-3.5 py-[11px] text-left ${on ? "border-[rgba(233,55,72,0.45)] bg-[rgba(233,55,72,0.12)]" : "border-white/[0.08] bg-[#0a0b10]"}`}>
      {on ? <span className="absolute inset-y-0 left-0 w-[3px] bg-[#e93748]" /> : null}
      <Diamond on={on} />
      {children}
    </button>
  );
}

export function Watch2GetherCreate({
  title,
  original,
  poster,
  episode,
  slug,
  position,
  onClose,
}: {
  title: string;
  original?: string;
  poster?: string;
  episode: number;
  slug: string;
  position: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(title);
  const [kind, setKind] = useState<Kind>("public");
  const [when, setWhen] = useState<"now" | "later">("now");
  const [at, setAt] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function loadFriends() {
    setInviteOpen((open) => !open);
    if (friends) return;
    const res = await fetch("/api/friends?mine=1");
    const data = (await res.json().catch(() => null)) as { items?: Friend[] } | null;
    setFriends(data?.items ?? []);
  }

  async function create() {
    const roomTitle = name.trim();
    if (!roomTitle || busy) return;
    if (when === "later" && !at) return setError("აირჩიე დრო.");
    setBusy(true);
    setError("");
    const res = await fetch("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        title: roomTitle,
        visibility: kind,
        voice: false,
        startsAt: when === "later" ? new Date(at).toISOString() : null,
        invite: picked,
        slug,
        episode,
        position: Math.floor(position),
      }),
    });
    const data = (await res.json().catch(() => null)) as { code?: string; error?: string } | null;
    if (!data?.code) {
      setBusy(false);
      setError(data?.error ?? "ოთახი ვერ შეიქმნა.");
      return;
    }
    router.push(`/watch2gether/${data.code}`);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8" onMouseDown={onClose}>
      <div
        className="relative my-auto w-full max-w-[478px] overflow-hidden rounded-[14px] border border-white/[0.06] bg-black text-white shadow-[0_24px_48px_rgba(0,0,0,0.8),0_4px_12px_rgba(0,0,0,0.5)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,rgba(233,55,72,0),rgba(233,55,72,0.55)_20%,#e93748_50%,rgba(233,55,72,0.55)_80%,rgba(233,55,72,0))]" />
        <button type="button" className="absolute top-3.5 right-3.5 grid size-9 place-items-center rounded-[8px]" aria-label="დახურვა" onClick={onClose}>
          <img src="/assets/watch2gether/close.svg" alt="" width={20} height={20} />
        </button>
        <div className="max-h-[calc(100vh-64px)] overflow-y-auto">
          <div className="border-b border-white/[0.07] px-7 pt-6 pb-4">
            <p className="text-[10px] leading-[15px] font-bold tracking-[2.8px] text-[#e93748] uppercase">ერთად ყურება</p>
            <h2 className="pt-1.5 text-[21px] leading-[27.3px] font-bold">ოთახის შექმნა</h2>
            <p className="pt-1 text-[13px] leading-[18.2px] text-[#8b929e]">გახსენი ოთახი და მეგობრებთან ერთად უყურე.</p>
            <span className="mt-3 block h-0.5 w-[72px] -skew-x-8 bg-[linear-gradient(90deg,#e93748_0_47%,transparent_47%_57%,rgba(233,55,72,0.55)_57%_68%,transparent_68%_78%,rgba(233,55,72,0.28)_78%_86%,transparent_86%)]" />
          </div>
          <div className="border-b border-white/[0.06] bg-[#08090d]">
            <div className="relative flex h-[232px] flex-col items-center justify-end overflow-hidden bg-[radial-gradient(circle_at_center,rgba(6,7,11,0.2),rgba(6,7,11,0.88))] pb-3">
              {poster ? <img src={poster} alt="" className="pointer-events-none absolute -inset-7 h-[260px] w-[calc(100%+56px)] object-cover opacity-30 blur-[11px]" /> : null}
              <div className="relative mb-3 h-[155px] w-[116px] overflow-hidden rounded-[6px] border border-white/14 shadow-[0_10px_26px_rgba(0,0,0,0.65)]">
                {poster ? <img src={poster} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <h3 className="relative max-w-[280px] truncate text-center text-[15px] leading-[19.5px] font-semibold">{title}</h3>
              {original ? <p className="relative max-w-[280px] truncate pt-[3px] text-center text-[12px] leading-[16.8px] text-[#9ca3af]">{original}</p> : null}
              <span className="absolute bottom-[14px] left-3.5 flex h-[28.5px] items-center gap-1.5 border border-[rgba(233,55,72,0.35)] bg-[#08090d]/92 px-[11px]">
                <img src="/assets/watch2gether/ep-eye.svg" alt="" width={14} height={14} />
                <span className="text-[11px] leading-[16.5px] font-bold tracking-[0.88px] text-[#e93748]">ეპ {episode}</span>
              </span>
            </div>
          </div>
          <form className="flex flex-col gap-[22px] px-7 pt-[22px] pb-7" onSubmit={(event) => { event.preventDefault(); void create(); }}>
            <label className="flex flex-col gap-2">
              <span className="text-[11px] leading-[16.5px] font-semibold tracking-[1.54px] text-[#aab0bc] uppercase">სახელი</span>
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={255} className="h-12 rounded-[10px] border border-white/[0.08] bg-[#0a0b10] px-3.5 text-[14px] leading-6 outline-none" />
            </label>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] leading-[16.5px] font-semibold tracking-[1.54px] text-[#aab0bc] uppercase">ვინ შევა</span>
              <div className="flex gap-3">
                {([["public", "საჯარო"], ["link", "ბმულით"], ["friends", "მეგობრები"]] as const).map(([id, label]) => (
                  <Choice key={id} on={kind === id} onClick={() => setKind(id)}>
                    <span className={`text-[14px] leading-[21px] font-medium ${kind === id ? "text-[#e93748]" : "text-[#e5e7eb]"}`}>{label}</span>
                  </Choice>
                ))}
              </div>
              <button type="button" className="mt-1 flex h-[42px] w-full items-center gap-2.5 border border-white/[0.08] bg-[#0a0b10] px-3.5" onClick={() => void loadFriends()}>
                <img src="/assets/watch2gether/invite.svg" alt="" width={16} height={16} />
                <span className="flex-1 text-left text-[14px] leading-[21px] font-medium text-[#aab0bc]">მეგობრების მოწვევა{picked.length ? ` (${picked.length})` : ""}</span>
                <img src="/assets/watch2gether/chevron.svg" alt="" width={16} height={16} className={inviteOpen ? "rotate-180" : ""} />
              </button>
              {inviteOpen ? (
                <div className="max-h-40 overflow-y-auto border border-white/[0.08] bg-[#0a0b10]">
                  {friends === null ? <p className="px-3.5 py-2 text-[13px] text-[#8b929e]">...</p> : friends.length === 0 ? <p className="px-3.5 py-2 text-[13px] text-[#8b929e]">მეგობრები არ გყავს.</p> : friends.map((friend) => (
                    <label key={friend.id} className="flex cursor-pointer items-center gap-2.5 px-3.5 py-2 text-[14px]">
                      <input type="checkbox" checked={picked.includes(friend.id)} onChange={() => setPicked((list) => list.includes(friend.id) ? list.filter((id) => id !== friend.id) : [...list, friend.id])} />
                      <span className="truncate">{friend.name}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] leading-[16.5px] font-semibold tracking-[1.54px] text-[#aab0bc] uppercase">დაწყება</span>
              <div className="flex gap-3">
                <Choice on={when === "now"} onClick={() => setWhen("now")}>
                  <span>
                    <span className={`block text-[14px] leading-[21px] font-medium ${when === "now" ? "text-[#e93748]" : "text-[#e5e7eb]"}`}>ახლა</span>
                    <span className={`block text-[12px] leading-[15.6px] ${when === "now" ? "text-[#d1d5db]" : "text-[#8b929e]"}`}>მაშინვე იწყება</span>
                  </span>
                </Choice>
                <Choice on={when === "later"} onClick={() => setWhen("later")}>
                  <span>
                    <span className={`block text-[14px] leading-[21px] font-medium ${when === "later" ? "text-[#e93748]" : "text-[#e5e7eb]"}`}>მერე</span>
                    <span className={`block text-[12px] leading-[15.6px] ${when === "later" ? "text-[#d1d5db]" : "text-[#8b929e]"}`}>დრო აირჩიე</span>
                  </span>
                </Choice>
              </div>
              {when === "later" ? <input type="datetime-local" value={at} onChange={(event) => setAt(event.target.value)} className="h-12 border border-white/[0.08] bg-[#0a0b10] px-3.5 text-[14px] outline-none" /> : null}
            </div>
            <div className="rounded-[10px] border border-white/[0.07] bg-[#08090d] px-4 py-3.5">
              <p className="text-[11px] leading-[16.5px] font-bold tracking-[1.98px] text-[#aab0bc] uppercase">ოთახში</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-2 pt-3">
                {[["feat-sync", "ერთად გადახვევა"], ["feat-chat", "ჩატი"], ["feat-viewers", "რამდენიმე მაყურებელი"], ["feat-host", "მასპინძლის კონტროლი"]].map(([icon, label]) => (
                  <span key={icon} className="flex items-center gap-2">
                    <img src={`/assets/watch2gether/${icon}.svg`} alt="" width={15} height={15} />
                    <span className="text-[13px] leading-[19.5px] text-[#d1d5db]">{label}</span>
                  </span>
                ))}
              </div>
            </div>
            {error ? <p className="text-[13px] text-[#e93748]">{error}</p> : null}
            <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center border border-[#ffb3ba] bg-[#e93748] text-[13.6px] leading-[20.4px] font-extrabold tracking-[1.088px] text-white uppercase shadow-[0_4px_20px_rgba(0,0,0,0.5)] disabled:opacity-60">
              შექმნა
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
