import type { ReactNode } from "react";

export const inputClass = "h-auto w-full rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-primary/50";
export const areaClass = "w-full resize-y rounded-3xl border border-white/10 bg-black/40 px-6 py-5 text-sm leading-relaxed text-white outline-none placeholder:text-white/20 focus:border-primary/50";
export const quietClass = "inline-flex cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-[10px] tracking-widest text-white uppercase hover:bg-white/10";
export const dangerClass = "inline-flex cursor-pointer items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-[10px] tracking-widest text-red-500 uppercase";

export function SiteCta({ href, children, submit, form }: { href?: string; children: ReactNode; submit?: boolean; form?: string }) {
  const className = "inline-flex cursor-pointer items-center justify-center gap-3 rounded-2xl bg-primary px-8 py-4 text-[10px] tracking-widest text-white uppercase shadow-xl shadow-primary/20 hover:bg-primary/90";
  if (href) return <a href={href} className={className}>{children}</a>;
  return <button type={submit ? "submit" : "button"} form={form} className={className}>{children}</button>;
}

export function PageHead({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="sticky top-0 z-40 border-b border-white/5 bg-[#020202]/80 px-8 py-8 backdrop-blur-2xl lg:px-12">
      <div className="mx-auto flex max-w-[1600px] flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-6">
          <div className="grid size-16 place-items-center rounded-[2rem] border border-white/10 bg-white/5">
            <span className="h-7 w-1.5 rounded-sm bg-primary" />
          </div>
          <div>
            <h1 className="mb-2 text-4xl tracking-tight">{title}</h1>
            {text ? <p className="text-[10px] tracking-[0.2em] text-white/30 uppercase">{text}</p> : null}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AdminBody({ children }: { children: ReactNode }) {
  return <div className="relative z-10 mx-auto max-w-[1600px] space-y-8 px-8 pt-12 pb-20 lg:px-12">{children}</div>;
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-[2.5rem] border border-white/5 bg-white/[0.02] ${className}`}>{children}</div>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0 space-y-3">
      <span className="ml-2 block text-[10px] tracking-[0.2em] text-white/60 uppercase">{label}</span>
      {children}
    </label>
  );
}

export function onPill(on: boolean) {
  return on
    ? "rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-[8px] tracking-[0.2em] text-green-500 uppercase"
    : "rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[8px] tracking-[0.2em] text-red-500 uppercase";
}
