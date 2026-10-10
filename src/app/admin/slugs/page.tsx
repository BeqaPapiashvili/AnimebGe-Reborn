import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { Link2 } from "lucide-react";
import { listDuplicateSlugs, renameAdminSlug } from "@/lib/admin";
import { recordAudit } from "@/lib/audit";
import { getSession, isAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "განმეორებული ბმულები | ადმინპანელი" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function save(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  const id = Number(formData.get("id"));
  const result = await renameAdminSlug(id, String(formData.get("slug") ?? ""));
  if ("error" in result) redirect(`/admin/slugs?id=${id}&error=${encodeURIComponent(result.error ?? "")}`);
  await recordAudit(user, "ბმული", `${result.from} → ${result.to}`);
  revalidatePath("/admin/slugs");
  revalidatePath("/");
  revalidatePath(`/anime/${result.from}`);
  revalidatePath(`/anime/${result.to}`);
  revalidatePath(`/anime/${result.from}/watch`);
  revalidatePath(`/anime/${result.to}/watch`);
}

export default async function SlugsPage({ searchParams }: Props) {
  const user = await getSession();
  if (!user || !isAdmin(user)) notFound();
  const params = await searchParams;
  const errorId = Number(params.id) || 0;
  const error = typeof params.error === "string" ? params.error : "";
  const groups = await listDuplicateSlugs();
  const animeCount = groups.reduce((sum, group) => sum + group.items.length, 0);
  return (
    <div className="min-h-screen bg-[#020202] pb-20 text-white">
      <div className="sticky top-0 z-40 border-b border-white/5 bg-[#020202]/80 px-8 py-8 backdrop-blur-2xl lg:px-12">
        <div className="mx-auto flex max-w-[1100px] items-center gap-6">
          <div className="grid size-16 place-items-center rounded-[2rem] border border-white/10 bg-white/5">
            <Link2 className="size-8 text-primary" />
          </div>
          <div>
            <h1 className="mb-2 text-4xl tracking-tight">ერთი ბმული, ორი ანიმე</h1>
            <p className="text-sm text-white/40">{groups.length ? `${groups.length} საერთო ბმული · ${animeCount} ანიმე` : "განმეორება აღარ არის"}</p>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1100px] space-y-8 px-8 pt-10 lg:px-12">
        <section className="rounded-[1.75rem] border border-white/5 bg-white/[0.02] p-6 sm:p-8">
          <p className="text-base leading-7 text-white/75">საიტზე ყოველ ანიმეს თავისი ბმული უნდა ჰქონდეს, მაგალითად <span className="text-white">/anime/სახელი</span>. თუ ორ ანიმეს ერთი და იგივე ბმული აქვს, გახსნისას მხოლოდ ერთი მათგანი ჩანს და მეორე იკარგება.</p>
          <ol className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["1", "იპოვე წყვილი", "ქვემოთ ერთ ბარათში ის ანიმეებია, რომლებიც ერთ ბმულს იყოფენ."],
              ["2", "ერთი გადაიტანე", "აირჩიე რომელ ანიმეს უნდა ახალი ბმული და დააჭირე გადატანას."],
              ["3", "მეორეს ნუ შეეხები", "ვისაც ძველი ბმული უნდა დარჩეს, იმას არაფერი შეცვალო."],
            ].map(([step, title, text]) => (
              <li key={step} className="rounded-2xl border border-white/5 bg-black/25 p-4">
                <p className="text-xs text-primary">{step}</p>
                <p className="mt-2 text-sm text-white">{title}</p>
                <p className="mt-1 text-sm leading-6 text-white/45">{text}</p>
              </li>
            ))}
          </ol>
        </section>
        {groups.length ? groups.map((group) => (
          <section key={group.slug} className="overflow-hidden rounded-[1.75rem] border border-white/5 bg-white/[0.02]">
            <div className="border-b border-white/5 bg-primary/10 px-6 py-5">
              <p className="text-[10px] tracking-[0.2em] text-primary uppercase">საერთო ბმული · ამას იყოფენ</p>
              <p className="mt-2 font-mono text-sm break-all text-white">/anime/{group.slug}</p>
              <p className="mt-2 text-sm leading-6 text-white/55">ეს ბმული ახლა {group.items.length} ანიმეს ეკუთვნის. საიტი მათგან მხოლოდ ერთს ხსნის. ერთს ახალ ბმულზე გადაიტანე, რომ ორივე ცალ-ცალკე გაიხსნას.</p>
            </div>
            <div className="grid gap-px bg-white/5 lg:grid-cols-2">
              {group.items.map((item) => {
                const others = group.items.filter((other) => other.id !== item.id);
                return (
                <article key={item.id} className="bg-[#020202] p-6">
                  <div className="flex gap-4">
                    <div className="relative aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-2xl bg-white/5">
                      {item.poster ? <img src={item.poster} alt="" className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] tracking-[0.16em] text-white/35 uppercase">ანიმე #{item.id}{item.year ? ` · ${item.year}` : ""}</p>
                      <h2 className="mt-1 text-lg leading-6">{item.title}</h2>
                      <p className={`mt-2 text-sm ${item.published ? "text-green-400" : "text-white/40"}`}>{item.published ? "საიტზე ჩანს" : "საიტზე დამალულია"}</p>
                    </div>
                  </div>
                  <div className="mt-5 rounded-2xl border border-primary/25 bg-primary/10 p-4">
                    <p className="text-[10px] tracking-[0.16em] text-primary uppercase">ახლა ეს ბმული აქვს</p>
                    <p className="mt-2 font-mono text-sm break-all text-white">/anime/{item.slug}</p>
                    <p className="mt-3 text-sm text-white/70">ზუსტად ემთხვევა:</p>
                    <ul className="mt-2 space-y-1">
                      {others.map((other) => (
                        <li key={other.id} className="text-sm leading-6 text-white">{other.title} <span className="text-white/45">#{other.id}{other.year ? ` · ${other.year}` : ""}</span></li>
                      ))}
                    </ul>
                  </div>
                  <form action={save} className="mt-4">
                    <input type="hidden" name="id" value={item.id} />
                    <label className="block text-sm text-white/70" htmlFor={`slug-${item.id}`}>თუ ამ ანიმეს გადაიტან, ახალი ბმული იქნება</label>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input id={`slug-${item.id}`} name="slug" defaultValue={item.suggestion} required aria-label="ახალი ბმული" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-3 font-mono text-sm outline-none focus:border-primary/50" />
                      <button className="rounded-xl bg-primary px-4 py-3 text-sm text-white">მხოლოდ ამის გადატანა</button>
                    </div>
                    {error && errorId === item.id ? <p className="mt-2 text-sm text-primary">{error}</p> : null}
                  </form>
                </article>
                );
              })}
            </div>
          </section>
        )) : (
          <p className="rounded-[1.75rem] border border-white/5 py-20 text-center text-sm leading-7 text-white/45">ყველა ანიმეს თავისი ბმული აქვს. აქ არაფერია შესაცვლელი.</p>
        )}
      </div>
    </div>
  );
}
