import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'
const ADMIN_USER_IDS = [
  'user_3COcIsVTwrcTV5undqfBnMdewWp', // Surya
]

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const authObj = await auth();
  const path = req.nextUrl.pathname;

  // Check for admin secret header on API routes
  if (path.startsWith('/api/admin')) {
    const adminSecret = req.headers.get('x-admin-secret')
    if (adminSecret !== ADMIN_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }
  }

  // Jika sudah login, root dan auth pages langsung ke dashboard/admin
  if (authObj.userId && (path === "/" || path.startsWith("/login") || path.startsWith("/register"))) {
    // Check if user is admin
    if (ADMIN_USER_IDS.includes(authObj.userId)) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Jika belum login, protect dashboard
  if (!authObj.userId && isProtectedRoute(req)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Jika admin user akses /dashboard, redirect ke /admin
  if (authObj.userId && path.startsWith('/dashboard')) {
    if (ADMIN_USER_IDS.includes(authObj.userId)) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  // Admin route protection - only allow specific admin users
  if (authObj.userId && isAdminRoute(req)) {
    if (!ADMIN_USER_IDS.includes(authObj.userId)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};