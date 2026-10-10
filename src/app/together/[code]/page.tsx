import { redirect } from "next/navigation";

export default async function TogetherRoomRedirect({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  redirect(`/watch2gether/${code}`);
}
