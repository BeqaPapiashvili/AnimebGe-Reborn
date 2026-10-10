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
  "Heybot!": "Heybot",
  "Punirunes Puni 2": "Punirunes",
  "BBK/BRNK The Gentle Giants of the Galaxy": "Bubuki Buranki",
  "The Apothecary Diaries Season 3": "Kusuriya no Hitorigoto",
  "Cyberpunk: Edgerunners 2": "Cyberpunk Edgerunners",
  "Black Clover Season 2": "Black Clover",
  "Made in Abyss: Mezameru Shinpi": "Made in Abyss",
  "Reincarnated as a Sword Season 2": "Tensei shitara Ken Deshita",
  "Witch on the Holy Night": "Mahoutsukai no Yoru",
  "Blue Box Season 2": "Ao no Hako",
  "Rascal Does Not Dream of a Dear Friend": "Seishun Buta Yarou",
  "Kusuriya no Hitorigoto: Bouhi no Hihou": "Kusuriya no Hitorigoto",
  "Tokyo Revengers: Santen Sensou-hen": "Tokyo Revengers",
  "Tantei wa mou, Shindeiru. Season 2": "Tantei wa Mou Shindeiru",
  "A Returner's Magic Should be Special Season 2": "Returner no Maou",
  "Kumarba Season 3": "Kumarba",
  "Odekake Kozame Season 2": "Odekake Kozame",
  "Shou 3 Ashibe QQ Goma-chan": "Ashibe",
  "BEYBLADE X": "Beyblade X",
  "Koupen-chan": "Koupen-chan",
  "Onegai AiPri": "Himitsu no AiPri",
  "Atelier Ryza: Ever Darkness & the Secret Hideout The Animation": "Ryza no Atelier",
};

function slug(title) {
  return title.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function walk(node, visit) {
  if (Array.isArray(node)) {
    node.forEach((item) => walk(item, visit));
    return;
  }
  if (!node || typeof node !== "object") return;
  visit(node);
  for (const value of Object.values(node)) {
    if (value && typeof value === "object") walk(value, visit);
  }
}

const needed = new Map();
walk(site, (node) => {
  if (node.title && !node.poster) needed.set(node.title, searches[node.title] || node.title);
});

async function jikan(search) {
  const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(search)}&limit=1`;
  const res = await fetch(url);
  if (res.status === 429 || res.status >= 500) return { retry: true };
  if (!res.ok) return null;
  const json = await res.json();
  return json.data?.[0] || null;
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("img " + res.status);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

const found = {};
for (const [title, search] of needed) {
  let media = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      media = await jikan(search);
    } catch (err) {
      console.log("wait", title, err.message);
      await new Promise((r) => setTimeout(r, 3000));
      continue;
    }
    if (media && media.retry) {
      console.log("wait", title);
      await new Promise((r) => setTimeout(r, 3000));
      continue;
    }
    break;
  }
  const id = slug(title);
  if (!media || media.retry) {
    console.log("MISS", title);
    found[title] = { poster: "", banner: "", desc: "" };
  } else {
    const poster = path.join(root, "assets/posters", `${id}.jpg`);
    const banner = path.join(root, "assets/banners", `${id}.jpg`);
    const posterUrl = media.images?.jpg?.large_image_url;
    const bannerUrl = media.trailer?.images?.maximum_image_url;
    if (posterUrl) await download(posterUrl, poster);
    found[title] = {
      poster: fs.existsSync(poster) ? `assets/posters/${id}.jpg` : "",
      banner: "",
      desc: (media.synopsis || "").replace(/\s+/g, " ").slice(0, 280),
      matched: media.title_english || media.title,
    };
    if (bannerUrl && bannerUrl.startsWith("http")) {
      try {
        await download(bannerUrl, banner);
        if (fs.existsSync(banner) && fs.statSync(banner).size > 5000) found[title].banner = `assets/banners/${id}.jpg`;
      } catch {}
    }
    console.log("OK", title, "->", found[title].matched);
  }
  await new Promise((r) => setTimeout(r, 700));
}

walk(site, (node) => {
  const art = found[node.title];
  if (!art) return;
  if (art.poster) node.poster = art.poster;
  if (art.banner) node.banner = art.banner;
  else if (art.poster && !node.banner) node.banner = art.poster;
  if (!node.desc && art.desc) node.desc = art.desc;
});

fs.writeFileSync(catalogPath, "window.SITE = " + JSON.stringify(site, null, 2) + ";\n");
console.log("still empty", [...needed.keys()].filter((title) => {
  let empty = false;
  walk(site, (node) => { if (node.title === title && !node.poster) empty = true; });
  return empty;
}));
