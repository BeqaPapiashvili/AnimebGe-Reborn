import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { AdminGuide, AdminHomeOrder, AdminLevels, AdminNotice } from "@/components/admin-site";
import { AdminFooter, AdminHelp, AdminSlides, AdminXp } from "@/components/admin-site-more";
import { recordAudit } from "@/lib/audit";
import { getSession, isAdmin } from "@/lib/auth";
import type { HomeBlock, HelpItem } from "@/lib/site-config";
import { slideBoard } from "@/lib/catalog";
import { getFooterLinks, getGuide, getHelp, getHomeBlocks, readLevelSpans, readNotice, readRankNames, readXpRules, saveFooterLinks, saveGuide, saveHelp, saveHomeBlocks, saveLevelSpans, saveNotice, saveRankNames, saveSlides, saveXpRules, slideModes, type SlideMode } from "@/lib/site-config";

export const metadata: Metadata = { title: "საიტი | ადმინპანელი" };
export const dynamic = "force-dynamic";

const parts = [
  { id: "notice", label: "განცხადება" },
  { id: "home", label: "მთავარი" },
  { id: "guide", label: "წესები" },
  { id: "levels", label: "დონეები" },
  { id: "slides", label: "სლაიდერი" },
  { id: "footer", label: "ფეხი" },
  { id: "help", label: "დახმარება" },
  { id: "xp", label: "ქულა" },
] as const;

type Part = (typeof parts)[number]["id"];

function refresh() {
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/guide");
  revalidatePath("/levels");
  revalidatePath("/help");
  revalidatePath("/admin/site");
  revalidatePath("/admin/log");
}

async function saveNoticeForm(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  await saveNotice({
    on: formData.get("on") === "1",
    kicker: String(formData.get("kicker") ?? ""),
    text: String(formData.get("text") ?? ""),
    href: String(formData.get("href") ?? ""),
    label: String(formData.get("label") ?? ""),
  });
  await recordAudit(user, "განცხადება", formData.get("on") === "1" ? "ჩართული" : "გამორთული");
  refresh();
}

async function saveHomeForm(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  let parsed: HomeBlock[] = [];
  try { parsed = JSON.parse(String(formData.get("json") ?? "[]")) as HomeBlock[]; } catch { return; }
  if (!Array.isArray(parsed)) return;
  await saveHomeBlocks(parsed);
  await recordAudit(user, "მთავარი", "სექციების რიგი");
  refresh();
}

async function saveGuideForm(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  let parsed: unknown = null;
  try { parsed = JSON.parse(String(formData.get("json") ?? "{}")); } catch { return; }
  await saveGuide(parsed);
  await recordAudit(user, "წესები", "გზამკვლევი");
  refresh();
}

async function saveLevelsForm(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  await saveLevelSpans(formData.getAll("step").map((item) => Number(item)));
  await saveRankNames(formData.getAll("rank").map((item) => String(item)), formData.getAll("color").map((item) => String(item)));
  await recordAudit(user, "დონეები", "შუალედი და რანგის სახელები");
  refresh();
}

async function saveSlidesForm(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  let parsed: number[] = [];
  try { parsed = JSON.parse(String(formData.get("json") ?? "[]")) as number[]; } catch { return; }
  if (!Array.isArray(parsed)) return;
  const mode = String(formData.get("mode") ?? "auto") as SlideMode;
  await saveSlides(mode, parsed);
  await recordAudit(user, "სლაიდერი", slideModes.find((item) => item.id === mode)?.label ?? mode);
  refresh();
}

async function saveFooterForm(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  await saveFooterLinks({
    twitter: String(formData.get("twitter") ?? ""),
    discord: String(formData.get("discord") ?? ""),
    reddit: String(formData.get("reddit") ?? ""),
  });
  await recordAudit(user, "ფეხი", "სოციალური ბმულები");
  refresh();
}

async function saveHelpForm(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  let parsed: HelpItem[] = [];
  try { parsed = JSON.parse(String(formData.get("json") ?? "[]")) as HelpItem[]; } catch { return; }
  if (!Array.isArray(parsed)) return;
  await saveHelp(parsed);
  await recordAudit(user, "დახმარება", `${parsed.length} კითხვა`);
  refresh();
}

async function saveXpForm(formData: FormData) {
  "use server";
  const user = await getSession();
  if (!user || !isAdmin(user)) return;
  let parsed: unknown = [];
  try { parsed = JSON.parse(String(formData.get("json") ?? "[]")); } catch { return; }
  await saveXpRules(parsed);
  await recordAudit(user, "ქულა", Array.isArray(parsed) ? `${parsed.length} გზა` : "წესები");
  refresh();
}

export default async function AdminSitePage({ searchParams }: { searchParams: Promise<{ part?: string }> }) {
  const user = await getSession();
  if (!user || !isAdmin(user)) notFound();
  const query = await searchParams;
  const part: Part = parts.some((item) => item.id === query.part) ? query.part as Part : "notice";
  const [notice, blocks, guide, spans, ranks, links, help, rules, slides] = await Promise.all([
    readNotice(), getHomeBlocks(), getGuide(), readLevelSpans(), readRankNames(), getFooterLinks(), getHelp(), readXpRules(),
    part === "slides" ? slideBoard() : Promise.resolve(null),
  ]);
  return (
    <div className="min-h-screen bg-[#020202] pb-20 text-white">
      <div className="sticky top-0 z-40 border-b border-white/5 bg-[#020202]/80 px-6 py-5 backdrop-blur-2xl lg:px-10">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4">
          <div className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/5">
            <SlidersHorizontal className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl tracking-tight">საიტი</h1>
            <p className="text-[11px] text-white/35">განცხადება, მთავარი, წესები, დონეები, სლაიდერი, ფეხი, დახმარება, ქულა</p>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] px-6 pt-6 lg:px-10">
        <nav className="mb-6 inline-flex flex-wrap gap-1 rounded-2xl border border-white/8 bg-white/[0.03] p-1">
          {parts.map((item) => (
            <a key={item.id} href={`/admin/site?part=${item.id}`} className={`h-9 rounded-xl px-4 text-sm leading-9 transition ${part === item.id ? "bg-[#e93748] text-white shadow-[0_8px_24px_rgba(233,55,72,0.28)]" : "text-white/45 hover:text-white"}`}>{item.label}</a>
          ))}
        </nav>
        {part === "notice" ? <AdminNotice notice={notice} save={saveNoticeForm} /> : null}
        {part === "home" ? <AdminHomeOrder blocks={blocks} save={saveHomeForm} /> : null}
        {part === "guide" ? <AdminGuide doc={guide} save={saveGuideForm} /> : null}
        {part === "levels" ? <AdminLevels spans={spans} names={ranks} save={saveLevelsForm} /> : null}
        {part === "slides" && slides ? <AdminSlides mode={slides.mode} picks={slides.picks} pools={slides.pools} save={saveSlidesForm} /> : null}
        {part === "footer" ? <AdminFooter links={links} save={saveFooterForm} /> : null}
        {part === "help" ? <AdminHelp items={help} save={saveHelpForm} /> : null}
        {part === "xp" ? <AdminXp rules={rules} save={saveXpForm} /> : null}
      </div>
    </div>
  );
}
