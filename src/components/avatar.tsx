"use client";

import { useState } from "react";
import { LiveMedia } from "@/components/live-media";
import { imageSrc } from "@/lib/dle";

export function FrameOverlay({ src, className, style }: { src?: string; className: string; style?: React.CSSProperties }) {
  const [hidden, setHidden] = useState(false);
  if (!imageSrc(src) || hidden) return null;
  return <img src={src} alt="" className={className} style={style} onError={() => setHidden(true)} />;
}

export function Avatar({ src, frame, alt = "", size, faceClass = "" }: { src?: string; frame?: string; alt?: string; size: number; faceClass?: string }) {
  const ring = Math.round(size * 1.32);
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <LiveMedia src={src || "/assets/avatar.jpg"} alt={alt} className={`size-full rounded-full object-cover ${faceClass}`} />
      <FrameOverlay src={frame} className="pointer-events-none absolute top-1/2 left-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 object-contain" style={{ width: ring, height: ring }} />
    </span>
  );
}
