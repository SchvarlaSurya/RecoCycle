import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'
// Static fallback - hanya untuk development/fallback
const STATIC_ADMIN_IDS = [
  'user_3COcIsVTwrcTV5undqfBnMdewWp',
]

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

// Check if user is admin - dynamic check from Clerk
async function isAdminUser(userId: string): Promise<boolean> {
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const isAdmin = user.publicMetadata?.isAdmin === true
    return isAdmin
  } catch (error) {
    console.error('Failed to check admin status:', error)
    // Fallback to static list if Clerk API fails
    return STATIC_ADMIN_IDS.includes(userId)
  }
}

export default clerkMiddleware(async (auth, req) => {
  const authObj = await auth()
  const path = req.nextUrl.pathname

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
    const isAdmin = await isAdminUser(authObj.userId)
    if (isAdmin) {
      return NextResponse.redirect(new URL("/admin", req.url))
    }
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Jika belum login, protect dashboard
  if (!authObj.userId && isProtectedRoute(req)) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Admin route protection - dynamic check
  if (authObj.userId && isAdminRoute(req)) {
    const isAdmin = await isAdminUser(authObj.userId)
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
  }

  // Jika admin user akses /dashboard, redirect ke /admin
  if (authObj.userId && path.startsWith('/dashboard')) {
    const isAdmin = await isAdminUser(authObj.userId)
    if (isAdmin) {
      return NextResponse.redirect(new URL("/admin", req.url))
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};