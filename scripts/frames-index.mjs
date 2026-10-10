import fs from "fs";

const dump = fs.readFileSync("C:/Users/Papicha/.cursor/projects/c-Users-Papicha-Desktop-animeb/agent-tools/63afd114-52b6-4a63-887e-cf4b442e3120.txt", "utf8");
const files = fs.readdirSync("C:/Users/Papicha/Desktop/animeb/frames").filter((name) => name.endsWith(".avif") && !name.includes(" ("));

function slug(name) {
  return name
    .replace(/&#39;|&amp;/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function titleFromFile(file) {
  return file.replace(/\.avif$/, "").split("_").filter(Boolean).map((part) => (/^\d+$/.test(part) ? part : part[0].toUpperCase() + part.slice(1))).join(" ");
}

function decode(value) {
  return value.replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}

const georgian = [
  ["Miscellaneous", "სხვადასხვა დეკორაცია და ქვესტის ჯილდო."],
  ["Shed the old", "ძველს გაეშვი, ახალს შეეგებე. გილოცავ გველის წელს!"],
  ["What shall we", "დღეს რას ავაწყობთ?"],
  ["You're walking", "ტყეში მიდიხარ და რაღაც ჯადოსნურს და ბრწყინვალეს ამჩნევ."],
  ["Tis the season", "სეზონი დადგა."],
  ["Cozy vibes", "მყუდრო განწყობა Lofi Girl-თან."],
  ["When :3", "როცა :3 შენი სათამაშო სახეა."],
  ["The hunt", "ნადირობა დაიწყო."],
  ["Wonders lost", "დროში დაკარგული საოცრებები, ხელახლა ნაპოვნი."],
  ["The ultimate", "თავგადასავლის სრული ნაკრები."],
  ["Beware what", "ერიდე იმას, რაც სიბნელეში იმალება..."],
  ["Hit the streets", "გამოდი ქუჩაში Street Fighter-თან."],
  ["Beauty in balance", "სილამაზე ბალანსშია."],
  ["There's a calm", "ჰაერში სიმშვიდე და სითბოა."],
  ["Long-awaited", "დიდი ხნის ნანატრი საგანძური ისევ დაბრუნდა."],
  ["Where discipline", "სადაც დისციპლინა ბედს ხვდება."],
  ["All Paths", "ყველა გზა აქ მთავრდება."],
  ["Celebrate 25", "25 წელი საზღვაო სისულელისა!"],
  ["Approach, wanderer", "მიუახლოვდი... საშიში და მომხიბვლელი რელიკვიები გელოდება."],
  ["New island", "ახალი კუნძული, ახალი პალები, ახალი თავგადასავლები!"],
  ["Press START", "დააჭირე START-ს სათამაშოდ."],
  ["How ya feelin", "დღეს როგორ გრძნობ თავს?"],
  ["Don yer", "ჩაიცვი საუკეთესო და გზას დაადგი."],
  ["Reach for", "ვარსკვლავებამდე გაიწოდე."],
  ["Where chill", "სადაც სიმშვიდე განწყობას ხვდება."],
  ["DEFY DEFINITION", "განსაზღვრებას გაექეცი."],
  ["You awaken", "იღვიძებ და გაზაფხულის საოცრებაში აღმოჩნდები."],
  ["Senpai will", "სენპაი აუცილებლად შეგნიშნავს."],
  ["Which will", "რომელს გაათავისუფლებ?"],
  ["Roar into", "დრაკონის წელიწადში შედი."],
  ["Welcome to the neon", "კეთილი იყოს ნეონის მომავალი."],
  ["We're not a menace", "საფრთხე არა ვართ, უბრალოდ ვერ გაგვიგეს."],
  ["tis the season", "სეზონი დადგა."],
  ["Fright and delight", "შეაშინე და გაახარე მეგობრები, უცნობები და მოწინააღმდეგეები."],
  ["Breakfast is", "საუზმე დღის ყველაზე მნიშვნელოვანი ჭამაა."],
  ["Available to use", "ხელმისაწვდომია აქტიური Nitro-ს გამოწერით."],
  ["Limited time", "2023 წლის გაზაფხულის შეზღუდული დეკორაცია."],
  ["Happy Snowsgiving", "გილოცავ Snowsgiving-ს!"],
];

const seasons = { WINTER: "ზამთარი", FALL: "შემოდგომა", SPRING: "გაზაფხული", APRIL: "აპრილი", JUNE: "ივნისი", JULY: "ივლისი", SEPTEMBER: "სექტემბერი" };

function toGeorgian(text) {
  const found = georgian.find(([start]) => text.startsWith(start));
  return found ? found[1] : text;
}

function toBadge(text) {
  const [season, year] = text.split(" ");
  return `${seasons[season] ?? season} ${year}`;
}

const lines = dump.split(/\n/);
const groups = [];
let current = null;
for (const line of lines) {
  const heading = line.match(/<text id="[^"]+" name="([^"]+)" x="0" y="0" width="[^"]+" height="20"/);
  const blurb = line.match(/<text id="[^"]+" name="([^"]+)" x="0" y="0" width="[^"]+" height="18"/);
  const badge = line.match(/name="((?:WINTER|FALL|SPRING|APRIL|JUNE|JULY|SEPTEMBER) \d{4})"/);
  const image = line.match(/name="Image \(([^)]+)\)"/);
  if (heading && heading[1] !== "Avatar Frames") {
    current = { title: decode(heading[1]), blurb: "", badge: "", items: [] };
    groups.push(current);
  }
  if (badge && current && !current.items.length) current.badge = toBadge(badge[1]);
  if (blurb && current && !current.blurb && !current.items.length) current.blurb = toGeorgian(decode(blurb[1]));
  if (image && current) current.items.push(decode(image[1]));
}

const used = new Set();
const bySlug = new Map(files.map((file) => [file.replace(/\.avif$/, ""), file]));
const catalog = groups.filter((group) => group.items.length).map((group) => ({
  title: group.title,
  blurb: group.blurb,
  badge: group.badge,
  items: group.items.flatMap((name) => {
    const file = bySlug.get(slug(name));
    if (!file || used.has(file)) return [];
    used.add(file);
    return [{ name, file }];
  }),
})).filter((group) => group.items.length);
for (const group of catalog) {
  if (group.title === "Discord 8th Birthday" && !group.blurb) group.blurb = "Discord-ის 8 წლის იუბილე.";
}

const rest = files.filter((file) => !used.has(file)).map((file) => ({ name: titleFromFile(file), file }));
if (rest.length) catalog.push({ title: "სხვა", blurb: "დანარჩენი დეკორაციები.", badge: "", items: rest });

fs.mkdirSync("src/data", { recursive: true });
fs.writeFileSync("src/data/frames.json", JSON.stringify(catalog));
console.log(catalog.reduce((sum, group) => sum + group.items.length, 0), "frames in", catalog.length, "groups");
