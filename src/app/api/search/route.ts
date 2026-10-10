import { searchAnime } from "@/lib/catalog";

export async function GET(request: Request) {
  const term = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json({ results: await searchAnime(term.slice(0, 100)) });
}
