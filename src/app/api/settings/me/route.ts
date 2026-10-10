import { getSession } from "@/lib/auth";
import { getPrefs } from "@/lib/settings";

export async function GET() {
  const user = await getSession();
  if (!user) return Response.json({ prefs: null });
  return Response.json({ prefs: await getPrefs(user.id) });
}
