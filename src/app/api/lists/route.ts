import { getSession } from "@/lib/auth";
import { setUserList } from "@/lib/lists";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ ok: false, error: "ჯერ შედი ანგარიშში." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { postId?: number; listId?: number | null };
  const postId = Number(body.postId);
  if (!Number.isInteger(postId) || postId <= 0) return Response.json({ ok: false, error: "ანიმე ვერ მოიძებნა." }, { status: 400 });
  if (body.listId == null) {
    await setUserList(user.id, postId, null);
    return Response.json({ ok: true, listId: null });
  }
  const listId = Number(body.listId);
  if (!Number.isInteger(listId) || !(await setUserList(user.id, postId, listId))) return Response.json({ ok: false, error: "სია არასწორია." }, { status: 400 });
  return Response.json({ ok: true, listId });
}
