"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function keyOf(storage: Storage, name: string) {
  try {
    let value = storage.getItem(name);
    if (!value) {
      value = crypto.randomUUID();
      storage.setItem(name, value);
    }
    return value;
  } catch {
    return crypto.randomUUID();
  }
}

export function PresenceBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    const ids = { visitor: keyOf(localStorage, "animeb.visitor"), tab: keyOf(sessionStorage, "animeb.tab") };
    const send = () => {
      void fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ids, path: location.pathname, title: document.title, referrer: document.referrer, hidden: document.visibilityState === "hidden" }),
        keepalive: true,
      }).catch(() => undefined);
    };
    const leave = () => navigator.sendBeacon("/api/presence", new Blob([JSON.stringify({ ...ids, leave: true })], { type: "application/json" }));
    const first = window.setTimeout(send, 600);
    const loop = window.setInterval(send, 20_000);
    document.addEventListener("visibilitychange", send);
    window.addEventListener("pageshow", send);
    window.addEventListener("pagehide", leave);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(loop);
      document.removeEventListener("visibilitychange", send);
      window.removeEventListener("pageshow", send);
      window.removeEventListener("pagehide", leave);
    };
  }, [pathname]);
  return null;
}
