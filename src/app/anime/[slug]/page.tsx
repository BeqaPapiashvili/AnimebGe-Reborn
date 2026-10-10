import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";
import { getUserAnimeState } from "@/lib/catalog";
import { getLists } from "@/lib/lists";
import { loadAnime } from "@/lib/load-anime";
import { cardsForAnime } from "@/lib/play";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const detail = await loadAnime(slug);
  return { title: detail ? `${detail.title} — ონლაინ ყურება | Animeb` : "ანიმე ვერ მოიძებნა | Animeb" };
}

export default async function AnimePage({ params }: Props) {
  const { slug } = await params;
  const [detail, user] = await Promise.all([loadAnime(slug), getSession()]);
  if (!detail) notFound();
  const [state, lists, cards] = await Promise.all([getUserAnimeState(user, detail.id), getLists(), cardsForAnime(detail.id, user?.id ?? 0)]);
  return <Home user={user} detail={detail} state={state} lists={lists} characterCards={cards} />;
}
