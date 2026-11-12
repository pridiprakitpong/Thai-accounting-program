import { NextResponse, type NextRequest } from "next/server";
import { readSession } from "@/lib/auth-token";

const PUBLIC_PATHS = new Set(["/", "/login", "/api/auth/login", "/api/auth/logout"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("bk_session")?.value;
  const session = token ? await readSession(token) : null;

  if (PUBLIC_PATHS.has(pathname)) {
    if (session && pathname === "/login") {
      const dashboard = request.nextUrl.clone();
      dashboard.pathname = "/dashboard";
      dashboard.search = "";
      return NextResponse.redirect(dashboard);
    }
    return NextResponse.next();
  }

  if (!session) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
