import type { Prisma, PrismaClient } from "@prisma/client";

type Db = Prisma.TransactionClient | PrismaClient;

export async function nextNumber(db: Db, companyId: string, docType: string, year: number, prefix: string) {
  const existing = await db.documentSequence.findUnique({
    where: { companyId_docType_year: { companyId, docType, year } },
  });
  const lastNumber = (existing?.lastNumber ?? 0) + 1;
  if (existing) {
    await db.documentSequence.update({ where: { id: existing.id }, data: { lastNumber } });
  } else {
    await db.documentSequence.create({ data: { companyId, docType, year, lastNumber } });
  }
  return `${prefix}${year}-${String(lastNumber).padStart(4, "0")}`;
}
