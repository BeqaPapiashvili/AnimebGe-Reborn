"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { toast } from "@/components/toast";
import type { FolderAnime, FolderCard, FolderDetail, FolderSort, FolderVisibility } from "@/lib/folders";

const months = ["იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი", "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"];

function dateLabel(value: string) {
  const date = new Date(value.replace(" ", "T"));
  if (!Number.isFinite(date.getTime())) return "";
  const hours = (Date.now() - date.getTime()) / 3600000;
  if (hours < 1) return "ახლახანს განახლდა";
  if (hours < 24) return "დღეს განახლდა";
  return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
}

function visibilityLabel(value: FolderVisibility) {
  if (value === "private") return "პირადი";
  if (value === "unlisted") return "ბმულით";
  return "საჯარო";
}

async function post(body: unknown) {
  const res = await fetch("/api/folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.json() as Promise<{ ok?: boolean; id?: number; error?: string }>;
}

export function MyListsView({ folders, folder }: { folders?: FolderCard[]; folder?: FolderDetail }) {
  if (folder) return <FolderScreen folder={folder} />;
  return <IndexScreen folders={folders ?? []} />;
}

function IndexScreen({ folders }: { folders: FolderCard[] }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [menu, setMenu] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [visibility, setVisibility] = useState("any");
  const [pinned, setPinned] = useState("any");
  const [size, setSize] = useState("any");
  const [updated, setUpdated] = useState("any");
  const [sort, setSort] = useState("updated");
  const [more, setMore] = useState(false);
  const results = useRef<HTMLDivElement>(null);
  const extra = more ? "" : "max-md:hidden";

  const shown = useMemo(() => {
    const now = Date.now();
    const list = folders.filter((item) => {
      if (q && !`${item.name} ${item.description}`.toLowerCase().includes(q.trim().toLowerCase())) return false;
      if (visibility !== "any" && item.visibility !== visibility) return false;
      if (pinned === "yes" && !item.pinned) return false;
      if (pinned === "no" && item.pinned) return false;
      if (size === "empty" && item.count !== 0) return false;
      if (size === "small" && (item.count < 1 || item.count > 10)) return false;
      if (size === "large" && item.count < 11) return false;
      const age = now - new Date(item.updatedAt.replace(" ", "T")).getTime();
      if (updated === "day" && age > 86400000) return false;
      if (updated === "week" && age > 7 * 86400000) return false;
      if (updated === "month" && age > 31 * 86400000) return false;
      if (updated === "year" && age > 366 * 86400000) return false;
      return true;
    });
    list.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (sort === "name") return a.name.localeCompare(b.name, "ka");
      if (sort === "size") return b.count - a.count;
      if (sort === "created") return b.createdAt.localeCompare(a.createdAt);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
    return list;
  }, [folders, q, visibility, pinned, size, updated, sort]);

  const publics = folders.filter((item) => item.visibility === "public").length;
  const views = folders.reduce((sum, item) => sum + item.views, 0);

  useEffect(() => {
    function onDown(event: MouseEvent) {
      if (!panel.current?.contains(event.target as Node)) setMenu("");
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-black px-6 pt-28 pb-16 text-white">
      <div className="rise mx-auto w-full max-w-[1180px]">
        <header className="text-center">
          <h1 className="text-[40px] leading-none font-bold">ჩემი სიები</h1>
          <p className="mt-3 text-sm text-white/45">შექმენი და გააზიარე შენი ანიმეს საქაღალდეები</p>
        </header>
        {folders.length ? (
          <>
            <div ref={panel} className="mt-10 grid grid-cols-1 gap-x-3 gap-y-4 border-b border-white/5 pb-4 sm:grid-cols-2 xl:grid-cols-4 max-md:grid-cols-2">
              <Field label="ძებნა" className="xl:col-span-2 max-md:order-1">
                <label className="relative block">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute top-1/2 left-3 -translate-y-1/2 text-[#6a7282]" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
                  <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="ჩაწერე საძიებოდ..." aria-label="საქაღალდის ძებნა" className="h-10 w-full rounded-md bg-[#141414] pr-3 pl-9 text-sm text-white outline-none placeholder:text-[#6a7282]" />
                </label>
              </Field>
              <Drop className="max-md:order-2" id="visibility" menu={menu} setMenu={setMenu} label="ხილვადობა" value={visibility} onChange={setVisibility} options={[["any", "ნებისმიერი"], ["public", "საჯარო"], ["unlisted", "ბმულით"], ["private", "პირადი"]]} />
              <Drop className="max-md:order-3" id="pinned" menu={menu} setMenu={setMenu} label="ჩამაგრებული" value={pinned} onChange={setPinned} options={[["any", "ნებისმიერი"], ["yes", "ჩამაგრებული"], ["no", "ჩაუმაგრებელი"]]} />
              <Drop className={`max-md:order-6 ${extra}`} id="content" menu={menu} setMenu={setMenu} label="შიგთავსი" value="anime" onChange={() => undefined} options={[["anime", "ანიმე"]]} />
              <Drop className={`max-md:order-4 ${extra}`} id="size" menu={menu} setMenu={setMenu} label="ზომა" value={size} onChange={setSize} options={[["any", "ნებისმიერი"], ["empty", "ცარიელი"], ["small", "1–10"], ["large", "11+"]]} />
              <Drop className={`max-md:order-7 ${extra}`} id="updated" menu={menu} setMenu={setMenu} label="განახლება" value={updated} onChange={setUpdated} options={[["any", "ნებისმიერ დროს"], ["day", "დღეს"], ["week", "კვირა"], ["month", "თვე"], ["year", "წელი"]]} />
              <Drop className={`max-md:order-8 ${extra}`} id="sort" menu={menu} setMenu={setMenu} label="დალაგება" value={sort} onChange={setSort} options={[["updated", "განახლებული"], ["name", "სახელი"], ["size", "ზომა"], ["created", "შექმნილი"]]} />
              {more ? <div className="col-span-2 hidden h-px bg-white/6 max-md:order-5 max-md:block" /> : null}
              <div className="hidden min-w-0 max-md:order-9 max-md:block">
                <p className="pl-1 text-[13px] font-bold tracking-[0.3px] text-white">მოქმედება</p>
                <div className="mt-1.5 grid h-10 grid-cols-3 gap-px overflow-hidden rounded-md bg-white/5">
                  <button type="button" className="flex cursor-pointer flex-col items-center justify-center gap-0.5 bg-[#141414] text-[#d1d5dc] active:bg-[#1f1f23]" aria-label="შედეგები" onClick={() => { setMenu(""); results.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M4 5h16l-6 7.5V19l-4-2v-4.5z" /></svg>
                    <span className="text-[9px] leading-none text-[#9ca3af]">შედეგი</span>
                  </button>
                  <button type="button" className="flex cursor-pointer flex-col items-center justify-center gap-0.5 bg-[#141414] text-[#d1d5dc] active:bg-[#1f1f23]" aria-label="გასუფთავება" onClick={() => { setMenu(""); setQ(""); setVisibility("any"); setPinned("any"); setSize("any"); setUpdated("any"); setSort("updated"); }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4h4" /></svg>
                    <span className="text-[9px] leading-none text-[#9ca3af]">წაშლა</span>
                  </button>
                  <button type="button" className={`flex cursor-pointer flex-col items-center justify-center gap-0.5 bg-[#141414] active:bg-[#1f1f23] ${more ? "text-[#ff8a95]" : "text-[#d1d5dc]"}`} aria-label={more ? "ნაკლები ფილტრი" : "ყველა ფილტრი"} aria-expanded={more} onClick={() => { setMenu(""); setMore(!more); }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform duration-300 ${more ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
                    <span className={`text-[9px] leading-none ${more ? "text-[#ff8a95]" : "text-[#9ca3af]"}`}>{more ? "ნაკლები" : "მეტი"}</span>
                  </button>
                </div>
              </div>
            </div>
            <div ref={results} className="mt-6 flex scroll-mt-20 items-center justify-between gap-4">
              <p className="text-sm text-white/55">{folders.length} საქაღალდე · {publics} საჯარო · {views} ნახვა</p>
              <button type="button" className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-[#e93748] px-4 text-xs font-bold tracking-wide whitespace-nowrap text-white uppercase" onClick={() => setFormOpen(true)}>
                <Plus /> ახალი საქაღალდე
              </button>
            </div>
            <div className="mt-6 flex flex-wrap gap-6">
              {shown.map((item) => (
                <a key={item.id} href={`/lists/${item.id}`} className="w-[220px]">
                  <Cover covers={item.covers} count={item.count} />
                  <p className="mt-3 truncate text-[15px] font-semibold">{item.name}</p>
                  {item.description ? <p className="mt-0.5 truncate text-xs text-white/40">{item.description}</p> : null}
                  <p className="mt-2 text-xs text-white/35">{dateLabel(item.updatedAt)}</p>
                  <p className="mt-1 flex gap-3 text-xs text-white/40">
                    <span>{item.count} ანიმე</span>
                    <span>{item.views} ნახვა</span>
                    <span>{item.shares} გაზიარება</span>
                  </p>
                </a>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center pt-24 text-center">
            <span className="grid size-16 place-items-center rounded-2xl border border-[#e93748]/30 bg-[#e93748]/10 text-[#e93748]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M8 7h11M8 12h11M8 17h11" /><path d="M4 7h.01M4 12h.01M4 17h.01" /></svg>
            </span>
            <p className="mt-5 text-lg font-bold">საქაღალდე ჯერ არ არის</p>
            <p className="mt-2 max-w-[280px] text-sm leading-6 text-white/45">აქ შექმენი, ან გახსენი ნებისმიერი ანიმე და აირჩიე „საქაღალდეში“.</p>
            <button type="button" className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-[#e93748] px-5 text-xs font-bold tracking-wide whitespace-nowrap text-white uppercase" onClick={() => setFormOpen(true)}>
              <Plus /> ახალი საქაღალდე
            </button>
          </div>
        )}
      </div>
      {formOpen ? <FolderForm onClose={() => setFormOpen(false)} onSaved={(id) => router.push(`/lists/${id}`)} /> : null}
    </div>
  );
}

function FolderScreen({ folder }: { folder: FolderDetail }) {
  const router = useRouter();
  const [items, setItems] = useState(folder.items);
  const [sort, setSort] = useState<FolderSort>(folder.sort);
  const [pinned, setPinned] = useState(folder.pinned);
  const [edit, setEdit] = useState(false);
  const [menu, setMenu] = useState<number | null>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);

  const ordered = useMemo(() => {
    const list = [...items];
    if (sort === "title") list.sort((a, b) => a.title.localeCompare(b.title, "ka"));
    if (sort === "year") list.sort((a, b) => Number(b.year ?? 0) - Number(a.year ?? 0));
    if (sort === "score") list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return list;
  }, [items, sort]);

  function play(list: FolderAnime[]) {
    const item = list[0];
    if (item) window.location.href = `/anime/${item.slug}/watch?ep=1`;
  }

  async function share() {
    await navigator.clipboard.writeText(window.location.href).then(() => toast("ბმული დაკოპირდა")).catch(() => undefined);
    await post({ action: "share", id: folder.id });
    router.refresh();
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-black px-6 pt-24 pb-16 text-white">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 lg:flex-row">
        <aside className="w-full shrink-0 rounded-2xl border border-white/8 bg-[#121212] p-4 lg:w-[360px]">
          <Cover covers={folder.covers} count={folder.count} tall blur={folder.adult && !folder.mine} />
          <span className="mt-4 ml-2 inline-flex rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold tracking-[1px] uppercase">{visibilityLabel(folder.visibility)}</span>
          <h1 className="mt-2 px-2 text-[28px] leading-tight font-bold">{folder.name}</h1>
          <p className="mt-3 flex items-center gap-2 px-2 text-sm text-white/70">
            <Avatar src={folder.owner.avatar} frame={folder.owner.frame} size={24} />
            {folder.owner.name}
          </p>
          <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 px-2 text-[13px] leading-5 whitespace-nowrap text-white/45">
            <span>{folder.count} ანიმე</span>
            <span>{folder.views} ნახვა</span>
            <span>{folder.shares} გაზიარება</span>
          </p>
          <p className="mt-2 px-2 text-xs text-white/35">{dateLabel(folder.updatedAt)}</p>
          {folder.description ? <p className="mt-3 px-2 text-sm leading-6 text-white/70">{folder.description}</p> : null}
          <div className="mt-5 grid grid-cols-2 gap-2 px-2">
            <button type="button" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-[13px] leading-none font-semibold whitespace-nowrap text-black" onClick={() => play(ordered)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0"><path d="M8 5v14l11-7z" /></svg>
              დაკვრა
            </button>
            <button type="button" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-white/10 px-3 text-[13px] leading-none font-semibold whitespace-nowrap" onClick={() => play([...ordered].sort(() => Math.random() - 0.5))}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0"><path d="M4 7h3l2 3 2-3h9M4 17h3l2-3 2 3h9" /><path d="m16 5 3 2-3 2M16 15l3 2-3 2" /></svg>
              შემთხვევით
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1 px-1 text-[13px] leading-none text-white/70">
            <button type="button" className="rounded-lg px-2.5 py-2 whitespace-nowrap hover:bg-white/5" onClick={share}>გაზიარება</button>
            {folder.mine ? <button type="button" className="rounded-lg px-2.5 py-2 whitespace-nowrap hover:bg-white/5" onClick={() => setEdit(true)}>რედაქტირება</button> : null}
            {folder.mine ? <button type="button" className="rounded-lg px-2.5 py-2 whitespace-nowrap hover:bg-white/5" onClick={async () => { setPinned(!pinned); await post({ action: "update", id: folder.id, pinned: !pinned }); }}>{pinned ? "ჩამაგრებულია" : "ჩამაგრება"}</button> : null}
          </div>
          {folder.mine ? (
            <button type="button" className="mt-2 ml-2 text-[13px] leading-none whitespace-nowrap text-[#e93748]" onClick={async () => { if (!confirm("საქაღალდე წაიშალოს?")) return; await post({ action: "delete", id: folder.id }); router.push("/lists"); }}>საქაღალდის წაშლა</button>
          ) : null}
        </aside>
        <section className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-sm text-white/45">{ordered.length} ანიმე{folder.mine && sort === "manual" ? " · გადაათრიე რიგის შესაცვლელად" : ""}</p>
            {folder.mine ? (
              <div className="relative w-[160px]">
                <button type="button" className="filter-trigger flex h-10 w-full items-center justify-between rounded-md border border-white/5 bg-[#141414] px-3 text-sm text-[#d1d5dc]" aria-expanded={sortOpen} onClick={() => setSortOpen((open) => !open)}>
                  <span>{({ manual: "ხელით", title: "სახელით", year: "წლით", score: "შეფასებით" })[sort]}</span>
                  <Chevron open={sortOpen} />
                </button>
                <DropMenu open={sortOpen}>
                  {(["manual", "title", "year", "score"] as const).map((value) => (
                    <button key={value} type="button" className={optionClass(sort === value)} onClick={async () => { setSort(value); setSortOpen(false); await post({ action: "update", id: folder.id, sort: value }); }}>{({ manual: "ხელით", title: "სახელით", year: "წლით", score: "შეფასებით" })[value]}</button>
                  ))}
                </DropMenu>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-3">
            {ordered.map((item) => (
              <article
                key={item.id}
                draggable={folder.mine && sort === "manual"}
                onDragStart={() => setDrag(item.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={async () => {
                  if (drag == null || drag === item.id) return;
                  const next = [...items];
                  const from = next.findIndex((entry) => entry.id === drag);
                  const to = next.findIndex((entry) => entry.id === item.id);
                  const [moved] = next.splice(from, 1);
                  next.splice(to, 0, moved);
                  setItems(next);
                  setDrag(null);
                  await post({ action: "reorder", id: folder.id, postIds: next.map((entry) => entry.id) });
                }}
                className="flex gap-3 rounded-xl p-2 hover:bg-white/4"
              >
                {folder.mine && sort === "manual" ? <span className="mt-6 cursor-grab text-white/30">⋮⋮</span> : null}
                <a href={`/anime/${item.slug}/watch?ep=1`} className="relative h-[84px] w-[60px] shrink-0 overflow-hidden rounded-md bg-[#1a1a1a]">
                  {item.poster ? <img src={item.poster} alt="" className={`h-full w-full object-cover ${folder.adult && !folder.mine ? "blur-md" : ""}`} /> : null}
                </a>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <a href={`/anime/${item.slug}`} className="truncate text-[15px] font-semibold hover:text-[#e93748]">{item.title}</a>
                    {folder.mine ? (
                      <div className="relative">
                        <button type="button" className="px-2 text-white/50" aria-label="მოქმედება" onClick={() => setMenu(menu === item.id ? null : item.id)}>···</button>
                        {menu === item.id ? (
                          <button type="button" className="absolute top-7 right-0 z-10 rounded-lg border border-white/10 bg-[#141414] px-3 py-2 text-sm whitespace-nowrap text-[#e93748]" onClick={async () => { setItems((list) => list.filter((entry) => entry.id !== item.id)); setMenu(null); await post({ action: "toggle", id: folder.id, postId: item.id }); router.refresh(); }}>ამოღება</button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-white/40">{[item.format, item.year, item.score ? `★ ${item.score.toFixed(1)}` : null].filter(Boolean).join(" · ")}</p>
                  {item.description ? <p className="mt-1 line-clamp-2 text-sm leading-5 text-white/55">{item.description}</p> : null}
                  {item.episodes ? <span className="mt-2 inline-flex rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold">{item.episodes} ეპ</span> : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
      {edit ? <FolderForm folder={folder} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); router.refresh(); }} /> : null}
      <ViewPing id={folder.id} mine={folder.mine} />
    </div>
  );
}

function ViewPing({ id, mine }: { id: number; mine: boolean }) {
  useEffect(() => {
    if (mine) return;
    const key = `folder-view-${id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void post({ action: "view", id });
  }, [id, mine]);
  return null;
}

function Cover({ covers, count, tall, blur }: { covers: string[]; count: number; tall?: boolean; blur?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-[#1a1a1a] ${tall ? "h-[210px]" : "h-[140px]"}`}>
      {covers.length > 1 ? (
        <div className="grid h-full grid-cols-2 grid-rows-2">
          {covers.slice(0, 4).map((src) => <img key={src} src={src} alt="" className={`h-full w-full object-cover ${blur ? "blur-md" : ""}`} />)}
        </div>
      ) : covers[0] ? <img src={covers[0]} alt="" className={`h-full w-full object-cover ${blur ? "blur-md" : ""}`} /> : null}
      {count > 1 ? <span className="absolute right-2 bottom-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-bold">{count}</span> : null}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`filter-chevron shrink-0 text-[#9ca3af] ${open ? "is-open" : ""}`} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="pl-1 text-[13px] font-bold tracking-[0.3px] text-white">{label}</p>
      <div className="pt-1.5">{children}</div>
    </div>
  );
}

function DropMenu({ open, children }: { open: boolean; children: ReactNode }) {
  if (!open) return null;
  return <div className="filter-pop absolute top-full right-0 left-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-md border border-white/8 bg-[#0a0a0a] p-1 shadow-[0_18px_40px_rgba(0,0,0,0.55)]">{children}</div>;
}

function optionClass(on: boolean) {
  return `flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-2 text-left text-sm transition-colors duration-150 ${on ? "bg-[#e93748]/10 text-[#e93748]" : "text-[#d1d5dc] hover:bg-white/5"}`;
}

function Drop({ className, id, menu, setMenu, label, value, onChange, options }: { className?: string; id: string; menu: string; setMenu: (id: string) => void; label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  const current = options.find((option) => option[0] === value)?.[1] ?? options[0][1];
  return (
    <Field label={label} className={className}>
      <div className="relative">
        <button type="button" className="filter-trigger flex h-10 w-full items-center justify-between rounded-md border border-white/5 bg-[#141414] px-3 text-sm text-[#d1d5dc]" aria-expanded={menu === id} onClick={() => setMenu(menu === id ? "" : id)}>
          <span className="truncate">{current}</span>
          <Chevron open={menu === id} />
        </button>
        <DropMenu open={menu === id}>
          {options.map(([option, text]) => (
            <button key={option} type="button" className={optionClass(value === option)} onClick={() => { onChange(option); setMenu(""); }}>{text}</button>
          ))}
        </DropMenu>
      </div>
    </Field>
  );
}

function Plus() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>;
}

function FolderForm({ folder, onClose, onSaved }: { folder?: FolderDetail; onClose: () => void; onSaved: (id: number) => void }) {
  const [name, setName] = useState(folder?.name ?? "");
  const [description, setDescription] = useState(folder?.description ?? "");
  const [visibility, setVisibility] = useState<FolderVisibility>(folder?.visibility ?? "public");
  const [adult, setAdult] = useState(folder?.adult ?? false);
  const [error, setError] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    const body = folder
      ? { action: "update", id: folder.id, name, description, visibility, adult }
      : { action: "create", name, description, visibility, adult };
    const data = await post(body);
    if (!data.ok && !data.id) return setError(data.error || "ვერ შეინახა.");
    onSaved(data.id ?? folder?.id ?? 0);
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 px-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="relative w-full max-w-[520px] overflow-hidden rounded-2xl border border-white/10 bg-[#101114] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.65)]" onSubmit={save}>
        <span className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full border border-[#e93748]/25" />
        <span className="pointer-events-none absolute -bottom-20 -left-16 size-44 rounded-full border border-[#e93748]/15" />
        <h2 className="text-xl font-bold">{folder ? "საქაღალდის შეცვლა" : "ახალი საქაღალდე"}</h2>
        <p className="mt-1.5 max-w-[420px] text-sm leading-5 text-white/55">შენი საქაღალდე. ანიმე რამდენ საქაღალდეშიც გინდა, იქ ჩასვი.</p>
        <span className="mt-3 block h-[3px] w-14 rounded-full bg-[#e93748]" />
        <div className="mt-5 flex items-center justify-between text-[11px] font-semibold tracking-[1.2px] text-white/45 uppercase">
          <span>სახელი</span>
          <span className="tracking-normal">{name.length}/60</span>
        </div>
        <input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="მაგალითად, კომფორტული ხელახლა ყურება" className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-[#e93748]" />
        <div className="mt-4 flex items-center justify-between text-[11px] font-semibold tracking-[1.2px] text-white/45 uppercase">
          <span>აღწერა <span className="tracking-normal text-white/30 normal-case">არასავალდებულო</span></span>
          <span className="tracking-normal">{description.length}/500</span>
        </div>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder="რა აკავშირებს ამ ანიმეებს?" className="mt-2 h-24 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none focus:border-[#e93748]" />
        <p className="mt-4 text-[11px] font-semibold tracking-[1.2px] text-white/45 uppercase">ხილვადობა</p>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button type="button" className={`rounded-xl border px-3 py-3 text-left ${visibility === "public" ? "border-[#e93748] bg-[#e93748]/10 shadow-[inset_3px_0_0_#e93748]" : "border-white/10 bg-black/20"}`} onClick={() => setVisibility("public")}>
            <span className="flex items-center gap-2 text-sm font-semibold whitespace-nowrap"><Globe /> საჯარო</span>
            <span className="mt-1 block text-xs leading-4 text-white/50">სიაში და ბმულით ჩანს</span>
          </button>
          <button type="button" className={`rounded-xl border px-3 py-3 text-left ${visibility === "unlisted" ? "border-[#e93748] bg-[#e93748]/10 shadow-[inset_3px_0_0_#e93748]" : "border-white/10 bg-black/20"}`} onClick={() => setVisibility("unlisted")}>
            <span className="flex items-center gap-2 text-sm font-semibold whitespace-nowrap"><Globe /> ბმულით</span>
            <span className="mt-1 block text-xs leading-4 text-white/50">მხოლოდ ბმულის მქონე</span>
          </button>
          <button type="button" className={`rounded-xl border px-3 py-3 text-left ${visibility === "private" ? "border-[#e93748] bg-[#e93748]/10 shadow-[inset_3px_0_0_#e93748]" : "border-white/10 bg-black/20"}`} onClick={() => setVisibility("private")}>
            <span className="flex items-center gap-2 text-sm font-semibold whitespace-nowrap"><Lock /> პირადი</span>
            <span className="mt-1 block text-xs leading-4 text-white/50">მხოლოდ შენ</span>
          </button>
        </div>
        <label className="mt-3 flex cursor-pointer gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
          <input type="checkbox" checked={adult} onChange={(event) => setAdult(event.target.checked)} className="mt-0.5 size-4 accent-[#e93748]" />
          <span>
            <span className="block text-sm font-semibold">შეიცავს ზრდასრულ კონტენტს</span>
            <span className="mt-1 block text-xs leading-4 text-white/45">ყდა სხვებისთვის ბუნდოვანი რჩება, სანამ ეს ჩართულია.</span>
          </span>
        </label>
        {error ? <p className="mt-3 text-sm text-[#e93748]">{error}</p> : null}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" className="h-11 rounded-xl bg-[#1c1e24] text-sm font-semibold whitespace-nowrap text-white" onClick={onClose}>გაუქმება</button>
          <button type="submit" disabled={!name.trim()} className="h-11 rounded-xl bg-[#e93748] text-sm font-bold tracking-wide whitespace-nowrap text-white uppercase disabled:opacity-40">{folder ? "შენახვა" : "შექმნა"}</button>
        </div>
      </form>
    </div>
  );
}

function Globe() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0"><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c2.2 2.4 3.3 5.1 3.3 8S14.2 17.6 12 20c-2.2-2.4-3.3-5.1-3.3-8S9.8 6.4 12 4z" /></svg>;
}

function Lock() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0"><rect x="6" y="11" width="12" height="8" rx="1.6" /><path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" /></svg>;
}
