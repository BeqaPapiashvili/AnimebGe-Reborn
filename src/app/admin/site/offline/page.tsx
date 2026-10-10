import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MaintenanceScreen } from "@/components/maintenance-screen";
import { getSession, isAdmin } from "@/lib/auth";
import { getMaintenance, maintenanceKinds } from "@/lib/site-config";

export const metadata: Metadata = { title: "ოფლაინ გვერდი | ადმინპანელი" };
export const dynamic = "force-dynamic";

export default async function OfflinePreview() {
  const user = await getSession();
  if (!user || !isAdmin(user)) notFound();
  const maintenance = await getMaintenance();
  const preset = maintenanceKinds.find((item) => item.id === maintenance.kind) ?? maintenanceKinds[0];
  return <MaintenanceScreen kind={maintenance.kind} title={maintenance.title || preset.title} text={maintenance.text || preset.text} until={maintenance.until} href={maintenance.href} label={maintenance.label} signedIn />;
}
