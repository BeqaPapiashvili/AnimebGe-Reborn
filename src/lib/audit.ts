import "server-only";
import { execute, query } from "@/lib/db";

let ready: Promise<void> | null = null;

function ensureAudit() {
  ready ??= execute(`CREATE TABLE IF NOT EXISTS site_audit (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(80) NOT NULL,
    action VARCHAR(80) NOT NULL,
    detail VARCHAR(240) NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).then(() => undefined).catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

export async function recordAudit(actor: { id: number; name: string }, action: string, detail: string) {
  await ensureAudit();
  await execute(
    "INSERT INTO site_audit (user_id, name, action, detail, created_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP())",
    [actor.id, actor.name.slice(0, 80), action.slice(0, 80), detail.replace(/\s+/g, " ").trim().slice(0, 240)],
  );
}

export async function listAudit() {
  await ensureAudit();
  const rows = await query<{ id: number; name: string; action: string; detail: string; created_at: string }>(
    "SELECT id, name, action, detail, created_at FROM site_audit ORDER BY id DESC LIMIT 80",
  );
  return rows.map((row) => {
    const date = new Date(String(row.created_at).replace(" ", "T") + "Z");
    return {
      id: row.id,
      name: row.name,
      action: row.action,
      detail: row.detail,
      at: Number.isFinite(date.getTime()) ? date.toLocaleString("ka-GE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : row.created_at,
    };
  });
}
