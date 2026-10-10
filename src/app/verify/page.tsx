import { redirect } from "next/navigation";
import { Home } from "@/components/home";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (token) redirect(`/api/auth/verify?token=${encodeURIComponent(token)}`);
  const user = await getSession();
  return <Home user={user} panel={<p className="mx-auto max-w-lg px-6 py-24 text-center text-sm text-white">ბმული არასწორია ან ვადა გაუვიდა.</p>} />;
}
