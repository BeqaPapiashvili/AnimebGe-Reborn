import type { Metadata } from "next";
import { PlayScreen } from "@/components/play-screen";

export const metadata: Metadata = { title: "გამხმოვანებელი | Animeb" };
export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ name: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { name } = await params;
  return <PlayScreen section="dubber" name={decodeURIComponent(name)} searchParams={searchParams} />;
}
