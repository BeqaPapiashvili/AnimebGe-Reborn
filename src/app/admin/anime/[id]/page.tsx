import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminAnimeForm } from "@/components/admin-anime-form";
import { deleteAdminAnime, emptyAdminAnime, genres, readAdminAnime, readAdminSources, saveAdminAnime, type AdminAnime } from "@/lib/admin";
import { recordAudit } from "@/lib/audit";
import { getSession, isAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "ანიმეს რედაქტირება | ადმინპანელი" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function save(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  const id = Number(formData.get("id")) || 0;
  const anime: AdminAnime = {
    id,
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    published: formData.get("published") === "1",
    year: String(formData.get("year") ?? ""),
    status: String(formData.get("status") ?? ""),
    score: String(formData.get("score") ?? ""),
    duration: String(formData.get("duration") ?? ""),
    studio: String(formData.get("studio") ?? ""),
    dubbers: String(formData.get("dubbers") ?? ""),
    director: String(formData.get("director") ?? ""),
    romaji: String(formData.get("romaji") ?? ""),
    japanese: String(formData.get("japanese") ?? ""),
    poster: String(formData.get("poster") ?? ""),
    cover: String(formData.get("cover") ?? ""),
    current: String(formData.get("current") ?? ""),
    total: String(formData.get("total") ?? ""),
    format: String(formData.get("format") ?? "11"),
    genres: formData.getAll("genre").map(String),
  };
  const sources = formData.getAll("source_key").map((key, index) => ({ key: String(key), value: String(formData.getAll("source_value")[index] ?? "") }));
  const result = await saveAdminAnime(anime, user.name, sources);
  if (result.error) redirect(`/admin/anime/${id || "new"}?error=${encodeURIComponent(result.error)}`);
  await recordAudit(user, "ანიმე", `${anime.title.slice(0, 60)} · ${sources.length} სერვერი`);
  redirect(`/admin/anime/${result.id}?saved=1`);
}

async function remove(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  if (formData.get("confirm") !== "1") return;
  const id = Number(formData.get("id"));
  await deleteAdminAnime(id);
  await recordAudit(user, "ანიმე", `წაშლა · ${id}`);
  redirect("/admin/anime");
}

export default async function AdminAnimeEdit({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const query = await searchParams;
  const creating = raw === "new";
  const id = creating ? 0 : Number(raw);
  if (!creating && (!Number.isInteger(id) || id <= 0)) notFound();
  const anime = creating ? emptyAdminAnime() : await readAdminAnime(id);
  if (!anime) notFound();
  const [options, sources] = await Promise.all([genres(), creating ? Promise.resolve([]) : readAdminSources(id)]);
  const error = typeof query.error === "string" ? query.error : "";
  const saved = query.saved === "1";
  return <AdminAnimeForm anime={anime} genreOptions={options} sources={sources} creating={creating} saved={saved} error={error} save={save} remove={remove} />;
}
