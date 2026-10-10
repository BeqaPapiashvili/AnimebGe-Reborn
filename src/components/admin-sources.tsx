"use client";

import { useState } from "react";
import { AdminSelect } from "@/components/admin-menu";
import { dangerClass, inputClass, quietClass } from "@/components/admin-ui";

type Server = { key: string; kind: "file" | "embed"; links: string[] };

function embedLinks(raw: string) {
  const found: string[] = [];
  const pattern = /"url"\s*:\s*['"]([^'"]*)['"]/g;
  for (const match of raw.matchAll(pattern)) found.push(match[1]);
  return found;
}

function fileLinks(raw: string) {
  const found: string[] = [];
  const pattern = /file\s*:\s*"([^"]+)"/g;
  for (const match of raw.matchAll(pattern)) found.push(match[1]);
  return found;
}

function encodeEmbed(links: string[]) {
  return links.map((url, index) => {
    const clean = url.trim().replace(/["']/g, "");
    return clean ? `{"title":"სერია ${index + 1}","url":"${clean}"}` : "";
  }).filter(Boolean).join("__NEWL__");
}

function encodeFile(links: string[]) {
  return links.map((url, index) => {
    const clean = url.trim().replace(/["']/g, "");
    if (!clean) return "";
    const type = clean.includes(".m3u8") ? "application/x-mpegURL" : "video/mp4";
    return `{ title:"სერია ${index + 1}",languages:[{label:"ქართული",sources:[{label:"მაღალი ხარისხი",file:"${clean}",type:"${type}"}]}]}`;
  }).filter(Boolean).join(",__NEWL__");
}

function nextEmbedKey(servers: Server[]) {
  const keys = new Set(servers.map((server) => server.key));
  if (!keys.has("iframe_season_1")) return "iframe_season_1";
  let index = 1;
  while (keys.has(`iframe${index}`)) index += 1;
  return `iframe${index}`;
}

function fromSources(sources: { key: string; value: string }[]): Server[] {
  const servers = sources.map((source) => ({
    key: source.key,
    kind: source.key === "mp4link" ? "file" as const : "embed" as const,
    links: (source.key === "mp4link" ? fileLinks(source.value) : embedLinks(source.value)).filter(Boolean),
  }));
  return servers.length ? servers : [{ key: "iframe_season_1", kind: "embed", links: [""] }];
}

export function AdminSources({ sources }: { sources: { key: string; value: string }[] }) {
  const [servers, setServers] = useState<Server[]>(() => fromSources(sources));
  const [bulk, setBulk] = useState<Record<number, string>>({});

  function update(index: number, next: Server) {
    setServers((current) => current.map((server, i) => i === index ? next : server));
  }

  function addLinks(index: number) {
    const extra = (bulk[index] ?? "").split(/\s+/).map((item) => item.trim()).filter((item) => /^https?:\/\//i.test(item));
    if (!extra.length) return;
    setServers((current) => current.map((server, i) => i === index ? { ...server, links: [...server.links.filter(Boolean), ...extra] } : server));
    setBulk((current) => ({ ...current, [index]: "" }));
  }

  return (
    <section className="mt-4 rounded-xl border border-white/8 bg-[#0c0c0c] px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-lg font-bold"><span className="h-5 w-1 rounded-sm bg-[#e93748]" />სერიები</h2>
        <button type="button" className={quietClass} onClick={() => setServers((current) => [...current, { key: nextEmbedKey(current), kind: "embed", links: [""] }])}>სერვერის დამატება</button>
      </div>
      <p className="mt-2 text-sm text-[#9ca3af]">ჩასვი მხოლოდ ბმული. სერიის ნომერი თვითონ იწერება, ზემოდან ქვემოთ.</p>
      <div className="mt-4 flex flex-col gap-4">
        {servers.map((server, index) => (
          <div key={server.key} className="rounded-xl border border-white/8 bg-[#141414] p-3">
            <input type="hidden" name="source_key" value={server.kind === "file" ? "mp4link" : server.key} />
            <input type="hidden" name="source_value" value={server.kind === "file" ? encodeFile(server.links) : encodeEmbed(server.links)} />
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-56">
                <AdminSelect
                  value={server.kind}
                  options={[{ value: "embed", label: "ჩაშენებული ფლეიერი" }, { value: "file", label: "ვიდეო ფაილი" }]}
                  placeholder="ტიპი"
                  onChange={(kind) => {
                    if (kind !== "file" && kind !== "embed") return;
                    if (kind === "file" && servers.some((item, i) => i !== index && item.kind === "file")) return;
                    const key = kind === "file" ? "mp4link" : server.key === "mp4link" ? nextEmbedKey(servers.filter((_, i) => i !== index)) : server.key;
                    update(index, { ...server, kind, key });
                  }}
                />
              </div>
              <p className="text-sm text-[#9ca3af]">{server.links.filter(Boolean).length} სერია</p>
              <button type="button" className={`${dangerClass} sm:ml-auto`} onClick={() => setServers((current) => current.filter((_, i) => i !== index))}>სერვერის წაშლა</button>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {server.links.map((link, linkIndex) => (
                <div key={linkIndex} className="flex items-center gap-2">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-black/80 text-sm font-semibold text-[#e93748]">{linkIndex + 1}</span>
                  <input value={link} onChange={(event) => update(index, { ...server, links: server.links.map((item, i) => i === linkIndex ? event.target.value.trim() : item) })} placeholder="https://" aria-label={`სერია ${linkIndex + 1}`} className={inputClass} />
                  <button type="button" className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-md border border-white/8 text-[#9ca3af] hover:text-white" aria-label="სერიის წაშლა" onClick={() => update(index, { ...server, links: server.links.filter((_, i) => i !== linkIndex) })}>×</button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={quietClass} onClick={() => update(index, { ...server, links: [...server.links, ""] })}>სერიის დამატება</button>
            </div>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-[13px] font-semibold">რამდენიმე ბმული ერთად</span>
              <textarea value={bulk[index] ?? ""} onChange={(event) => setBulk((current) => ({ ...current, [index]: event.target.value }))} rows={3} placeholder={"თითო ბმული ახალ ხაზზე\nhttps://...\nhttps://..."} className="w-full resize-y rounded-md border border-white/8 bg-[#0c0c0c] px-3 py-2 text-sm text-white outline-none placeholder:text-[#6a7282]" />
            </label>
            <button type="button" className={`${quietClass} mt-2`} onClick={() => addLinks(index)}>ბმულების ჩამატება</button>
          </div>
        ))}
      </div>
    </section>
  );
}
