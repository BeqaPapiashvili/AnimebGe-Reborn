import { getFooterLinks } from "@/lib/site-config";

export async function GET() {
  const links = await getFooterLinks();
  return Response.json({ links });
}