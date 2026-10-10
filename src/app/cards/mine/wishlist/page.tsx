import type { Metadata } from "next";
import { PlayScreen } from "@/components/play-screen";

export const metadata: Metadata = { title: "სურვილების სია | Animeb" };
export const dynamic = "force-dynamic";

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PlayScreen section="wishlist" searchParams={searchParams} />;
}