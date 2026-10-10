import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { LayoutGrid, Tag } from "lucide-react";
import { AdminGenres } from "@/components/admin-genres";
import { addAdminGenre, deleteAdminGenre, listAdminGenres, renameAdminGenre } from "@/lib/admin-control";
import { recordAudit } from "@/lib/audit";
import { getSession, isAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "ჟანრები | ადმინპანელი" };
export const dynamic = "force-dynamic";

async function rename(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  const name = String(formData.get("name") ?? "");
  await renameAdminGenre(Number(formData.get("id")), name);
  await recordAudit(user, "ჟანრი", name.slice(0, 40));
  revalidatePath("/admin/genres");
  revalidatePath("/");
}

async function add(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  const name = String(formData.get("name") ?? "");
  const error = await addAdminGenre(name);
  if (error) redirect(`/admin/genres?error=${encodeURIComponent(error)}`);
  await recordAudit(user, "ჟანრი", `დამატება · ${name.trim().slice(0, 40)}`);
  revalidatePath("/admin/genres");
  revalidatePath("/");
}

async function remove(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  const id = Number(formData.get("id"));
  const error = await deleteAdminGenre(id);
  if (error) redirect(`/admin/genres?error=${encodeURIComponent(error)}`);
  await recordAudit(user, "ჟანრი", `წაშლა · ${id}`);
  revalidatePath("/admin/genres");
  revalidatePath("/");
}

export default async function GenresPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getSession();
  if (!user || !isAdmin(user)) notFound();
  const query = await searchParams;
  const rows = await listAdminGenres();
  return (
    <div className="min-h-screen bg-[#020202] pb-20 text-white">
      <div className="sticky top-0 z-40 border-b border-white/5 bg-[#020202]/80 px-8 py-8 backdrop-blur-2xl lg:px-12">
        <div className="mx-auto flex max-w-[1600px] items-center gap-6">
          <div className="grid size-16 place-items-center rounded-[2rem] border border-white/10 bg-white/5">
            <LayoutGrid className="size-8 text-primary" />
          </div>
          <div>
            <h1 className="mb-2 text-4xl tracking-tight">ჟანრები</h1>
            <p className="flex items-center gap-2 text-[10px] tracking-[0.2em] text-white/30 uppercase">
              <Tag className="size-3.5 text-primary" /> {rows.length} ჟანრი
            </p>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] px-8 pt-10 lg:px-12">
        {query.error ? <p className="mb-4 text-sm text-[#e93748]">{query.error}</p> : null}
        <AdminGenres rows={rows} rename={rename} add={add} remove={remove} />
      </div>
    </div>
  );
}
