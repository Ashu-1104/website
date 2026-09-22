import { NextResponse, type NextRequest } from 'next/server';
import { verifyAccessToken } from './lib/auth/jwt';
import { hasAdminAccess } from './lib/auth/roles';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth is only enforced on admin routes — all other pages are publicly accessible
  const isAdminPage = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');
  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    if (isAdminApi) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyAccessToken(token);
  const hasAccess = payload
    ? hasAdminAccess({ role: payload.role ?? null, isAdmin: payload.isAdmin ?? false })
    : false;

  if (!hasAccess) {
    if (isAdminApi) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/:path*'],
};
