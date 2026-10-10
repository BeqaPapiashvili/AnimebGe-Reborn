import { loadRemoteCast } from "@/lib/catalog";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim().slice(0, 80) ?? "";
  const page = Number(url.searchParams.get("page"));
  if (!search || !Number.isInteger(page) || page < 2 || page > 40) {
    return Response.json({ cast: [], total: 0, hasNext: false });
  }
  const result = await loadRemoteCast(search, page);
  return Response.json(result);
}
