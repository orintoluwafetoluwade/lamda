import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname === "/favicon.ico" || /\.(?:svg|png|jpg|jpeg|gif|webp)$/.test(pathname)) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get("forgepilot_session")?.value);
  const publicPath = pathname.startsWith("/login") || pathname.startsWith("/auth");
  if (!hasSession && !publicPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (hasSession && pathname === "/login") {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = "/";
    nextUrl.search = "";
    return NextResponse.redirect(nextUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
