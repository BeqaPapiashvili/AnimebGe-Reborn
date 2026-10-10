import type { Metadata } from "next";
import { PlayScreen } from "@/components/play-screen";

export const metadata: Metadata = { title: "გემოვნება | Animeb" };
export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ name: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { name } = await params;
  return <PlayScreen section="taste" name={decodeURIComponent(name)} searchParams={searchParams} />;
}
