import type { Metadata } from "next";
import { Suspense } from "react";
import { PageProgress } from "@/components/page-progress";
import { Toaster } from "@/components/toast";
import { fontStyle } from "@/lib/fonts";
import { loadLevelSpans } from "@/lib/site-config";
import "./globals.css";

export const metadata: Metadata = {
  title: "უყურე ანიმეს უფასოდ HD ხარისხში | Animeb",
  description: "ანიმეს ყურება, განხილვა და საზოგადოება ერთ სივრცეში.",
  icons: { icon: "/logo.png", apple: "/logo.png" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [fonts] = await Promise.all([fontStyle(), loadLevelSpans()]);
  return (
    <html lang="ka" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <style dangerouslySetInnerHTML={{ __html: fonts }} />
        <Suspense fallback={null}>
          <PageProgress />
        </Suspense>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
