"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react";
import { AvatarPicker } from "@/components/avatar-picker";
import { CoverPicker } from "@/components/cover-picker";
import { FramePicker } from "@/components/frame-picker";
import { FrameOverlay } from "@/components/avatar";
import { LiveMedia } from "@/components/live-media";
import { stillSrc } from "@/lib/dle";
import type { AccountSettings, Prefs } from "@/lib/settings-model";

const sections = [
  { id: "account", href: "/settings", label: "ანგარიში", icon: "user" },
  { id: "preferences", href: "/settings/preferences", label: "მოწყობა", icon: "gear" },
  { id: "security", href: "/settings/security", label: "უსაფრთხოება", icon: "lock" },
] as const;

export type SettingsSection = (typeof sections)[number]["id"];

const folders = [
  ["1", "ვუყურებ"],
  ["3", "ვგეგმავ"],
  ["5", "გადაიდო"],
  ["2", "დავასრულე"],
  ["4", "მიტოვებული"],
] as const;

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`relative h-6 w-11 shrink-0 rounded-full ${on ? "bg-[#e93748]" : "bg-white/15"}`} onClick={onClick}>
      <span className={`absolute top-0.5 size-5 rounded-full bg-white transition ${on ? "left-5" : "left-0.5"}`} />
    </button>
  );
}

function Row({ title, text, on, set }: { title: string; text: string; on: boolean; set: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/6 py-4 last:border-0 [&>button]:shrink-0">
      <div className="min-w-0">
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="mt-1 text-sm text-[#99a1af]">{text}</p>
      </div>
      <Toggle on={on} label={title} onClick={() => set(!on)} />
    </div>
  );
}

function Choice<T extends string>({ value, options, onPick }: { value: T; options: { id: T; label: string }[]; onPick: (id: T) => void }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map((option) => (
        <button key={option.id} type="button" className={`rounded-full px-3 py-1.5 text-sm font-bold ${value === option.id ? "bg-[#e93748] text-white" : "bg-white/5 text-[#d1d5dc]"}`} onClick={() => onPick(option.id)}>{option.label}</button>
      ))}
    </div>
  );
}

async function post(body: unknown) {
  const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.json() as Promise<{ ok?: boolean; error?: string; avatar?: string; frame?: string; cover?: string; count?: number }>;
}

export function SettingsView({ section, account }: { section: SettingsSection; account: AccountSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(account);
  const [prefs, setPrefs] = useState(account.prefs);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pass, setPass] = useState({ current: "", next: "", confirm: "", show: false });
  const [mail, setMail] = useState({ email: account.email, password: "", show: false });

  function note(data: { ok?: boolean; error?: string }) {
    setError(data.ok ? "" : data.error || "ვერ შეინახა.");
    setMessage(data.ok ? "შეინახა." : "");
    if (data.ok) router.refresh();
  }

  async function saveAccount(event: FormEvent) {
    event.preventDefault();
    note(await post({ action: "account", name: form.name, displayName: form.displayName, bio: form.bio, website: form.website }));
  }

  async function savePreferences() {
    note(await post({ action: "prefs", prefs }));
  }

  async function chooseMedia(kind: "avatar" | "frame" | "cover", file: string) {
    const data = await post({ action: kind, file });
    if (data.ok) {
      setForm((value) => ({ ...value, [kind]: data[kind] || undefined }));
      router.refresh();
    } else note(data);
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  function setFlag<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    setPrefs((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="rise flex min-h-[calc(100vh-80px)] bg-black pt-20 text-white">
      <aside className="sticky top-20 hidden h-[calc(100vh-80px)] w-60 shrink-0 flex-col px-5 pt-6 pb-6 lg:flex">
        <p className="px-3 text-[11px] font-semibold tracking-[1.6px] text-white/45 uppercase">პარამეტრები</p>
        <nav className="mt-3 flex flex-col gap-0.5">
          {sections.map((item) => (
            <a key={item.id} href={item.href} className={`flex h-[37px] items-center gap-2.5 rounded-lg px-3 text-sm ${section === item.id ? "bg-[#e93748] font-semibold text-white" : "text-white/75 hover:bg-white/5"}`}>
              <NavIcon name={item.icon} />
              {item.label}
            </a>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-5">
          <p className="px-0 text-[11px] font-semibold tracking-[1.4px] text-white/45 uppercase">ანგარიშის ინფო</p>
          <p className="mt-4 text-[13px] text-white/55">მომხმარებლის ID</p>
          <p className="mt-0.5 truncate font-mono text-[13px] text-white/90">{form.id}</p>
          <p className="mt-3 text-[13px] text-white/55">ელფოსტა</p>
          <p className="mt-0.5 text-[13px] leading-snug break-all text-white/90">{form.email}</p>
          <p className="mt-3 flex items-center gap-1.5 text-[13px] text-white/55">სტატუსი <span className="size-1.5 rounded-full bg-[#e93748]" /></p>
          <p className="mt-0.5 text-sm text-white">აქტიური</p>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[960px] px-6 py-12 max-md:px-4 max-md:py-6">
          <div className="mb-6 flex gap-2 overflow-x-auto lg:hidden max-md:mb-5 max-md:grid max-md:grid-cols-3 max-md:gap-1 max-md:rounded-xl max-md:bg-[#121214] max-md:p-1">
            {sections.map((item) => (
              <a key={item.id} href={item.href} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold max-md:truncate max-md:px-1 max-md:text-center max-md:text-xs ${section === item.id ? "bg-[#e93748] text-white" : "bg-white/5 text-white/75 max-md:bg-transparent"}`}>{item.label}</a>
            ))}
          </div>
          {message ? <p className="mb-4 text-sm text-white">{message}</p> : null}
          {error ? <p className="mb-4 text-sm text-[#e93748]">{error}</p> : null}
          {section === "account" ? <AccountPane form={form} setForm={setForm} onSave={saveAccount} onMedia={chooseMedia} onSignOut={signOut} /> : null}
          {section === "preferences" ? <PreferencesPane prefs={prefs} setFlag={setFlag} setPrefs={setPrefs} onSave={savePreferences} /> : null}
          {section === "security" ? <SecurityPane pass={pass} setPass={setPass} mail={mail} setMail={setMail} onNote={note} /> : null}
        </div>
      </div>
    </div>
  );
}

function NavIcon({ name }: { name: "user" | "gear" | "lock" }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8 };
  if (name === "user") return <svg {...common}><circle cx="12" cy="8" r="3.2" /><path d="M5.5 19.2c1.4-3 3.6-4.4 6.5-4.4s5.1 1.4 6.5 4.4" /></svg>;
  if (name === "gear") return <svg {...common}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" /></svg>;
  return <svg {...common}><rect x="6" y="11" width="12" height="8.5" rx="1.6" /><path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" /></svg>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm text-white">{label}</span>
      {hint ? <span className="mt-1 block text-sm text-[#99a1af]">{hint}</span> : null}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

const inputClass = "h-[46px] w-full rounded-xl border border-white/10 bg-[#141414] px-[15px] text-[15px] text-white outline-none placeholder:text-white/35";

function daysAgo(unix: number) {
  if (!unix) return "";
  const days = Math.max(0, Math.floor((Date.now() - unix * 1000) / 86400000));
  if (days === 0) return "დღეს";
  if (days === 1) return "1 დღის წინ";
  return `${days} დღის წინ`;
}

function MenuPick({ label, icon, onClick }: { label: string; icon: "avatar" | "frame" | "cover"; onClick: () => void }) {
  return (
    <button type="button" className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-[13px] font-semibold text-white hover:bg-white/5" onClick={onClick}>
      <span className="grid size-7 place-items-center text-[#e93748]">
        {icon === "avatar" ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 16V6" /><path d="m8 10 4-4 4 4" /><path d="M5 20h14" /></svg> : null}
        {icon === "frame" ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 12a8 8 0 0 1 13.5-5.8" /><path d="M20 4v5h-5" /><path d="M20 12a8 8 0 0 1-13.5 5.8" /><path d="M4 20v-5h5" /></svg> : null}
        {icon === "cover" ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 15 5-4 4 3 3-2 6 5" /></svg> : null}
      </span>
      {label}
    </button>
  );
}

function AccountPane({ form, setForm, onSave, onMedia, onSignOut }: { form: AccountSettings; setForm: Dispatch<SetStateAction<AccountSettings>>; onSave: (event: FormEvent) => void; onMedia: (kind: "avatar" | "frame" | "cover", file: string) => void; onSignOut: () => void }) {
  const [menu, setMenu] = useState(false);
  const [picker, setPicker] = useState<"avatar" | "frame" | "cover" | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    function close(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setMenu(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);
  function openPicker(kind: "avatar" | "frame" | "cover") {
    setMenu(false);
    setPicker(kind);
  }
  return (
    <form onSubmit={onSave}>
      <h1 className="text-[56px] leading-none font-bold tracking-tight text-white max-md:text-[34px]">ანგარიში</h1>
      <div className="relative mt-8 flex items-center justify-between gap-6 rounded-2xl border border-white/8 bg-[#121212] px-8 py-7 max-md:mt-5 max-md:flex-col max-md:gap-5 max-md:border-0 max-md:px-5 max-md:py-6">
        {form.cover ? <img src={stillSrc(form.cover) || form.cover} alt="" className="pointer-events-none absolute inset-0 h-full w-full rounded-2xl object-cover opacity-25" /> : null}
        <div className="relative flex min-w-0 items-center gap-[22px] max-md:w-full max-md:flex-col max-md:gap-4 max-md:text-center">
          <div ref={box} className="relative size-[72px] shrink-0">
            <LiveMedia src={form.avatar || "/assets/avatar.jpg"} className="size-[72px] rounded-full object-cover" />
            <FrameOverlay src={form.frame} className="pointer-events-none absolute top-1/2 left-1/2 size-[132%] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain" />
            <button type="button" aria-label="სურათის შეცვლა" className="absolute right-[-2px] bottom-[-2px] grid size-6 cursor-pointer place-items-center rounded-full bg-[#e93748] text-white" onClick={() => setMenu((open) => !open)}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 20h4l10-10-4-4L4 16v4z" /><path d="m13 7 4 4" /></svg>
            </button>
            {menu ? (
              <div className="absolute top-[78px] left-0 z-20 w-[210px] text-left max-md:left-1/2 max-md:-translate-x-1/2 rounded-xl border border-white/10 bg-[#1a1a1a] py-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
                <MenuPick label="ავატარის შეცვლა" icon="avatar" onClick={() => openPicker("avatar")} />
                <MenuPick label="ჩარჩოს შეცვლა" icon="frame" onClick={() => openPicker("frame")} />
                <MenuPick label="ქოვერის შეცვლა" icon="cover" onClick={() => openPicker("cover")} />
                <a href="/shop" className="flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] font-semibold text-white hover:bg-white/5">
                  <span className="grid size-7 place-items-center text-[#e93748]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 7h12l-1 13H7L6 7z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>
                  </span>
                  მაღაზია
                </a>
              </div>
            ) : null}
            <AvatarPicker open={picker === "avatar"} avatar={form.avatar} frame={form.frame} locked={form.locked} onClose={() => setPicker(null)} onPick={(file) => onMedia("avatar", file)} />
            <FramePicker open={picker === "frame"} avatar={form.avatar ?? ""} frame={form.frame} locked={form.locked} onClose={() => setPicker(null)} onPick={(file) => onMedia("frame", file)} />
            <CoverPicker open={picker === "cover"} cover={form.cover} locked={form.locked} onClose={() => setPicker(null)} onPick={(file) => onMedia("cover", file)} />
          </div>
          <div className="min-w-0 max-md:w-full">
            <p className="truncate text-[28px] leading-9 font-bold text-white max-md:text-2xl">{form.name}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/55 max-md:mt-1 max-md:flex-wrap max-md:justify-center max-md:gap-x-1.5 max-md:gap-y-0.5 max-md:text-[13px]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>
              შემოუერთდა {form.joined}
              <span className="text-white/35">· {daysAgo(form.joinedAt)}</span>
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-white/40 max-md:justify-center max-md:text-[11px]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 16V6" /><path d="m8 10 4-4 4 4" /><path d="M5 20h14" /></svg>
              მაქსიმალური ზომა 1 მბ (JPEG, PNG, GIF, WEBP)
            </p>
          </div>
        </div>
        <button type="button" className="relative h-[37px] shrink-0 rounded-lg bg-[#e93748] px-4 text-sm font-semibold text-white max-md:h-11 max-md:w-full" onClick={onSignOut}>გასვლა</button>
      </div>
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Field label="მომხმარებელი" hint="3–10 სიმბოლო, მხოლოდ ასოები და ციფრები.">
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} />
        </Field>
        <Field label="საჩვენებელი სახელი" hint="როგორ გხედავენ სხვები. 32 სიმბოლომდე.">
          <input value={form.displayName} maxLength={32} placeholder="საჩვენებელი სახელი" onChange={(event) => setForm({ ...form, displayName: event.target.value })} className={inputClass} />
        </Field>
      </div>
      <div className="relative mt-8">
        <Field label="ბიო" hint="მოუყევი სხვებს ცოტა შენს შესახებ.">
          <textarea value={form.bio} maxLength={500} onChange={(event) => setForm({ ...form, bio: event.target.value })} className={`${inputClass} h-[94px] resize-none py-[11px]`} placeholder="დაწერე რამე შენს შესახებ..." />
        </Field>
        <p className="mt-1 text-right text-[13px] text-white/40">{form.bio.length}/500</p>
      </div>
      <div className="mt-2">
        <Field label="საიტი">
          <input value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} placeholder="https://yoursite.com" className={inputClass} />
        </Field>
      </div>
      <div className="mt-6 flex justify-end">
        <button type="submit" className="inline-flex h-[41px] items-center gap-2 rounded-lg bg-[#e93748] px-6 text-sm font-semibold text-white max-md:h-11 max-md:w-full max-md:justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 4h11l3 3v13H5z" /><path d="M8 4v5h7" /><path d="M8 20v-6h8v6" /></svg>
          ცვლილებების შენახვა
        </button>
      </div>
    </form>
  );
}

function PreferencesPane({ prefs, setFlag, setPrefs, onSave }: { prefs: Prefs; setFlag: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void; setPrefs: Dispatch<SetStateAction<Prefs>>; onSave: () => void }) {
  const audience = [{ id: "all" as const, label: "ყველა" }, { id: "friends" as const, label: "მეგობრები" }, { id: "none" as const, label: "არავინ" }];
  return (
    <div>
      <h1 className="text-[56px] leading-none font-bold tracking-tight text-white max-md:text-[34px]">მოწყობა</h1>
      <section className="mt-8 rounded-2xl border border-white/8 bg-[#0c0c0c] px-5">
        <h2 className="pt-5 text-lg font-extrabold text-white">ჩვენება</h2>
        <Row title="კომენტარები" text="კომენტარების ბლოკი ყურების გვერდზე." on={prefs.comments} set={(value) => setFlag("comments", value)} />
      </section>
      <section className="mt-4 rounded-2xl border border-white/8 bg-[#0c0c0c] px-5">
        <h2 className="pt-5 text-lg font-extrabold text-white">შეტყობინებები</h2>
        <Row title="ბრაუზერის შეტყობინება" text="საიტის გახსნილ ჩანართში ახალ შეტყობინებას გაჩვენებს. ფოსტაზე არ იგზავნება." on={prefs.push} set={(value) => {
          if (value && typeof Notification !== "undefined") {
            void Notification.requestPermission().then((perm) => { if (perm === "granted") setFlag("push", true); });
            return;
          }
          setFlag("push", value);
        }} />
        <Row title="მეგობრების აქტივობა" text="მეგობრობის მოთხოვნა და მოწვევები." on={prefs.friends} set={(value) => setFlag("friends", value)} />
        <Row title="სიახლეები" text="სიახლე იმ ანიმეზე, რომელიც სიაში გაქვს." on={prefs.news} set={(value) => setFlag("news", value)} />
        <div className="py-4">
          <p className="text-sm font-bold text-white">სერიის შეტყობინება</p>
          <p className="mt-1 text-sm text-[#99a1af]">რომელ სიაზე მოგივიდეს ახალი სერია.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {folders.map(([id, label]) => (
              <button key={id} type="button" className={`rounded-full px-3 py-1.5 text-sm font-bold ${prefs.folders[id] ? "bg-[#e93748] text-white" : "bg-white/5 text-[#d1d5dc]"}`} onClick={() => setPrefs((current) => ({ ...current, folders: { ...current.folders, [id]: !current.folders[id] } }))}>{label}</button>
            ))}
          </div>
        </div>
      </section>
      <section className="mt-4 rounded-2xl border border-white/8 bg-[#0c0c0c] px-5 py-5">
        <h2 className="text-lg font-extrabold text-white">კონფიდენციალობა</h2>
        <p className="mt-4 text-sm font-bold text-white">ვინ ხედავს სიას</p>
        <Choice value={prefs.list} options={audience} onPick={(id) => setFlag("list", id)} />
        <p className="mt-4 text-sm font-bold text-white">ვინ ხედავს რას უყურებ</p>
        <Choice value={prefs.live} options={audience} onPick={(id) => setFlag("live", id)} />
      </section>
      <section className="mt-4 rounded-2xl border border-white/8 bg-[#0c0c0c] px-5">
        <h2 className="pt-5 text-lg font-extrabold text-white">დაკვრა</h2>
        <Row title="ავტო დაკვრა" text="გვერდზე შესვლისას ვიდეო თვითონ იწყება." on={prefs.autoplay} set={(value) => setFlag("autoplay", value)} />
        <Row title="შემდეგი ავტომატურად" text="სერიის ბოლოს შემდეგი თვითონ ირთვება." on={prefs.autoNext} set={(value) => setFlag("autoNext", value)} />
        <Row title="ნანახი სერიის ჩაბნელება" text="დასრულებული სერია სიაში ფერმკრთალია." on={prefs.dimWatched} set={(value) => setFlag("dimWatched", value)} />
        <Row title="გვერდითი მენიუ" text="ეკრანის გვერდით მცურავი მენიუ." on={prefs.dock} set={(value) => setFlag("dock", value)} />
      </section>
      <button type="button" className="mt-6 h-11 rounded-lg bg-[#e93748] px-5 text-sm font-bold text-white" onClick={onSave}>შენახვა</button>
    </div>
  );
}

function SecurityPane({ pass, setPass, mail, setMail, onNote }: { pass: { current: string; next: string; confirm: string; show: boolean }; setPass: Dispatch<SetStateAction<{ current: string; next: string; confirm: string; show: boolean }>>; mail: { email: string; password: string; show: boolean }; setMail: Dispatch<SetStateAction<{ email: string; password: string; show: boolean }>>; onNote: (data: { ok?: boolean; error?: string }) => void }) {
  return (
    <div>
      <h1 className="text-[56px] leading-none font-bold tracking-tight text-white max-md:text-[34px]">უსაფრთხოება</h1>
      <form className="mt-8 space-y-4" onSubmit={async (event) => { event.preventDefault(); onNote(await post({ action: "password", current: pass.current, next: pass.next, confirm: pass.confirm })); }}>
        <Field label="მიმდინარე პაროლი" hint="დაადასტურე, რომ ეს შენი ანგარიშია."><input type={pass.show ? "text" : "password"} value={pass.current} onChange={(event) => setPass({ ...pass, current: event.target.value })} className={inputClass} /></Field>
        <Field label="ახალი პაროლი" hint="მინიმუმ 8 სიმბოლო."><input type={pass.show ? "text" : "password"} value={pass.next} onChange={(event) => setPass({ ...pass, next: event.target.value })} className={inputClass} /></Field>
        <Field label="გაიმეორე ახალი პაროლი"><input type={pass.show ? "text" : "password"} value={pass.confirm} onChange={(event) => setPass({ ...pass, confirm: event.target.value })} className={inputClass} /></Field>
        <button type="button" className="text-sm text-[#99a1af]" onClick={() => setPass({ ...pass, show: !pass.show })}>{pass.show ? "დამალვა" : "ჩვენება"}</button>
        <button type="submit" className="block h-11 rounded-lg bg-[#e93748] px-5 text-sm font-bold text-white">პაროლის შეცვლა</button>
      </form>
      <form className="mt-10 space-y-4 border-t border-white/8 pt-8" onSubmit={async (event) => { event.preventDefault(); onNote(await post({ action: "email", email: mail.email, password: mail.password })); }}>
        <h2 className="text-lg font-extrabold text-white">ელფოსტის შეცვლა</h2>
        <Field label="ახალი ელფოსტა"><input type="email" value={mail.email} onChange={(event) => setMail({ ...mail, email: event.target.value })} className={inputClass} /></Field>
        <Field label="პაროლი" hint="ცვლილების დასადასტურებლად."><input type={mail.show ? "text" : "password"} value={mail.password} onChange={(event) => setMail({ ...mail, password: event.target.value })} className={inputClass} /></Field>
        <button type="submit" className="h-11 rounded-lg bg-[#e93748] px-5 text-sm font-bold text-white">ელფოსტის განახლება</button>
      </form>
    </div>
  );
}
