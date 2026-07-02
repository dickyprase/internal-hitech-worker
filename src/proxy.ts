import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths
  const publicPaths = ['/login', '/api/auth'];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  // Static files
  const isStatic = pathname.startsWith('/_next') || pathname.includes('.');

  if (isPublicPath || isStatic) {
    return NextResponse.next();
  }

  // Check session
  const session = await auth();

  if (!session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only routes
  const adminPaths = ['/dashboard/settings'];
  const isAdminPath = adminPaths.some((p) => pathname.startsWith(p));

  if (isAdminPath && (session.user as any)?.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)'
  ]
};
