import type { Metadata } from "next";
import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "პაროლის აღდგენა | Animeb" };
export const dynamic = "force-dynamic";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <Home user={await getSession()} hub={{ kind: "reset", token: token ?? "" }} />;
}
