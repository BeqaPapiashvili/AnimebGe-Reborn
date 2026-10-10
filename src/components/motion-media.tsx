"use client";

import { useState } from "react";
import { stillSrc } from "@/lib/dle";

function videoFile(src: string) {
  return /\.(mp4|webm|mov|m4v)$/i.test(src.split("?")[0] ?? "");
}

export function MotionMedia({ src, alt = "", className = "", active }: { src: string; alt?: string; className?: string; active?: boolean }) {
  const [hover, setHover] = useState(false);
  const hot = active ?? hover;
  const poster = stillSrc(src);
  const play = hot && !!poster;
  return (
    <span className={`relative block overflow-hidden ${className}`} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {play && videoFile(src) ? (
        <video src={src} poster={poster} autoPlay muted loop playsInline className="h-full w-full object-cover" />
      ) : (
        <img src={play ? src : poster || src} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      )}
    </span>
  );
}
