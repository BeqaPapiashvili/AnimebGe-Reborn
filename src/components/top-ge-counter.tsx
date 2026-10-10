"use client";

import { useEffect, useRef } from "react";

const SITE_ID = "115911";

type CounterWindow = Window & { __topGeBadge?: Element | null; __topGeLoading?: boolean };

export function TopGeCounter({ className = "" }: { className?: string }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    const win = window as CounterWindow;
    if (!el) return;
    // counter.js ერთხელ უნდა ჩაიტვირთოს: ის თავად აკვირდება history.pushState-ს
    if (win.__topGeBadge) {
      el.appendChild(win.__topGeBadge);
      return;
    }
    if (win.__topGeLoading) return;
    win.__topGeLoading = true;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://counter.top.ge/counter.js";
    script.onload = () => {
      win.__topGeBadge = document.getElementById("top-ge-counter-container")?.firstElementChild ?? null;
    };
    document.body.appendChild(script);
  }, []);

  return <div ref={box} id="top-ge-counter-container" data-site-id={SITE_ID} className={className} />;
}
