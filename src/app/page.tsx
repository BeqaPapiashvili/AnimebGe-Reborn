import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";
import { getHomeData, homeSectionItems } from "@/lib/catalog";
import { getHomePosts } from "@/lib/community";
import { getLists } from "@/lib/lists";
import { getHomeBlocks, getNotice } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getSession();
  const [data, lists, notice, sections] = await Promise.all([getHomeData(user?.id), getLists(), getNotice(), getHomeBlocks()]);
  const showPosts = sections.some((block) => block.id === "posts" && block.on);
  const [custom, posts] = await Promise.all([homeSectionItems(sections), showPosts ? getHomePosts(3).catch(() => []) : Promise.resolve([])]);
  return <Home user={user} data={data} lists={lists} notice={notice} sections={sections} custom={custom} posts={posts} />;
}
