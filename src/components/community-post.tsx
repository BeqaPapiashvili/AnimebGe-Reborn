"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimeTags, Face, PollBox, RichText, ago } from "@/components/community-view";
import { toast } from "@/components/toast";
import { visibleBody } from "@/lib/community-body";
import { communityCategories, type CommunityPageData, type CommunityPost } from "@/lib/community-types";
const labelOf = (id: string) => communityCategories.find((item) => item.id === id)?.label ?? id;

const imageLine = /^!\[[^\]]*\]\((https?:\/\/[^\s)]+|\/uploads\/community\/[\w.-]+)\)$/;

function splitBody(body: string) {
  const lines = visibleBody(body).split("\n");
  let end = lines.length;
  while (end > 0 && (!lines[end - 1].trim() || imageLine.test(lines[end - 1].trim()))) end -= 1;
  const images = lines.slice(end).flatMap((line) => line.trim().match(imageLine)?.[1] ?? []);
  return { text: lines.slice(0, end).join("\n").trim(), images };
}

export function CommunityPostView({ page, post, onAuth }: { page: CommunityPageData; post: CommunityPost; onAuth: () => void }) {
  const router = useRouter();
  const [sort, setSort] = useState<"best" | "new" | "old">("new");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const { text, images } = useMemo(() => splitBody(post.body), [post.body]);
  const replies = useMemo(() => {
    const copy = [...post.replies];
    if (sort === "old") copy.sort((a, b) => a.id - b.id);
    else if (sort === "best") copy.sort((a, b) => b.votes - a.votes || b.id - a.id);
    else copy.sort((a, b) => b.id - a.id);
    return copy;
  }, [post.replies, sort]);

  async function send(payload: Record<string, unknown>) {
    if (!page.signedIn) {
      onAuth();
      return false;
    }
    setSending(true);
    setError("");
    const response = await fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setSending(false);
    if (!response.ok) {
      setError(data.error || "ვერ შეინახა.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function share() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast("ბმული დაკოპირდა");
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 pt-28 pb-16 text-white">
      <div className="rise mx-auto grid w-full max-w-[1180px] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article>
          <div className="flex items-center gap-3">
            <a href="/community" aria-label="უკან" className="grid size-9 place-items-center rounded-full border border-white/10 bg-[#141414]/40">
              <img src="/assets/community/back.svg" alt="" width={16} height={16} />
            </a>
            <a href={`/@${encodeURIComponent(post.name)}`} className="flex items-center gap-3">
              <Face name={post.name} avatar={post.avatar} frame={post.frame} size={36} />
              <span>
                <span className="block text-[16px] font-black tracking-[-0.4px] text-white">{post.name}</span>
                <span className="block text-[12px] text-zinc-500">{ago(post.at)}</span>
              </span>
            </a>
          </div>
          <h1 className="mt-4 text-[28px] font-black leading-tight">{post.title}</h1>
          <span className="mt-3 inline-flex h-5 items-center rounded-full border border-[#e93748]/30 bg-[#e93748]/15 px-3 text-[12px] font-semibold text-[#e93748]">{labelOf(post.category)}</span>
          {images.map((src) => (
            <div key={src} className="relative mt-4 flex h-[336px] items-center justify-center overflow-hidden rounded-[12px] bg-[#0a0a0a]">
              <img src={src} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />
              <img src={src} alt="" className="relative z-10 max-h-full max-w-full object-contain" />
            </div>
          ))}
          {text && <div className="mt-4"><RichText text={text} className="font-mkhedruli text-base leading-6 font-light whitespace-pre-line text-white/90" /></div>}
          {post.anime && post.anime.length > 0 && <div className="mt-4"><AnimeTags items={post.anime} /></div>}
          {post.poll && <div className="mt-4"><PollBox poll={post.poll} onVote={(option) => void send({ action: "poll", postId: post.id, option })} /></div>}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="inline-flex h-9 items-center rounded-full bg-[#141414]/40">
              <button type="button" aria-label="მოწონება" onClick={() => void send({ action: "vote", postId: post.id, value: 1 })} className={`grid h-9 w-10 place-items-center rounded-full ${post.vote === 1 ? "bg-[#e93748]/20" : ""}`}>
                <img src="/assets/community/up.svg" alt="" width={20} height={20} />
              </button>
              <span className="min-w-4 text-center text-[14px] font-bold">{post.votes}</span>
              <button type="button" aria-label="არმოწონება" onClick={() => void send({ action: "vote", postId: post.id, value: -1 })} className={`grid h-9 w-10 place-items-center rounded-full ${post.vote === -1 ? "bg-white/10" : ""}`}>
                <img src="/assets/community/down.svg" alt="" width={20} height={20} />
              </button>
            </div>
            <a href="#comments" className="inline-flex h-9 items-center gap-2 rounded-full bg-[#141414]/40 px-4 text-[14px] font-bold">
              <img src="/assets/community/comment.svg" alt="" width={16} height={16} />
              {post.replies.length}
            </a>
            <button type="button" onClick={() => void share()} className="inline-flex h-9 items-center gap-2 rounded-full bg-[#141414]/40 px-4 text-[14px] font-bold">
              <img src="/assets/community/share.svg" alt="" width={16} height={16} />
              გაზიარება
            </button>
            {page.admin && (
              <>
                <button type="button" onClick={() => void send({ action: "pin", postId: post.id })} className="inline-flex h-9 items-center rounded-full bg-[#141414]/40 px-4 text-[14px] font-bold">
                  {post.pinned ? "მოხსნა" : "ჩამაგრება"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm("წაიშალოს ეს პოსტი?")) return;
                    void send({ action: "delete", postId: post.id }).then((ok) => { if (ok) router.push("/community"); });
                  }}
                  className="inline-flex h-9 items-center rounded-full bg-[#141414]/40 px-4 text-[14px] font-bold text-[#e93748]"
                >
                  წაშლა
                </button>
              </>
            )}
          </div>

          <section id="comments" className="mt-6">
            <div className="flex items-center justify-between border-b border-[#27272a]/50 px-1 py-4">
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-semibold text-[#9f9fa9]">კომენტარები</h2>
                <span className="rounded-full bg-[#e93748] px-2 py-0.5 text-[12px] font-bold text-white">{post.replies.length}</span>
              </div>
              <div className="flex gap-1 text-[13px]">
                {(["best", "new", "old"] as const).map((id) => (
                  <button key={id} type="button" onClick={() => setSort(id)} className={`h-7 rounded-full px-3 ${sort === id ? "bg-[#e93748] font-bold text-white" : "text-zinc-500"}`}>
                    {id === "new" ? "ახალი" : id === "old" ? "ძველი" : "საუკეთესო"}
                  </button>
                ))}
              </div>
            </div>
            <form
              className="mt-4 flex items-center gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const value = draft.trim();
                if (!value) return;
                void send({ action: "reply", postId: post.id, body: value }).then((ok) => { if (ok) setDraft(""); });
              }}
            >
              <Face name={page.viewer?.name} avatar={page.viewer?.avatar} frame={page.viewer?.frame} size={36} />
              <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} placeholder="დაწერე კომენტარი..." className="h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.03] px-4 text-[14px] outline-none placeholder:text-zinc-500" />
              <button type="submit" disabled={sending || draft.trim().length < 1} className="h-11 rounded-full bg-[#e93748] px-4 text-[13px] font-bold text-white disabled:opacity-40">პასუხი</button>
            </form>
            {error && <p className="mt-2 text-[13px] text-[#e93748]">{error}</p>}
            <div className="mt-4 grid gap-4">
              {replies.map((reply) => (
                <div key={reply.id} className="flex gap-3">
                  <Face name={reply.name} avatar={reply.avatar} frame={reply.frame} size={32} />
                  <div>
                    <div className="flex items-center gap-2">
                      <a href={`/@${encodeURIComponent(reply.name)}`} className="text-[14px] font-bold text-white">{reply.name}</a>
                      <span className="text-[12px] text-zinc-500">{ago(reply.at)}</span>
                    </div>
                    <div className="site-comment mt-1 text-[14px] leading-6 text-zinc-300"><RichText text={reply.body} /></div>
                    <button type="button" className={`mt-1 text-[12px] font-bold ${reply.mine ? "text-[#e93748]" : "text-zinc-500"}`} onClick={() => void send({ action: "reply-vote", replyId: reply.id })}>{reply.mine ? "მოწონებული" : "მოწონება"} · {reply.votes}</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </article>

        <aside className="grid gap-4 lg:sticky lg:top-24">
          <div className="rounded-[10px] p-px" style={{ background: "linear-gradient(180deg, rgba(233,55,72,0.45), rgba(255,255,255,0.04))" }}>
            <div className="rounded-[9px] bg-[#101010] p-5">
              <span className="inline-flex rounded-full bg-[#e93748] px-2 py-0.5 text-[10px] font-bold text-white">საზოგადოება</span>
              <p className="mt-3 text-[24px] font-black leading-none">ანიმეს <span className="text-[#e93748]">სივრცე</span></p>
              <p className="mt-2 text-[13px] leading-5 text-zinc-400">რეალური წევრები და პოსტები ამ საიტიდან.</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div><div className="text-[22px] font-black leading-none">{page.stats.users}</div><div className="mt-1 text-[11px] text-zinc-500">წევრები</div></div>
                <div><div className="text-[22px] font-black leading-none">{page.stats.posts}</div><div className="mt-1 text-[11px] text-zinc-500">პოსტები</div></div>
              </div>
            </div>
          </div>
          <section className="rounded-[10px] border border-white/[0.06] bg-[#141414] p-4">
            <h2 className="text-[12px] font-bold text-zinc-500">თემები</h2>
            <ul className="mt-3 grid gap-1">
              {communityCategories.map((item) => (
                <li key={item.id}>
                  <a href={`/community?cat=${item.id}`} className="flex items-center justify-between rounded-md px-2 py-1.5 text-[13px] text-zinc-300 hover:bg-white/5">
                    <span># {item.label}</span>
                    <span className="text-zinc-500">{page.counts[item.id] ?? 0}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
