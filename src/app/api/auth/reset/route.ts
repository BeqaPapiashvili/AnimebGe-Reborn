import { clientIp } from "@/lib/auth";
import { consumeReset } from "@/lib/hub";
import { ipLimited } from "@/lib/limit";

export async function POST(request: Request) {
  if (await ipLimited("reset", await clientIp(), 10, 15 * 60 * 1000)) {
    return Response.json({ error: "ძალიან ბევრი მცდელობაა. ცოტა ხანში სცადე." }, { status: 429 });
  }
  const body = (await request.json().catch(() => ({}))) as { token?: string; password?: string };
  const error = await consumeReset(String(body.token ?? ""), String(body.password ?? ""));
  if (error) return Response.json({ error }, { status: 400 });
  return Response.json({ ok: true });
}
