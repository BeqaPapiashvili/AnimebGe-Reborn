import fs from "fs";
import path from "path";

const root = "c:/Users/Papicha/Desktop/animeb";
const posterDir = path.join(root, "assets/posters");
const bannerDir = path.join(root, "assets/banners");
fs.mkdirSync(posterDir, { recursive: true });
fs.mkdirSync(bannerDir, { recursive: true });

const cards = JSON.parse(fs.readFileSync(path.join(root, "scripts/cards.json"), "utf8"));

function slug(title) {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function parseCard(card) {
  const texts = card.texts.filter((t) => !["Add to list", "Watching", "Planning", "Completed", "Paused", "Dropped"].includes(t));
  const score = texts.find((t) => /^\d+\.\d$/.test(t)) || "0.0";
  const scoreIdx = texts.indexOf(score);
  const rest = texts.slice(scoreIdx + 1);
  const ratings = new Set(["PG-13", "PG", "G", "R-17+", "R", "R+"]);
  let rating = "";
  let numsStart = 0;
  if (rest[0] && ratings.has(rest[0])) {
    rating = rest[0];
    numsStart = 1;
  }
  const nums = rest.slice(numsStart).filter((t) => t !== "/");
  const metaLine = [...rest].reverse().find((t) => /·/.test(t) || t.includes("TV") || t.includes("ONA") || t.includes("OVA") || t.includes("MOVIE") || t.includes("SPECIAL") || t.includes("TV_SHORT")) || "";
  return {
    title: card.title,
    slug: slug(card.title),
    score,
    rating,
    sub: nums[0] || "0",
    dub: nums[1] || "0",
    total: nums[2] || "?",
    meta: metaLine,
    wide: card.w > 300,
  };
}

const parsed = cards.filter((c) => c.h > 150).map(parseCard);
const continueCard = parsed.find((c) => c.wide);
const posterCards = parsed.filter((c) => !c.wide);
const latest = posterCards.slice(0, 12);
const fresh = posterCards.slice(12, 24);
const upcoming = posterCards.slice(24, 36);

const extraSearches = {
  "That Time I Got Reincarnated as a Slime Season 4": "Tensei shitara Slime Datta Ken",
  "Let's go KAIKIGUMI": "Let's Go Kaikigumi",
  "You and I Are Polar Opposites Season 2": "You and I Are Polar Opposites",
  "Soul Land 2: The Peerless Tang Clan": "Douluo Dalu 2",
  "DIGIMON BEATBREAK": "Digimon Beatbreak",
  "Golden Curse": "Golden Curse",
  "Star Detective Precure!": "Star Detective Precure",
  "Hanaori-san Still Wants to Fight in the Next Life": "Hanaori-san wa Kyou mo Ikitai",
  "Magilumiere Magical Girls Inc. Season 2": "Magilumiere",
  "Grow Up Show": "Grow Up Show",
  "MAO": "MAO",
  "A Wild Last Boss Appeared! Season 2": "A Wild Last Boss Appeared",
  "Narumi's Week at Work": "Narumi",
  "The Journey Home": "The Journey Home",
  "Iron Man: Rise of Technovore": "Iron Man: Rise of Technovore",
  "Iron Man": "Iron Man",
  "Sister Princess RePure": "Sister Princess Repure",
  "Atelier Ryza: Ever Darkness & the Secret Hideout The Animation": "Atelier Ryza",
  "Shonen Onmyoji": "Shounen Onmyouji",
  "Gekidol": "Gekidol",
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
  "A Returner's Magic Should be Special Season 2": "Returner's Magic Should Be Special",
  "HELL MODE: The Hardcore Gamer Dominates in Another World with Garbage Balancing Season 2": "Hell Mode",
  "ONE PIECE": "ONE PIECE",
  Bleach: "Bleach",
  "Mushoku Tensei: Jobless Reincarnation Season 3": "Mushoku Tensei",
  "Naruto: Shippuden": "Naruto Shippuuden",
  "Black Clover": "Black Clover",
  "Re:ZERO -Starting Life in Another World- Season 4": "Re:Zero kara Hajimeru Isekai Seikatsu",
  "BLEACH: Thousand-Year Blood War - The Calamity": "Bleach: Sennen Kessen-hen",
  Naruto: "Naruto",
  "STEEL BALL RUN JoJo's Bizarre Adventure": "JoJo no Kimyou na Bouken",
  "Kumarba Season 3": "Kumarba",
  "Odekake Kozame Season 2": "Odekake Kozame",
  "Shou 3 Ashibe QQ Goma-chan": "Ashibe",
  "BEYBLADE X": "Beyblade X",
  "Koupen-chan": "Koupen-chan",
  "Onegai AiPri": "Onegai AiPri",
};

const slides = [
  { title: "ONE PIECE", score: "8.7", type: "TV", year: "1999", search: "ONE PIECE" },
  {
    title: "That Time I Got Reincarnated as a Slime Season 4",
    score: "8.3",
    type: "TV",
    year: "2026",
    search: "Tensei shitara Slime Datta Ken",
    desc: "Demon Lord Rimuru's dream of creating an alliance between humans and monsters takes a step closer to being realized. As Tempest continues to prosper, Granville Rozzo and his granddaughter, Maribel Rozzo, clash with Demon Lord Rimuru over their plan to protect mankind by ruling ov",
  },
  { title: "Bleach", score: "7.9", type: "TV", year: "2004", search: "Bleach" },
  { title: "Mushoku Tensei: Jobless Reincarnation Season 3", score: "8.4", type: "TV", year: "2026", search: "Mushoku Tensei" },
  { title: "Naruto: Shippuden", score: "8.2", type: "TV", year: "2007", search: "Naruto Shippuuden" },
  { title: "Black Clover", score: "7.9", type: "TV", year: "2017", search: "Black Clover" },
  { title: "You and I Are Polar Opposites Season 2", score: "8.2", type: "TV", year: "2026", search: "You and I Are Polar Opposites" },
  { title: "Re:ZERO -Starting Life in Another World- Season 4", score: "9.0", type: "TV", year: "2026", search: "Re:Zero kara Hajimeru Isekai Seikatsu" },
  { title: "BLEACH: Thousand-Year Blood War - The Calamity", score: "9.0", type: "TV", year: "2026", search: "Bleach: Sennen Kessen-hen" },
  { title: "Naruto", score: "8.0", type: "TV", year: "2002", search: "Naruto" },
];

const trending = [
  { title: "ONE PIECE", score: "8.7", type: "TV", sub: "1179", dub: "1155", total: "?", search: "ONE PIECE" },
  { title: "That Time I Got Reincarnated as a Slime Season 4", score: "8.3", type: "TV", sub: "24", dub: "22", total: "24", search: "Tensei shitara Slime Datta Ken" },
  { title: "Bleach", score: "7.9", type: "TV", sub: "366", dub: "366", total: "366", search: "Bleach" },
  { title: "Mushoku Tensei: Jobless Reincarnation Season 3", score: "8.4", type: "TV", sub: "13", dub: "11", total: "14", search: "Mushoku Tensei" },
  { title: "Naruto: Shippuden", score: "8.2", type: "TV", sub: "500", dub: "500", total: "500", search: "Naruto Shippuuden" },
  { title: "Black Clover", score: "7.9", type: "TV", sub: "170", dub: "170", total: "170", search: "Black Clover" },
  { title: "Re:ZERO -Starting Life in Another World- Season 4", score: "9.0", type: "TV", sub: "18", dub: "16", total: "19", search: "Re:Zero kara Hajimeru Isekai Seikatsu" },
  { title: "BLEACH: Thousand-Year Blood War - The Calamity", score: "9.0", type: "TV", sub: "8", dub: "5", total: "10", search: "Bleach: Sennen Kessen-hen" },
  { title: "HELL MODE: The Hardcore Gamer Dominates in Another World with Garbage Balancing Season 2", score: "7.1", type: "TV", sub: "13", dub: "7", total: "13", search: "Hell Mode" },
  { title: "STEEL BALL RUN JoJo's Bizarre Adventure", score: "", type: "ONA", sub: "1", dub: "1", total: "11", search: "JoJo no Kimyou na Bouken" },
];

const schedule = [
  { time: "02:00", title: "Kumarba Season 3", format: "TV_SHORT", ep: "EP 25" },
  { time: "02:00", title: "Odekake Kozame Season 2", format: "TV_SHORT", ep: "EP 25" },
  { time: "02:00", title: "Shou 3 Ashibe QQ Goma-chan", format: "TV_SHORT", ep: "EP 25" },
  { time: "02:45", title: "BEYBLADE X", format: "TV", ep: "EP 101" },
  { time: "03:00", title: "Koupen-chan", format: "TV_SHORT", ep: "EP 78" },
  { time: "04:30", title: "Star Detective Precure!", format: "TV", ep: "EP 35" },
  { time: "04:30", title: "Onegai AiPri", format: "TV", ep: "EP 26" },
  { time: "07:00", title: "DIGIMON BEATBREAK", format: "TV", ep: "EP 49" },
  { time: "12:30", title: "Let's go KAIKIGUMI", format: "TV", ep: "EP 12" },
];

const allTitles = new Map();
function add(title, search) {
  if (!allTitles.has(title)) allTitles.set(title, search || extraSearches[title] || title);
}
slides.forEach((s) => add(s.title, s.search));
trending.forEach((s) => add(s.title, s.search));
posterCards.forEach((c) => add(c.title, extraSearches[c.title]));
if (continueCard) add(continueCard.title, extraSearches[continueCard.title]);
schedule.forEach((s) => add(s.title, extraSearches[s.title]));

const query = `query ($search: String) {
  Media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
    id
    title { romaji english }
    description(asHtml: false)
    coverImage { extraLarge }
    bannerImage
    seasonYear
  }
}`;

async function anilist(search) {
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables: { search } }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text.slice(0, 180)}`);
  }
  const json = await res.json();
  return json.data?.Media || null;
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`img ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
}

const mediaByTitle = {};
const titles = [...allTitles.entries()];
for (let i = 0; i < titles.length; i++) {
  const [title, search] = titles[i];
  const id = slug(title);
  try {
    const media = await anilist(search);
    if (!media) {
      console.log("MISS", title);
      mediaByTitle[title] = { poster: "", banner: "", desc: "" };
    } else {
      const posterPath = path.join(posterDir, `${id}.jpg`);
      const bannerPath = path.join(bannerDir, `${id}.jpg`);
      if (media.coverImage?.extraLarge) await download(media.coverImage.extraLarge, posterPath);
      if (media.bannerImage) await download(media.bannerImage, bannerPath);
      const desc = (media.description || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      mediaByTitle[title] = {
        poster: fs.existsSync(posterPath) ? `assets/posters/${id}.jpg` : "",
        banner: fs.existsSync(bannerPath) ? `assets/banners/${id}.jpg` : "",
        desc: desc.slice(0, 280),
        matched: media.title.english || media.title.romaji,
        year: media.seasonYear,
      };
      console.log("OK", title, "->", mediaByTitle[title].matched);
    }
  } catch (err) {
    console.log("ERR", title, err.message);
    mediaByTitle[title] = { poster: "", banner: "", desc: "" };
  }
  await new Promise((r) => setTimeout(r, 350));
}

function withArt(item) {
  const art = mediaByTitle[item.title] || { poster: "", banner: "", desc: "" };
  return { ...item, poster: art.poster, banner: art.banner || art.poster, desc: item.desc || art.desc || "" };
}

const site = {
  slides: slides.map(withArt),
  continue: continueCard
    ? {
        ...withArt(continueCard),
        episode: "EP 13",
        progress: "0:02/23:40",
        progressPct: 0.14,
      }
    : null,
  latest: latest.map(withArt),
  fresh: fresh.map(withArt),
  upcoming: upcoming.map(withArt),
  trending: trending.map(withArt),
  schedule: schedule.map((row) => ({ ...row, poster: (mediaByTitle[row.title] || {}).poster || "" })),
};

const js = "window.SITE = " + JSON.stringify(site, null, 2) + ";\n";
fs.mkdirSync(path.join(root, "js"), { recursive: true });
fs.writeFileSync(path.join(root, "js/catalog.js"), js);
const missing = Object.entries(mediaByTitle).filter(([, v]) => !v.poster);
console.log("missing posters", missing.map(([k]) => k));
