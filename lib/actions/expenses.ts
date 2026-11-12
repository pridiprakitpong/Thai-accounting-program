"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "../db";
import { isIsoDate, parseExpenseForm } from "../parse-form";
import { tr } from "../i18n";
import { getLocale } from "../locale";
import { nextNumber } from "../sequences";
import { withDb } from "../with-db";
import { requireUser } from "../session";
import { deleteUpload, saveUpload } from "../uploads";
import type { ActionState } from "./sales";

async function vendorOrError(companyId: string, contactId: string, locale: "th" | "en") {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, companyId, role: { in: ["vendor", "both"] } },
  });
  if (!contact) return { error: tr(locale, "ไม่พบผู้ขาย", "Vendor not found.") };
  return { contact };
}

async function storeFiles(expenseId: string, formData: FormData, locale: "th" | "en") {
  const files = formData.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);
  if (files.length > 5) return { error: tr(locale, "แนบได้ไม่เกิน 5 ไฟล์ต่อครั้ง", "Attach up to 5 files at a time.") };
  try {
    for (const file of files) {
      const saved = await saveUpload(file);
      if (!saved) continue;
      await prisma.expenseFile.create({ data: { expenseId, ...saved } });
    }
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "FILE_TOO_LARGE") return { error: tr(locale, "ไฟล์ต้องไม่เกิน 8 MB", "Each file must be 8 MB or smaller.") };
    if (code === "FILE_TYPE") return { error: tr(locale, "รองรับ PDF และรูปภาพเท่านั้น", "Only PDF and image files are supported.") };
    throw error;
  }
  return {};
}

export async function createExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const locale = await getLocale();
  const parsed = parseExpenseForm(formData, locale);
  if ("error" in parsed && parsed.error) return { error: parsed.error };
  const data = parsed.data;
  if (!data) return { error: tr(locale, "ข้อมูลไม่ถูกต้อง", "Invalid data.") };
  const owner = await vendorOrError(user.companyId, data.contactId, locale);
  if ("error" in owner && owner.error) return { error: owner.error };
  const year = Number(data.billDate.slice(0, 4));
  const id = await withDb(prisma, async (tx) => {
    const number = await nextNumber(tx, user.companyId, "expense", year, "EX");
    const created = await tx.expense.create({
      data: {
        companyId: user.companyId,
        contactId: data.contactId,
        number,
        status: "unpaid",
        category: data.category,
        billDate: data.billDate,
        taxInvoiceNo: data.taxInvoiceNo,
        taxInvoiceDate: data.taxInvoiceDate,
        vatRate: data.vatRate,
        notes: data.notes,
        subtotal: data.calculated.subtotal,
        vatAmount: data.calculated.vatAmount,
        whtAmount: data.calculated.whtAmount,
        total: data.calculated.total,
        netPayable: data.calculated.netPayable,
        lines: {
          create: data.calculated.lines.map((line, index) => ({
            position: index,
            description: line.description,
            incomeType: line.incomeType,
            whtRate: line.whtRate,
            payCondition: line.payCondition,
            baseAmount: line.baseAmount,
            vatAmount: line.vatAmount,
            whtAmount: line.whtAmount,
          })),
        },
      },
    });
    return created.id;
  });
  const stored = await storeFiles(id, formData, locale);
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/reports/pp30");
  if (stored.error) redirect(`/expenses/${id}?error=file`);
  redirect(`/expenses/${id}`);
}

export async function updateExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const locale = await getLocale();
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.expense.findFirst({
    where: { id, companyId: user.companyId },
    include: { certificate: true },
  });
  if (!existing || existing.status === "void") return { error: tr(locale, "ไม่พบรายจ่าย", "Expense not found.") };
  if (existing.status === "paid" || existing.certificate) {
    return { error: tr(locale, "รายจ่ายที่จ่ายแล้วต้องยกเลิกการจ่ายก่อนแก้ไข", "Undo the payment before editing this expense.") };
  }
  if (existing.pp30Period) {
    return { error: tr(locale, "รายจ่ายนี้อยู่ในร่าง ภ.พ.30 นำออกจากร่างก่อนแก้ไข", "Remove this expense from the PP.30 draft before editing.") };
  }
  const parsed = parseExpenseForm(formData, locale);
  if ("error" in parsed && parsed.error) return { error: parsed.error };
  const data = parsed.data;
  if (!data) return { error: tr(locale, "ข้อมูลไม่ถูกต้อง", "Invalid data.") };
  const owner = await vendorOrError(user.companyId, data.contactId, locale);
  if ("error" in owner && owner.error) return { error: owner.error };
  await withDb(prisma, async (tx) => {
    await tx.expenseLine.deleteMany({ where: { expenseId: id } });
    await tx.expense.update({
      where: { id },
      data: {
        contactId: data.contactId,
        category: data.category,
        billDate: data.billDate,
        taxInvoiceNo: data.taxInvoiceNo,
        taxInvoiceDate: data.taxInvoiceDate,
        vatRate: data.vatRate,
        notes: data.notes,
        subtotal: data.calculated.subtotal,
        vatAmount: data.calculated.vatAmount,
        whtAmount: data.calculated.whtAmount,
        total: data.calculated.total,
        netPayable: data.calculated.netPayable,
        lines: {
          create: data.calculated.lines.map((line, index) => ({
            position: index,
            description: line.description,
            incomeType: line.incomeType,
            whtRate: line.whtRate,
            payCondition: line.payCondition,
            baseAmount: line.baseAmount,
            vatAmount: line.vatAmount,
            whtAmount: line.whtAmount,
          })),
        },
      },
    });
  });
  revalidatePath(`/expenses/${id}`);
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/reports/pp30");
  redirect(`/expenses/${id}`);
}

export async function markExpensePaid(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const paymentDate = String(formData.get("paymentDate") ?? "");
  const bankAccountId = String(formData.get("bankAccountId") ?? "");
  if (!isIsoDate(paymentDate)) redirect(`/expenses/${id}?error=date`);
  const expense = await prisma.expense.findFirst({
    where: { id, companyId: user.companyId },
    include: { contact: true, certificate: true },
  });
  const bank = await prisma.bankAccount.findFirst({ where: { id: bankAccountId, companyId: user.companyId } });
  if (!expense || expense.status === "void" || !bank) redirect(`/expenses/${id}?error=state`);
  if (expense.certificate?.status === "confirmed") redirect(`/expenses/${id}?error=locked`);
  await withDb(prisma, async (tx) => {
    await tx.expense.update({
      where: { id },
      data: { status: "paid", paymentDate, bankAccountId },
    });
    if (expense.whtAmount > 0) {
      const formType = expense.contact.partyType === "individual" ? "pnd3" : "pnd53";
      if (expense.certificate) {
        await tx.whtCertificate.update({
          where: { id: expense.certificate.id },
          data: {
            paymentDate,
            formType,
            baseAmount: expense.subtotal,
            taxAmount: expense.whtAmount,
            status: "draft",
            confirmedAt: null,
          },
        });
      } else {
        const number = await nextNumber(tx, user.companyId, "wht", Number(paymentDate.slice(0, 4)), "WT");
        await tx.whtCertificate.create({
          data: {
            companyId: user.companyId,
            expenseId: expense.id,
            number,
            formType,
            status: "draft",
            paymentDate,
            baseAmount: expense.subtotal,
            taxAmount: expense.whtAmount,
          },
        });
      }
    } else if (expense.certificate) {
      await tx.whtCertificate.delete({ where: { id: expense.certificate.id } });
    }
  });
  revalidatePath(`/expenses/${id}`);
  revalidatePath("/expenses");
  revalidatePath("/wht");
  revalidatePath("/dashboard");
  revalidatePath("/reports/pnd");
  redirect(`/expenses/${id}`);
}

export async function undoExpensePayment(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const expense = await prisma.expense.findFirst({
    where: { id, companyId: user.companyId },
    include: { certificate: true },
  });
  if (!expense) redirect("/expenses");
  if (expense.certificate?.status === "confirmed") redirect(`/expenses/${id}?error=locked`);
  await withDb(prisma, async (tx) => {
    if (expense.certificate) await tx.whtCertificate.delete({ where: { id: expense.certificate.id } });
    await tx.expense.update({ where: { id }, data: { status: "unpaid", paymentDate: "", bankAccountId: null } });
  });
  revalidatePath(`/expenses/${id}`);
  revalidatePath("/wht");
  revalidatePath("/dashboard");
  revalidatePath("/reports/pnd");
  redirect(`/expenses/${id}`);
}

export async function addExpenseFiles(formData: FormData) {
  const user = await requireUser();
  const locale = await getLocale();
  const id = String(formData.get("id") ?? "");
  const expense = await prisma.expense.findFirst({ where: { id, companyId: user.companyId } });
  if (!expense) redirect("/expenses");
  const stored = await storeFiles(id, formData, locale);
  revalidatePath(`/expenses/${id}`);
  if (stored.error) redirect(`/expenses/${id}?error=file`);
  redirect(`/expenses/${id}`);
}

export async function deleteExpenseFile(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const fileId = String(formData.get("fileId") ?? "");
  const file = await prisma.expenseFile.findFirst({
    where: { id: fileId, expenseId: id, expense: { companyId: user.companyId } },
  });
  if (file) {
    await prisma.expenseFile.delete({ where: { id: file.id } });
    await deleteUpload(file.storedName);
  }
  revalidatePath(`/expenses/${id}`);
  redirect(`/expenses/${id}`);
}

export async function unlockExpenseFromPp30(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await prisma.expense.updateMany({ where: { id, companyId: user.companyId }, data: { pp30Period: "" } });
  revalidatePath(`/expenses/${id}`);
  revalidatePath("/reports/pp30");
  redirect(`/expenses/${id}`);
}

export async function voidExpense(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const expense = await prisma.expense.findFirst({
    where: { id, companyId: user.companyId },
    include: { certificate: true },
  });
  if (!expense) redirect("/expenses");
  if (expense.certificate?.status === "confirmed") redirect(`/expenses/${id}?error=locked`);
  await withDb(prisma, async (tx) => {
    if (expense.certificate) await tx.whtCertificate.delete({ where: { id: expense.certificate.id } });
    await tx.expense.update({ where: { id }, data: { status: "void" } });
  });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/reports/pp30");
  revalidatePath("/wht");
  redirect(`/expenses/${id}`);
}
