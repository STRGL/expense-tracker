// middleware.js
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth

  // Always allow: login page, setup page, auth API, setup API
  if (
    pathname === "/login" ||
    pathname === "/setup" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/setup")
  ) {
    // If already authenticated, redirect away from login/setup to dashboard
    if (isAuthenticated && (pathname === "/login" || pathname === "/setup")) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
    return NextResponse.next()
  }

  // Unauthenticated: redirect to login
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Admin guard: only admin role can access /admin routes
  if (pathname.startsWith("/admin") && req.auth?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)",
  ],
}
