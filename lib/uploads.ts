import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

const ALLOWED = new Map<string, string>([
  ["application/pdf", ".pdf"],
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
  ["text/plain", ".txt"],
]);

export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const MAX_BYTES = 8 * 1024 * 1024;

export function safeDownloadName(filename: string): string {
  const cleaned = filename.replace(/[\\/\r\n"]/g, "_").slice(0, 120);
  return cleaned || "file";
}

export async function saveUpload(file: File) {
  if (!(file instanceof File) || file.size <= 0) return null;
  if (file.size > MAX_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }
  const extension = ALLOWED.get(file.type);
  if (!extension) throw new Error("FILE_TYPE");
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const storedName = `${randomUUID()}${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOAD_DIR, storedName), bytes);
  const filename = file.name.replace(/[\\/\r\n"]/g, "_").slice(0, 140) || `attachment${extension}`;
  return { filename, storedName, mimeType: file.type, size: bytes.length };
}

export async function readUpload(storedName: string) {
  if (!/^[a-z0-9-]+\.[a-z0-9]+$/i.test(storedName)) return null;
  try {
    return await fs.readFile(path.join(UPLOAD_DIR, storedName));
  } catch {
    return null;
  }
}

export async function deleteUpload(storedName: string) {
  if (!/^[a-z0-9-]+\.[a-z0-9]+$/i.test(storedName)) return;
  await fs.rm(path.join(UPLOAD_DIR, storedName), { force: true });
}
