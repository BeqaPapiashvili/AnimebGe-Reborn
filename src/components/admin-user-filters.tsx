"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ChevronDown, Search, Shield } from "lucide-react";

export function DeleteAccount({ id, action }: { id: number; action: (formData: FormData) => void }) {
  return (
    <form action={action} className="mx-auto mt-4 max-w-[1100px] px-8 lg:px-12" onSubmit={(event) => { if (!confirm("ანგარიში წაიშლება. კომენტარები დარჩება.")) event.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button className="h-10 cursor-pointer rounded-xl border border-[#e93748]/40 px-4 text-sm text-[#e93748]">ანგარიშის წაშლა</button>
    </form>
  );
}

export function AdminUserFilters({
  q,
  group,
  status,
  groups,
}: {
  q: string;
  group: string;
  status: string;
  groups: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [roleOpen, setRoleOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const roleLabel = groups.find((item) => item.id === group)?.name ?? "ყველა ჯგუფი";
  const statusLabel = status === "active" ? "აქტიური" : status === "banned" ? "დაბლოკილი" : "სტატუსი";

  function go(next: { q?: string; group?: string; status?: string }) {
    const params = new URLSearchParams();
    const query = next.q ?? q;
    const role = next.group ?? group;
    const state = next.status ?? status;
    if (query) params.set("q", query);
    if (role) params.set("group", role);
    if (state) params.set("status", state);
    router.push(`/admin/users${params.size ? `?${params}` : ""}`);
  }

  return (
    <form
      className={`relative flex flex-col items-center justify-between gap-6 rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-8 shadow-2xl backdrop-blur-3xl lg:flex-row ${roleOpen || statusOpen ? "z-[60]" : "z-30"}`}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        go({ q: String(data.get("q") ?? "") });
      }}
    >
      <div className="group relative w-full lg:w-[500px]">
        <Search className="pointer-events-none absolute top-1/2 left-6 size-5 -translate-y-1/2 text-white/20 group-focus-within:text-primary" />
        <input name="q" defaultValue={q} placeholder="ძებნა სახელით ან ელ-ფოსტით..." className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-5 pr-8 pl-16 text-sm text-white outline-none placeholder:text-white/20 focus:border-primary/50 focus:bg-white/[0.05]" />
      </div>
      <div className="flex w-full items-center gap-4 lg:w-auto">
        <div className="relative flex-1 lg:w-56">
          <button type="button" onClick={() => { setRoleOpen((open) => !open); setStatusOpen(false); }} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-5 text-[10px] tracking-widest text-white/60 uppercase hover:text-white">
            <span className="flex items-center gap-3"><Shield className="size-4 text-primary" />{roleLabel}</span>
            <ChevronDown className={`size-4 ${roleOpen ? "rotate-180" : ""}`} />
          </button>
          {roleOpen ? (
            <div className="absolute top-full left-0 z-50 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl">
              <button type="button" className={`w-full px-6 py-4 text-left text-[10px] tracking-widest uppercase hover:bg-white/5 ${group ? "text-white/40" : "bg-primary/5 text-primary"}`} onClick={() => { setRoleOpen(false); go({ group: "" }); }}>ყველა ჯგუფი</button>
              {groups.map((item) => (
                <button key={item.id} type="button" className={`w-full px-6 py-4 text-left text-[10px] tracking-widest uppercase hover:bg-white/5 ${group === item.id ? "bg-primary/5 text-primary" : "text-white/40"}`} onClick={() => { setRoleOpen(false); go({ group: item.id }); }}>{item.name}</button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="relative flex-1 lg:w-56">
          <button type="button" onClick={() => { setStatusOpen((open) => !open); setRoleOpen(false); }} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-5 text-[10px] tracking-widest text-white/60 uppercase hover:text-white">
            <span className="flex items-center gap-3"><Activity className="size-4 text-blue-500" />{statusLabel}</span>
            <ChevronDown className={`size-4 ${statusOpen ? "rotate-180" : ""}`} />
          </button>
          {statusOpen ? (
            <div className="absolute top-full left-0 z-50 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl">
              {[["", "ყველა სტატუსი"], ["active", "აქტიური"], ["banned", "დაბლოკილი"]].map(([id, label]) => (
                <button key={id || "all"} type="button" className={`w-full px-6 py-4 text-left text-[10px] tracking-widest uppercase hover:bg-white/5 ${status === id ? "bg-primary/5 text-primary" : "text-white/40"}`} onClick={() => { setStatusOpen(false); go({ status: id }); }}>{label}</button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </form>
  );
}
