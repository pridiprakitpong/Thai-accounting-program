/**
 * Prisma's generated client compiles its query compiler from base64 with
 * `new WebAssembly.Module()`. Cloudflare Workers reject that
 * ("Wasm code generation disallowed by embedder") and only accept a Wasm
 * module the bundler uploaded already compiled.
 *
 * Node (next dev, seed) keeps the base64 path. The Worker falls back to a
 * static `.wasm` import, which @cloudflare/vite-plugin emits as CompiledWasm.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const b64Path = path.join(
  root,
  "node_modules/@prisma/client/runtime/query_compiler_bg.sqlite.wasm-base64.mjs",
);
const classPath = path.join(root, "generated/prisma/internal/class.ts");
const wasmPath = path.join(root, "generated/prisma/query_compiler_bg.sqlite.wasm");

const source = fs.readFileSync(b64Path, "utf8");
const match = source.match(/const wasm = "([A-Za-z0-9+/=]+)"/);
if (!match) {
  throw new Error(`Could not read Prisma sqlite query compiler from ${b64Path}`);
}
fs.mkdirSync(path.dirname(wasmPath), { recursive: true });
fs.writeFileSync(wasmPath, Buffer.from(match[1], "base64"));

let client = fs.readFileSync(classPath, "utf8");
const start = client.indexOf("async function decodeBase64AsWasm");
const end = client.indexOf("export type LogOptions");
if (start < 0 || end < 0) {
  throw new Error("Prisma client layout changed; wasm patch anchors were not found.");
}

const replacement = `async function decodeBase64AsWasm(wasmBase64: string): Promise<WebAssembly.Module> {
  const { Buffer } = await import("node:buffer")
  const wasmArray = Buffer.from(wasmBase64, "base64")
  return new WebAssembly.Module(wasmArray)
}

async function loadQueryCompilerWasm(): Promise<WebAssembly.Module> {
  // Vite replaces process.env.PRISMA_WORKER_BUILD in the Worker build so the
  // base64 import is dropped. Node leaves it unset and uses WebAssembly.Module().
  if (process.env.PRISMA_WORKER_BUILD === "1") {
    const compiled = await import("../query_compiler_bg.sqlite.wasm")
    return (compiled as { default?: WebAssembly.Module }).default ?? (compiled as unknown as WebAssembly.Module)
  }
  const { wasm } = await import("@prisma/client/runtime/query_compiler_bg.sqlite.wasm-base64.mjs")
  return decodeBase64AsWasm(wasm)
}

config.compilerWasm = {
  getRuntime: async () => await import("@prisma/client/runtime/query_compiler_bg.sqlite.mjs"),
  getQueryCompilerWasmModule: async () => loadQueryCompilerWasm(),
}

`;

client = client.slice(0, start) + replacement + client.slice(end);
fs.writeFileSync(classPath, client);
console.log(`Patched Prisma query compiler for Workers (${fs.statSync(wasmPath).size} bytes).`);
