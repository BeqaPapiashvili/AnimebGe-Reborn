"use client";

import { useMemo, useState } from "react";
import { animeHref, formatCount } from "@/lib/data";
import type { ActivityData, ActivityPoint } from "@/lib/profile-types";
import { Avatar } from "@/components/avatar";
import { LevelBar } from "@/components/profile-view";

const ranges = [
  { id: 30, label: "30 დღე" },
  { id: 90, label: "90 დღე" },
  { id: 365, label: "1 წელი" },
  { id: 0, label: "სულ" },
] as const;

const weekdays = ["ორშ", "სამ", "ოთხ", "ხუთ", "პარ", "შაბ", "კვი"];
const monthShort = ["იან", "თებ", "მარ", "აპრ", "მაი", "ივნ", "ივლ", "აგვ", "სექ", "ოქტ", "ნოე", "დეკ"];

function dayKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseDay(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function shift(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes}წთ`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}სთ ${rest}წთ` : `${hours}სთ`;
}

function heatColor(value: number) {
  if (value <= 0) return "#161616";
  if (value === 1) return "#5c1a22";
  if (value < 4) return "#a12332";
  return "#e93748";
}

function sumWatches(watches: ActivityData["watches"], from: string, to: string) {
  const anime = new Set<string>();
  let episodes = 0;
  let seconds = 0;
  for (const row of watches) {
    if (row.day < from || row.day >= to) continue;
    episodes += row.episode;
    seconds += row.seconds;
    anime.add(row.slug);
  }
  return { episodes, minutes: Math.round(seconds / 60), anime: anime.size };
}

function sumPoints(points: ActivityPoint[], from: string, to: string) {
  const days = new Set<string>();
  let episodes = 0;
  let comments = 0;
  let seconds = 0;
  for (const point of points) {
    if (point.day < from || point.day >= to) continue;
    episodes += point.episodes;
    comments += point.comments;
    seconds += point.seconds;
    if (point.episodes || point.comments) days.add(point.day);
  }
  return { episodes, comments, minutes: Math.round(seconds / 60), active: days.size };
}

export function ActivityView({ data }: { data: ActivityData }) {
  const { profile } = data;
  const [range, setRange] = useState<(typeof ranges)[number]["id"]>(30);
  const [shown, setShown] = useState(6);
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const span = range || 3650;
  const from = dayKey(shift(today, -(span - 1)));
  const to = dayKey(shift(today, 1));
  const prevFrom = dayKey(shift(today, -(span * 2 - 1)));
  const current = sumPoints(data.points, from, to);
  const watched = sumWatches(data.watches, from, to);
  const previous = sumPoints(data.points, prevFrom, from);
  const activeDelta = current.active - previous.active;

  const weeks = useMemo(() => {
    const end = new Date(today);
    const mondayOffset = (end.getDay() + 6) % 7;
    const start = shift(end, -mondayOffset - 52 * 7);
    const byDay = new Map<string, number>();
    for (const point of data.points) byDay.set(point.day, (byDay.get(point.day) ?? 0) + point.episodes + point.comments);
    return Array.from({ length: 53 }, (_, week) => {
      const column = Array.from({ length: 7 }, (_, row) => {
        const date = shift(start, week * 7 + row);
        const key = dayKey(date);
        return { key, value: byDay.get(key) ?? 0, future: date > today, month: date.getMonth() };
      });
      return column;
    });
  }, [data.points, today]);

  const yearActive = useMemo(() => {
    const start = dayKey(shift(today, -364));
    return sumPoints(data.points, start, to);
  }, [data.points, today, to]);

  const hourGrid = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    for (const point of data.points) {
      if (point.day < from || point.day >= to || !point.episodes) continue;
      const date = parseDay(point.day);
      const row = (date.getDay() + 6) % 7;
      grid[row][point.hour] += point.episodes;
    }
    return grid;
  }, [data.points, from, to]);
  const hourMax = Math.max(1, ...hourGrid.flat());

  const bars = useMemo(() => {
    const map = new Map<string, number>();
    for (const point of data.points) {
      if (point.day < from || point.day >= to) continue;
      map.set(point.day, (map.get(point.day) ?? 0) + Math.round(point.seconds / 60));
    }
    const days = Math.min(span, 366);
    const raw = Array.from({ length: days }, (_, index) => {
      const date = shift(parseDay(from), index);
      const key = dayKey(date);
      return { key, label: `${date.getDate()} ${monthShort[date.getMonth()]}`, minutes: map.get(key) ?? 0 };
    }).filter((item) => item.key < to);
    if (raw.length <= 40) return raw;
    const grouped: { key: string; label: string; minutes: number }[] = [];
    const size = raw.length > 120 ? 30 : 7;
    for (let index = 0; index < raw.length; index += size) {
      const chunk = raw.slice(index, index + size);
      grouped.push({ key: chunk[0].key, label: chunk[0].label, minutes: chunk.reduce((sum, item) => sum + item.minutes, 0) });
    }
    return grouped;
  }, [data.points, from, span, to]);
  const barMax = Math.max(1, ...bars.map((bar) => bar.minutes));

  const library = profile.lists.filter((list) => list.count > 0);
  const libraryTotal = library.reduce((sum, list) => sum + list.count, 0) || 1;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const donut = library.reduce<{ offset: number; parts: { id: number; color: string; length: number; offset: number }[] }>((state, list) => {
    const length = (list.count / libraryTotal) * circumference;
    state.parts.push({ id: list.id, color: list.color, length, offset: state.offset });
    state.offset += length;
    return state;
  }, { offset: 0, parts: [] }).parts;

  const recentTitles = data.titles.filter((item) => item.day >= from && item.day < to).slice(0, 5);
  const genres = useMemo(() => {
    if (!range) return data.genres;
    const counts = new Map<string, number>();
    for (const title of data.titles) {
      if (title.day < from || title.day >= to) continue;
      for (const name of title.genres) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [data.genres, data.titles, from, range, to]);
  const genreMax = Math.max(1, ...genres.map((genre) => genre.count));
  const events = data.events.filter((event) => range === 0 || (event.day >= from && event.day < to));
  const visible = events.slice(0, shown);

  const groups: { label: string; items: typeof visible }[] = [];
  for (const event of visible) {
    const date = parseDay(event.day);
    const label = event.day === dayKey(today) ? "დღეს" : `${date.getDate()} ${monthShort[date.getMonth()]}`;
    const group = groups.find((item) => item.label === label);
    if (group) group.items.push(event);
    else groups.push({ label, items: [event] });
  }

  return (
    <div className="bg-[#070707] px-4 pt-24 pb-16 sm:px-8">
      <div className="rise mx-auto w-full max-w-[1100px]">
        <a href={`/@${encodeURIComponent(profile.name)}`} className="mb-4 inline-flex items-center gap-2 text-sm text-[#99a1af] hover:text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6 9 12l6 6" /></svg>
          პროფილი
        </a>
        <div className="flex flex-col gap-4 border-b border-white/8 pb-6 max-md:gap-3 max-md:border-0 max-md:pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 max-md:gap-3">
            <span className="md:hidden"><Avatar src={profile.avatar} frame={profile.frame} size={52} /></span>
            <span className="hidden md:block"><Avatar src={profile.avatar} frame={profile.frame} size={80} /></span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-extrabold text-white max-md:text-xl">{profile.name}</h1>
              <p className="text-sm text-[#99a1af] max-md:text-xs">@{profile.name} · აქტივობა</p>
            </div>
          </div>
          <div className="sm:text-right max-md:[&>div]:max-w-none">
            <LevelBar level={profile.level} rank={profile.rank} xp={Math.max(0, profile.xp)} step={profile.xpStep} total={profile.totalXp} />
            <p className="mt-2 text-xs text-[#99a1af]">{profile.streakLive ? `სერია ${profile.streak} დღეა` : "სერია არ მიდის"} · საუკეთესო {profile.streak}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 *:min-w-0 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-2xl border border-white/8 bg-[#0c0c0c] p-4 max-md:border-0 max-md:bg-[#121214]">
            <h2 className="font-extrabold text-white max-md:hidden">გასული წელი</h2>
            <h2 className="font-extrabold text-white md:hidden">ბოლო 6 თვე</h2>
            <p className="mt-1 text-sm text-[#99a1af] max-md:text-xs">{yearActive.active} აქტიური დღე · {sumWatches(data.watches, dayKey(shift(today, -364)), to).episodes} ეპიზოდი · {yearActive.comments} კომენტარი</p>
            <div className="mt-3 md:hidden">
              <div className="flex gap-[3px]">
                {weeks.slice(-26).map((week, index, list) => {
                  const month = week.find((cell) => !cell.future)?.month;
                  const prev = index ? list[index - 1].find((cell) => !cell.future)?.month : undefined;
                  return (
                    <div key={week[0]?.key ?? index} className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <span className="h-4 overflow-visible text-[9px] whitespace-nowrap text-[#6a7282]">{month !== prev ? monthShort[month ?? 0] : ""}</span>
                      {week.map((cell) => (
                        <span key={cell.key} title={`${cell.key}: ${cell.value}`} className="aspect-square w-full rounded-[2px]" style={{ background: cell.future ? "transparent" : heatColor(cell.value) }} />
                      ))}
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-right text-[10px] text-[#6a7282]">ნაკლები <span className="mx-1 inline-block size-[10px] rounded-[2px] bg-[#5c1a22]" /> <span className="inline-block size-[10px] rounded-[2px] bg-[#e93748]" /> მეტი</p>
            </div>
            <div className="mt-4 overflow-x-auto max-md:hidden">
              <div className="flex gap-[3px]">
                {weeks.map((week, index) => {
                  const month = week.find((cell) => !cell.future)?.month;
                  const prev = index ? weeks[index - 1].find((cell) => !cell.future)?.month : undefined;
                  return (
                    <div key={week[0]?.key ?? index} className="flex flex-col gap-[3px]">
                      <span className="h-4 text-[10px] text-[#6a7282]">{month !== prev ? monthShort[month ?? 0] : ""}</span>
                      {week.map((cell) => (
                        <span key={cell.key} title={`${cell.key}: ${cell.value}`} className="size-[11px] rounded-[2px]" style={{ background: cell.future ? "transparent" : heatColor(cell.value) }} />
                      ))}
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-right text-[11px] text-[#6a7282]">ნაკლები <span className="mx-1 inline-block size-[11px] rounded-[2px] bg-[#5c1a22]" /> <span className="inline-block size-[11px] rounded-[2px] bg-[#e93748]" /> მეტი</p>
            </div>
          </section>

          <section className="rounded-2xl border border-white/8 bg-[#0c0c0c] p-4 max-md:border-0 max-md:bg-[#121214]">
            <h2 className="font-extrabold text-white">ბიბლიოთეკა</h2>
            <p className="mt-1 text-sm text-[#99a1af]">სია დღეს</p>
            {library.length ? (
              <div className="mt-4 flex items-center gap-4">
                <svg viewBox="0 0 80 80" className="size-24 -rotate-90">
                  {donut.map((part) => (
                    <circle key={part.id} cx="40" cy="40" r={radius} fill="none" stroke={part.color} strokeWidth="8" strokeDasharray={`${part.length} ${circumference - part.length}`} strokeDashoffset={-part.offset} />
                  ))}
                </svg>
                <ul className="min-w-0 flex-1 space-y-2">
                  {library.map((list) => (
                    <li key={list.id} className="flex items-center gap-2 text-sm">
                      <span className="h-2 w-8 rounded-full" style={{ background: list.color }} />
                      <span className="min-w-0 flex-1 truncate text-[#d1d5dc]">{list.label}</span>
                      <span className="font-bold text-white">{Math.round((list.count / libraryTotal) * 100)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : <p className="mt-10 text-center text-sm text-[#99a1af]">სია ცარიელია</p>}
          </section>
        </div>

        <div className="mt-6 flex gap-4 border-b border-white/8 max-md:grid max-md:grid-cols-4 max-md:gap-1 max-md:rounded-xl max-md:border-0 max-md:bg-[#121214] max-md:p-1">
          {ranges.map((item) => (
            <button key={item.id} type="button" className={`border-b-2 px-1 pb-2 text-sm font-bold max-md:h-9 max-md:rounded-lg max-md:border-0 max-md:pb-0 max-md:text-xs ${range === item.id ? "border-[#e93748] text-white max-md:bg-[#e93748]" : "border-transparent text-[#99a1af]"}`} onClick={() => { setRange(item.id); setShown(6); }}>
              {item.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-[#6a7282]">{range ? `შედარება წინა ${range} დღესთან` : "მთელი პერიოდი"}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 *:min-w-0 max-md:gap-2 lg:grid-cols-6">
          {[
            ["ყურების დრო", minutesLabel(range ? watched.minutes : data.totals.minutes)],
            ["ეპიზოდები", String(range ? watched.episodes : data.totals.episodes)],
            ["ანიმე", String(range ? watched.anime : data.totals.anime)],
            ["დასრულებული", String(profile.stats.completed)],
            ["კომენტარები", String(range ? current.comments : data.totals.comments)],
          ].map(([label, value]) => (
            <article key={label} className="rounded-xl border border-white/8 bg-[#0c0c0c] p-3 max-md:border-0 max-md:bg-[#121214]">
              <p className="text-xs text-[#99a1af]">{label}</p>
              <p className="mt-1 truncate text-2xl font-extrabold text-white max-md:text-xl">{value}</p>
            </article>
          ))}
          <article className="rounded-xl border border-white/8 bg-[#0c0c0c] p-3 max-md:border-0 max-md:bg-[#121214]">
            <p className="flex items-center justify-between text-xs text-[#99a1af]">აქტიური დღეები {range && activeDelta ? <span className={activeDelta > 0 ? "text-white" : "text-[#e93748]"}>{activeDelta > 0 ? `+${activeDelta}` : activeDelta}</span> : null}</p>
            <p className="mt-1 text-2xl font-extrabold text-white max-md:text-xl">{current.active}{range ? <span className="text-base text-[#6a7282]">/{range}</span> : null}</p>
          </article>
        </div>

        <div className="mt-4 grid gap-4 *:min-w-0 lg:grid-cols-2">
          <section className="rounded-2xl border border-white/8 bg-[#0c0c0c] p-4 max-md:border-0 max-md:bg-[#121214]">
            <h2 className="font-extrabold text-white">ყურების დრო</h2>
            <p className="text-sm text-[#99a1af]">დღეში, აქტიური {current.active} / {range || "სულ"}</p>
            {bars.some((bar) => bar.minutes) ? (
              <div className="mt-4 flex h-36 items-end gap-1">
                {bars.map((bar) => (
                  <div key={bar.key} title={`${bar.label}: ${minutesLabel(bar.minutes)}`} className="min-w-0 flex-1 rounded-t bg-[#e93748]" style={{ height: `${Math.max(4, (bar.minutes / barMax) * 100)}%` }} />
                ))}
              </div>
            ) : <p className="py-16 text-center text-sm text-[#99a1af]">ამ პერიოდში ყურება არ ყოფილა</p>}
            <div className="mt-2 flex justify-between text-[11px] text-[#6a7282]">
              <span>{bars[0]?.label}</span>
              <span>{bars.at(-1)?.label}</span>
            </div>
          </section>
          <section className="rounded-2xl border border-white/8 bg-[#0c0c0c] p-4 max-md:border-0 max-md:bg-[#121214]">
            <h2 className="font-extrabold text-white">ტოპ ჟანრები</h2>
            <p className="text-sm text-[#99a1af]">ნანახი ანიმეების მიხედვით</p>
            {genres.length ? (
              <ul className="mt-4 space-y-3">
                {genres.map((genre) => (
                  <li key={genre.name}>
                    <div className="mb-1 flex justify-between text-sm"><span className="text-white">{genre.name}</span><span className="text-[#99a1af]">{genre.count}</span></div>
                    <div className="h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-[#e93748]" style={{ width: `${(genre.count / genreMax) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            ) : <p className="py-16 text-center text-sm text-[#99a1af]">ამ პერიოდში ყურება არ ყოფილა</p>}
          </section>
          <section className="rounded-2xl border border-white/8 bg-[#0c0c0c] p-4 max-md:border-0 max-md:bg-[#121214]">
            <h2 className="font-extrabold text-white">როდის უყურებს</h2>
            <p className="text-sm text-[#99a1af]">ეპიზოდები კვირის დღისა და საათის მიხედვით</p>
            {hourGrid.some((row) => row.some(Boolean)) ? (
              <div className="mt-4 overflow-x-auto">
                <div className="mb-1 ml-10 flex text-[10px] text-[#6a7282] max-md:grid max-md:grid-cols-4">{[0, 6, 12, 18].map((hour) => <span key={hour} className="w-[72px] max-md:w-auto">{String(hour).padStart(2, "0")}:00</span>)}</div>
                {hourGrid.map((row, index) => (
                  <div key={weekdays[index]} className="mt-1 flex items-center gap-2">
                    <span className="w-8 shrink-0 text-[11px] text-[#6a7282]">{weekdays[index]}</span>
                    <div className="flex gap-px max-md:min-w-0 max-md:flex-1">
                      {row.map((value, hour) => <span key={hour} title={`${weekdays[index]} ${hour}:00 · ${value}`} className="size-2.5 rounded-[2px] max-md:aspect-square max-md:size-auto max-md:min-w-0 max-md:flex-1" style={{ background: value ? `rgba(233,55,72,${0.25 + (value / hourMax) * 0.75})` : "#1a1a1a" }} />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="py-16 text-center text-sm text-[#99a1af]">ამ პერიოდში ეპიზოდი არ ყოფილა</p>}
          </section>
          <section className="rounded-2xl border border-white/8 bg-[#0c0c0c] p-4 max-md:border-0 max-md:bg-[#121214]">
            <h2 className="font-extrabold text-white">ბოლოს ნანახი</h2>
            <p className="text-sm text-[#99a1af]">არჩეულ პერიოდში</p>
            {recentTitles.length ? (
              <ul className="mt-4 space-y-3">
                {recentTitles.map((item) => (
                  <li key={`${item.slug}-${item.day}`}>
                    <a href={animeHref(item.slug)} className="flex min-w-0 items-center gap-3">
                      {item.poster ? <img src={item.poster} alt="" className="h-12 w-9 shrink-0 rounded object-cover" /> : <span className="h-12 w-9 shrink-0 rounded bg-white/10" />}
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-white">{item.title}</span><span className="text-xs text-[#99a1af]">{item.day}{item.seconds ? ` · ${minutesLabel(Math.round(item.seconds / 60))}` : ""}</span></span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : <p className="py-16 text-center text-sm text-[#99a1af]">ამ პერიოდში ყურება არ ყოფილა</p>}
          </section>
          <section className="rounded-2xl border border-white/8 bg-[#0c0c0c] p-4 max-md:border-0 max-md:bg-[#121214]">
            <h2 className="font-extrabold text-white">ბოლო აქტივობა</h2>
            <p className="text-sm text-[#99a1af]">ეპიზოდები და კომენტარები</p>
            {groups.length ? (
              <div className="mt-4 space-y-4">
                {groups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-2 text-[11px] font-bold tracking-wide text-[#99a1af]">{group.label}</p>
                    <ul className="space-y-3 border-l border-[#e93748]/40 pl-3">
                      {group.items.map((event) => (
                        <li key={event.id} className="relative min-w-0 [overflow-wrap:anywhere]">
                          <span className="absolute top-1.5 -left-[17px] size-2 rounded-full bg-[#e93748]" />
                          <p className="text-[11px] text-[#6a7282]">{event.at.slice(11, 16)}</p>
                          <p className="text-[11px] font-bold tracking-wide" style={{ color: event.kind === "comment" ? "#6ea8ff" : "#e93748" }}>{event.kind === "comment" ? "კომენტარი" : "ყურება"}</p>
                          {event.slug ? <a href={animeHref(event.slug)} className="text-sm font-bold text-white hover:underline">{event.title}{event.episode ? ` · ეპ ${event.episode}` : ""}</a> : <p className="text-sm font-bold text-white">{event.title}</p>}
                          {event.text ? <p className="line-clamp-3 text-xs text-[#99a1af]">{event.text}</p> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {shown < events.length ? <button type="button" className="w-full rounded-lg border border-white/10 py-2 text-xs font-bold tracking-wide text-[#d1d5dc]" onClick={() => setShown((count) => count + 6)}>მეტის ჩატვირთვა</button> : null}
              </div>
            ) : <p className="py-16 text-center text-sm text-[#99a1af]">აქტივობა ჯერ არ არის</p>}
          </section>
          <div className="space-y-4">
            <section className="rounded-2xl border border-white/8 bg-[#0c0c0c] p-4 max-md:border-0 max-md:bg-[#121214]">
              <h2 className="font-extrabold text-white">სეზონის ანგარიში</h2>
              <p className="text-sm text-[#99a1af]">ბოლო 90 დღე</p>
              <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div><dt className="text-[#99a1af]">წუთი</dt><dd className="font-bold text-white">{formatCount(data.season.minutes)}</dd></div>
                <div><dt className="text-[#99a1af]">ანიმე</dt><dd className="font-bold text-white">{formatCount(data.season.episodes)}</dd></div>
                <div><dt className="text-[#99a1af]">კომენტარი</dt><dd className="font-bold text-white">{formatCount(data.season.comments)}</dd></div>
              </dl>
            </section>
            <section className="rounded-2xl border border-white/8 bg-[#0c0c0c] p-4 max-md:border-0 max-md:bg-[#121214]">
              <h2 className="font-extrabold text-white">სულ</h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-[#99a1af]">წევრი გახდა</dt><dd className="font-bold text-white">{profile.joinedMonth}</dd></div>
                <div><dt className="text-[#99a1af]">ყურების დრო</dt><dd className="font-bold text-white">{minutesLabel(data.totals.minutes)}</dd></div>
                <div><dt className="text-[#99a1af]">ეპიზოდები</dt><dd className="font-bold text-white">{formatCount(data.totals.episodes)}</dd></div>
                <div><dt className="text-[#99a1af]">ანიმე</dt><dd className="font-bold text-white">{formatCount(data.totals.anime)}</dd></div>
                <div><dt className="text-[#99a1af]">დასრულებული</dt><dd className="font-bold text-white">{profile.stats.completed}</dd></div>
                <div><dt className="text-[#99a1af]">საუკეთესო სერია</dt><dd className="font-bold text-white">{profile.streak} დღე</dd></div>
                <div><dt className="text-[#99a1af]">ჯამური XP</dt><dd className="font-bold text-white">{formatCount(profile.totalXp)}</dd></div>
              </dl>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
