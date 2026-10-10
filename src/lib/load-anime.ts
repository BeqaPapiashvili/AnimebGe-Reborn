import "server-only";
import { cache } from "react";
import { getAnimeBySlug } from "@/lib/catalog";

export const loadAnime = cache(async (slug: string) => {
  let value = slug;
  try {
    value = decodeURIComponent(slug);
  } catch {}
  return getAnimeBySlug(value);
});
