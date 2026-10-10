export function Marks({ sub, dub, total }: { sub?: string; dub?: string; total?: string }) {
  const parts = [
    Number(sub) > 0 ? { key: "sub", value: sub, icon: <><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M8 10.5a2 2 0 0 0 0 3M14 10.5a2 2 0 0 0 0 3" /></> } : null,
    Number(dub) > 0 ? { key: "dub", value: dub, icon: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4" /></> } : null,
    { key: "total", value: total || "?", icon: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" /></> },
  ].filter((part): part is NonNullable<typeof part> => !!part);
  return (
    <>
      {parts.map((part, index) => (
        <span key={part.key} className="inline-flex items-center gap-1">
          {index ? <span className="mr-1 text-white/20">/</span> : null}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{part.icon}</svg>
          {part.value}
        </span>
      ))}
    </>
  );
}
