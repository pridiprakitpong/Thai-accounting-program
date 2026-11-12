import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../db";
import { periodKey } from "../format";
import { buildPp30Series, seriesBounds, type Pp30Month, type VatDocument } from "../tax/pp30";

type Db = Prisma.TransactionClient | PrismaClient;

type SalesRow = {
  id: string;
  number: string;
  issueDate: string;
  vatAmount: number;
  total: number;
  pp30Period: string;
  status: string;
  contact: { nameTh: string; titleTh: string; lastNameTh: string; nameEn: string; titleEn: string; lastNameEn: string };
};

type ExpenseRow = {
  id: string;
  number: string;
  billDate: string;
  taxInvoiceNo: string;
  taxInvoiceDate: string;
  vatAmount: number;
  total: number;
  pp30Period: string;
  status: string;
  contact: { nameTh: string; titleTh: string; lastNameTh: string; nameEn: string; titleEn: string; lastNameEn: string };
};

export type Pp30View = {
  month: Pp30Month;
  saved: {
    outputVat: number;
    inputVat: number;
    carryIn: number;
    vatPayable: number;
    excessVat: number;
    outputCount: number;
    inputCount: number;
    savedAt: Date;
    status: string;
  } | null;
  stale: boolean;
  outputDocs: SalesRow[];
  inputDocs: ExpenseRow[];
};

function toDocs(sales: { id: string; issueDate: string; vatAmount: number; pp30Period: string; status: string }[], expenses: { id: string; taxInvoiceDate: string; vatAmount: number; pp30Period: string; status: string }[]): VatDocument[] {
  return [
    ...sales.map((doc) => ({
      id: doc.id,
      kind: "output" as const,
      period: doc.issueDate.slice(0, 7),
      vat: doc.vatAmount,
      lockedTo: doc.pp30Period || null,
      active: doc.status !== "void",
    })),
    ...expenses.map((doc) => ({
      id: doc.id,
      kind: "input" as const,
      period: doc.taxInvoiceDate.slice(0, 7),
      vat: doc.vatAmount,
      lockedTo: doc.pp30Period || null,
      active: doc.status !== "void",
    })),
  ];
}

async function load(db: Db, companyId: string) {
  const [sales, expenses] = await Promise.all([
    db.salesDocument.findMany({
      where: { companyId, type: "tax_invoice", vatAmount: { gt: 0 } },
      include: { contact: true },
      orderBy: { issueDate: "asc" },
    }),
    db.expense.findMany({
      where: { companyId, vatAmount: { gt: 0 } },
      include: { contact: true },
      orderBy: { taxInvoiceDate: "asc" },
    }),
  ]);
  return { sales, expenses };
}

export async function getPp30View(companyId: string, year: number, month: number, db: Db = prisma): Promise<Pp30View> {
  const target = periodKey(year, month);
  const [{ sales, expenses }, savedRow] = await Promise.all([
    load(db, companyId),
    db.pp30Return.findUnique({ where: { companyId_period: { companyId, period: target } } }),
  ]);
  const docs = toDocs(sales, expenses);
  const counted = docs.filter((doc) => doc.active).map((doc) => doc.lockedTo || doc.period);
  const bounds = seriesBounds(counted, target);
  const series = buildPp30Series(docs, bounds.from, bounds.to);
  const current = series.find((item) => item.period === target) ?? series[series.length - 1];
  const saved = savedRow
    ? {
        outputVat: savedRow.outputVat,
        inputVat: savedRow.inputVat,
        carryIn: savedRow.carryIn,
        vatPayable: savedRow.vatPayable,
        excessVat: savedRow.excessVat,
        outputCount: savedRow.outputCount,
        inputCount: savedRow.inputCount,
        savedAt: savedRow.savedAt,
        status: savedRow.status,
      }
    : null;
  const stale = saved
    ? saved.outputVat !== current.outputVat ||
      saved.inputVat !== current.inputVat ||
      saved.carryIn !== current.carryIn ||
      saved.vatPayable !== current.vatPayable ||
      saved.excessVat !== current.excessVat
    : false;
  return {
    month: current,
    saved,
    stale,
    outputDocs: sales.filter((doc) => current.outputIds.includes(doc.id)),
    inputDocs: expenses.filter((doc) => current.inputIds.includes(doc.id)),
  };
}

export async function savePp30Draft(companyId: string, year: number, month: number) {
  const period = periodKey(year, month);
  await prisma.$transaction(async (tx) => {
    await tx.salesDocument.updateMany({ where: { companyId, pp30Period: period }, data: { pp30Period: "" } });
    await tx.expense.updateMany({ where: { companyId, pp30Period: period }, data: { pp30Period: "" } });
    const view = await getPp30View(companyId, year, month, tx);
    const current = view.month;
    const data = {
      outputVat: current.outputVat,
      inputVat: current.inputVat,
      carryIn: current.carryIn,
      vatPayable: current.vatPayable,
      excessVat: current.excessVat,
      outputCount: current.outputIds.length,
      inputCount: current.inputIds.length,
      status: "draft",
      savedAt: new Date(),
    };
    await tx.pp30Return.upsert({
      where: { companyId_period: { companyId, period } },
      create: { companyId, year, month, period, ...data },
      update: data,
    });
    if (current.outputIds.length > 0) {
      await tx.salesDocument.updateMany({
        where: { companyId, id: { in: current.outputIds } },
        data: { pp30Period: period },
      });
    }
    if (current.inputIds.length > 0) {
      await tx.expense.updateMany({
        where: { companyId, id: { in: current.inputIds } },
        data: { pp30Period: period },
      });
    }
  });
}
