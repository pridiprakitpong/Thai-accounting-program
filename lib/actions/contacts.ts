"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "../db";
import { tr } from "../i18n";
import { getLocale } from "../locale";
import { parseContactForm } from "../parse-form";
import { requireUser } from "../session";
import { documentBranch } from "../tax/pnd";
import type { ActionState } from "./sales";

function payload(data: NonNullable<ReturnType<typeof parseContactForm>["data"]>) {
  return { ...data, branchCode: documentBranch(data.branchCode) };
}

export async function createContact(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const locale = await getLocale();
  const parsed = parseContactForm(formData, locale);
  if ("error" in parsed && parsed.error) return { error: parsed.error };
  if (!parsed.data) return { error: tr(locale, "ข้อมูลไม่ถูกต้อง", "Invalid data.") };
  const created = await prisma.contact.create({ data: { companyId: user.companyId, ...payload(parsed.data) } });
  revalidatePath("/contacts");
  redirect(`/contacts/${created.id}`);
}

export async function updateContact(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const locale = await getLocale();
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.contact.findFirst({ where: { id, companyId: user.companyId } });
  if (!existing) return { error: tr(locale, "ไม่พบผู้ติดต่อ", "Contact not found.") };
  const parsed = parseContactForm(formData, locale);
  if ("error" in parsed && parsed.error) return { error: parsed.error };
  if (!parsed.data) return { error: tr(locale, "ข้อมูลไม่ถูกต้อง", "Invalid data.") };
  await prisma.contact.update({ where: { id }, data: payload(parsed.data) });
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  redirect(`/contacts/${id}`);
}

export async function deleteContact(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const [sales, expenses] = await Promise.all([
    prisma.salesDocument.count({ where: { contactId: id, companyId: user.companyId } }),
    prisma.expense.count({ where: { contactId: id, companyId: user.companyId } }),
  ]);
  if (sales + expenses > 0) redirect(`/contacts/${id}?error=used`);
  await prisma.contact.deleteMany({ where: { id, companyId: user.companyId } });
  revalidatePath("/contacts");
  redirect("/contacts");
}
