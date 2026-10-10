import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Home } from "@/components/home";
import { ViewPing } from "@/components/view-ping";
import { getSession } from "@/lib/auth";
import { getCommentPage, getUserAnimeState } from "@/lib/catalog";
import { readEmotes } from "@/lib/emote";
import { getLists } from "@/lib/lists";
import { loadAnime } from "@/lib/load-anime";
import { getPrefs } from "@/lib/settings";
import { attachStills } from "@/lib/stills";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ ep?: string; room?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { ep, room } = await searchParams;
  const detail = await loadAnime(slug);
  return { title: detail ? `${detail.title} — ${Number(ep) || 1}-ე ეპიზოდი | Animeb` : "ანიმე ვერ მოიძებნა | Animeb" };
}

export default async function WatchPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { ep, room } = await searchParams;
  const [detail, user] = await Promise.all([loadAnime(slug), getSession()]);
  if (!detail) notFound();
  const [state, comments, lists, episodeList, prefs, emotes] = await Promise.all([
    getUserAnimeState(user, detail.id),
    getCommentPage(detail.id, user, { limit: 10, sort: "new" }),
    getLists(),
    attachStills(detail.episodeList),
    user ? getPrefs(user.id) : Promise.resolve(undefined),
    readEmotes(detail.id, user?.id),
  ]);
  return (
    <>
      <Home user={user} detail={{ ...detail, episodeList }} state={state} comments={comments.comments} commentStats={{ total: comments.total, roots: comments.roots }} lists={lists} watchEpisode={Number(ep) || 1} watchRoom={room || undefined} prefs={prefs} emotes={emotes} />
      <ViewPing id={detail.id} />
    </>
  );
}
