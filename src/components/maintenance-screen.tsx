"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthDialog } from "@/components/auth-dialog";
import { Logo } from "@/components/logo";

type Kind = "maintenance" | "update" | "offline";

const kinds: Record<Kind, { pill: string; jp: string }> = {
  maintenance: { pill: "ტექნიკური სამუშაოები", jp: "メンテナンス中" },
  update: { pill: "მიმდინარეობს განახლება", jp: "アップデート中" },
  offline: { pill: "დროებით გამორთულია", jp: "一時休止中" },
};

const petals = Array.from({ length: 18 }, (_, index) => ({
  left: (index * 37) % 100,
  delay: (index * 1.7) % 12,
  duration: 11 + ((index * 5) % 9),
  size: 8 + ((index * 3) % 9),
  drift: ((index % 2 ? 1 : -1) * (30 + ((index * 13) % 70))),
}));

function left(until: string) {
  const ms = new Date(until).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  return { d: Math.floor(total / 86400), h: Math.floor((total % 86400) / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

export function MaintenanceScreen({ kind, title, text, until, href, label, signedIn }: { kind: Kind; title: string; text: string; until: string; href: string; label: string; signedIn: boolean }) {
  const router = useRouter();
  const [auth, setAuth] = useState(false);
  const [time, setTime] = useState<ReturnType<typeof left>>(null);
  const info = kinds[kind];

  useEffect(() => {
    if (!until) return;
    const tick = () => setTime(left(until));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [until]);

  const cells = time ? [...(time.d ? [[time.d, "დღე"] as const] : []), [time.h, "საათი"] as const, [time.m, "წუთი"] as const, [time.s, "წამი"] as const] : [];

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#070707] px-5 py-16 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 size-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e93748]/12 blur-[140px] max-md:size-[420px]" />
        <div className="absolute -top-40 -left-40 size-[420px] rounded-full bg-[#ff8a95]/6 blur-[120px]" />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.018)_0,rgba(255,255,255,0.018)_1px,transparent_1px,transparent_4px)]" />
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[180px] leading-none font-black whitespace-nowrap text-white/[0.025] select-none max-md:text-[84px]">{info.jp}</span>
        <span className="absolute top-10 right-8 text-[11px] tracking-[6px] text-white/15 [writing-mode:vertical-rl] max-md:hidden">ANIMEB · {info.jp}</span>
        {petals.map((petal, index) => (
          <span
            key={index}
            className="maint-petal absolute -top-8 rounded-[100%_0_100%_0] bg-linear-to-br from-[#ffb3bc] to-[#e93748]"
            style={{ left: `${petal.left}%`, width: petal.size, height: petal.size * 0.8, animationDelay: `${petal.delay}s`, animationDuration: `${petal.duration}s`, "--drift": `${petal.drift}px` } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="maint-rise relative flex w-full max-w-[560px] flex-col items-center text-center">
        <Logo className="h-11 max-md:h-9" />

        <span className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#e93748]/12 px-3.5 py-1.5 text-xs font-semibold text-[#ff8a95]">
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#e93748] opacity-70" />
            <span className="relative size-2 rounded-full bg-[#e93748]" />
          </span>
          {info.pill}
        </span>

        <h1 className="mt-5 text-[40px] leading-[1.1] font-extrabold tracking-[-0.8px] max-md:text-[30px]">{title}</h1>
        <p className="mt-4 max-w-[460px] text-[15px] leading-7 text-[#a1a1aa] max-md:text-sm max-md:leading-6">{text}</p>

        {cells.length ? (
          <div className="mt-8 flex gap-2.5">
            {cells.map(([value, unit]) => (
              <span key={unit} className="flex w-[72px] flex-col items-center rounded-xl bg-[#121214] py-3 max-md:w-16">
                <span className="text-[26px] leading-none font-bold tabular-nums max-md:text-[22px]">{String(value).padStart(2, "0")}</span>
                <span className="mt-1.5 text-[11px] text-[#71717b]">{unit}</span>
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-8 h-1 w-56 overflow-hidden rounded-full bg-white/8">
            <span className="maint-bar block h-full w-1/3 rounded-full bg-linear-to-r from-transparent via-[#e93748] to-transparent" />
          </div>
        )}

        <div className="mt-9 flex flex-wrap justify-center gap-2.5">
          {href ? (
            <a href={href} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#e93748] px-5 text-sm font-semibold shadow-[0_10px_30px_rgba(233,55,72,0.3)] transition hover:brightness-110">
              {label || "სიახლეები"}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M8 7h9v9" /></svg>
            </a>
          ) : null}
          <button type="button" className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-[#18181b] px-5 text-sm font-semibold text-[#d4d4d8] transition hover:bg-[#1f1f23] hover:text-white" onClick={() => window.location.reload()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4h4" /></svg>
            თავიდან ცდა
          </button>
        </div>

        <p className="mt-12 text-xs text-[#52525b]">
          {signedIn ? "ამ დროს საიტი მხოლოდ ადმინისტრაციისთვის არის ხელმისაწვდომი." : <>ადმინისტრატორი ხარ? <button type="button" className="cursor-pointer text-[#a1a1aa] underline-offset-4 hover:text-white hover:underline" onClick={() => setAuth(true)}>შესვლა</button></>}
        </p>
      </div>

      {auth ? <AuthDialog onClose={() => setAuth(false)} onSuccess={() => { setAuth(false); router.refresh(); }} /> : null}
    </main>
  );
}
