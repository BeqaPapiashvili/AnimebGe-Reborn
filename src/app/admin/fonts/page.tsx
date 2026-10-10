import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { Type } from "lucide-react";
import { AdminFonts } from "@/components/admin-fonts";
import { recordAudit } from "@/lib/audit";
import { getSession, isAdmin } from "@/lib/auth";
import { fontSlots, type FontRole } from "@/lib/font-types";
import { listFonts, removeFont, saveFontRoles } from "@/lib/fonts";

export const metadata: Metadata = { title: "ფონტები | ადმინპანელი" };
export const dynamic = "force-dynamic";

function refresh() {
  revalidatePath("/", "layout");
  revalidatePath("/admin/fonts");
}

async function save(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  const input = {} as Record<FontRole, string>;
  for (const slot of fontSlots) input[slot.role] = String(formData.get(slot.role) ?? "BOG");
  await saveFontRoles(input);
  await recordAudit(user, "ფონტი", "როლები");
  refresh();
}

async function remove(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  const id = Number(formData.get("id")) || 0;
  await removeFont(id);
  await recordAudit(user, "ფონტი", `წაშლა · ${id}`);
  refresh();
}

export default async function AdminFontsPage() {
  const user = await getSession();
  if (!user || !isAdmin(user)) notFound();
  const { fonts, use } = await listFonts();
  return (
    <div className="min-h-screen bg-[#020202] pb-20 text-white">
      <div className="sticky top-0 z-40 border-b border-white/5 bg-[#020202]/80 px-6 py-5 backdrop-blur-2xl lg:px-10">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4">
          <div className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/5">
            <Type className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl tracking-tight">ფონტები</h1>
            <p className="text-[11px] text-white/35">მენიუ, სათაურები, აღწერა, კომენტარი, ღილაკები</p>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] px-6 pt-6 lg:px-10">
        <AdminFonts key={fontSlots.map((slot) => use[slot.role]).join("|")} fonts={fonts} use={use} save={save} remove={remove} />
      </div>
    </div>
  );
}
