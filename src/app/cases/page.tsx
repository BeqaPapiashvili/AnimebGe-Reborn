import { redirect } from "next/navigation";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const note = typeof params.note === "string" ? params.note : "";
  redirect(note ? `/packs?note=${encodeURIComponent(note)}` : "/packs");
}
