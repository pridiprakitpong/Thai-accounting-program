import path from "path";
import { PrismaBetterSQLite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";

function sqlitePath(): string {
  const raw = (process.env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, "");
  if (path.isAbsolute(raw)) return raw;
  const cleaned = raw.replace(/^\.\//, "");
  return cleaned.startsWith("prisma/") ? path.resolve(cleaned) : path.resolve("prisma", cleaned);
}

const globalForPrisma = globalThis as unknown as { localPrisma?: PrismaClient };

export function createLocalPrisma(): PrismaClient {
  if (!globalForPrisma.localPrisma) {
    globalForPrisma.localPrisma = new PrismaClient({ adapter: new PrismaBetterSQLite3({ url: sqlitePath() }) });
  }
  return globalForPrisma.localPrisma;
}
