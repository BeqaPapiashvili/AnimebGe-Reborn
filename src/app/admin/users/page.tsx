import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { Activity, Clock, Edit2, Mail, Shield, ShieldCheck, UserCheck, UserPlus, UserX, Users } from "lucide-react";
import { AdminUserFilters } from "@/components/admin-user-filters";
import { adminUserStats, listAdminUsers, listGroups, setUserBanned } from "@/lib/admin-control";
import { getSession, isAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "მომხმარებლები | ადმინპანელი" };
export const dynamic = "force-dynamic";

async function ban(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  await setUserBanned(Number(formData.get("id")), formData.get("banned") === "1", user.id);
  revalidatePath("/admin/users");
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; group?: string; status?: string }> }) {
  const user = await getSession();
  if (!user || !isAdmin(user)) notFound();
  const { q = "", group: groupQuery = "", status = "" } = await searchParams;
  const groupId = Number(groupQuery) || 0;
  const state = status === "active" || status === "banned" ? status : "";
  const [rows, groups, stats] = await Promise.all([listAdminUsers(q, groupId, state), listGroups(), adminUserStats()]);
  const cards = [
    { label: "სულ მომხმარებელი", value: stats.total, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "აქტიური", value: stats.active, icon: Activity, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "ადმინისტრატორი", value: stats.admins, icon: Shield, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020202] pb-20 text-white selection:bg-primary/30">
      <div className="sticky top-0 z-40 border-b border-white/5 bg-[#020202]/80 px-8 py-8 backdrop-blur-2xl lg:px-12">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-6">
          <div className="grid size-16 place-items-center rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl">
            <Users className="size-8 text-primary" />
          </div>
          <div>
            <h1 className="mb-2 text-4xl tracking-tight">მომხმარებლები</h1>
            <p className="flex items-center gap-2 text-[10px] tracking-[0.2em] text-white/30 uppercase">
              <ShieldCheck className="size-3.5 text-primary" /> სულ {stats.total} რეგისტრირებული პირი
            </p>
          </div>
          </div>
          <a href="/admin/users/new" className="inline-flex items-center gap-3 rounded-2xl bg-primary px-8 py-5 text-xs tracking-widest text-white uppercase"><UserPlus className="size-5" /> ახალი მომხმარებელი</a>
        </div>
      </div>
      <div className="relative z-10 mx-auto max-w-[1600px] space-y-12 px-8 pt-12 lg:px-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {cards.map((stat) => (
            <div key={stat.label} className="group relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-8 shadow-2xl">
              <div className={`absolute top-0 right-0 size-32 ${stat.bg} opacity-20 blur-3xl`} />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="mb-3 text-[10px] tracking-[0.2em] text-white/20 uppercase">{stat.label}</p>
                  <h2 className="text-4xl tracking-tighter">{stat.value}</h2>
                </div>
                <div className={`grid size-16 place-items-center rounded-[1.5rem] border border-white/5 ${stat.bg}`}>
                  <stat.icon className={`size-7 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <AdminUserFilters q={q} group={groupId ? String(groupId) : ""} status={state} groups={groups.map((item) => ({ id: String(item.id), name: item.name }))} />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {rows.length ? rows.map((row) => {
            const mine = row.id === user.id;
            const admin = row.group === 1;
            return (
              <article key={row.id} className="group relative flex flex-col items-center gap-8 rounded-[2.5rem] border border-white/5 bg-white/[0.01] p-6 shadow-2xl focus-within:z-30 sm:flex-row">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary to-purple-500 opacity-20 blur-md" />
                  {row.avatar ? <img src={row.avatar} alt="" className="relative z-10 size-24 rounded-full border-2 border-white/10 object-cover" /> : <span className="relative z-10 grid size-24 place-items-center rounded-full border-2 border-white/10 bg-white/5 text-2xl">{row.name.slice(0, 1)}</span>}
                  <span className={`absolute right-1 bottom-1 z-20 size-5 rounded-full border-4 border-[#020202] ${row.banned ? "bg-red-500" : "bg-green-500"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="mb-1 truncate text-2xl group-hover:text-primary">{row.name}</h3>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-[8px] tracking-widest uppercase ${admin ? "border-amber-500/20 bg-amber-500/10 text-amber-500" : "border-blue-500/20 bg-blue-500/10 text-blue-500"}`}>{row.groupName || "მომხმარებელი"}</span>
                  <div className="mt-4 space-y-3">
                    <p className="flex items-center gap-3 text-[10px] tracking-widest text-white/30 uppercase"><Mail className="size-3.5 text-primary" /><span className="truncate">{row.email || "ელ-ფოსტის გარეშე"}</span></p>
                    <p className="flex items-center gap-3 text-[10px] tracking-widest text-white/30 uppercase"><Clock className="size-3.5 text-blue-500" />რეგისტრაცია: {row.joined || "უცნობია"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href={`/admin/users/${row.id}`} title="რედაქტირება" className="grid size-14 place-items-center rounded-2xl border border-white/5 bg-white/[0.03] text-white/40 hover:text-primary"><Edit2 className="size-4" /></a>
                <form action={ban}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="banned" value={row.banned ? "0" : "1"} />
                  <button type="submit" disabled={mine} title={row.banned ? "ბლოკის მოხსნა" : "დაბლოკვა"} className="grid size-14 place-items-center rounded-2xl border border-white/5 bg-white/[0.03] text-white/40 disabled:opacity-30">
                    {row.banned ? <UserCheck className="size-4 text-green-500" /> : <UserX className="size-4" />}
                  </button>
                </form>
                </div>
              </article>
            );
          }) : (
            <div className="col-span-full flex flex-col items-center py-32 text-center">
              <div className="mb-8 grid size-24 place-items-center rounded-[2.5rem] border border-white/5 bg-white/[0.02]">
                <Users className="size-10 text-white/10" />
              </div>
              <h3 className="mb-2 text-2xl">მომხმარებელი ვერ მოიძებნა</h3>
              <p className="text-white/20">სცადეთ სხვა საძიებო სიტყვა ან ფილტრი</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
