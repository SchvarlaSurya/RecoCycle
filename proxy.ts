import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const authObj = await auth();
  const path = req.nextUrl.pathname;

  // Jika sudah login, root dan auth pages langsung ke dashboard
  if (authObj.userId && (path === "/" || path.startsWith("/login") || path.startsWith("/register"))) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Jika belum login, protect dashboard
  if (!authObj.userId && isProtectedRoute(req)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Admin route protection
  if (authObj.userId && isAdminRoute(req)) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(authObj.userId);
      const isAdmin = user.publicMetadata?.isAdmin === true;

      if (!isAdmin) {
        const dashboardUrl = new URL("/dashboard", req.url);
        dashboardUrl.searchParams.set("access", "denied");
        return NextResponse.redirect(dashboardUrl);
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};