"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { grouped, type LevelRank } from "@/lib/levels";

type XpPath = { id: string; on: boolean; amount: number; cap: number; after: number; max: number; percent: number; min: number; coins?: number; coinsSmall?: number; gate?: number };

function plus(value: number) {
  return `+${grouped(value)}`;
}

function clock() {
  const now = new Date();
  const hours = String(now.getUTCHours()).padStart(2, "0");
  const minutes = String(now.getUTCMinutes()).padStart(2, "0");
  const left = ((24 - now.getUTCHours()) * 60 - now.getUTCMinutes()) % (24 * 60);
  const whole = left === 0 ? 24 * 60 : left;
  return { stamp: `${hours}:${minutes}`, left: `${Math.floor(whole / 60)} სთ ${whole % 60} წთ` };
}

function RankName({ name, color, rainbow }: { name: string; color: string; rainbow?: boolean }) {
  const face = "text-[13px] leading-[19.5px] font-black tracking-[1.3px] uppercase";
  const shine = rainbow
    ? "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.95) 50%, transparent 70%), linear-gradient(110deg, #fbbf24 0%, #f472b6 28%, #38bdf8 50%, #a3e635 72%, #fbbf24 100%)"
    : `linear-gradient(110deg, transparent 34%, rgba(255,255,255,0.95) 50%, transparent 66%), linear-gradient(90deg, ${color}, ${color})`;
  return (
    <span className="relative inline-grid">
      <span aria-hidden className={`${face} col-start-1 row-start-1 blur-[7px] opacity-80`} style={{ color }}>{name}</span>
      <span className={`${face} col-start-1 row-start-1`} style={{ color, textShadow: `0 0 14px ${color}` }}>{name}</span>
      <span aria-hidden className={`${face} col-start-1 row-start-1 bg-[length:220%_100%] bg-clip-text text-transparent`} style={{ backgroundImage: shine, animation: "level-shine 2.8s linear infinite" }}>{name}</span>
    </span>
  );
}

export function LevelsView({ progressHref, onAuth, ranks, cap, rules }: { progressHref?: string; onAuth: () => void; ranks: LevelRank[]; cap: string; rules: XpPath[] }) {
  const live = (id: string) => rules.find((item) => item.id === id && item.on);
  const episode = live("episode");
  const streak = live("streak");
  const series = live("series");
  const comment = live("comment");
  const post = live("post");
  const reply = live("reply");
  const rate = live("rate");
  const earns = [
    episode ? { title: "ეპიზოდის ყურება", text: `ითვლება მაშინ, როცა ეპიზოდის ${episode.percent}% მაინც ნახავ. ერთ ეპიზოდზე მხოლოდ ერთხელ.`, value: plus(episode.amount), note: `${episode.cap > 0 ? `დღეში პირველი ${episode.cap} ეპიზოდი სრულ ქულას გაძლევს, შემდეგ თითო ${grouped(episode.after)}-ს.` : "დღიური ლიმიტი არ აქვს."} სრულზე ${grouped(episode.coins || 0)} მონეტა, შემცირებულზე ${grouped(episode.coinsSmall || 0)}. დღეში ${episode.gate || 0} შემცირებული იღებს მონეტას.` } : null,
    streak ? { title: "ყოველდღე შემოსვლა", text: "სერია იმ დღეს იწყება, როცა პირველ ეპიზოდს ნახავ.", value: `${grouped(streak.amount)} → ${grouped(streak.max || streak.amount)}`, note: `პირველ დღეს ${grouped(streak.amount)} ქულაა. ზედიზედ ყოველ დღეზე ${grouped(streak.after)}-ით იზრდება და ${grouped(streak.max || streak.amount)}-ზე ჩერდება.` } : null,
    series ? { title: "სერიალის დასრულება", text: "ანიმეს „დასრულებულში“ გადატანა. უნდა გქონდეს ნანახიც, არა მხოლოდ მონიშნული.", value: plus(series.amount), note: `${series.cap > 0 ? `დღეში მაქსიმუმ ${series.cap}. ` : ""}ერთ ანიმეზე მხოლოდ ერთხელ. ${grouped(series.coins || 0)} მონეტა.` } : null,
    comment ? { title: "კომენტარი", text: comment.min > 0 ? `${comment.min} სიმბოლო მაინც უნდა იყოს.` : "სიგრძის ზღვარი არ აქვს.", value: plus(comment.amount), note: `${comment.cap > 0 ? `დღეში ${comment.cap} კომენტარი. ` : ""}${grouped(comment.coins || 0)} მონეტა.` } : null,
    post ? { title: "პოსტი", text: post.min > 0 ? `${post.min} სიმბოლო მაინც უნდა იყოს.` : "სიგრძის ზღვარი არ აქვს.", value: plus(post.amount), note: `${post.cap > 0 ? `დღეში ${post.cap} პოსტი. ` : ""}${grouped(post.coins || 0)} მონეტა.` } : null,
    reply ? { title: "პასუხი", text: reply.min > 0 ? `${reply.min} სიმბოლო მაინც უნდა იყოს.` : "სიგრძის ზღვარი არ აქვს.", value: plus(reply.amount), note: `${reply.cap > 0 ? `დღეში ${reply.cap} პასუხი. ` : ""}${grouped(reply.coins || 0)} მონეტა.` } : null,
    rate ? { title: "შეფასება", text: "ერთ ანიმეზე ერთხელ ითვლება.", value: plus(rate.amount), note: `${rate.cap > 0 ? `დღეში ${rate.cap} შეფასება. ` : ""}${grouped(rate.coins || 0)} მონეტა.` } : null,
  ].filter((item): item is { title: string; text: string; value: string; note: string } => !!item);
  const day: [string, string][] = [];
  let dayTotal = 0;
  const streakTop = streak ? (streak.max || streak.amount) : 0;
  if (episode) {
    day.push(["დღის პირველი ეპიზოდი" + (streak ? ", სერია მაქსიმუმზე" : ""), plus(episode.amount + streakTop)]);
    dayTotal += episode.amount + streakTop;
    const rest = episode.cap > 1 ? episode.cap - 1 : 0;
    if (rest) {
      day.push([`კიდევ ${rest} ეპიზოდი, სრული ქულა`, plus(rest * episode.amount)]);
      dayTotal += rest * episode.amount;
    }
    if (episode.cap > 0 && episode.after > 0) {
      day.push(["კიდევ 2 ეპიზოდი, დღიური ლიმიტის შემდეგ", plus(2 * episode.after)]);
      dayTotal += 2 * episode.after;
    }
  } else if (streak) {
    day.push(["სერია მაქსიმუმზე", plus(streakTop)]);
    dayTotal += streakTop;
  }
  if (series) {
    day.push(["1 დასრულებული სერიალი", plus(series.amount)]);
    dayTotal += series.amount;
  }
  if (comment) {
    const count = comment.cap > 0 ? Math.min(4, comment.cap) : 4;
    day.push([`${count} კომენტარი`, plus(count * comment.amount)]);
    dayTotal += count * comment.amount;
  }
  const [time, setTime] = useState(clock);
  useEffect(() => {
    const timer = window.setInterval(() => setTime(clock()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative overflow-hidden bg-[#0a0a0a] pt-20 text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1100px]" style={{ background: "radial-gradient(ellipse 140% 70% at 50% -8%, rgba(32,32,38,0.55) 0%, rgba(16,16,18,0.28) 38%, rgba(10,10,10,0) 72%)" }} />
      <div className="rise relative mx-auto w-full max-w-[768px] px-5 pt-16 pb-32">
        <p className="text-center text-[10px] tracking-[3px] text-white/30 uppercase">
          <a href="/">მთავარი</a>
          <span className="px-2">/</span>
          <span className="text-white/55">გზამკვლევი</span>
        </p>
        <h1 className="mt-5 text-center text-[36px] leading-[48px] font-black tracking-[1px] uppercase italic drop-shadow-[0_0_28px_rgba(255,255,255,0.28)] min-[700px]:text-[44px]">დონეების სისტემა</h1>
        <p className="mx-auto mt-4 max-w-[520px] text-center text-[14px] leading-[22.75px] text-[#9ca3af]">საიტზე ყველაფერი, რასაც აკეთებ, ქულას გაძლევს. ქულა დონეს ზრდის, დონე სახელის ფერს სვამს და ეს ფერი კომენტარსა და რეიტინგშიც გყვება.</p>

        <section className="level-panel mt-14 px-[22px] py-5">
          <h2 className="text-[15.2px] leading-[22.8px] font-black tracking-[1.216px] uppercase">მოკლედ</h2>
          <p className="mt-3 text-[13px] leading-[22.75px] text-[#9ca3af]">სულ <b className="font-bold text-white">80 დონეა</b>. ბოლომდე ასვლას <b className="font-bold text-white">{cap} ქულა</b> სჭირდება. ყველაზე სწრაფადაც კი, თუ ყოველ დღე იდეალურად ითამაშებ, დაახლოებით ორი თვე გჭირდება.</p>
          <p className="mt-3 text-[13px] leading-[22.75px] text-[#9ca3af]">ქულა <b className="font-bold text-white">სამუდამოდ გროვდება</b> და მხოლოდ იზრდება. უარყოფითმა ხმამ შეიძლება შეგიმციროს საზოგადოების ქულა, მაგრამ მიღებულ დონეს ვერავინ წაგართმევს.</p>
        </section>

        <section className="mt-8">
          <h2 className="text-center text-[11.2px] leading-[16.8px] font-bold tracking-[3.584px] text-white/40 uppercase">როგორ გროვდება</h2>
          <div className="mt-4 flex flex-col gap-3">
            {earns.map((item) => (
              <article key={item.title} className="level-panel px-[22px] py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-[13px] leading-[19.5px] font-black tracking-[0.65px] uppercase">{item.title}</h3>
                    <p className="mt-1.5 text-[12.5px] leading-[20px] text-[#9ca3af]">{item.text}</p>
                  </div>
                  <span className="shrink-0 rounded-[6px] bg-[rgba(233,55,72,0.16)] px-2.5 py-1 text-[11.2px] leading-[16.8px] font-bold text-[#e93748] shadow-[0_0_18px_rgba(233,55,72,0.28)]">{item.value}</span>
                </div>
                <p className="mt-3 border-t border-white/[0.06] pt-3 text-[11.5px] leading-[17.25px] text-[#6b7280]">{item.note}</p>
              </article>
            ))}
            <article className="level-panel px-[22px] py-5">
              <h3 className="text-[11px] leading-[16.5px] font-black tracking-[1.1px] uppercase">როდის ნულდება დღიური ლიმიტი</h3>
              <p className="mt-2 text-[13px] leading-[22.75px] text-[#9ca3af]">დღიური ლიმიტი ახლდება <b className="font-bold text-white">00:00 მსოფლიო დროით</b>, არა შენს ადგილობრივ შუაღამეზე. სერიაც ამავე საათს ითვლის, ამიტომ უსაფრთხოა დღის გადაბრუნებამდე ერთი ეპიზოდი მაინც ნახო.</p>
              <p className="mt-3 text-[13px] leading-[22.75px] text-[#9ca3af]">ახლა მსოფლიო დროით არის <b className="font-bold text-white">{time.stamp}</b>, ანუ ლიმიტი განახლდება <b className="font-bold text-white">{time.left}</b>-ში.</p>
            </article>
            <article className="level-panel px-[22px] py-5">
              <h3 className="text-[11px] leading-[16.5px] font-black tracking-[1.1px] uppercase">ჩვეულებრივი დღე, შეკრებილი</h3>
              <div className="mt-2 flex flex-col gap-1.5">
                {day.map(([label, value]) => (
                  <p key={label} className="flex items-baseline justify-between gap-4 text-[12.5px] leading-[18.75px] text-[#9ca3af]">
                    <span>{label}</span>
                    <span className="shrink-0 text-[11.5px] font-bold text-[#e93748] drop-shadow-[0_0_8px_rgba(233,55,72,0.45)]">{value}</span>
                  </p>
                ))}
                <p className="mt-1 flex items-baseline justify-between gap-4 border-t border-white/[0.08] pt-2 text-[12.5px] leading-[18.75px] font-black uppercase">
                  <span>სულ</span>
                  <span className="text-[12px] normal-case">{grouped(dayTotal)} ქულა</span>
                </p>
              </div>
              <p className="mt-3 text-[11.5px] leading-[18.7px] text-[#6b7280]">ყურება წერაზე მეტს იხდის. ზემოთ შეკრებილი დღე {grouped(dayTotal)} ქულაა და ეს მაშინ, როცა სერია მაქსიმუმზეა. გამოტოვებული დღე უფრო ძვირი ჯდება, ვიდრე ერთი სესია შოგის.</p>
            </article>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-center text-[11.2px] leading-[16.8px] font-bold tracking-[3.584px] text-white/40 uppercase">კიბე</h2>
          <p className="mt-4 text-center text-[12.5px] leading-[20px] text-[#9ca3af]">ყოველ საფეხურს თავისი ფერი და ნათება აქვს. ეს ფერი ჩანს პროფილზე, კომენტარში და რეიტინგში.</p>
          <div className="mt-4 flex flex-col gap-2">
            {ranks.map((rank) => (
              <article key={rank.name} className="level-rank flex items-center gap-3.5 rounded-[10px] px-3.5 py-2.5 backdrop-blur-md" style={{ "--rank": rank.color } as CSSProperties}>
                <span className="relative h-[30px] w-[3px] shrink-0">
                  <span className="absolute inset-0 -skew-x-12 opacity-80 blur-[4px]" style={{ background: rank.color }} />
                  <span className="absolute inset-0 -skew-x-12" style={{ background: rank.color }} />
                </span>
                <span className="min-w-0 flex-1">
                  <RankName name={rank.name} color={rank.color} rainbow={rank.rainbow} />
                  <span className="mt-1.5 block text-[10px] leading-[15px] tracking-[1px] text-white/35 uppercase">{rank.range}</span>
                </span>
                <span className="text-[11px] leading-[16.5px] text-white/45">{rank.xp}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="level-panel mt-8 px-[22px] py-5">
          <h2 className="text-[15.2px] leading-[22.8px] font-black tracking-[1.216px] uppercase">მთავარი სერიაა</h2>
          <p className="mt-3 text-[13px] leading-[22.75px] text-[#9ca3af]">{streak ? `სერია იმ დღეს ითვლება, როცა პირველ ეპიზოდს ნახავ. პირველ დღეს ${grouped(streak.amount)} ქულაა, ზედიზედ ყოველ მომდევნო დღეზე ${grouped(streak.after)}-ით იზრდება და ${grouped(streak.max || streak.amount)}-ზე ჩერდება. ` : "ზედიზედ დღეების ქულა ამჟამად გამორთულია. "}ერთი გამოტოვებული დღე სერიას თავიდან აბრუნებს.</p>
          <p className="mt-3 text-[13px] leading-[22.75px] text-[#9ca3af]">პროფილის ბარათზეც „სერია“ ნულდება, ამიტომ გრძელი სერია ყველაზე ძნელი მოსაყალბებელი და ყველაზე ადვილი დასაკარგია.</p>
        </section>

        <section className="level-panel mt-8 px-[22px] py-5">
          <h2 className="text-[15.2px] leading-[22.8px] font-black tracking-[1.216px] uppercase">რა არ მუშაობს</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {[
              `ეპიზოდის ბოლომდე გადახტომა. ქულა ერიცხება მხოლოდ იმ დროს, რაც რეალურად გაეშვა${episode ? `, და ეს დრო ხანგრძლივობის ${episode.percent}% უნდა იყოს` : ""}.`,
              "ნახვის გარეშე „დასრულებულად“ მონიშვნა. ბონუსს ნახვის ისტორია სჭირდება.",
              "თავიდან ყურება ქულისთვის. ერთი ეპიზოდი და ერთი სერიალი მხოლოდ ერთხელ იხდის.",
              comment && comment.min > 0 ? `${comment.min} სიმბოლოზე მოკლე კომენტარი იწერება, ქულას არ გაძლევს.` : "გამორთული გზა ქულას არ გაძლევს.",
            ].map((text) => (
              <li key={text} className="relative pl-4 text-[13px] leading-[22px] text-[#9ca3af]">
                <span className="absolute top-2 left-0 h-[5px] w-[5px] -skew-x-12 bg-[#e93748] opacity-70" />
                {text}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a href="/leaderboard" className="rounded-[8px] bg-[#e93748] px-[22px] py-2.5 text-[11.5px] leading-[17px] font-extrabold tracking-[1.38px] text-white uppercase shadow-[0_0_24px_rgba(233,55,72,0.4)]">რეიტინგის ნახვა</a>
          {progressHref ? (
            <a href={progressHref} className="rounded-[8px] border border-white/14 px-[22px] py-2.5 text-[11.5px] leading-[17px] font-extrabold tracking-[1.38px] text-white/75 uppercase">შენი პროგრესი</a>
          ) : (
            <button type="button" className="cursor-pointer rounded-[8px] border border-white/14 px-[22px] py-2.5 text-[11.5px] leading-[17px] font-extrabold tracking-[1.38px] text-white/75 uppercase" onClick={onAuth}>შენი პროგრესი</button>
          )}
        </div>
      </div>
    </div>
  );
}
