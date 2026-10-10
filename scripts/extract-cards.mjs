import fs from "fs";

const xml = fs.readFileSync(
  "C:/Users/Papicha/.cursor/projects/c-Users-Papicha-Desktop-animeb/agent-tools/cda3f556-35a3-4234-9bea-c09e9c196511.txt",
  "utf8"
);

const re = /name="Image \(([^)]+)\)"[^>]*width="([0-9.]+)" height="([0-9.]+)"/g;
const imgs = [];
let m;
while ((m = re.exec(xml))) {
  imgs.push({
    title: m[1].replace(/&#39;/g, "'").replace(/&amp;/g, "&"),
    w: +m[2],
    h: +m[3],
    i: m.index,
  });
}

const posters = imgs.filter((x) => x.w > 180 && x.w < 360 && x.h > 150);

function textsAfter(i, until) {
  const slice = xml.slice(i, until);
  const t = [];
  const r = /<text id="[^"]+" name="([^"]+)"/g;
  let mm;
  while ((mm = r.exec(slice))) {
    t.push(mm[1].replace(/&#39;/g, "'").replace(/&amp;/g, "&"));
  }
  return t;
}

const out = [];
for (let n = 0; n < posters.length; n++) {
  const p = posters[n];
  const until = posters[n + 1] ? posters[n + 1].i : p.i + 15000;
  const t = textsAfter(p.i, until);
  out.push({ title: p.title, w: p.w, h: Math.round(p.h), texts: t.slice(0, 30) });
}

fs.writeFileSync("c:/Users/Papicha/Desktop/animeb/scripts/cards.json", JSON.stringify(out, null, 2));
console.log("posters", out.length);
