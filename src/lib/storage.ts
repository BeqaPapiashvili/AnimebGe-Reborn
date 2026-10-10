import path from "node:path";

const roots = {
  uploads: path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads")),
  assets: path.join(process.cwd(), "public", "assets"),
  fonts: path.join(process.cwd(), "public", "fonts"),
};

export type StorageRoot = keyof typeof roots;

export function isStorageRoot(value: string): value is StorageRoot {
  return value in roots;
}

export function storageFile(root: StorageRoot, ...parts: string[]) {
  const base = roots[root];
  const file = path.resolve(base, ...parts);
  return file.startsWith(base + path.sep) ? file : "";
}
