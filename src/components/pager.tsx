function pageWindow(current: number, pages: number) {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
  const items: (number | "gap")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(pages - 1, current + 1);
  if (start > 2) items.push("gap");
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < pages - 1) items.push("gap");
  items.push(pages);
  return items;
}

export function Pager({ page, pages, onPick }: { page: number; pages: number; onPick: (page: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="გვერდები">
      <button type="button" disabled={page <= 1} className="grid size-9 cursor-pointer place-items-center rounded-lg border border-white/10 text-white transition hover:border-white/25 disabled:cursor-default disabled:opacity-30" aria-label="წინა გვერდი" onClick={() => onPick(page - 1)}>‹</button>
      {pageWindow(page, pages).map((item, index) => item === "gap" ? (
        <span key={`gap-${index}`} className="px-1 text-sm text-white/35">…</span>
      ) : (
        <button key={item} type="button" aria-current={item === page ? "page" : undefined} className={`grid size-9 cursor-pointer place-items-center rounded-lg text-sm font-semibold transition ${item === page ? "bg-[#e93748] text-white" : "border border-white/10 text-white/80 hover:border-white/25 hover:text-white"}`} onClick={() => onPick(item)}>{item}</button>
      ))}
      <button type="button" disabled={page >= pages} className="grid size-9 cursor-pointer place-items-center rounded-lg border border-white/10 text-white transition hover:border-white/25 disabled:cursor-default disabled:opacity-30" aria-label="შემდეგი გვერდი" onClick={() => onPick(page + 1)}>›</button>
    </nav>
  );
}
