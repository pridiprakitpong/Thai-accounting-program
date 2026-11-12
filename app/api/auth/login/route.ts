import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signSession } from "@/lib/auth-token";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/session";
import { sameOrigin } from "@/lib/origin";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const matches = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !matches) {
    return NextResponse.redirect(sameOrigin(request, "/login?error=1"), 303);
  }
  const token = await signSession({
    uid: user.id,
    companyId: user.companyId,
    email: user.email,
    name: user.name,
  });
  const response = NextResponse.redirect(sameOrigin(request, "/dashboard"), 303);
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return response;
}
