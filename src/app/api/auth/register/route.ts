import { clientIp, register, siteUrl } from "@/lib/auth";
import { ipLimited, limited } from "@/lib/limit";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { name?: string; email?: string; password?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  const ip = await clientIp();
  if ((await limited(`register:${ip}:${email}`, 5, 60 * 60 * 1000)) || (await ipLimited("register-ip", ip, 10, 60 * 60 * 1000))) {
    return Response.json({ ok: false, error: "ძალიან ბევრი მცდელობაა. ცოტა ხანში სცადე." }, { status: 429 });
  }
  const result = await register(String(body.name ?? ""), email, String(body.password ?? ""), siteUrl(new URL(request.url).origin));
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
