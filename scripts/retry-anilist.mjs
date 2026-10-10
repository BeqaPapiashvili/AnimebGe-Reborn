import fs from "fs";
import path from "path";

const root = "c:/Users/Papicha/Desktop/animeb";
const catalogPath = path.join(root, "js/catalog.js");
const raw = fs.readFileSync(catalogPath, "utf8").replace(/^window\.SITE = /, "").replace(/;\s*$/, "");
const site = JSON.parse(raw);

const searches = {
  "Hanaori-san Still Wants to Fight in the Next Life": "Hanaori",
  "Rio: Rainbow Gate!": "Rio Rainbow Gate",
  "Tokyo ESP": "Tokyo ESP",
  "Heybot!": "Heybot!",
  "Punirunes Puni 2": "Punirunes",
  "BBK/BRNK The Gentle Giants of the Galaxy": "Bubuki Buranki",
  "The Apothecary Diaries Season 3": "Kusuriya no Hitorigoto",
  "Cyberpunk: Edgerunners 2": "Cyberpunk: Edgerunners",
  "Black Clover Season 2": "Black Clover",
  "Made in Abyss: Mezameru Shinpi": "Made in Abyss",
  "Reincarnated as a Sword Season 2": "Tensei shitara Ken Deshita",
  "Witch on the Holy Night": "Mahoutsukai no Yoru",
  "Blue Box Season 2": "Ao no Hako",
  "Rascal Does Not Dream of a Dear Friend": "Seishun Buta Yarou",
  "Kusuriya no Hitorigoto: Bouhi no Hihou": "Kusuriya no Hitorigoto",
  "Tokyo Revengers: Santen Sensou-hen": "Tokyo Revengers",
  "Tantei wa mou, Shindeiru. Season 2": "Tantei wa Mou, Shindeiru.",
  "A Returner's Magic Should be Special Season 2": "Kikansha no Mahou",
  "Kumarba Season 3": "Kumarba",
  "Odekake Kozame Season 2": "Odekake Kozame",
  "Shou 3 Ashibe QQ Goma-chan": "Shou 3 Ashibe",
  "BEYBLADE X": "Beyblade X",
  "Koupen-chan": "Koupen-chan",
  "Onegai AiPri": "Onegai AiPri",
};

function slug(title) {
  return title.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}
function walk(node, visit) {
  if (Array.isArray(node)) return node.forEach((item) => walk(item, visit));
  if (!node || typeof node !== "object") return;
  visit(node);
  for (const value of Object.values(node)) if (value && typeof value === "object") walk(value, visit);
}

const needed = new Map();
walk(site, (node) => {
  if (node.title && !node.poster) needed.set(node.title, searches[node.title] || node.title);
});
console.log("need", needed.size);

const query = `query ($search: String) {
  Media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
    id
    title { romaji english }
    description(asHtml: false)
    coverImage { extraLarge }
    bannerImage
  }
}`;

async function lookup(search) {
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables: { search } }),
  });
  if (res.status === 429) return { retry: true };
  if (res.status === 404) return null;
  if (!res.ok) {
    console.log("status", res.status);
    return { retry: true };
  }
  const json = await res.json();
  if (json.errors) return null;
  return json.data?.Media || null;
}

const found = {};
for (const [title, search] of needed) {
  let media = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    media = await lookup(search);
    if (media && media.retry) {
      console.log("rate", title);
      await new Promise((r) => setTimeout(r, 8000));
      continue;
    }
    break;
  }
  const id = slug(title);
  if (!media || media.retry || !media.coverImage?.extraLarge) {
    console.log("MISS", title);
    continue;
  }
  const poster = path.join(root, "assets/posters", `${id}.jpg`);
  const banner = path.join(root, "assets/banners", `${id}.jpg`);
  const img = await fetch(media.coverImage.extraLarge);
  fs.writeFileSync(poster, Buffer.from(await img.arrayBuffer()));
  if (media.bannerImage) {
    const ban = await fetch(media.bannerImage);
    if (ban.ok) fs.writeFileSync(banner, Buffer.from(await ban.arrayBuffer()));
  }
  found[title] = {
    poster: `assets/posters/${id}.jpg`,
    banner: fs.existsSync(banner) && fs.statSync(banner).size > 1000 ? `assets/banners/${id}.jpg` : `assets/posters/${id}.jpg`,
    desc: (media.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280),
  };
  console.log("OK", title, "->", media.title.english || media.title.romaji);
  await new Promise((r) => setTimeout(r, 1200));
}

walk(site, (node) => {
  const art = found[node.title];
  if (!art) return;
  node.poster = art.poster;
  if (!node.banner || node.banner === node.poster) node.banner = art.banner;
  if (!node.desc) node.desc = art.desc;
});
fs.writeFileSync(catalogPath, "window.SITE = " + JSON.stringify(site, null, 2) + ";\n");
const left = [];
walk(site, (node) => { if (node.title && !node.poster) left.push(node.title); });
console.log("left", [...new Set(left)]);
