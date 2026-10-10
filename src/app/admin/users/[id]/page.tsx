import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminSelect } from "@/components/admin-menu";
import { DeleteAccount } from "@/components/admin-user-filters";
import { Field, SiteCta, inputClass, quietClass } from "@/components/admin-ui";
import { adjustUserCoins, adjustUserXp, deskNumber, readUserDesk } from "@/lib/admin-desk";
import { deleteAdminUser, listGroups, readAdminUser, saveAdminUser } from "@/lib/admin-control";
import { recordAudit } from "@/lib/audit";
import { getSession, isAdmin, startSession } from "@/lib/auth";

export const metadata: Metadata = { title: "მომხმარებლის რედაქტირება | ადმინპანელი" };
export const dynamic = "force-dynamic";

async function save(formData: FormData) {
  "use server";
  const actor = await getSession();
  if (!actor || !isAdmin(actor)) return;
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password !== confirm) redirect(`/admin/users/${formData.get("id") || "new"}?error=${encodeURIComponent("პაროლები არ ემთხვევა.")}`);
  const id = Number(formData.get("id")) || 0;
  const result = await saveAdminUser(actor.id, {
    id,
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password,
    group: Number(formData.get("group")) || 4,
    banned: formData.get("banned") === "1",
  });
  if (result.error) redirect(`/admin/users/${id || "new"}?error=${encodeURIComponent(result.error)}`);
  await recordAudit(actor, "მომხმარებელი", `${String(formData.get("name") ?? "").slice(0, 40)} · ჯგუფი ${Number(formData.get("group")) || 4}${formData.get("banned") === "1" ? " · ბანი" : ""}`);
  if (result.password) await startSession({ user_id: actor.id, password: result.password });
  redirect(`/admin/users/${result.id}?saved=1`);
}

async function moveCoins(formData: FormData) {
  "use server";
  const actor = await getSession();
  if (!actor || !isAdmin(actor)) return;
  const id = Number(formData.get("id")) || 0;
  const amount = Number(formData.get("amount")) || 0;
  const signed = formData.get("way") === "take" ? -Math.abs(amount) : Math.abs(amount);
  const error = await adjustUserCoins(id, signed);
  if (!error) await recordAudit(actor, "მონეტა", `${signed > 0 ? "+" : ""}${signed} · მომხმარებელი ${id}`);
  redirect(`/admin/users/${id}?${error ? `error=${encodeURIComponent(error)}` : "saved=coins"}`);
}

async function moveXp(formData: FormData) {
  "use server";
  const actor = await getSession();
  if (!actor || !isAdmin(actor)) return;
  const id = Number(formData.get("id")) || 0;
  const amount = Number(formData.get("amount")) || 0;
  const signed = formData.get("way") === "take" ? -Math.abs(amount) : Math.abs(amount);
  const error = await adjustUserXp(id, signed);
  if (!error) await recordAudit(actor, "ქულა", `${signed > 0 ? "+" : ""}${signed} · მომხმარებელი ${id}`);
  redirect(`/admin/users/${id}?${error ? `error=${encodeURIComponent(error)}` : "saved=xp"}`);
}

async function removeUser(formData: FormData) {
  "use server";
  const actor = await getSession();
  if (!actor || !isAdmin(actor)) return;
  const id = Number(formData.get("id")) || 0;
  const error = await deleteAdminUser(actor.id, id);
  if (error) redirect(`/admin/users/${id}?error=${encodeURIComponent(error)}`);
  await recordAudit(actor, "მომხმარებელი", `წაშლა · ${id}`);
  redirect("/admin/users");
}

export default async function UserEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const actor = await getSession();
  if (!actor || !isAdmin(actor)) notFound();
  const { id: raw } = await params;
  const query = await searchParams;
  const creating = raw === "new";
  const id = creating ? 0 : Number(raw);
  if (!creating && (!Number.isInteger(id) || id <= 0)) notFound();
  const account = creating ? { id: 0, name: "", email: "", group: 4, banned: false } : await readAdminUser(id);
  if (!account) notFound();
  const groups = await listGroups();
  const desk = creating ? null : await readUserDesk(account.id);
  const mine = account.id === actor.id;
  const error = query.error ?? "";
  return (
    <div className="min-h-screen bg-[#020202] pb-20 text-white">
      <form action={save}>
        <div className="sticky top-0 z-40 border-b border-white/5 bg-[#020202]/80 px-8 py-6 backdrop-blur-3xl lg:px-12">
          <div className="mx-auto flex w-full max-w-[1100px] flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <a href="/admin/users" className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-lg" aria-label="უკან">←</a>
              <div>
                <h1 className="text-3xl tracking-tight">{creating ? "ახალი მომხმარებელი" : "რედაქტირება"}</h1>
                <p className="mt-1 text-[10px] tracking-[0.2em] text-white/60 uppercase">{creating ? "სახელი, ელფოსტა და პაროლი" : account.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a href="/admin/users" className={quietClass}>გაუქმება</a>
              <SiteCta submit>{creating ? "შექმნა" : "შენახვა"}</SiteCta>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-[1100px] px-8 pt-8 lg:px-12">
          {query.saved ? <p className="mb-4 text-sm text-white">{query.saved === "coins" ? "მონეტა განახლდა." : query.saved === "xp" ? "ქულა განახლდა." : "შენახულია."}</p> : null}
          {error ? <p className="mb-4 text-sm text-primary">{error}</p> : null}
          <input type="hidden" name="id" value={account.id} />
          <section className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6 sm:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="სახელი"><input name="name" required defaultValue={account.name} className={inputClass} /></Field>
              <Field label="ელფოსტა"><input name="email" type="email" required defaultValue={account.email} className={inputClass} /></Field>
              <Field label={creating ? "პაროლი" : "ახალი პაროლი"}>
                <input name="password" type="password" required={creating} autoComplete="new-password" placeholder={creating ? "" : "ცარიელი დარჩეს და არ შეიცვლება"} className={inputClass} />
              </Field>
              <Field label="გაიმეორე პაროლი"><input name="confirm" type="password" required={creating} autoComplete="new-password" className={inputClass} /></Field>
              <div className="relative z-20">
                <Field label="ჯგუფი">
                  {mine ? (
                    <p className="rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-sm">{groups.find((item) => item.id === account.group)?.name}</p>
                  ) : (
                    <AdminSelect name="group" value={String(account.group)} options={groups.map((item) => ({ value: String(item.id), label: item.name }))} />
                  )}
                </Field>
              </div>
              <div>
                <p className="mb-3 ml-2 text-[10px] tracking-[0.2em] text-white/60 uppercase">სტატუსი</p>
                {mine ? (
                  <p className="rounded-2xl border border-green-500/20 bg-green-500/10 px-6 py-4 text-sm text-green-400">აქტიური</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="cursor-pointer">
                      <input type="radio" name="banned" value="0" defaultChecked={!account.banned} className="peer sr-only" />
                      <span className="flex items-center justify-center rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-sm text-white/50 peer-checked:border-green-500/30 peer-checked:bg-green-500/15 peer-checked:text-green-400">აქტიური</span>
                    </label>
                    <label className="cursor-pointer">
                      <input type="radio" name="banned" value="1" defaultChecked={account.banned} className="peer sr-only" />
                      <span className="flex items-center justify-center rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-sm text-white/50 peer-checked:border-red-500/30 peer-checked:bg-red-500/15 peer-checked:text-red-400">დაბლოკილი</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
            {mine ? <p className="mt-4 text-sm text-white/40">საკუთარ ჯგუფს და სტატუსს აქედან ვერ შეცვლი.</p> : null}
          </section>
        </div>
      </form>
      {!creating && !mine ? <DeleteAccount id={account.id} action={removeUser} /> : null}
      {desk ? (
        <div className="mx-auto max-w-[1100px] space-y-4 px-8 pt-6 lg:px-12">
          <div className="grid gap-4 md:grid-cols-2">
            <form action={moveCoins} className="relative overflow-hidden rounded-2xl border border-[#e2b340]/20 bg-[#101013] p-5">
              <span className="pointer-events-none absolute -top-10 -right-8 size-32 rounded-full bg-[#e2b340]/15 blur-3xl" />
              <input type="hidden" name="id" value={account.id} />
              <p className="text-[11px] tracking-[0.16em] text-[#e2b340] uppercase">მონეტა</p>
              <p className="mt-1 text-3xl tracking-tight tabular-nums">{deskNumber(desk.coins)}</p>
              <div className="mt-4 flex gap-2">
                <input name="amount" type="number" min={1} max={1000000} placeholder="რაოდენობა" className="h-10 min-w-0 flex-1 rounded-xl border border-white/8 bg-black/30 px-3 text-sm outline-none" />
                <button name="way" value="add" className="h-10 cursor-pointer rounded-xl bg-[#e93748] px-3 text-sm text-white">დამატება</button>
                <button name="way" value="take" className="h-10 cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm">ჩამოჭრა</button>
              </div>
            </form>
            <form action={moveXp} className="relative overflow-hidden rounded-2xl border border-sky-400/15 bg-[#101013] p-5">
              <span className="pointer-events-none absolute -top-10 -right-8 size-32 rounded-full bg-sky-400/15 blur-3xl" />
              <input type="hidden" name="id" value={account.id} />
              <p className="text-[11px] tracking-[0.16em] text-sky-300 uppercase">ქულა · დონე {desk.level}</p>
              <p className="mt-1 text-3xl tracking-tight tabular-nums">{deskNumber(desk.xp)}</p>
              <div className="mt-4 flex gap-2">
                <input name="amount" type="number" min={1} max={1000000} placeholder="რაოდენობა" className="h-10 min-w-0 flex-1 rounded-xl border border-white/8 bg-black/30 px-3 text-sm outline-none" />
                <button name="way" value="add" className="h-10 cursor-pointer rounded-xl bg-[#e93748] px-3 text-sm text-white">დამატება</button>
                <button name="way" value="take" className="h-10 cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm">ჩამოჭრა</button>
              </div>
            </form>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-2xl border border-white/8 bg-[#101013] p-4">
              <h2 className="px-1 text-[11px] tracking-[0.16em] text-white/35 uppercase">კომენტარები</h2>
              <ul className="mt-3 grid gap-2">
                {desk.comments.length ? desk.comments.map((item) => (
                  <li key={item.id} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                    <a href={item.slug ? `/anime/${item.slug}` : "/admin/comments"} className="text-sm text-white">{item.title}</a>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-white/40">{item.text}</p>
                  </li>
                )) : <li className="px-1 text-sm text-white/30">კომენტარი არ არის.</li>}
              </ul>
            </section>
            <section className="rounded-2xl border border-white/8 bg-[#101013] p-4">
              <h2 className="px-1 text-[11px] tracking-[0.16em] text-white/35 uppercase">რეპორტები</h2>
              <ul className="mt-3 grid gap-2">
                {desk.reports.length ? desk.reports.map((item) => (
                  <li key={item.id} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                    <a href="/admin/reports" className="flex items-center justify-between gap-2 text-sm text-white"><span className="truncate">{item.title}</span><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${item.open ? "bg-[#e93748]/15 text-[#ff8b96]" : "bg-white/8 text-white/40"}`}>{item.open ? "ღია" : "დახურული"}</span></a>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-white/40">{item.text}</p>
                  </li>
                )) : <li className="px-1 text-sm text-white/30">რეპორტი არ არის.</li>}
              </ul>
            </section>
            <section className="rounded-2xl border border-white/8 bg-[#101013] p-4">
              <h2 className="px-1 text-[11px] tracking-[0.16em] text-white/35 uppercase">სიები</h2>
              <ul className="mt-3 grid gap-1.5">
                {desk.lists.map((item) => <li key={item.name} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-sm"><span className="truncate text-white/75">{item.name}</span><span className="tabular-nums text-white/35">{item.n}</span></li>)}
                {desk.folders.map((item) => <li key={item.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-sm"><a href={`/lists/${item.id}`} className="truncate text-white/75">{item.name}</a><span className="tabular-nums text-white/35">{item.n}</span></li>)}
                {!desk.lists.length && !desk.folders.length ? <li className="px-1 text-sm text-white/30">სია არ არის.</li> : null}
              </ul>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
