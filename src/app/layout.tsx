import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { MaintenanceScreen } from "@/components/maintenance-screen";
import { PageProgress } from "@/components/page-progress";
import { PresenceBeacon } from "@/components/presence-beacon";
import { Toaster } from "@/components/toast";
import { getSession, isAdmin } from "@/lib/auth";
import { fontStyle } from "@/lib/fonts";
import { getMaintenance, loadLevelSpans, maintenanceKinds } from "@/lib/site-config";
import "./globals.css";

export const metadata: Metadata = {
  title: "უყურე ანიმეს უფასოდ HD ხარისხში | Animeb",
  description: "ანიმეს ყურება, განხილვა და საზოგადოება ერთ სივრცეში.",
  icons: { icon: "/logo.png", apple: "/logo.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [fonts, , maintenance] = await Promise.all([fontStyle(), loadLevelSpans(), getMaintenance()]);
  const user = maintenance.on ? await getSession().catch(() => null) : null;
  if (maintenance.on && !(user && isAdmin(user))) {
    const preset = maintenanceKinds.find((item) => item.id === maintenance.kind) ?? maintenanceKinds[0];
    return (
      <html lang="ka" suppressHydrationWarning>
        <body className="antialiased" suppressHydrationWarning>
          <style dangerouslySetInnerHTML={{ __html: fonts }} />
          <MaintenanceScreen kind={maintenance.kind} title={maintenance.title || preset.title} text={maintenance.text || preset.text} until={maintenance.until} href={maintenance.href} label={maintenance.label} signedIn={!!user} />
          <PresenceBeacon />
        </body>
      </html>
    );
  }
  return (
    <html lang="ka" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <style dangerouslySetInnerHTML={{ __html: fonts }} />
        <Suspense fallback={null}>
          <PageProgress />
        </Suspense>
        {children}
        <Toaster />
        <PresenceBeacon />
      </body>
    </html>
  );
}
