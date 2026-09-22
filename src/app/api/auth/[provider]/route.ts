export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  OAuthProvider,
  getOAuthUrl,
  generateOAuthState,
  isProviderConfigured,
} from '@/lib/auth';

const VALID_PROVIDERS: OAuthProvider[] = ['google', 'discord', 'twitter', 'apple'];
const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_RETURN_TO_COOKIE = 'oauth_return_to';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  // Validate provider
  if (!VALID_PROVIDERS.includes(provider as OAuthProvider)) {
    return NextResponse.json(
      { error: `Invalid OAuth provider: ${provider}` },
      { status: 400 }
    );
  }

  const oauthProvider = provider as OAuthProvider;

  // Check if provider is configured
  if (!isProviderConfigured(oauthProvider)) {
    return NextResponse.json(
      { error: `OAuth provider ${provider} is not configured` },
      { status: 501 }
    );
  }

  // Generate state for CSRF protection
  const state = generateOAuthState();

  // Read and validate returnTo — must be a same-origin path to prevent open redirect
  const rawReturnTo = new URL(request.url).searchParams.get('returnTo') ?? '';
  const safeReturnTo = rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/';

  // Store state and returnTo in cookies for verification in callback
  const cookieStore = await cookies();
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  };
  cookieStore.set(OAUTH_STATE_COOKIE, state, cookieOpts);
  cookieStore.set(OAUTH_RETURN_TO_COOKIE, safeReturnTo, cookieOpts);

  // Get OAuth URL and redirect
  const authUrl = getOAuthUrl(oauthProvider, state);

  return NextResponse.redirect(authUrl);
}
