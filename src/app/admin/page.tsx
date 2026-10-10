import type { Metadata } from "next";
import { Activity, Calendar, Clapperboard, Eye, Plus, Tags, Users } from "lucide-react";
import { onPill } from "@/components/admin-ui";
import { controlCounts } from "@/lib/admin-control";
import { adminStats, listAdminAnime } from "@/lib/admin";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "ადმინპანელი | Animeb" };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [stats, counts, recent, user] = await Promise.all([adminStats(), controlCounts(), listAdminAnime("", 1), getSession()]);
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "დილა მშვიდობისა" : hour < 18 ? "შუადღე მშვიდობისა" : "საღამო მშვიდობისა";
  const initials = (user?.name ?? "ა").slice(0, 2);
  const cards = [
    { title: "ჩანს", value: stats.published, icon: Clapperboard, tone: "text-primary bg-primary/10 border-primary/20" },
    { title: "დამალული", value: stats.hidden, icon: Eye, tone: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    { title: "მომხმარებელი", value: counts.users, icon: Users, tone: "text-green-500 bg-green-500/10 border-green-500/20" },
    { title: "ღია რეპორტი", value: stats.reports, icon: Activity, tone: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  ];
  const actions = [
    { label: "ანიმე", icon: Plus, href: "/admin/anime/new", color: "bg-primary" },
    { label: "მომხმარებლები", icon: Users, href: "/admin/users", color: "bg-blue-600" },
    { label: "ჟანრები", icon: Tags, href: "/admin/genres", color: "bg-purple-600" },
    { label: "რეპორტები", icon: Activity, href: "/admin/reports", color: "bg-orange-500" },
  ];
  return (
    <div className="min-h-screen bg-[#020202] pb-20 text-white">
      <div className="sticky top-0 z-40 border-b border-white/5 bg-[#020202]/80 px-6 py-5 backdrop-blur-2xl lg:px-10">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-2xl border border-primary/20 bg-primary/10">
              <Activity className="size-6 text-primary" />
            </div>
            <div>
              <span className="text-lg tracking-tight">Animeb <span className="text-primary">Admin</span></span>
              <span className="mt-1 block text-[10px] tracking-widest text-white/30 uppercase">Control Center</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-2.5 xl:flex">
              <Calendar className="size-4 text-primary" />
              <span className="text-xs tracking-wider text-white/70 uppercase">{now.toLocaleDateString("ka-GE", { weekday: "long", month: "short", day: "numeric" })}</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] py-1.5 pr-4 pl-1.5">
              <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-blue-600 text-xs">{initials}</span>
              <span className="hidden text-xs lg:block">{user?.name ?? "ადმინი"}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="relative z-10 mx-auto max-w-[1600px] space-y-12 px-6 pt-10 lg:px-10">
        <div className="flex flex-col items-stretch gap-8 lg:flex-row">
          <div className="relative flex-1 overflow-hidden rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-[#111] to-[#050505] p-10 lg:p-14">
            <div className="pointer-events-none absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l from-primary/5 to-transparent" />
            <div className="relative z-10">
              <div className="mb-6 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] tracking-[0.2em] text-primary uppercase">სისტემა ჩართულია</div>
              <h1 className="mb-6 text-4xl tracking-tighter lg:text-6xl">{greeting}, <br /><span className="text-white/40">ადმინისტრატორო!</span></h1>
              <p className="max-w-xl text-lg leading-relaxed text-white/40">ანიმე, მომხმარებელი, კომენტარი და რეპორტი აქედან იმართება.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:w-[400px]">
            {actions.map((action) => (
              <a key={action.href} href={action.href} className="group flex flex-col items-center justify-center gap-4 rounded-[2rem] border border-white/5 bg-white/[0.03] transition-all hover:-translate-y-1 hover:border-white/10 hover:bg-white/[0.08]">
                <span className={`rounded-2xl p-4 text-white shadow-lg ${action.color}`}><action.icon className="size-6" /></span>
                <span className="text-xs tracking-[0.2em] text-white/40 uppercase group-hover:text-white">{action.label}</span>
              </a>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.title} className="rounded-[2.5rem] border border-white/5 bg-white/[0.03] p-8">
              <div className={`mb-8 w-fit rounded-2xl border p-4 ${card.tone}`}><card.icon className="size-7" /></div>
              <div className="text-4xl tracking-tighter tabular-nums">{card.value}</div>
              <div className="mt-1 text-[10px] tracking-[0.2em] text-white/30 uppercase">{card.title}</div>
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-[3rem] border border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between gap-6 border-b border-white/5 p-8 lg:p-12">
            <div className="flex items-center gap-6">
              <div className="grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/5"><Clapperboard className="size-7 text-primary" /></div>
              <div>
                <h2 className="text-3xl tracking-tight">ბოლო დამატებული</h2>
                <p className="mt-1 text-sm tracking-widest text-white/30 uppercase">ანიმე</p>
              </div>
            </div>
            <a href="/admin/anime" className="text-xs tracking-widest text-primary uppercase">სრული სია</a>
          </div>
          <div className="space-y-4 p-4 lg:p-8">
            {recent.items.slice(0, 4).map((item) => (
              <div key={item.id} className="flex flex-col items-center gap-8 rounded-[2rem] border border-white/5 bg-white/[0.01] p-4 lg:flex-row lg:p-6">
                <div className="relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-2xl bg-white/5">
                  {item.poster ? <img src={item.poster} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <h3 className="truncate text-2xl">{item.title}</h3>
                    <span className={onPill(item.published)}>{item.published ? "ჩანს" : "დამალული"}</span>
                  </div>
                  <p className="text-sm text-white/30">{item.year || "წელი არ წერია"}</p>
                </div>
                <a href={`/admin/anime/${item.id}`} className="flex items-center justify-center rounded-2xl bg-white/[0.05] px-6 py-4 text-xs tracking-widest text-white/60 uppercase hover:bg-primary hover:text-white">რედაქტირება</a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
