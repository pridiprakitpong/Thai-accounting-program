import { NextResponse } from "next/server";
import { sameOrigin } from "@/lib/origin";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(sameOrigin(request, "/login"), 303);
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
