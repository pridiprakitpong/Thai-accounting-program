"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "../db";
import { requireUser } from "../session";

export async function confirmCertificate(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const certificate = await prisma.whtCertificate.findFirst({
    where: { id, companyId: user.companyId },
    include: { expense: true },
  });
  if (!certificate || certificate.expense.status !== "paid") redirect(`/wht/${id}?error=state`);
  await prisma.whtCertificate.update({
    where: { id },
    data: { status: "confirmed", confirmedAt: new Date() },
  });
  revalidatePath(`/wht/${id}`);
  revalidatePath("/wht");
  revalidatePath("/reports/pnd");
  redirect(`/wht/${id}`);
}

export async function revertCertificate(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await prisma.whtCertificate.updateMany({
    where: { id, companyId: user.companyId },
    data: { status: "draft", confirmedAt: null },
  });
  revalidatePath(`/wht/${id}`);
  revalidatePath("/wht");
  revalidatePath("/reports/pnd");
  redirect(`/wht/${id}`);
}
