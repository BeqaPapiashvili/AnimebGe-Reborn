import type { Metadata } from "next";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { addAdminCard, addAdminGiveaway, adminCards, adminCases, adminDubbers, adminGiveaways, deleteAdminCard, saveAdminCard, saveAdminCase, saveAdminDubber } from "@/lib/play-admin";
import { recordAudit } from "@/lib/audit";
import { getSession, isAdmin } from "@/lib/auth";
import { makeCardThumb } from "@/lib/card-thumbs";
import { renderCard } from "@/lib/card-render";
import { AdminCardCreator } from "@/components/admin-card-creator";
import { storageFile } from "@/lib/storage";

export const metadata: Metadata = { title: "თამაში | ადმინპანელი" };
export const dynamic = "force-dynamic";

const field = "h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-sm outline-none";

async function gate() {
  const user = await getSession();
  if (!user || !isAdmin(user)) return null;
  return user;
}

async function saveCard(formData: FormData) {
  "use server";
  const user = await gate();
  if (!user) return;
  const error = await saveAdminCard(Number(formData.get("id")), String(formData.get("name") ?? ""), String(formData.get("rarity") ?? ""));
  if (!error) await recordAudit(user, "ბარათი", String(formData.get("name") ?? "").slice(0, 40));
  redirect(`/admin/play?part=cards&q=${encodeURIComponent(String(formData.get("q") ?? ""))}${error ? `&error=${encodeURIComponent(error)}` : ""}`);
}

async function removeCard(formData: FormData) {
  "use server";
  const user = await gate();
  if (!user) return;
  const error = await deleteAdminCard(Number(formData.get("id")));
  if (!error) await recordAudit(user, "ბარათი", `წაშლა · ${formData.get("id")}`);
  redirect(`/admin/play?part=cards${error ? `&error=${encodeURIComponent(error)}` : ""}`);
}

async function createCard(formData: FormData) {
  "use server";
  const user = await gate();
  if (!user) return;
  const file = formData.get("file");
  const cardName = String(formData.get("name") ?? "").trim();
  const rarity = String(formData.get("rarity") ?? "C");
  let image = "";
  let error = "";
  if (!(file instanceof File) || file.size === 0) error = "სურათი აირჩიე.";
  else if (file.size > 25 * 1024 * 1024) error = "ფაილი 25 MB-ზე დიდია.";
  else {
    const raw = (file.name.split(".").pop() || "").toLowerCase();
    const ext = ["webp", "png", "jpg", "jpeg", "gif", "webm", "mp4"].includes(raw) ? raw : "";
    const still = ["webp", "png", "jpg", "jpeg"].includes(ext);
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    let body: Buffer | null = Buffer.from(await file.arrayBuffer());
    let name = `${id}.${ext}`;
    if (!ext) error = "ფორმატი: PNG, JPG, WEBP, GIF, MP4 ან WEBM.";
    else if (rarity !== "RE") {
      if (!still) error = "ჩარჩოიანი ქარდისთვის სურათი უნდა იყოს (PNG, JPG, WEBP). ვიდეო მხოლოდ RE რანგზე.";
      else {
        body = await renderCard({ image: body, rarity, name: cardName, anime: String(formData.get("anime") ?? ""), withText: formData.get("caption") === "on" }).catch(() => null);
        if (!body) error = "ქარდის გენერაცია ვერ მოხერხდა.";
        name = `${id}.png`;
      }
    }
    if (!error && body) {
      const target = storageFile("uploads", "anime_cards", name);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, body);
      await makeCardThumb(name, body);
      image = `/uploads/anime_cards/${name}`;
    }
  }
  if (!error) {
    error = await addAdminCard({
      name: cardName,
      rarity,
      newsId: Number(formData.get("news") ?? 0),
      description: String(formData.get("text") ?? ""),
      points: Number(formData.get("points") ?? 300),
      author: user.name,
      image,
    });
  }
  if (!error) await recordAudit(user, "ბარათი", `დამატება · ${cardName.slice(0, 40)}`);
  redirect(`/admin/play?part=cards${error ? `&error=${encodeURIComponent(error)}` : "&added=1"}`);
}

async function saveCase(formData: FormData) {
  "use server";
  const user = await gate();
  if (!user) return;
  await saveAdminCase(Number(formData.get("id")), Number(formData.get("price")), Number(formData.get("chance")), Number(formData.get("min")), Number(formData.get("max")));
  await recordAudit(user, "პაკი", String(formData.get("name") ?? "").slice(0, 40));
  revalidatePath("/cases");
  revalidatePath("/packs");
  redirect("/admin/play?part=cases");
}

async function createGiveaway(formData: FormData) {
  "use server";
  const user = await gate();
  if (!user) return;
  const error = await addAdminGiveaway(String(formData.get("title") ?? ""), String(formData.get("text") ?? ""), String(formData.get("end") ?? ""), Number(formData.get("winners") ?? 1));
  if (!error) await recordAudit(user, "გათამაშება", String(formData.get("title") ?? "").slice(0, 40));
  redirect(`/admin/play?part=giveaways${error ? `&error=${encodeURIComponent(error)}` : ""}`);
}

async function saveDubber(formData: FormData) {
  "use server";
  const user = await gate();
  if (!user) return;
  const error = await saveAdminDubber(Number(formData.get("id") ?? 0), String(formData.get("name") ?? ""), String(formData.get("bio") ?? ""));
  if (!error) await recordAudit(user, "გამხმოვანებელი", String(formData.get("name") ?? "").slice(0, 40));
  redirect(`/admin/play?part=dubbers${error ? `&error=${encodeURIComponent(error)}` : ""}`);
}

const parts = [
  ["cards", "ბარათები"],
  ["cases", "პაკები"],
  ["giveaways", "გათამაშება"],
  ["dubbers", "გამხმოვანებლები"],
] as const;

export default async function PlayAdmin({ searchParams }: { searchParams: Promise<{ part?: string; q?: string; error?: string; added?: string }> }) {
  const user = await getSession();
  if (!user || !isAdmin(user)) notFound();
  const query = await searchParams;
  const part = parts.some((item) => item[0] === query.part) ? query.part! : "cards";
  const q = query.q ?? "";
  const [cards, cases, giveaways, dubbers] = await Promise.all([
    part === "cards" ? adminCards(q) : Promise.resolve([]),
    part === "cases" ? adminCases() : Promise.resolve([]),
    part === "giveaways" ? adminGiveaways() : Promise.resolve([]),
    part === "dubbers" ? adminDubbers() : Promise.resolve([]),
  ]);
  return (
    <div className="px-6 py-8 lg:px-10">
      <h1 className="text-2xl">თამაში</h1>
      <nav className="mt-4 flex gap-2">
        {parts.map(([id, label]) => <a key={id} href={`/admin/play?part=${id}`} className={`rounded-xl px-3 py-2 text-sm ${part === id ? "bg-[#e93748]" : "bg-white/5 text-white/70"}`}>{label}</a>)}
      </nav>
      {query.error ? <p className="mt-4 text-sm text-[#e93748]">{query.error}</p> : null}
      {part === "cards" ? (
        <div className="mt-6 grid gap-4">
          <form action="/admin/play" className="flex gap-2">
            <input type="hidden" name="part" value="cards" />
            <input name="q" defaultValue={q} placeholder="ძებნა" className={`${field} flex-1`} />
            <button className="h-10 cursor-pointer rounded-xl bg-white/10 px-4 text-sm">ძებნა</button>
          </form>
          <AdminCardCreator action={createCard} added={query.added === "1"} />
          {cards.map((card) => (
            <form key={card.id} action={saveCard} className="flex flex-wrap items-center gap-2 rounded-2xl bg-[#101013] p-3">
              <input type="hidden" name="id" value={card.id} />
              <input type="hidden" name="q" value={q} />
              <input name="name" defaultValue={card.name} className={`${field} min-w-40 flex-1`} />
              <select name="rarity" defaultValue={card.rarity} className={field}>{["E", "D", "C", "B", "A", "S", "S+", "RE"].map((rank) => <option key={rank}>{rank}</option>)}</select>
              <span className="text-xs text-white/40">ანიმე {card.news_id} · {card.copies} ასლი</span>
              <button className="h-10 cursor-pointer rounded-xl bg-[#e93748] px-3 text-sm">შენახვა</button>
              <button formAction={removeCard} className="h-10 cursor-pointer rounded-xl bg-white/10 px-3 text-sm">წაშლა</button>
            </form>
          ))}
        </div>
      ) : null}
      {part === "cases" ? (
        <div className="mt-6 grid gap-3">
          {cases.map((item) => (
            <form key={item.id} action={saveCase} className="grid items-center gap-2 rounded-2xl bg-[#101013] p-3 md:grid-cols-[1fr_repeat(4,90px)_auto]">
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="name" value={item.name} />
              <p>{item.name}</p>
              <input name="price" type="number" min={0} defaultValue={item.price} aria-label="ფასი" className={field} />
              <input name="chance" type="number" min={0} max={100} defaultValue={item.coin_chance} aria-label="მონეტის შანსი" className={field} />
              <input name="min" type="number" min={0} defaultValue={item.coin_min} aria-label="მინიმუმი" className={field} />
              <input name="max" type="number" min={0} defaultValue={item.coin_max} aria-label="მაქსიმუმი" className={field} />
              <button className="h-10 cursor-pointer rounded-xl bg-[#e93748] px-3 text-sm">შენახვა</button>
            </form>
          ))}
        </div>
      ) : null}
      {part === "giveaways" ? (
        <div className="mt-6 grid gap-3">
          <form action={createGiveaway} className="grid gap-2 rounded-2xl bg-[#101013] p-4">
            <input name="title" required placeholder="სახელი" className={field} />
            <textarea name="text" placeholder="აღწერა" className="min-h-20 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm" />
            <input name="end" type="datetime-local" required className={field} />
            <input name="winners" type="number" min={1} max={10} defaultValue={1} aria-label="გამარჯვებულები" className={field} />
            <button className="h-10 w-fit cursor-pointer rounded-xl bg-[#e93748] px-4 text-sm">დამატება</button>
          </form>
          {giveaways.map((item) => (
            <p key={item.id} className="rounded-2xl bg-[#101013] px-4 py-3 text-sm">{item.title} · {String(item.end_date).slice(0, 16)} · {item.status === 1 ? "ღიაა" : "დასრულდა"}</p>
          ))}
        </div>
      ) : null}
      {part === "dubbers" ? (
        <div className="mt-6 grid gap-3">
          <form action={saveDubber} className="grid gap-2 rounded-2xl bg-[#101013] p-4">
            <input name="name" required placeholder="ახალი გამხმოვანებელი" className={field} />
            <textarea name="bio" placeholder="ბიოგრაფია" className="min-h-20 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm" />
            <button className="h-10 w-fit cursor-pointer rounded-xl bg-[#e93748] px-4 text-sm">დამატება</button>
          </form>
          {dubbers.map((item) => (
            <form key={item.id} action={saveDubber} className="grid gap-2 rounded-2xl bg-[#101013] p-3">
              <input type="hidden" name="id" value={item.id} />
              <input name="name" defaultValue={item.name} className={field} />
              <textarea name="bio" placeholder="ბიოგრაფია" className="min-h-16 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm" />
              <button className="h-10 w-fit cursor-pointer rounded-xl bg-[#e93748] px-3 text-sm">შენახვა</button>
            </form>
          ))}
        </div>
      ) : null}
    </div>
  );
}
