import path from "node:path";
import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

const root = process.cwd();

/** fontkit's Node build reads a Unicode trie via `node:fs` and a `file:` URL, which Workers reject. */
function workerFontkit() {
  return {
    name: "worker-fontkit",
    enforce: "pre" as const,
    resolveId(id: string, importer?: string) {
      if (id === "fontkit") return path.join(root, "node_modules/fontkit/dist/browser/index.js");
      if (id === "#binary-trie" && importer?.includes("unicode-properties")) {
        return path.join(root, "node_modules/unicode-properties/binaryTrie.browser.js");
      }
      return null;
    },
  };
}

export default defineConfig({
  define: {
    // Inlined so the Worker bundle keeps only the precompiled Wasm import.
    // `next dev` and the seed script never set this, so they compile from base64.
    "process.env.PRISMA_WORKER_BUILD": JSON.stringify("1"),
  },
  plugins: [
    workerFontkit(),
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
