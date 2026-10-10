import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";
import { getFolder } from "@/lib/folders";

export const metadata: Metadata = { title: "სია | Animeb" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ListFolderPage({ params }: Props) {
  const { id } = await params;
  const user = await getSession();
  const folder = await getFolder(Number(id), user?.id);
  if (!folder) notFound();
  return <Home user={user} myLists={{ folder }} />;
}
