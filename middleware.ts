import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));

  if (!hasSession && (pathname.startsWith("/admin") || pathname.startsWith("/barbero"))) {
    const url = new URL("/ingresar", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/barbero/:path*"],
};
