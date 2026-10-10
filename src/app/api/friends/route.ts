import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { acceptRequest, blockUser, cancelRequest, declineRequest, getFriendsPage, markFriendNotices, removeFriend, sendRequest, suggestFriends, unblockUser } from "@/lib/friends";

export async function GET(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ items: [] });
  const url = new URL(request.url);
  if (url.searchParams.get("mine") === "1") {
    const page = await getFriendsPage(user.id);
    return NextResponse.json({ items: page.friends });
  }
  const q = url.searchParams.get("q") ?? "";
  const items = await suggestFriends(user.id, q);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "შესვლა სჭირდება" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { action?: string; name?: string; id?: number } | null;
  const id = Number(body?.id);
  const action = body?.action;
  const result =
    action === "request" ? await sendRequest(user.id, body?.name ?? "") :
    action === "accept" && Number.isInteger(id) ? await acceptRequest(user.id, id) :
    action === "decline" && Number.isInteger(id) ? await declineRequest(user.id, id) :
    action === "cancel" && Number.isInteger(id) ? await cancelRequest(user.id, id) :
    action === "remove" && Number.isInteger(id) ? await removeFriend(user.id, id) :
    action === "block" && Number.isInteger(id) ? await blockUser(user.id, id) :
    action === "unblock" && Number.isInteger(id) ? await unblockUser(user.id, id) :
    action === "read" ? await markFriendNotices(user.id).then(() => ({ ok: true })) :
    { error: "მოქმედება ვერ შესრულდა" };
  if ("error" in result && result.error) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({ ok: true });
}
