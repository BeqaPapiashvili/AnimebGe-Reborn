"use client";

import { useEffect, useRef, useState } from "react";
import type { GuideDoc, GuideRow } from "@/data/guide";

const accent = "#e93748";

function Rich({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\((?:https?:\/\/[^)\s]+|\/[^)\s]*)\))/g);
  return parts.map((part, index) => {
    const match = part.match(/^\[([^\]]+)\]\(((?:https?:\/\/[^)\s]+|\/[^)\s]*))\)$/);
    if (!match) return <span key={index}>{part}</span>;
    const external = match[2].startsWith("http");
    return <a key={index} href={match[2]} className="text-white underline" target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>{match[1]}</a>;
  });
}


function Mark({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-flex h-5 -skew-x-12 items-center px-2.5 text-[10.5px] leading-none font-extrabold tracking-[0.4px] ${ok ? "bg-[#e93748] text-white" : "bg-[#f43f5e]/16 text-[#fb7185]"}`}>
      <span className="skew-x-12">{ok ? "ნებადართული" : "აკრძალული"}</span>
    </span>
  );
}

function Lines({ row }: { row: GuideRow }) {
  return (
    <div className="pt-3.5">
      <Mark ok={row.ok} />
      <ul className="flex flex-col gap-1.5 pt-2">
        {row.items.map((item, index) => (
          <li key={index} className="flex gap-2 text-[13px] leading-[21px] text-[#d4d4d8]">
            <span className={`w-3.5 shrink-0 font-bold ${row.ok ? "text-[#e93748]" : "text-[#ff637e]"}`}>{row.ok ? "✓" : "✕"}</span>
            <span><Rich text={item} /></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GuideView({ doc }: { doc: GuideDoc }) {
  const sections = doc.sections;
  const steps = doc.steps;
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const [landed, setLanded] = useState("");
  const [mark, setMark] = useState(0);
  const [dragging, setDragging] = useState(false);
  const rail = useRef<HTMLElement>(null);
  const drag = useRef({ on: false, x: 0, left: 0, moved: false, v: 0, lastX: 0, lastT: 0, pick: "" });

  useEffect(() => {
    const nodes = sections.map((section) => document.getElementById(section.id)).filter((node): node is HTMLElement => !!node);
    const observer = new IntersectionObserver((entries) => {
      const hit = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (hit?.target.id) setActive(hit.target.id);
    }, { rootMargin: "-140px 0px -60% 0px", threshold: 0 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [sections]);

  function go(id: string) {
    const node = document.getElementById(id);
    if (!node) return;
    const top = node.getBoundingClientRect().top + window.scrollY - 136;
    const start = window.scrollY;
    const distance = top - start;
    setActive(id);
    history.replaceState(null, "", `#${id}`);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || Math.abs(distance) < 2) {
      window.scrollTo(0, top);
      return;
    }
    const duration = Math.min(900, 420 + Math.abs(distance) * 0.35);
    const t0 = performance.now();
    function frame(now: number) {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      window.scrollTo(0, start + distance * eased);
      if (t < 1) requestAnimationFrame(frame);
      else {
        setLanded(id);
        setMark((value) => value + 1);
        window.setTimeout(() => setLanded(""), 900);
      }
    }
    requestAnimationFrame(frame);
  }

  return (
    <div className="bg-[#070707] pt-20 text-white">
      <div className="relative overflow-hidden bg-[#0a0a0a]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_100%,rgba(233,55,72,0.14),transparent_58%)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#070707] via-[#070707]/70 to-[#070707]/40" />
        <div className="relative mx-auto w-full max-w-[896px] px-6 pt-16 pb-6">
          <p className="text-[11px] font-bold tracking-[2.2px] text-[#71717b]">ANIMEB</p>
          <h1 className="pt-1 text-[30px] leading-9 font-extrabold tracking-[-0.75px]">საზოგადოების წესები</h1>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[896px] px-6 pt-6 pb-16">
        <nav className="flex items-center gap-2 text-xs" aria-label="გზა">
          <a href="/" className="text-[#71717b] hover:text-white">მთავარი</a>
          <span className="text-[#3f3f47]">•</span>
          <span className="text-[#d4d4d8]">საზოგადოების წესები</span>
        </nav>

        <div className="mt-6 rounded-[10px] border border-white/6 bg-black p-5">
          <p className="text-sm leading-[23px] text-[#9f9fa9]">არსებითად ერთი წესია და ქვემოთ ყველაფერი მისი ახსნაა:</p>
          <p className="pt-2 text-xl leading-7 font-bold">
            იბრძოდე <span style={{ color: accent }}>იდეასთან</span>, არასდროს <span className="underline">ადამიანთან</span>.
          </p>
        </div>

        <div className="sticky top-20 z-30 -mx-6 mt-8 bg-[#070707]/95 px-6 backdrop-blur-md">
          <nav
            ref={rail}
            className={`guide-rail flex gap-2 overflow-x-auto border-b border-white/6 py-3 ${dragging ? "is-drag" : ""}`}
            aria-label="სექციები"
            onPointerDown={(event) => {
              const node = rail.current;
              if (!node || event.button !== 0) return;
              const pick = event.target instanceof Element ? event.target.closest("button")?.dataset.section ?? "" : "";
              drag.current = { on: true, x: event.clientX, left: node.scrollLeft, moved: false, v: 0, lastX: event.clientX, lastT: performance.now(), pick };
              node.setPointerCapture(event.pointerId);
              setDragging(true);
            }}
            onPointerMove={(event) => {
              const node = rail.current;
              const state = drag.current;
              if (!node || !state.on) return;
              const dx = event.clientX - state.x;
              if (Math.abs(dx) <= 5) return;
              state.moved = true;
              node.scrollLeft = state.left - dx;
              const now = performance.now();
              const dt = now - state.lastT;
              if (dt > 0) state.v = (event.clientX - state.lastX) / dt;
              state.lastX = event.clientX;
              state.lastT = now;
            }}
            onPointerUp={() => {
              const state = drag.current;
              const pick = state.pick;
              const moved = state.moved;
              state.on = false;
              state.pick = "";
              setDragging(false);
              if (!moved && pick) {
                go(pick);
                return;
              }
              let velocity = state.v * 16;
              function glide() {
                const node = rail.current;
                if (!node || Math.abs(velocity) < 0.4) return;
                node.scrollLeft -= velocity;
                velocity *= 0.92;
                requestAnimationFrame(glide);
              }
              if (moved) requestAnimationFrame(glide);
            }}
            onPointerCancel={() => { drag.current.on = false; setDragging(false); }}
          >
            {sections.map((section) => {
              const on = active === section.id;
              return (
                <button key={section.id} type="button" data-section={section.id} aria-current={on ? "true" : undefined} className={`flex h-[31px] shrink-0 cursor-grab items-center gap-1.5 rounded-[6px] border px-3 text-xs font-bold transition-colors duration-300 ${on ? "border-[#e93748]/50 bg-[#e93748]/12 text-white" : "border-white/6 bg-white/[0.02] text-[#9f9fa9] hover:text-white"}`}>
                  <span style={{ color: accent }}>{section.n}</span>
                  {section.title}
                </button>
              );
            })}
          </nav>
        </div>

        {sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-36 pt-8">
            <h2 className="relative flex items-baseline gap-2 text-xl leading-7 font-extrabold tracking-[-0.5px]">
              <span className="text-lg font-black" style={{ color: accent }}>{section.n}</span>
              {section.title}
              {landed === section.id ? <span key={mark} className="guide-mark absolute -bottom-1 left-0 h-0.5 w-16 rounded-full bg-[#e93748]" /> : null}
            </h2>
            <p className="pt-3 text-[13px] leading-[21px] text-[#71717b]">{section.lead}</p>
            <div className="flex flex-col gap-3 pt-4">
              {section.blocks.map((block) => (
                <article key={block.code} className="rounded-[10px] border border-white/6 bg-black p-5">
                  <h3 className="flex items-baseline gap-2">
                    <span className="font-mono text-[13px] font-bold text-[#71717b]">{block.code}</span>
                    <span className="text-[15px] leading-[22.5px] font-bold">{block.title}</span>
                  </h3>
                  <p className="pt-2 text-sm leading-[23px] text-[#d4d4d8]"><Rich text={block.body} /></p>
                  {block.rows?.map((row, index) => <Lines key={`${block.code}-${index}`} row={row} />)}
                </article>
              ))}
            </div>
          </section>
        ))}

        <div className="mt-4 rounded-[10px] border border-white/6 bg-black p-5">
          <p className="text-[13px] font-bold tracking-[0.65px] text-[#9f9fa9]">როგორ მკაცრდება შედეგი</p>
          <div className="flex flex-wrap items-center gap-1.5 pt-3">
            {steps.map((step, index) => (
              <span key={step} className="contents">
                {index ? <span className="text-base text-[#52525c]">→</span> : null}
                <span className="rounded-[6px] border border-white/7 bg-[#0d0e15] px-2.5 py-1 text-xs font-semibold text-[#e4e4e7]">{step}</span>
              </span>
            ))}
          </div>
        </div>

        <p className="mt-10 border-t border-white/6 pt-5 text-[13px] leading-5 text-[#71717b]">
          ეს წესები მოქმედებს ყველგან, სადაც წერ: ეპიზოდის კომენტარებში და საზოგადოების ლენტაში.
        </p>
      </div>
    </div>
  );
}
