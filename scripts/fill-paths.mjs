import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const sitePath = join(root, "src", "lib", "site.json");
const posters = join(root, "public", "assets", "posters");
const banners = join(root, "public", "assets", "banners");
const site = JSON.parse(readFileSync(sitePath, "utf8"));

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function fill(item) {
  const slug = item.slug || slugify(item.title || "");
  if (!slug) return;
  const posterFile = join(posters, `${slug}.jpg`);
  const bannerFile = join(banners, `${slug}.jpg`);
  if (!item.poster && existsSync(posterFile)) item.poster = `/assets/posters/${slug}.jpg`;
  if (!item.banner && existsSync(bannerFile)) item.banner = `/assets/banners/${slug}.jpg`;
  if (!item.banner && item.poster) item.banner = item.poster;
}

for (const key of ["slides", "latest", "fresh", "upcoming", "trending"]) {
  for (const item of site[key]) fill(item);
}
fill(site.continue);
for (const row of site.schedule) fill(row);

const still = [];
for (const key of ["latest", "fresh", "upcoming", "trending"]) {
  for (const item of site[key]) if (!item.poster) still.push(item.title);
}
for (const row of site.schedule) if (!row.poster) still.push(row.title);

writeFileSync(sitePath, JSON.stringify(site));
console.log("still empty:", still.length ? still.join(" | ") : "none");
