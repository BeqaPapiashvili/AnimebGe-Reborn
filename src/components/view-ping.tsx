"use client";

import { useEffect } from "react";

export function ViewPing({ id }: { id: number }) {
  useEffect(() => {
    fetch("/api/view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }), keepalive: true }).catch(() => undefined);
  }, [id]);
  return null;
}
