import fs from "fs";
const text = fs.readFileSync("js/catalog.js", "utf8");
const site = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
const missing = [];
function walk(n) {
  if (Array.isArray(n)) return n.forEach(walk);
  if (!n || typeof n !== "object") return;
  for (const key of ["poster", "banner"]) {
    if (!n[key]) continue;
    if (!fs.existsSync(n[key])) missing.push("gone " + n.title + " " + n[key]);
    else if (fs.statSync(n[key]).size < 2000) missing.push("tiny " + n.title + " " + fs.statSync(n[key]).size);
  }
  for (const v of Object.values(n)) if (v && typeof v === "object") walk(v);
}
walk(site);
console.log("slides", site.slides.length, site.slides.map((s) => s.banner && fs.statSync(s.banner).size).join(","));
console.log(missing.length ? missing.join("\n") : "ok");
