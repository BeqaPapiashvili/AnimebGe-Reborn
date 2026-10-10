import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";
import { getHomeData } from "@/lib/catalog";
import { getLists } from "@/lib/lists";
import { getHomeBlocks, getNotice } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getSession();
  const [data, lists, notice, sections] = await Promise.all([getHomeData(user?.id), getLists(), getNotice(), getHomeBlocks()]);
  return <Home user={user} data={data} lists={lists} notice={notice} sections={sections} />;
}
