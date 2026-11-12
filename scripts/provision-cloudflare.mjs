/**
 * Creates the D1 database and R2 bucket when they are missing, then writes the
 * D1 database id into wrangler.jsonc so `wrangler d1 migrations apply --remote` can run.
 * Uses CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID. Never prints the token.
 */
import fs from "node:fs";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!accountId || !token) {
  console.error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required.");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const api = `https://api.cloudflare.com/client/v4/accounts/${accountId}`;

async function cf(path, init) {
  const response = await fetch(`${api}${path}`, { ...init, headers });
  const body = await response.json();
  if (!body.success) {
    const message = (body.errors || []).map((error) => error.message).join("; ");
    throw new Error(message || `Cloudflare API ${path} failed`);
  }
  return body.result;
}

const databases = await cf("/d1/database");
let database = databases.find((item) => item.name === "bai-khiao");
if (!database) {
  database = await cf("/d1/database", { method: "POST", body: JSON.stringify({ name: "bai-khiao" }) });
  console.log("Created D1 database bai-khiao");
} else {
  console.log("D1 database bai-khiao already exists");
}

try {
  await cf("/r2/buckets", { method: "POST", body: JSON.stringify({ name: "bai-khiao-files" }) });
  console.log("Created R2 bucket bai-khiao-files");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!/already exists|409/i.test(message)) throw error;
  console.log("R2 bucket bai-khiao-files already exists");
}

const configPath = new URL("../wrangler.jsonc", import.meta.url);
const config = fs.readFileSync(configPath, "utf8");
const next = config.replace(/"database_id":\s*"[^"]+"/, `"database_id": "${database.uuid}"`);
if (next === config) throw new Error("Could not find database_id in wrangler.jsonc");
fs.writeFileSync(configPath, next);
console.log("Updated wrangler.jsonc with the D1 database id");
