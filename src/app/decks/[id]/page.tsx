import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayScreen } from "@/components/play-screen";

export const metadata: Metadata = { title: "კოლოდა | Animeb" };
export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const deckId = Number(id);
  if (!Number.isInteger(deckId) || deckId <= 0) notFound();
  return <PlayScreen section="deck" id={deckId} searchParams={searchParams} />;
}
