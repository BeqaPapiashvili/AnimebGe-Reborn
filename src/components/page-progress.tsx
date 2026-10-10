"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "run" | "done";

export function PageProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const route = `${pathname}?${search.toString()}`;
  const [token, setToken] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");
  const gen = useRef(0);
  const started = useRef(0);
  const routeRef = useRef(route);
  const finishTimer = useRef(0);

  function begin() {
    if (phaseRef.current === "run") return;
    window.clearTimeout(finishTimer.current);
    const id = ++gen.current;
    started.current = Date.now();
    phaseRef.current = "run";
    // Next updates the address inside useInsertionEffect. setState there throws.
    window.setTimeout(() => {
      if (gen.current !== id) return;
      setToken(id);
      setPhase("run");
    }, 0);
    finishTimer.current = window.setTimeout(() => finish(id), 8000);
  }

  function finish(id = gen.current) {
    window.clearTimeout(finishTimer.current);
    const wait = Math.max(0, 520 - (Date.now() - started.current));
    finishTimer.current = window.setTimeout(() => {
      if (gen.current !== id) return;
      phaseRef.current = "done";
      setPhase("done");
      finishTimer.current = window.setTimeout(() => {
        if (gen.current !== id) return;
        phaseRef.current = "idle";
        setPhase("idle");
      }, 340);
    }, wait);
  }

  useEffect(() => {
    function samePlace(url: URL) {
      return url.origin === location.origin && url.pathname === location.pathname && url.search === location.search;
    }
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      let url: URL;
      try {
        url = new URL(link.href, location.href);
      } catch {
        return;
      }
      if (samePlace(url)) return;
      begin();
    }
    const push = history.pushState.bind(history);
    const replace = history.replaceState.bind(history);
    function arm(next: unknown) {
      if (typeof next !== "string" || next.startsWith("#")) return;
      try {
        const url = new URL(next, location.href);
        if (url.pathname === location.pathname) return;
        if (!samePlace(url)) begin();
      } catch {
        /* ignore malformed history urls */
      }
    }
    history.pushState = ((...args: Parameters<History["pushState"]>) => {
      arm(args[2]);
      return push(...args);
    }) as History["pushState"];
    history.replaceState = ((...args: Parameters<History["replaceState"]>) => {
      arm(args[2]);
      return replace(...args);
    }) as History["replaceState"];
    function onPop() {
      if (location.pathname === routeRef.current.split("?")[0]) return;
      begin();
    }
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => {
      history.pushState = push;
      history.replaceState = replace;
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      window.clearTimeout(finishTimer.current);
    };
  }, []);

  useEffect(() => {
    if (routeRef.current === route) return;
    routeRef.current = route;
    if (phaseRef.current === "idle") return;
    finish();
  }, [route]);

  if (phase === "idle") return null;
  return (
    <div className={`page-progress${phase === "done" ? " is-done" : ""}`} role="progressbar" aria-hidden="true">
      <div key={token} className="page-progress-bar" />
    </div>
  );
}
