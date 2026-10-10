"use client";

import { useEffect, useState } from "react";

type Mode = "signin" | "signup" | "forgot";

function Field({ label, aside, children }: { label: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between">
        <span className="text-[11px] leading-[16.5px] font-semibold tracking-[1.1px] text-[#6a7282] uppercase">{label}</span>
        {aside}
      </span>
      {children}
    </label>
  );
}

export function AuthDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", login: "", email: "", password: "" });
  const [sent, setSent] = useState(false);
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((value) => ({ ...value, [key]: event.target.value }));

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function switchMode(next: Mode) {
    setMode(next);
    setNotice("");
    setSent(false);
    setShowPassword(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice("");
    if (mode === "forgot") {
      try {
        const res = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email }) });
        const result = (await res.json()) as { ok?: boolean; error?: string };
        setSent(Boolean(result.ok));
        setNotice(result.ok ? "თუ ეს ფოსტა ანგარიშზეა, წერილი გაგზავნილია. ბმული 30 წუთი იმუშავებს." : (result.error || "წერილი ვერ გაიგზავნა."));
      } catch {
        setNotice("სერვერთან კავშირი ვერ მოხერხდა. სცადე თავიდან.");
      } finally {
        setBusy(false);
      }
      return;
    }
    try {
      const res = await fetch(mode === "signin" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "signin" ? { login: form.login, password: form.password } : { name: form.name, email: form.email, password: form.password }),
      });
      const result = (await res.json()) as { ok: boolean; pending?: boolean; error?: string };
      if (result.ok && result.pending) {
        setSent(true);
        setNotice("წერილი გაგზავნილია. გახსენი ბმული და ანგარიში ჩაირთვება.");
      } else if (result.ok) onSuccess();
      else setNotice(result.error ?? "Something went wrong.");
    } catch {
      setNotice("სერვერთან კავშირი ვერ მოხერხდა. სცადე თავიდან.");
    } finally {
      setBusy(false);
    }
  }

  const signin = mode === "signin";
  const forgot = mode === "forgot";

  return (
    <div className="folder-overlay fixed inset-0 z-[70] grid place-items-center bg-black/60 px-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="folder-dialog auth-frame w-full max-w-[418px]" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <div className="auth-shell relative bg-black p-7">
          <button type="button" className="auth-close absolute top-5 right-5 grid size-8 -skew-x-12 cursor-pointer place-items-center border border-white/10" aria-label="დახურვა" onClick={onClose}>
            <span className="relative block size-4 skew-x-12">
              <img src="/assets/auth/close-a.svg" alt="" width={9.33333} height={9.33333} className="absolute top-[3.33px] left-[3.33px]" />
              <img src="/assets/auth/close-b.svg" alt="" width={9.33333} height={9.33333} className="absolute top-[3.33px] left-[3.33px]" />
            </span>
          </button>

          <h2 id="auth-title" className="flex items-center gap-3 pt-2 text-2xl leading-8 font-bold tracking-[-0.6px] text-white">
            <span className="h-6 w-1 -skew-x-12 bg-[#e93748]" />
            {mode === "forgot" ? "პაროლის აღდგენა" : signin ? "კეთილი იყოს შენი დაბრუნება" : "ანგარიშის შექმნა"}
          </h2>
          <p className="pt-1 pl-4 text-sm leading-5 text-[#6a7282]">{mode === "forgot" ? "ჩაწერე ანგარიშის ფოსტა. ბმულს info@animeb.ge გამოგიგზავნის." : signin ? "შედი და განაგრძე ყურება." : "შეუერთდი და დაიწყე სიის შევსება."}</p>

          <div className="mt-6 flex gap-2 pl-1" role="tablist">
            {(["signin", "signup"] as const).map((item) => (
              <button key={item} type="button" role="tab" aria-selected={mode === item} className={`auth-tab h-9 -skew-x-12 cursor-pointer border px-5 ${mode === item ? "is-on" : ""}`} onClick={() => switchMode(item)}>
                <span className="inline-block skew-x-12 text-[12.8px] leading-[19.2px] font-semibold">{item === "signin" ? "შესვლა" : "რეგისტრაცია"}</span>
              </button>
            ))}
          </div>

          <form className="flex flex-col gap-3.5 pt-6" onSubmit={submit}>
            {mode === "signup" ? (
              <Field label="მომხმარებელი">
                <span className="auth-control">
                  <input required autoFocus minLength={3} maxLength={40} autoComplete="username" value={form.name} onChange={set("name")} className="auth-input" />
                </span>
              </Field>
            ) : null}
            <Field label={signin ? "ელფოსტა ან მომხმარებელი" : "ელფოსტა"}>
              <span className="auth-control">
                {signin ? (
                  <input required autoFocus type="text" autoComplete="username" value={form.login} onChange={set("login")} className="auth-input" />
                ) : (
                  <input required type="email" maxLength={50} autoComplete="email" value={form.email} onChange={set("email")} className="auth-input" />
                )}
              </span>
            </Field>
            {forgot ? null : <Field label="პაროლი" aside={signin ? <button type="button" className="auth-link cursor-pointer text-[11px] leading-[16.5px] font-medium" onClick={() => switchMode("forgot")}>დაგავიწყდა პაროლი?</button> : null}>
              <span className="auth-control">
                <input required minLength={signin ? undefined : 8} type={showPassword ? "text" : "password"} autoComplete={signin ? "current-password" : "new-password"} value={form.password} onChange={set("password")} className="auth-input pr-10" />
                <button type="button" className={`auth-eye absolute top-3.5 right-3 size-4 cursor-pointer ${showPassword ? "is-on" : ""}`} aria-label={showPassword ? "პაროლის დამალვა" : "პაროლის ჩვენება"} onClick={() => setShowPassword((value) => !value)}>
                  <img src="/assets/auth/eye.svg" alt="" width={16} height={16} />
                </button>
              </span>
            </Field>}

            <div className="px-1.5 pt-2">
              <button type="submit" disabled={busy} className="hero-cta relative h-12 w-full -skew-x-12 cursor-pointer overflow-hidden bg-[#e93748] text-white disabled:cursor-wait disabled:opacity-70">
                <span className="inline-flex skew-x-12 items-center gap-2 text-[13.6px] font-black tracking-[2.4px] uppercase">
                  {busy ? "მოიცადე…" : forgot ? "წერილის გაგზავნა" : signin ? "შესვლა" : "რეგისტრაცია"}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </span>
              </button>
            </div>

            {notice ? <p className={`text-center text-xs leading-4 ${sent ? "text-white" : "text-[#e93748]"}`} role="status">{notice}</p> : null}

            <p className="pt-1 text-center text-xs leading-4 text-[#6a7282]">
              {forgot ? <button type="button" className="auth-link cursor-pointer" onClick={() => switchMode("signin")}>უკან შესვლაზე</button> : <>
                {signin ? "ანგარიში არ გაქვს? " : "უკვე გაქვს ანგარიში? "}
                <button type="button" className="auth-link cursor-pointer" onClick={() => switchMode(signin ? "signup" : "signin")}>{signin ? "რეგისტრაცია" : "შესვლა"}</button>
              </>}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
