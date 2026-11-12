"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "../db";
import { tr } from "../i18n";
import { getLocale } from "../locale";
import { parseCompanyForm } from "../parse-form";
import { requireUser } from "../session";
import { documentBranch } from "../tax/pnd";
import type { ActionState } from "./sales";

export async function updateCompany(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const locale = await getLocale();
  const parsed = parseCompanyForm(formData, locale);
  if ("error" in parsed && parsed.error) return { error: parsed.error };
  if (!parsed.data) return { error: tr(locale, "ข้อมูลไม่ถูกต้อง", "Invalid data.") };
  try {
    await prisma.company.update({
      where: { id: user.companyId },
      data: { ...parsed.data, branchCode: documentBranch(parsed.data.branchCode) },
    });
  } catch {
    return { error: tr(locale, "เลขประจำตัวผู้เสียภาษีนี้ถูกใช้แล้ว", "That tax ID is already in use.") };
  }
  revalidatePath("/company");
  redirect("/company?saved=1");
}

export async function createBankAccount(formData: FormData) {
  const user = await requireUser();
  const bankName = String(formData.get("bankName") ?? "").trim();
  const accountName = String(formData.get("accountName") ?? "").trim();
  const accountNumber = String(formData.get("accountNumber") ?? "").trim();
  if (!bankName || !accountName || !accountNumber) redirect("/company?error=bank");
  const count = await prisma.bankAccount.count({ where: { companyId: user.companyId } });
  await prisma.bankAccount.create({
    data: {
      companyId: user.companyId,
      bankName: bankName.slice(0, 80),
      accountName: accountName.slice(0, 120),
      accountNumber: accountNumber.slice(0, 40),
      isDefault: count === 0,
    },
  });
  revalidatePath("/company");
  redirect("/company");
}

export async function deleteBankAccount(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await prisma.bankAccount.deleteMany({ where: { id, companyId: user.companyId } });
  revalidatePath("/company");
  redirect("/company");
}
