import { randomUUID } from "crypto";
import { bindings } from "./runtime";

const ALLOWED = new Map<string, string>([
  ["application/pdf", ".pdf"],
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
  ["text/plain", ".txt"],
]);

const MAX_BYTES = 8 * 1024 * 1024;

export function safeDownloadName(filename: string): string {
  const cleaned = filename.replace(/[\\/\r\n"]/g, "_").slice(0, 120);
  return cleaned || "file";
}

function keyFor(storedName: string): string {
  return `receipts/${storedName}`;
}

async function localFs() {
  const fs = await import("fs/promises");
  const path = await import("path");
  const dir = path.join(process.cwd(), "data", "uploads");
  await fs.mkdir(dir, { recursive: true });
  return { fs, dir, path };
}

export async function saveUpload(file: File) {
  if (!(file instanceof File) || file.size <= 0) return null;
  if (file.size > MAX_BYTES) throw new Error("FILE_TOO_LARGE");
  const extension = ALLOWED.get(file.type);
  if (!extension) throw new Error("FILE_TYPE");
  const storedName = `${randomUUID()}${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const bucket = bindings().FILES;
  if (bucket) {
    await bucket.put(keyFor(storedName), bytes, { httpMetadata: { contentType: file.type } });
  } else {
    const { fs, dir, path } = await localFs();
    await fs.writeFile(path.join(dir, storedName), bytes);
  }
  const filename = file.name.replace(/[\\/\r\n"]/g, "_").slice(0, 140) || `attachment${extension}`;
  return { filename, storedName, mimeType: file.type, size: bytes.byteLength };
}

export async function readUpload(storedName: string) {
  if (!/^[a-z0-9-]+\.[a-z0-9]+$/i.test(storedName)) return null;
  const bucket = bindings().FILES;
  if (bucket) {
    const object = await bucket.get(keyFor(storedName));
    if (!object) return null;
    return new Uint8Array(await object.arrayBuffer());
  }
  try {
    const { fs, dir, path } = await localFs();
    return new Uint8Array(await fs.readFile(path.join(dir, storedName)));
  } catch {
    return null;
  }
}

export async function deleteUpload(storedName: string) {
  if (!/^[a-z0-9-]+\.[a-z0-9]+$/i.test(storedName)) return;
  const bucket = bindings().FILES;
  if (bucket) {
    await bucket.delete(keyFor(storedName));
    return;
  }
  const { fs, dir, path } = await localFs();
  await fs.rm(path.join(dir, storedName), { force: true });
}
