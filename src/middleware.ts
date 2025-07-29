import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes publiques qui ne nécessitent pas d'authentification
  const publicRoutes = [
    "/login",
    "/register",
    "/api/auth",
    "/",
    "/_next",
    "/favicon.ico",
    "/api/health"
  ];

  // Routes qui nécessitent une authentification
  const protectedRoutes = [
    "/dashboard",
    "/projects",
    "/clients",
    "/profile",
    "/admin"
  ];

  // Vérifier si la route actuelle est publique
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route) || pathname === route
  );

  // Vérifier si la route actuelle est protégée
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Si c'est une route publique, permettre l'accès
  if (isPublicRoute) {
    return NextResponse.next();
  }

  try {
    // Vérifier la session utilisateur avec Better Auth
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    // Si pas de session et route protégée, rediriger vers login
    if (!session && isProtectedRoute) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Si session valide et utilisateur sur login/register, rediriger vers dashboard
    if (session && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Vérification des rôles pour les routes admin
    if (pathname.startsWith("/admin") && session) {
      if (session.user.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    
    // En cas d'erreur et si c'est une route protégée, rediriger vers login
    if (isProtectedRoute) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};