"use client";

import { useEffect, useMemo, useState } from "react";
import { Apple, Ban, Cat, Flag, Hand, House, Lightbulb, Smile, Volleyball } from "lucide-react";
import data from "@emoji-mart/data";

type Emoji = { id: string; native: string; name: string; keywords: string[] };
type Category = { id: string; emojis: Emoji[] };

const source = data as {
  categories: { id: string; emojis: string[] }[];
  emojis: Record<string, { name: string; keywords?: string[]; skins: { native: string }[] }>;
};

const icons = {
  people: Smile,
  hands: Hand,
  nature: Cat,
  foods: Apple,
  places: House,
  activity: Volleyball,
  objects: Lightbulb,
  symbols: Ban,
  flags: Flag,
} as const;

const handWords = ["hand", "finger", "thumb", "clap", "wave", "palm", "fist", "point", "pinch", "vulcan"];
const recentKey = "animeb.emojiRecent";
const starter = ["❤️", "👍", "😂", "🤣", "😍", "🔥", "😭", "😎"];

function loadRecent() {
  try {
    const saved = JSON.parse(localStorage.getItem(recentKey) ?? "[]") as string[];
    const list = saved.filter((item) => item).slice(0, 16);
    return list.length ? list : starter;
  } catch {
    return starter;
  }
}

export function RoomEmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<keyof typeof icons>("people");
  const [recent, setRecent] = useState<string[]>(starter);

  useEffect(() => setRecent(loadRecent()), []);

  const catalog = useMemo<Category[]>(() => {
    const people = source.categories.find((item) => item.id === "people");
    const mapped = source.categories.map((item) => ({
      id: item.id,
      emojis: item.emojis.flatMap((id) => {
        const emoji = source.emojis[id];
        const native = emoji?.skins[0]?.native;
        if (!emoji || !native) return [];
        return [{ id, native, name: emoji.name, keywords: emoji.keywords ?? [] }];
      }),
    }));
    const hands = (people?.emojis ?? []).flatMap((id) => {
      const emoji = source.emojis[id];
      const native = emoji?.skins[0]?.native;
      const words = `${emoji?.name ?? ""} ${(emoji?.keywords ?? []).join(" ")}`.toLowerCase();
      if (!emoji || !native || !handWords.some((word) => words.includes(word))) return [];
      return [{ id, native, name: emoji.name, keywords: emoji.keywords ?? [] }];
    });
    const peopleIndex = mapped.findIndex((item) => item.id === "people");
    mapped.splice(peopleIndex + 1, 0, { id: "hands", emojis: hands });
    return mapped;
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog.find((item) => item.id === category)?.emojis ?? [];
    return catalog.flatMap((item) => item.emojis).filter((emoji) => emoji.name.toLowerCase().includes(q) || emoji.keywords.some((word) => word.includes(q)));
  }, [catalog, category, query]);

  function choose(native: string) {
    const next = [native, ...recent.filter((item) => item !== native)].slice(0, 16);
    setRecent(next);
    try { localStorage.setItem(recentKey, JSON.stringify(next)); } catch {}
    onPick(native);
  }

  return (
    <div className="flex h-[420px] w-full flex-col overflow-hidden rounded-[12px] border border-white/10 bg-[#111214] shadow-[0_16px_40px_rgba(0,0,0,0.65)]">
      <div className="px-2 pt-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          aria-label="ემოჯის ძებნა"
          className="h-9 w-full rounded-[8px] border border-white/10 bg-black px-3 text-[13px] text-white outline-none placeholder:text-[#8b929e]"
        />
      </div>
      <div className="flex items-center justify-between px-1 pt-1">
        {(Object.keys(icons) as (keyof typeof icons)[]).map((id) => {
          const Icon = icons[id];
          const on = !query && category === id;
          return (
            <button key={id} type="button" aria-label={id} className={`relative grid h-8 flex-1 place-items-center ${on ? "text-[#e93748]" : "text-[#9ca3af]"}`} onClick={() => { setCategory(id); setQuery(""); }}>
              <Icon size={16} strokeWidth={1.8} />
              {on ? <span className="absolute inset-x-1.5 bottom-0 h-0.5 bg-[#e93748]" /> : null}
            </button>
          );
        })}
      </div>
      <div className="emoji-scroll min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <div className="grid grid-cols-8 gap-0.5">
          {shown.map((emoji) => (
            <button key={emoji.id} type="button" title={emoji.name} className="grid h-8 place-items-center rounded-[6px] text-[22px] leading-none hover:bg-white/10" onClick={() => choose(emoji.native)}>
              {emoji.native}
            </button>
          ))}
        </div>
        {shown.length === 0 ? <p className="py-8 text-center text-[12px] text-[#8b929e]">ვერ მოიძებნა</p> : null}
      </div>
      <div className="flex gap-0.5 overflow-x-auto border-t border-white/10 px-2 py-1.5">
        {recent.map((emoji) => (
          <button key={emoji} type="button" className="grid size-8 shrink-0 place-items-center rounded-[6px] text-[20px] leading-none hover:bg-white/10" onClick={() => choose(emoji)}>
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
