"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isPeriod } from "../format";
import { savePp30Draft } from "../services/pp30";
import { requireUser } from "../session";

export async function savePp30(formData: FormData) {
  const user = await requireUser();
  const period = String(formData.get("period") ?? "");
  if (!isPeriod(period)) redirect("/reports/pp30");
  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(5, 7));
  await savePp30Draft(user.companyId, year, month);
  revalidatePath("/reports/pp30");
  revalidatePath("/dashboard");
  revalidatePath("/sales");
  revalidatePath("/expenses");
  redirect(`/reports/pp30?period=${period}&saved=1`);
}
