import { clientIp, siteUrl } from "@/lib/auth";
import { createReset } from "@/lib/hub";
import { ipLimited, limited } from "@/lib/limit";
import { sendResetMail } from "@/lib/mail";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = String(body.email ?? "").trim();
  if (!email.includes("@")) return Response.json({ error: "ფოსტა სწორად ჩაწერე." }, { status: 400 });
  if ((await ipLimited("forgot-ip", await clientIp(), 5, 15 * 60 * 1000)) || (await limited(`forgot:${email.toLowerCase()}`, 3, 60 * 60 * 1000))) {
    return Response.json({ error: "ძალიან ბევრი მცდელობაა. ცოტა ხანში სცადე." }, { status: 429 });
  }
  const token = await createReset(email);
  if (token) {
    const origin = siteUrl(new URL(request.url).origin);
    try {
      await sendResetMail(email, `${origin}/reset?token=${token}`);
    } catch {
      return Response.json({ error: "წერილი ვერ გაიგზავნა. ცოტა ხანში სცადე." }, { status: 502 });
    }
  }
  return Response.json({ ok: true });
}
