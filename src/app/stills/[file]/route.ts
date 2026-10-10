import { readFile } from "fs/promises";
import path from "path";

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[a-f0-9]{20}\.jpg$/.test(file)) return new Response(null, { status: 404 });
  try {
    const body = await readFile(path.join(process.cwd(), "data", "stills", file));
    return new Response(body, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
