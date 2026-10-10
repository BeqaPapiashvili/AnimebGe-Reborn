"use client";

import { useState } from "react";
import { inputClass } from "@/components/admin-ui";

export function PosterField({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div>
      <p className="text-sm text-white">{label}</p>
      <div className="mx-auto mt-2 aspect-[2/3] w-full max-w-[180px] overflow-hidden rounded-xl border border-white/8 bg-[#141414]">
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center px-3 text-center text-sm text-white/35">პოსტერი არ არის</div>}
      </div>
      <input name={name} value={value} onChange={(event) => setValue(event.target.value)} placeholder="სურათის ბმული" aria-label={label} className={`${inputClass} mt-3`} />
    </div>
  );
}
