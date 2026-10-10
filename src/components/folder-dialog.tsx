"use client";

import { useEffect, useState } from "react";

export type Folder = { id: number; name: string; has: boolean };

export function FolderDialog({ title, folders, onCreate, onToggle, onClose }: { title: string; folders: Folder[]; onCreate: (name: string) => void; onToggle: (id: number) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const clean = name.trim();
  const taken = folders.some((folder) => folder.name.toLowerCase() === clean.toLowerCase());

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!clean || taken) return;
    onCreate(clean);
    setName("");
  }

  return (
    <div className="folder-overlay fixed inset-0 z-[70] grid place-items-center bg-black/60 px-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="folder-dialog relative w-full max-w-[398px] overflow-hidden rounded-[14px] border border-white/7 bg-[#0a0a0a] p-[22px] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.04)]" role="dialog" aria-modal="true" aria-labelledby="folder-title">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,rgba(233,55,72,0)_0%,rgba(233,55,72,0.55)_20%,#e93748_50%,rgba(233,55,72,0.55)_80%,rgba(233,55,72,0)_100%)]" />
        <div className="relative border-b border-white/7 pb-3">
          <h2 id="folder-title" className="text-lg leading-[27px] font-extrabold tracking-[-0.18px] text-white">საქაღალდეში დამატება</h2>
          <p className="truncate pt-[3px] text-[12.5px] leading-[18.75px] text-[#8b929e]">{title}</p>
          <span className="folder-dash absolute -bottom-px left-0 h-[2px] w-[72px]" />
        </div>

        <div className="detail-scroll mt-3.5 max-h-[320px] overflow-y-auto">
          {folders.length ? (
            <div className="flex flex-col gap-0.5">
              {folders.map((folder) => (
                <button key={folder.id} type="button" role="menuitemcheckbox" aria-checked={folder.has} className={`list-item ${folder.has ? "is-on" : ""}`} onClick={() => onToggle(folder.id)}>
                  <span className="list-icon" style={{ "--icon": "url(/assets/detail/list/folder.svg)" } as React.CSSProperties} />
                  <span className="truncate">{folder.name}</span>
                  {folder.has ? <img src="/assets/detail/list/check.svg" alt="" width={16} height={16} className="ml-auto" /> : null}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 px-3 py-[22px]">
              <img src="/assets/detail/list/folder-empty.svg" alt="" width={24} height={24} />
              <p className="text-center text-[12.5px] leading-[18.75px] text-[#7c8592]">საქაღალდე ჯერ არ არის. პირველი ქვემოთ შექმენი.</p>
            </div>
          )}
        </div>

        <form className="mt-3.5 flex gap-2 border-t border-white/7 pt-2.5" onSubmit={submit}>
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={40} placeholder="ახალი საქაღალდის სახელი" aria-label="ახალი საქაღალდის სახელი" className="folder-input h-11 min-w-0 flex-1 rounded-lg border border-white/9 bg-white/4 px-3 text-[13.5px] text-white outline-none placeholder:text-[#4b5563]" />
          <button type="submit" disabled={!clean || taken} className="folder-create relative flex h-11 w-[111px] shrink-0 items-center gap-[5px] overflow-hidden border px-[14px] text-[12.5px] leading-[18.75px] font-extrabold tracking-[0.75px] uppercase">
            <span className="list-icon relative" style={{ "--icon": "url(/assets/detail/list/plus.svg)" } as React.CSSProperties} />
            <span className="relative">შექმნა</span>
          </button>
        </form>

        <div className="mt-3.5 flex justify-end">
          <button type="button" className="folder-done border border-white/9 bg-[#141414] px-[18px] py-2 text-[13px] leading-[19.5px] font-bold text-[#d6dae2]" onClick={onClose}>
            მზადაა
          </button>
        </div>
      </div>
    </div>
  );
}
