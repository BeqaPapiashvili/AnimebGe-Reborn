function videoFile(src: string) {
  return /\.(mp4|webm|mov|m4v)$/i.test(src.split("?")[0] ?? "");
}

export function LiveMedia({ src, alt = "", className = "" }: { src: string; alt?: string; className?: string }) {
  if (videoFile(src)) return <video src={src} autoPlay muted loop playsInline className={className} />;
  return <img src={src} alt={alt} className={className} />;
}
