import { getSession } from "@/lib/auth";
import { setFavorite } from "@/lib/favorites";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ ok: false, error: "ჯერ შედი ანგარიშში." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { postId?: number; on?: boolean };
  const postId = Number(body.postId);
  if (!Number.isInteger(postId) || postId <= 0) return Response.json({ ok: false, error: "ანიმე ვერ მოიძებნა." }, { status: 400 });
  const favorite = await setFavorite(user.id, postId, Boolean(body.on));
  if (favorite == null) return Response.json({ ok: false, error: "ანიმე ვერ მოიძებნა." }, { status: 404 });
  return Response.json({ ok: true, favorite });
}
