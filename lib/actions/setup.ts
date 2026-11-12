"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { signSession } from "../auth-token";
import { prisma } from "../db";
import { hashPassword } from "../password";
import { bindings, preloadBindings } from "../runtime";
import { safeEqual } from "../secret";
import { SESSION_COOKIE } from "../session";
import { isValidThaiTaxId } from "../tax/tax-id";

export async function createFirstAdmin(formData: FormData) {
  await preloadBindings();
  const existing = await prisma.user.count();
  if (existing > 0) redirect("/login");
  const secretEmail = (bindings().ADMIN_EMAIL || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const secretPassword = bindings().ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "";
  if (!secretEmail || !secretPassword) redirect("/setup?error=secrets");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const nameTh = String(formData.get("nameTh") ?? "").trim();
  const nameEn = String(formData.get("nameEn") ?? "").trim();
  const taxId = String(formData.get("taxId") ?? "").trim();
  if (!safeEqual(email, secretEmail) || !safeEqual(password, secretPassword)) redirect("/setup?error=auth");
  if (!name || !nameTh || !nameEn || !isValidThaiTaxId(taxId)) redirect("/setup?error=form");
  const company = await prisma.company.create({
    data: {
      nameTh,
      nameEn,
      taxId,
      branchCode: "00000",
      addressTh: "",
      addressEn: "",
    },
  });
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      companyId: company.id,
    },
  });
  const token = await signSession({ uid: user.id, companyId: company.id, email: user.email, name: user.name });
  const proto = (await headers()).get("x-forwarded-proto") ?? "http";
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: proto === "https",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  redirect("/company");
}
