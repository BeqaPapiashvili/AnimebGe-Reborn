import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScrollText } from "lucide-react";
import { listAudit } from "@/lib/audit";
import { getSession, isAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "ჩანაწერი | ადმინპანელი" };
export const dynamic = "force-dynamic";

export default async function AdminLogPage() {
  const user = await getSession();
  if (!user || !isAdmin(user)) notFound();
  const rows = await listAudit();
  return (
    <div className="min-h-screen bg-[#020202] pb-20 text-white">
      <div className="sticky top-0 z-40 border-b border-white/5 bg-[#020202]/80 px-6 py-5 backdrop-blur-2xl lg:px-10">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4">
          <div className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/5">
            <ScrollText className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl tracking-tight">ჩანაწერი</h1>
            <p className="text-[11px] text-white/35">ვინ რა შეცვალა ადმინპანელში</p>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] px-6 pt-6 lg:px-10">
        {rows.length ? (
          <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#101013]">
            {rows.map((row) => (
              <div key={row.id} className="grid gap-1 border-b border-white/6 px-4 py-3 last:border-0 sm:grid-cols-[160px_140px_140px_1fr] sm:items-center">
                <span className="text-xs text-white/35">{row.at}</span>
                <span className="text-sm">{row.name}</span>
                <span className="text-sm text-[#e93748]">{row.action}</span>
                <span className="text-sm text-white/55">{row.detail}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-white/40">ჩანაწერი ჯერ არ არის.</p>}
      </div>
    </div>
  );
}
