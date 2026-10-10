"use client";

import { usePathname } from "next/navigation";
import { AlertCircle, Clapperboard, ExternalLink, Folder, Home, Layers, Link2, LogOut, MessageCircle, MessageSquare, ScrollText, Shield, SlidersHorizontal, Store, Tags, Tv, Type, Users } from "lucide-react";
import type { ReactNode } from "react";

const main = [
  { href: "/admin", label: "საწყისი გვერდი", icon: Home },
  { href: "/admin/anime", label: "ანიმეები", icon: Clapperboard },
  { href: "/admin/slugs", label: "განმეორებული ბმულები", icon: Link2 },
  { href: "/admin/shop", label: "მაღაზია", icon: Store },
  { href: "/admin/play", label: "თამაში", icon: Layers },
  { href: "/admin/fonts", label: "ფონტები", icon: Type },
  { href: "/admin/site", label: "საიტი", icon: SlidersHorizontal },
  { href: "/admin/log", label: "ჩანაწერი", icon: ScrollText },
  { href: "/admin/reports", label: "რეპორტები", icon: AlertCircle },
  { href: "/admin/users", label: "მომხმარებლები", icon: Users },
  { href: "/admin/genres", label: "ჟანრები", icon: Tags },
];

const manage = [
  { href: "/admin/comments", label: "კომენტარები", icon: MessageCircle },
  { href: "/admin/community", label: "საზოგადოება", icon: MessageSquare },
  { href: "/admin/rooms", label: "ოთახები", icon: Tv },
  { href: "/admin/folders", label: "სიები", icon: Folder },
];

function Nav({ href, label, icon: Icon, on }: { href: string; label: string; icon: typeof Home; on: boolean }) {
  return (
    <a href={href} className={`group relative flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-all duration-300 ${on ? "border border-white/5 bg-white/[0.04] text-white shadow-xl" : "text-white/40 hover:bg-white/[0.02] hover:text-white"}`}>
      {on ? <span className="absolute top-1/4 bottom-1/4 left-0 w-1 rounded-r-full bg-primary shadow-[0_0_15px_rgba(233,55,72,0.8)]" /> : null}
      <Icon className={`h-5 w-5 transition-all duration-300 ${on ? "scale-110 text-primary" : "group-hover:scale-110 group-hover:text-white"}`} />
      <span className={`text-sm tracking-tight ${on ? "translate-x-1" : ""}`}>{label}</span>
      {on ? <span className="ml-auto size-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(233,55,72,0.5)]" /> : null}
    </a>
  );
}

export function AdminShell({ name, children }: { name: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));
  async function leave() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }
  return (
    <div className="flex min-h-screen bg-[#020202] text-white selection:bg-primary/30">
      <aside className="fixed top-0 left-0 z-50 hidden h-screen w-72 flex-col overflow-hidden border-r border-white/5 bg-[#050505] lg:flex">
        <div className="pointer-events-none absolute top-0 left-0 h-32 w-full bg-primary/5 blur-[80px]" />
        <div className="relative border-b border-white/5 p-8">
          <a href="/admin" className="group flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary shadow-[0_0_30px_rgba(233,55,72,0.3)]">
              <Shield className="size-6 text-white" />
            </span>
            <span>
              <span className="block text-xl leading-none tracking-tighter group-hover:text-primary">Animeb</span>
              <span className="mt-1 block text-[10px] tracking-[0.2em] text-white/30 uppercase">Admin Panel</span>
            </span>
          </a>
        </div>
        <nav className="relative z-10 flex-1 space-y-10 overflow-y-auto p-6">
          <div>
            <div className="mb-4 flex items-center justify-between px-4">
              <span className="text-[10px] tracking-[0.2em] text-white/20 uppercase">საბაზისო ფუნქციები</span>
              <span className="h-px w-8 bg-white/5" />
            </div>
            <div className="space-y-1.5">{main.map((item) => <Nav key={item.href} {...item} on={active(item.href)} />)}</div>
          </div>
          <div>
            <div className="mb-4 flex items-center justify-between px-4">
              <span className="text-[10px] tracking-[0.2em] text-white/20 uppercase">სხვა</span>
              <span className="h-px w-8 bg-white/5" />
            </div>
            <div className="space-y-1.5">{manage.map((item) => <Nav key={item.href} {...item} on={active(item.href)} />)}</div>
          </div>
        </nav>
        <div className="relative z-20 space-y-3 border-t border-white/5 bg-[#080808]/50 p-6 backdrop-blur-md">
          <p className="truncate px-1 text-xs text-white/40">{name}</p>
          <a href="/" className="group flex items-center justify-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4 text-[11px] tracking-[0.2em] text-white/40 uppercase hover:bg-white/[0.08] hover:text-white">
            <ExternalLink className="size-4" /> საიტზე დაბრუნება
          </a>
          <button type="button" onClick={leave} className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border border-red-500/10 bg-red-500/5 px-4 py-4 text-[11px] tracking-[0.2em] text-red-500 uppercase hover:bg-red-500/10">
            <LogOut className="size-4" /> გამოსვლა
          </button>
        </div>
      </aside>
      <main className="relative min-h-screen flex-1 overflow-hidden lg:ml-72">
        <div className="pointer-events-none absolute top-0 right-0 h-1/3 w-1/3 bg-blue-600/5 blur-[120px]" />
        <div className="flex gap-2 overflow-x-auto border-b border-white/5 px-4 py-3 lg:hidden">
          {[...main, ...manage].map((item) => (
            <a key={item.href} href={item.href} className={`shrink-0 rounded-xl px-3 py-2 text-sm ${active(item.href) ? "bg-primary text-white" : "bg-white/5 text-white/60"}`}>{item.label}</a>
          ))}
        </div>
        <div className="relative z-10">{children}</div>
      </main>
    </div>
  );
}
