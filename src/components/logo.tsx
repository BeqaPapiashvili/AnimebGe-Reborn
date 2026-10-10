export function Logo({ className = "" }: { className?: string }) {
  return <img src="/logo2.png" alt="Animeb" className={`h-9 w-auto object-contain mix-blend-lighten ${className}`} />;
}
