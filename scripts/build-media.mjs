import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import sharp from "sharp";

const root = process.cwd();
const kinds = [
  { dir: "avatar", out: "avatars", title: "ავატარები", fallback: "ავატარი" },
  { dir: "cover", out: "covers", title: "ქოვერები", fallback: "ქოვერი" },
];

function label(file, fallback, index) {
  const base = file.replace(/\.[^.]+$/, "");
  if (/^item_\d+_\d+$/.test(base)) return `${fallback} ${index}`;
  return base.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (char) => char.toUpperCase());
}

function posterOf(file) {
  return `${file.replace(/\.[^.]+$/, "")}.jpg`;
}

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: "ignore" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("ffmpeg"))));
  });
}

async function still(input, output, file) {
  if (/\.(mp4|webm|mov|m4v)$/i.test(file)) {
    await run(["-y", "-i", input, "-frames:v", "1", output]);
    return;
  }
  await sharp(input, { animated: false, pages: 1 }).jpeg({ quality: 82 }).toFile(output);
}

async function pool(jobs, size) {
  const queue = [...jobs];
  await Promise.all(Array.from({ length: size }, async () => {
    while (queue.length) {
      const job = queue.shift();
      if (job) await job();
    }
  }));
}

for (const kind of kinds) {
  const source = path.join(root, kind.dir);
  const dest = path.join(root, "public", "assets", kind.out);
  const posters = path.join(dest, "posters");
  await mkdir(posters, { recursive: true });
  const files = (await readdir(source)).filter((name) => !name.startsWith(".")).sort((a, b) => a.localeCompare(b, "en"));
  let named = 0;
  const items = files.map((file) => {
    const generated = /^item_\d+_\d+\./.test(file);
    if (!generated) named += 1;
    return { file, generated };
  });
  let plain = 0;
  const catalog = items.map((item) => {
    const index = item.generated ? ++plain : named;
    return {
      name: label(item.file, kind.fallback, item.generated ? index : 0) || label(item.file, kind.fallback, index),
      file: item.file,
      poster: posterOf(item.file),
    };
  });
  // named files used index 0 in the ternary above when not generated. Fix names for named files.
  let n = 0;
  for (const item of catalog) {
    if (/^item_\d+_\d+\./.test(item.file)) item.name = `${kind.fallback} ${++n}`;
  }
  await pool(files.map((file) => async () => {
    await copyFile(path.join(source, file), path.join(dest, file));
    await still(path.join(dest, file), path.join(posters, posterOf(file)), file);
  }), 6);
  await writeFile(path.join(root, "src", "data", `${kind.out}.json`), JSON.stringify([{ title: kind.title, items: catalog }]));
  console.log(kind.out, catalog.length);
}
