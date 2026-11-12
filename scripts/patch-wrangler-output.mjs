/**
 * @cloudflare/vite-plugin rewrites dist/server/wrangler.json and replaces
 * `rules` with an ESModule-only rule. Prisma's query compiler is imported as
 * a .wasm file, and Workers can only instantiate Wasm that wrangler uploads
 * as CompiledWasm.
 */
import fs from "node:fs";

const configPath = "dist/server/wrangler.json";
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const rules = Array.isArray(config.rules) ? config.rules : [];
if (!rules.some((rule) => rule.type === "CompiledWasm")) {
  rules.push({
    type: "CompiledWasm",
    globs: ["**/*.wasm"],
    fallthrough: true,
  });
}
config.rules = rules;
fs.writeFileSync(configPath, JSON.stringify(config));
console.log("Added CompiledWasm rule to dist/server/wrangler.json");
