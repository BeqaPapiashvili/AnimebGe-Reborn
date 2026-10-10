"use client";

import { useEffect, useState } from "react";

type Note = { id: number; text: string };

let emit: ((text: string) => void) | null = null;

export function toast(text: string) {
  emit?.(text);
}

export function Toaster() {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    emit = (text) => {
      const id = Date.now() + Math.random();
      setNotes((list) => [...list.slice(-2), { id, text }]);
      window.setTimeout(() => setNotes((list) => list.filter((item) => item.id !== id)), 2800);
    };
    return () => {
      emit = null;
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[90] flex flex-col items-center gap-2 px-4">
      {notes.map((note) => (
        <div key={note.id} className="flex max-w-[min(100%,420px)] items-center gap-3 rounded-[10px] border border-white/10 bg-[#16181e] px-4 py-3 text-[14px] leading-5 text-white shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#22c55e]">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2.5 6.2 4.7 8.4 9.5 3.6" stroke="#052e16" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span>{note.text}</span>
        </div>
      ))}
    </div>
  );
}
