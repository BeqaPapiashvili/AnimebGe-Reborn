import { NextResponse } from "next/server";
import { clientIp, confirmEmail, siteUrl } from "@/lib/auth";
import { ipLimited } from "@/lib/limit";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = siteUrl(url.origin);
  if (await ipLimited("verify", await clientIp(), 20, 15 * 60 * 1000)) return NextResponse.redirect(new URL("/verify?failed=1", origin));
  const token = url.searchParams.get("token") ?? "";
  const error = token ? await confirmEmail(token) : "ბმული არასწორია.";
  return NextResponse.redirect(new URL(error ? "/verify?failed=1" : "/", origin));
}
