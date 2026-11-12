"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { salesPrefix } from "../constants";
import { prisma } from "../db";
import { tr } from "../i18n";
import { getLocale } from "../locale";
import { parseSalesForm } from "../parse-form";
import { nextNumber } from "../sequences";
import { withDb } from "../with-db";
import { requireUser } from "../session";
import { todayBangkok } from "../format";

export type ActionState = { error: string };

async function customerOrError(companyId: string, contactId: string, locale: "th" | "en") {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, companyId, role: { in: ["customer", "both"] } },
  });
  if (!contact) return { error: tr(locale, "ไม่พบลูกค้า", "Customer not found.") };
  return { contact };
}

export async function createSales(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const locale = await getLocale();
  const parsed = parseSalesForm(formData, locale);
  if ("error" in parsed) return { error: parsed.error ?? "" };
  const data = parsed.data;
  if (!data) return { error: tr(locale, "ข้อมูลไม่ถูกต้อง", "Invalid data.") };
  const owner = await customerOrError(user.companyId, data.contactId, locale);
  if ("error" in owner) return { error: owner.error ?? "" };
  const year = Number(data.issueDate.slice(0, 4));
  const id = await withDb(prisma, async (tx) => {
    const number = await nextNumber(tx, user.companyId, data.type, year, salesPrefix(data.type));
    const created = await tx.salesDocument.create({
      data: {
        companyId: user.companyId,
        contactId: data.contactId,
        type: data.type,
        number,
        status: "issued",
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        vatMode: data.vatMode,
        remarks: data.remarks,
        subtotal: data.calculated.subtotal,
        vatAmount: data.calculated.vatAmount,
        total: data.calculated.total,
        lines: {
          create: data.calculated.lines.map((line, index) => ({
            position: index,
            description: line.description,
            quantity: line.quantityMillis,
            unitPrice: line.unitPrice,
            amount: line.amount,
          })),
        },
      },
    });
    return created.id;
  });
  revalidatePath("/sales");
  revalidatePath("/dashboard");
  revalidatePath("/reports/pp30");
  redirect(`/sales/${id}`);
}

export async function updateSales(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const locale = await getLocale();
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.salesDocument.findFirst({ where: { id, companyId: user.companyId } });
  if (!existing || existing.status === "void") {
    return { error: tr(locale, "ไม่พบเอกสาร", "Document not found.") };
  }
  if (existing.pp30Period) {
    return { error: tr(locale, "เอกสารถูกรวมในร่าง ภ.พ.30 แล้ว นำออกจากร่างก่อนแก้ไข", "This document is in a PP.30 draft. Remove it before editing.") };
  }
  const parsed = parseSalesForm(formData, locale);
  if ("error" in parsed && parsed.error) return { error: parsed.error };
  const data = parsed.data;
  if (!data) return { error: tr(locale, "ข้อมูลไม่ถูกต้อง", "Invalid data.") };
  if (data.type !== existing.type) return { error: tr(locale, "เปลี่ยนประเภทเอกสารไม่ได้", "The document type cannot change.") };
  const owner = await customerOrError(user.companyId, data.contactId, locale);
  if ("error" in owner && owner.error) return { error: owner.error };
  await withDb(prisma, async (tx) => {
    await tx.salesLine.deleteMany({ where: { documentId: id } });
    await tx.salesDocument.update({
      where: { id },
      data: {
        contactId: data.contactId,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        vatMode: data.vatMode,
        remarks: data.remarks,
        subtotal: data.calculated.subtotal,
        vatAmount: data.calculated.vatAmount,
        total: data.calculated.total,
        lines: {
          create: data.calculated.lines.map((line, index) => ({
            position: index,
            description: line.description,
            quantity: line.quantityMillis,
            unitPrice: line.unitPrice,
            amount: line.amount,
          })),
        },
      },
    });
  });
  revalidatePath("/sales");
  revalidatePath(`/sales/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports/pp30");
  redirect(`/sales/${id}`);
}

export async function markSalesPaid(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const paymentDate = String(formData.get("paymentDate") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) redirect(`/sales/${id}?error=date`);
  const doc = await prisma.salesDocument.findFirst({ where: { id, companyId: user.companyId } });
  if (!doc || doc.status === "void" || doc.type === "quotation") redirect(`/sales/${id}?error=state`);
  await prisma.salesDocument.update({ where: { id }, data: { status: "paid", paymentDate } });
  revalidatePath(`/sales/${id}`);
  revalidatePath("/dashboard");
  redirect(`/sales/${id}`);
}

export async function voidSales(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const doc = await prisma.salesDocument.findFirst({ where: { id, companyId: user.companyId } });
  if (!doc) redirect("/sales");
  await prisma.salesDocument.update({ where: { id }, data: { status: "void" } });
  revalidatePath("/sales");
  revalidatePath("/dashboard");
  revalidatePath("/reports/pp30");
  redirect(`/sales/${id}`);
}

export async function copyAsTaxInvoice(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const doc = await prisma.salesDocument.findFirst({
    where: { id, companyId: user.companyId },
    include: { lines: { orderBy: { position: "asc" } } },
  });
  if (!doc || doc.status === "void") redirect("/sales");
  const issueDate = todayBangkok();
  const year = Number(issueDate.slice(0, 4));
  const createdId = await withDb(prisma, async (tx) => {
    const number = await nextNumber(tx, user.companyId, "tax_invoice", year, "TI");
    const created = await tx.salesDocument.create({
      data: {
        companyId: user.companyId,
        contactId: doc.contactId,
        type: "tax_invoice",
        number,
        status: "issued",
        issueDate,
        dueDate: "",
        vatMode: doc.vatMode,
        remarks: doc.remarks,
        subtotal: doc.subtotal,
        vatAmount: doc.vatAmount,
        total: doc.total,
        lines: {
          create: doc.lines.map((line) => ({
            position: line.position,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            amount: line.amount,
          })),
        },
      },
    });
    return created.id;
  });
  revalidatePath("/sales");
  revalidatePath("/reports/pp30");
  redirect(`/sales/${createdId}`);
}

export async function unlockSalesFromPp30(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await prisma.salesDocument.updateMany({ where: { id, companyId: user.companyId }, data: { pp30Period: "" } });
  revalidatePath(`/sales/${id}`);
  revalidatePath("/reports/pp30");
  redirect(`/sales/${id}`);
}
