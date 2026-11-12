import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession } from "./auth-token";
import { prisma } from "./db";
import { getLocale } from "./locale";

export const SESSION_COOKIE = "bk_session";

export async function getSessionUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await readSession(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.uid },
    include: { company: true },
  });
  if (!user || user.companyId !== payload.companyId) return null;
  return user;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function pageContext() {
  const [user, locale] = await Promise.all([requireUser(), getLocale()]);
  return { user, company: user.company, locale };
}
