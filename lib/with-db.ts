import type { Prisma, PrismaClient } from "../generated/prisma/client";

/**
 * SQLite in `next dev` runs the callback inside a real transaction.
 * Cloudflare D1's Prisma adapter throws on interactive transactions, so the
 * Worker build runs the same queries one after another. Document numbers can
 * race if two requests allocate one at the same time.
 */
export async function withDb<T>(
  client: PrismaClient,
  run: (db: Prisma.TransactionClient | PrismaClient) => Promise<T>,
): Promise<T> {
  if (process.env.PRISMA_WORKER_BUILD === "1") return run(client);
  return client.$transaction((tx) => run(tx));
}
