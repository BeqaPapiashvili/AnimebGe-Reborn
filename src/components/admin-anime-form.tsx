"use client";

import { useRef, useState, type ReactNode } from "react";
import { AdminMulti, AdminSelect } from "@/components/admin-menu";
import { Field, SiteCta, areaClass, dangerClass, inputClass, quietClass } from "@/components/admin-ui";
import type { AdminAnime } from "@/lib/admin";

type Embed = { key: string; url: string };
type Episode = { number: number; direct: string; embeds: Embed[] };

function readField(chunk: string, key: string) {
  const text = chunk.replace(/\\"/g, '"');
  const match = text.match(new RegExp(`(?:"${key}"|\\b${key})\\s*:\\s*['"]([^'"]*)['"]`));
  return match?.[1] ?? "";
}

function readItems(raw: string, key: string) {
  return raw.split(/__NEWL__+/).map((part) => part.trim()).filter(Boolean).map((chunk, index) => {
    const title = readField(chunk, "title");
    const digits = title.match(/(\d+)/);
    return { number: digits ? Number(digits[1]) : index + 1, url: readField(chunk, key) };
  }).filter((item) => item.url);
}

function freshKey(embeds: Embed[]) {
  const keys = new Set(embeds.map((embed) => embed.key));
  if (!keys.has("iframe_season_1")) return "iframe_season_1";
  let index = 1;
  while (keys.has(`iframe${index}`)) index += 1;
  return `iframe${index}`;
}

function episodesFrom(sources: { key: string; value: string }[]): Episode[] {
  const direct = new Map<number, string>();
  const embeds = new Map<string, Map<number, string>>();
  for (const source of sources) {
    if (source.key === "mp4link") {
      for (const item of readItems(source.value, "file")) direct.set(item.number, item.url);
    } else {
      const links = new Map<number, string>();
      for (const item of readItems(source.value, "url")) links.set(item.number, item.url);
      if (links.size) embeds.set(source.key, links);
    }
  }
  const numbers = [...new Set([...direct.keys(), ...[...embeds.values()].flatMap((links) => [...links.keys()])])].sort((a, b) => a - b);
  if (!numbers.length) return [{ number: 1, direct: "", embeds: [] }];
  return numbers.map((number) => ({
    number,
    direct: direct.get(number) ?? "",
    embeds: [...embeds.entries()].map(([key, links]) => ({ key, url: links.get(number) ?? "" })).filter((embed) => embed.url),
  }));
}

function cleanUrl(url: string) {
  return url.trim().replace(/["'|]/g, "");
}

function pack(episodes: Episode[], film: boolean) {
  const titleOf = (number: number) => (film && episodes.length === 1 ? "ფილმი" : `სერია ${number}`);
  const rows: { key: string; value: string }[] = [];
  const files = episodes.flatMap((episode) => {
    const url = cleanUrl(episode.direct);
    if (!url) return [];
    const type = url.includes(".m3u8") ? "application/x-mpegURL" : "video/mp4";
    return `{ title:"${titleOf(episode.number)}",languages:[{label:"ქართული",sources:[{label:"მაღალი ხარისხი",file:"${url}",type:"${type}"}]}]}`;
  });
  if (files.length) rows.push({ key: "mp4link", value: files.join(",__NEWL__") });
  const keys: string[] = [];
  for (const episode of episodes) {
    for (const embed of episode.embeds) if (!keys.includes(embed.key)) keys.push(embed.key);
  }
  for (const key of keys) {
    const parts = episodes.flatMap((episode) => {
      const url = cleanUrl(episode.embeds.find((embed) => embed.key === key)?.url ?? "");
      return url ? `{"title":"${titleOf(episode.number)}","url":"${url}"}` : [];
    });
    if (parts.length) rows.push({ key, value: parts.join("__NEWL__") });
  }
  return rows;
}

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function useUpload(kind: "poster" | "cover" | "logo", onDone: (path: string) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file: File | undefined) {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("kind", kind);
      body.set("file", file);
      const res = await fetch("/api/admin/anime/upload", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { path?: string; error?: string };
      if (res.ok && data.path) onDone(data.path);
      else setError(data.error || "ვერ აიტვირთა.");
    } catch {
      setError("ვერ აიტვირთა.");
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, upload };
}

function MediaField({ kind, label, value, onChange, hint, frame, placeholder }: { kind: "poster" | "cover" | "logo"; label: string; value: string; onChange: (value: string) => void; hint?: string; frame: (value: string) => ReactNode; placeholder: string }) {
  const { busy, error, upload } = useUpload(kind, onChange);
  const [over, setOver] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  return (
    <div className="mt-5 first:mt-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{label}</p>
        <button type="button" disabled={busy} onClick={() => picker.current?.click()} className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#e93748]/15 px-3 text-xs font-semibold text-[#ff8a95] transition hover:bg-[#e93748]/25 disabled:cursor-wait disabled:opacity-60">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></svg>
          {busy ? "იტვირთება..." : "ატვირთვა"}
        </button>
      </div>
      {hint ? <p className="mb-2 text-xs text-white/40">{hint}</p> : null}
      <div
        role="button"
        tabIndex={0}
        onClick={() => picker.current?.click()}
        onKeyDown={(event) => { if (event.key === "Enter") picker.current?.click(); }}
        onDragOver={(event) => { event.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => { event.preventDefault(); setOver(false); void upload(event.dataTransfer.files?.[0]); }}
        className={`relative cursor-pointer transition ${over ? "opacity-70 ring-2 ring-[#e93748] rounded-[2rem]" : ""} ${busy ? "animate-pulse" : ""}`}
      >
        {frame(value)}
      </div>
      <input ref={picker} type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/gif" className="hidden" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={label} className={`${inputClass} mt-3`} />
      {error ? <p className="mt-2 text-xs text-[#e93748]">{error}</p> : null}
    </div>
  );
}

function Block({ title, text, action, className = "", children }: { title: string; text?: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`rounded-[3rem] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-3xl sm:p-10 ${className}`}>
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid size-12 place-items-center rounded-2xl border border-primary/20 bg-primary/10"><span className="h-6 w-1.5 rounded-sm bg-primary" /></span>
          <div>
            <h2 className="text-xl tracking-tight uppercase">{title}</h2>
            {text ? <p className="mt-1 text-[10px] tracking-widest text-white/60 uppercase">{text}</p> : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function AdminAnimeForm({
  anime,
  genreOptions,
  sources,
  creating,
  saved,
  error,
  save,
  remove,
}: {
  anime: AdminAnime;
  genreOptions: { id: string; name: string }[];
  sources: { key: string; value: string }[];
  creating: boolean;
  saved: boolean;
  error: string;
  save: (formData: FormData) => void;
  remove: (formData: FormData) => void;
}) {
  const [format, setFormat] = useState(anime.format || "11");
  const [published, setPublished] = useState(anime.published);
  const [bump, setBump] = useState(false);
  const [poster, setPoster] = useState(anime.poster);
  const [cover, setCover] = useState(anime.cover);
  const [logo, setLogo] = useState(anime.logo);
  const [episodes, setEpisodes] = useState<Episode[]>(() => episodesFrom(sources));
  const film = format === "12";
  const rows = pack(episodes, film);

  function patch(number: number, next: Episode) {
    setEpisodes((current) => current.map((episode) => episode.number === number ? next : episode));
  }

  return (
    <div className="min-h-screen bg-[#020202] pb-20 text-white">
      <form action={save}>
        <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 border-b border-white/5 bg-[#020202]/80 px-8 py-6 backdrop-blur-3xl lg:px-12">
          <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <a href="/admin/anime" className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-lg" aria-label="უკან">←</a>
            <div>
              <h1 className="text-3xl tracking-tight">{creating ? "დამატება" : "რედაქტირება"}</h1>
              <p className="mt-1 text-[10px] tracking-[0.2em] text-white/60 uppercase">{creating ? "ახალი ანიმე" : anime.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {creating ? null : (
              <button
                type="button"
                onClick={() => setBump((value) => !value)}
                aria-pressed={bump}
                title="შენახვისას ანიმე მთავარ გვერდზე პირველ ადგილზე ავა"
                className={`flex h-11 cursor-pointer items-center gap-2.5 rounded-xl px-4 text-[10px] tracking-widest uppercase transition ${bump ? "bg-[#e93748]/15 text-[#ff8a95]" : "bg-white/5 text-white/50 hover:text-white"}`}
              >
                <span className={`relative h-4 w-7 rounded-full transition ${bump ? "bg-[#e93748]" : "bg-white/15"}`}>
                  <span className={`absolute top-0.5 size-3 rounded-full bg-white transition-all ${bump ? "left-3.5" : "left-0.5"}`} />
                </span>
                პირველზე აწევა
              </button>
            )}
            <a href="/admin/anime" className={quietClass}>გაუქმება</a>
            <SiteCta submit>{creating ? "დამატება" : "შენახვა"}</SiteCta>
          </div>
          </div>
        </div>
        {saved ? <p className="mb-4 text-sm text-white">შენახულია.</p> : null}
        {error ? <p className="mb-4 text-sm text-[#e93748]">{error}</p> : null}
        <input type="hidden" name="id" value={anime.id} />
        <input type="hidden" name="format" value={format} />
        {published ? <input type="hidden" name="published" value="1" /> : null}
        {bump ? <input type="hidden" name="bump" value="1" /> : null}
        <input type="hidden" name="poster" value={poster} />
        <input type="hidden" name="cover" value={cover} />
        <input type="hidden" name="logo" value={logo} />
        {rows.map((row) => (
          <span key={row.key}>
            <input type="hidden" name="source_key" value={row.key} />
            <input type="hidden" name="source_value" value={row.value} />
          </span>
        ))}

        <div className="mx-auto grid max-w-[1400px] items-start gap-12 px-8 pt-12 lg:grid-cols-12 lg:px-12">
          <div className="space-y-6 lg:col-span-8">
            <Block title="სახელი" text="ეს ტექსტი ჩანს ანიმეს გვერდზე.">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="mb-3 ml-2 text-[10px] tracking-[0.2em] text-white/60 uppercase">რა არის</p>
                  <div className="flex rounded-[1.2rem] border border-white/5 bg-black/40 p-1.5">
                    {[["11", "სერიალი"], ["12", "ფილმი"], ["44", "OVA"]].map(([value, label]) => (
                      <button key={value} type="button" onClick={() => setFormat(value)} className={`h-11 flex-1 cursor-pointer rounded-xl text-[10px] tracking-widest uppercase ${format === value ? "bg-primary text-white shadow-lg" : "text-white/30"}`}>{label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-3 ml-2 text-[10px] tracking-[0.2em] text-white/60 uppercase">საიტზე ჩანს</p>
                  <div className="flex rounded-[1.2rem] border border-white/5 bg-black/40 p-1.5">
                    <button type="button" onClick={() => setPublished(true)} className={`h-11 flex-1 cursor-pointer rounded-xl text-[10px] tracking-widest uppercase ${published ? "bg-primary text-white shadow-lg" : "text-white/30"}`}>ჩანს</button>
                    <button type="button" onClick={() => setPublished(false)} className={`h-11 flex-1 cursor-pointer rounded-xl text-[10px] tracking-widest uppercase ${published ? "text-white/30" : "bg-primary text-white shadow-lg"}`}>დამალული</button>
                  </div>
                </div>
                <div className="sm:col-span-2"><Field label="ქართული სახელი"><input name="title" required defaultValue={anime.title} className={inputClass} /></Field></div>
                <Field label="ინგლისური / რომაჯი"><input name="romaji" defaultValue={anime.romaji} className={inputClass} /></Field>
                <Field label="იაპონური"><input name="japanese" defaultValue={anime.japanese} className={inputClass} /></Field>
                <div className="sm:col-span-2"><Field label="მისამართი"><input name="slug" defaultValue={anime.slug} placeholder="ცარიელი დარჩეს და თვითონ შეივსება" className={inputClass} /></Field></div>
                <div className="sm:col-span-2"><Field label="აღწერა"><textarea name="description" rows={5} defaultValue={anime.description} className={areaClass} /></Field></div>
              </div>
            </Block>

            <Block title="კატალოგი" text="წელი, სტატუსი, ჟანრი." className="relative z-30">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="წელი"><input name="year" defaultValue={anime.year} inputMode="numeric" className={inputClass} /></Field>
                <Field label="IMDb"><input name="score" defaultValue={anime.score} className={inputClass} /></Field>
                <Field label="ხანგრძლივობა, წუთი"><input name="duration" defaultValue={anime.duration} inputMode="numeric" className={inputClass} /></Field>
                <Field label="სტატუსი">
                  <AdminSelect name="status" value={anime.status} options={[{ value: "დასრულებული", label: "დასრულებული" }, { value: "მიმდინარე", label: "მიმდინარე" }, { value: "ანონსი", label: "ანონსი" }]} />
                </Field>
              </div>
              <div className="mt-5 grid gap-5 border-t border-white/8 pt-5 sm:grid-cols-2">
                <Field label="გამოსული სერია"><input name="current" defaultValue={anime.current} inputMode="numeric" className={inputClass} /></Field>
                <Field label="სულ სერია"><input name="total" defaultValue={anime.total} inputMode="numeric" className={inputClass} /></Field>
              </div>
              <div className="mt-5 grid gap-5 border-t border-white/8 pt-5 sm:grid-cols-2">
                <Field label="სტუდია"><input name="studio" defaultValue={anime.studio} className={inputClass} /></Field>
                <Field label="რეჟისორი"><input name="director" defaultValue={anime.director} className={inputClass} /></Field>
                <div className="sm:col-span-2"><Field label="გახმოვანება"><input name="dubbers" defaultValue={anime.dubbers} className={inputClass} /></Field></div>
                <div className="sm:col-span-2">
                  <Field label="ჟანრები">
                    <AdminMulti name="genre" values={anime.genres} options={genreOptions.map((option) => ({ value: option.id, label: option.name }))} placeholder="აირჩიე ჟანრები" />
                  </Field>
                </div>
              </div>
            </Block>

            <Block
              title={film ? "ვიდეო" : "სერიები"}
              text="ჯერ AnimeB-ის mp4 ან m3u8, მერე სხვა საიტის ფლეიერი."
              action={film ? null : <button type="button" className={quietClass} onClick={() => setEpisodes((current) => [...current, { number: Math.max(0, ...current.map((episode) => episode.number)) + 1, direct: "", embeds: [] }])}>სერიის დამატება</button>}
            >
              <div className="flex flex-col gap-4">
                {[...episodes].sort((a, b) => b.number - a.number).map((episode) => {
                  const label = film && episodes.length === 1 ? "ფილმი" : `სერია ${episode.number}`;
                  const kind = episode.direct.includes(".m3u8") ? "m3u8" : episode.direct.includes(".mp4") ? "mp4" : "";
                  return (
                    <article key={episode.number} className="overflow-hidden rounded-[2rem] border border-white/5 bg-black/40">
                      <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                        <p className="font-bold">{label}</p>
                        {film && episodes.length === 1 ? null : <button type="button" className="cursor-pointer text-sm font-semibold text-[#e93748]" onClick={() => setEpisodes((current) => current.filter((item) => item.number !== episode.number))}>წაშლა</button>}
                      </div>
                      <div className="grid gap-6 p-6">
                        <label className="block">
                          <span className="flex items-center gap-2 text-sm font-semibold">
                            AnimeB-ის ვიდეო
                            {kind ? <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-medium text-white/70">{kind}</span> : null}
                          </span>
                          <span className="mt-0.5 block text-xs text-white/40">mp4 ან m3u8 ბმული</span>
                          <input value={episode.direct} onChange={(event) => patch(episode.number, { ...episode, direct: event.target.value })} placeholder="https://...mp4 ან ...m3u8" aria-label={`${label} mp4 ან m3u8`} className={`${inputClass} mt-2`} />
                        </label>
                        <div className="border-t border-white/5 pt-6">
                          <p className="text-sm font-semibold">სხვა ფლეიერები</p>
                          <p className="mt-0.5 text-xs text-white/40">მაგალითად sibnet ან fsst</p>
                          <div className="mt-3 flex flex-col gap-2">
                            {episode.embeds.map((embed, index) => (
                              <div key={embed.key} className="flex items-center gap-2">
                                <span className="w-28 shrink-0 truncate text-xs text-white/55">{hostLabel(embed.url) || "ბმული"}</span>
                                <input value={embed.url} onChange={(event) => patch(episode.number, { ...episode, embeds: episode.embeds.map((item, i) => i === index ? { ...item, url: event.target.value } : item) })} placeholder="https://" aria-label={`${label} ფლეიერი`} className={inputClass} />
                                <button type="button" className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-md border border-white/8 text-white/50" aria-label="ფლეიერის წაშლა" onClick={() => patch(episode.number, { ...episode, embeds: episode.embeds.filter((_, i) => i !== index) })}>×</button>
                              </div>
                            ))}
                          </div>
                          <button type="button" className={`${quietClass} mt-3`} onClick={() => setEpisodes((current) => current.map((item) => item.number === episode.number ? { ...item, embeds: [...item.embeds, { key: freshKey(current.flatMap((row) => row.embeds)), url: "" }] } : item))}>ფლეიერის დამატება</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </Block>
          </div>

          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-32">
              <Block title="მედია" text="პოსტერი, ქოვერი და სახელის ლოგო">
                <MediaField kind="poster" label="პოსტერი" value={poster} onChange={setPoster} placeholder="ან ჩასვი სურათის ბმული" frame={(value) => (
                  <div className="aspect-[2/3] overflow-hidden rounded-[2rem] border-2 border-dashed border-white/10 bg-black/40">
                    {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center px-6 text-center text-sm text-white/35">დააჭირე ან ჩააგდე სურათი</div>}
                  </div>
                )} />
                <MediaField kind="cover" label="ქოვერი" value={cover} onChange={setCover} placeholder="ან ჩასვი სურათის ბმული" frame={(value) => (
                  <div className="aspect-video overflow-hidden rounded-[2rem] border-2 border-dashed border-white/10 bg-black/40">
                    {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center px-6 text-center text-sm text-white/35">დააჭირე ან ჩააგდე სურათი</div>}
                  </div>
                )} />
                <MediaField kind="logo" label="სახელის ლოგო" value={logo} onChange={setLogo} placeholder="ან ჩასვი ლოგოს ბმული (არასავალდებულო)" hint="გამჭვირვალე PNG/WEBP სახელით. მთავარ სლაიდერზე სახელის ნაცვლად გამოჩნდება. თუ ცარიელია, სახელი ტექსტად ეწერება." frame={(value) => (
                  <div className="relative grid h-32 place-items-center overflow-hidden rounded-[2rem] bg-cover bg-center" style={{ backgroundImage: cover ? `linear-gradient(90deg,rgba(10,10,10,0.8),rgba(10,10,10,0.35)),url('${cover}')` : undefined, backgroundColor: "#0f0f11" }}>
                    {value ? <img src={value} alt="" className="max-h-24 max-w-[85%] object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]" /> : <span className="px-4 text-center text-lg font-bold text-white/80">{anime.title || "სახელი"}</span>}
                  </div>
                )} />
              </Block>
            </div>
          </aside>
        </div>
      </form>
      {anime.id ? (
        <form action={remove} className="mx-auto mt-12 flex max-w-[1400px] flex-wrap items-center justify-between gap-3 rounded-[3rem] border border-white/5 bg-white/[0.02] px-8 py-8 lg:px-12">
          <div>
            <p className="font-bold">წაშლა</p>
            <p className="mt-1 text-sm text-white/45">იშლება ანიმე, კომენტარები და შეფასებები.</p>
            <label className="mt-3 flex items-center gap-2 text-sm text-white/45">
              <input type="checkbox" name="confirm" value="1" required className="accent-[#e93748]" />
              ვადასტურებ წაშლას
            </label>
          </div>
          <input type="hidden" name="id" value={anime.id} />
          <button type="submit" className={dangerClass}>წაშლა</button>
        </form>
      ) : null}
    </div>
  );
}
