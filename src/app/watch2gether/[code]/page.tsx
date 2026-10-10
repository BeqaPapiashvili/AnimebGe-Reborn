import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";
import { canEnterRoom, readRoom } from "@/lib/hub";
import { loadAnime } from "@/lib/load-anime";
import type { RoomPlay } from "@/lib/watch-room-types";

export const metadata: Metadata = { title: "Watch Party | Animeb" };
export const dynamic = "force-dynamic";

export default async function Watch2GetherRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [user, room] = await Promise.all([getSession(), readRoom(code)]);
  if (!room || !(await canEnterRoom(room, user?.id))) notFound();
  const detail = room.slug ? await loadAnime(room.slug) : null;
  const play: RoomPlay | null = detail
    ? {
        slug: detail.slug,
        title: detail.title,
        format: detail.format,
        year: detail.startDate?.slice(0, 4),
        duration: detail.duration,
        banner: detail.banner,
        episodes: detail.episodeList.map((item) => ({ number: item.number, sources: item.sources })),
      }
    : null;
  return (
    <Home
      user={user}
      hub={{
        kind: "room",
        code: room.code,
        hostId: room.hostId,
        host: room.host,
        title: room.title,
        episode: room.episode,
        position: room.position,
        slug: room.slug,
        play,
        viewerId: user?.id,
        signedIn: !!user,
        closed: room.closed,
        startsAt: room.startsAt,
      }}
    />
  );
}
