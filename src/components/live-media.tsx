"use client";

import { useEffect, useRef, type ImgHTMLAttributes } from "react";
import { cardThumb } from "@/lib/thumbs";

function videoFile(src: string) {
  return /\.(mp4|webm|mov|m4v)$/i.test(src.split("?")[0] ?? "");
}

export function LazyVideo({ src, poster, className = "", autoplay = false }: { src: string; poster?: string; className?: string; autoplay?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const play = () => {
      el.preload = "auto";
      void el.play().catch(() => undefined);
    };
    const stop = () => el.pause();
    if (!autoplay) {
      const host = el.parentElement ?? el;
      host.addEventListener("mouseenter", play);
      host.addEventListener("mouseleave", stop);
      return () => {
        host.removeEventListener("mouseenter", play);
        host.removeEventListener("mouseleave", stop);
      };
    }
    const observer = new IntersectionObserver(([entry]) => (entry.isIntersecting ? play() : stop()), { rootMargin: "200px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [src, autoplay]);
  return <video ref={ref} src={src} poster={poster} muted loop playsInline preload={autoplay ? "none" : "metadata"} className={className} />;
}

export function CardImg({ src, alt = "", ...rest }: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src: string }) {
  const thumb = cardThumb(src);
  return (
    <img
      {...rest}
      src={thumb}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={(event) => {
        if (event.currentTarget.src.endsWith(thumb) && thumb !== src) event.currentTarget.src = src;
      }}
    />
  );
}

export function LiveMedia({ src, alt = "", className = "", autoplay = true }: { src: string; alt?: string; className?: string; autoplay?: boolean }) {
  if (videoFile(src)) return <LazyVideo src={src} className={className} autoplay={autoplay} />;
  return <img src={src} alt={alt} loading="lazy" decoding="async" className={className} />;
}
