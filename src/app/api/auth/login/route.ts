import { clientIp, login } from "@/lib/auth";
import { ipLimited, limited } from "@/lib/limit";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { login?: string; password?: string };
  const name = String(body.login ?? "").trim().toLowerCase();
  const ip = await clientIp();
  if ((await limited(`login:${ip}:${name}`, 8, 10 * 60 * 1000)) || (await limited(`login-user:${name}`, 30, 30 * 60 * 1000)) || (await ipLimited("login-ip", ip, 60, 10 * 60 * 1000))) {
    return Response.json({ ok: false, error: "ძალიან ბევრი მცდელობაა. ცოტა ხანში სცადე." }, { status: 429 });
  }
  const result = await login(String(body.login ?? ""), String(body.password ?? ""));
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
