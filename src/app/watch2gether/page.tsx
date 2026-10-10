import type { Metadata } from "next";
import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";
import { listWatchRooms } from "@/lib/hub";

export const metadata: Metadata = { title: "Watch2Gether | Animeb" };
export const dynamic = "force-dynamic";

export default async function Watch2GetherPage() {
  const user = await getSession();
  const { rooms, friendIds } = await listWatchRooms(user?.id);
  return <Home user={user} hub={{ kind: "together", viewerId: user?.id, rooms, friendIds }} />;
}
