const query = `query { Media(id: 199066, type: ANIME) { coverImage { extraLarge } bannerImage title { english } } }`;
const res = await fetch("https://graphql.anilist.co", {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ query }),
});
const json = await res.json();
const media = json.data.Media;
console.log(media.title.english, media.coverImage.extraLarge);
const img = await fetch(media.coverImage.extraLarge);
const buf = Buffer.from(await img.arrayBuffer());
const dest = "assets/posters/hanaori-san-still-wants-to-fight-in-the-next-life.jpg";
await import("fs").then((fs) => fs.writeFileSync(dest, buf));
console.log("wrote", buf.length);
