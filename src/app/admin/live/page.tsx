import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Radio } from "lucide-react";
import { AdminLive } from "@/components/admin-live";
import { getSession, isAdmin } from "@/lib/auth";
import { presenceSnapshot } from "@/lib/presence";

export const metadata: Metadata = { title: "ლაივი | ადმინპანელი" };
export const dynamic = "force-dynamic";

export default async function AdminLivePage() {
  const user = await getSession();
  if (!user || !isAdmin(user)) notFound();
  return (
    <div className="min-h-screen bg-[#020202] pb-20 text-white">
      <div className="sticky top-0 z-40 border-b border-white/5 bg-[#020202]/80 px-6 py-5 backdrop-blur-2xl lg:px-10">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4">
          <div className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/5">
            <Radio className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl tracking-tight">ლაივი</h1>
            <p className="text-[11px] text-white/35">ვინ არის ახლა საიტზე და რომელ გვერდზე</p>
          </div>
        </div>
      </div>
      <AdminLive initial={presenceSnapshot()} />
    </div>
  );
}
