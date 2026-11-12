import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "../generated/prisma/client";
import { createLocalPrisma } from "./local-db";
import { bindings } from "./runtime";

function localPrisma(): PrismaClient {
  return createLocalPrisma();
}

export function getPrisma(): PrismaClient {
  const database = bindings().DB;
  if (database) return new PrismaClient({ adapter: new PrismaD1(database) });
  return localPrisma();
}

/** Property access resolves a client for the current runtime (D1 on Workers, SQLite locally). */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrisma();
    const value = Reflect.get(client, property, client) as unknown;
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});
