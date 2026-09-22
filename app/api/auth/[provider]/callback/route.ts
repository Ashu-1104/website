export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import {
  OAuthProvider,
  exchangeCode,
  getOAuthProfile,
  signAccessToken,
  signRefreshToken,
  getRefreshTokenExpiry,
  setAuthCookies,
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
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error(`[OAuth] ${provider} error:`, error);
    return NextResponse.redirect(`${APP_URL}/login?error=oauth_${error}`);
  }

  // Validate provider
  if (!VALID_PROVIDERS.includes(provider as OAuthProvider)) {
    return NextResponse.redirect(`${APP_URL}/login?error=invalid_provider`);
  }

  // Validate code
  if (!code) {
    return NextResponse.redirect(`${APP_URL}/login?error=missing_code`);
  }

  // Verify state for CSRF protection
  const cookieStore = await cookies();
  const storedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${APP_URL}/login?error=invalid_state`);
  }

  // Read returnTo before clearing cookies
  const returnTo = cookieStore.get(OAUTH_RETURN_TO_COOKIE)?.value || '/';

  // Clear auth cookies
  cookieStore.delete(OAUTH_STATE_COOKIE);
  cookieStore.delete(OAUTH_RETURN_TO_COOKIE);

  const oauthProvider = provider as OAuthProvider;

  try {
    // Exchange code for tokens
    const tokens = await exchangeCode(oauthProvider, code);

    // Get user profile from provider
    const profile = await getOAuthProfile(
      oauthProvider,
      tokens.accessToken,
      tokens.idToken
    );

    // Find existing account link
    const existingAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: oauthProvider,
          providerAccountId: profile.id,
        },
      },
      include: { user: true },
    });

    let user = existingAccount?.user ?? null;

    if (!user) {
      // No linked account - try to find user by email
      if (profile.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: profile.email.toLowerCase() },
        });
        user = existingUser;
      }

      if (user) {
        // Link OAuth account to existing user
        await prisma.account.create({
          data: {
            userId: user.id,
            provider: oauthProvider,
            providerAccountId: profile.id,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          },
        });

        // Update user's email verification if they came from OAuth
        if (profile.email && !user.emailVerified) {
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          });
        }
      } else {
        // Create new user with OAuth account - handle is null so user sees personalization step
        user = await prisma.user.create({
          data: {
            email: profile.email?.toLowerCase(),
            emailVerified: profile.email ? new Date() : null,
            handle: null, // Will be set in personalization step
            avatarUrl: profile.avatarUrl,
            accounts: {
              create: {
                provider: oauthProvider,
                providerAccountId: profile.id,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
              },
            },
          },
        });
      }
    } else {
      // Update existing account tokens
      await prisma.account.update({
        where: { id: existingAccount!.id },
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
    }

    // Check if user is deactivated
    if (user.isDeactivated) {
      return NextResponse.redirect(`${APP_URL}/login?error=account_deactivated`);
    }

    // Generate JWT tokens
    const accessToken = await signAccessToken(user.id, user.role, user.isAdmin);
    const refreshToken = await signRefreshToken(user.id);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    // Redirect to the page the user came from (or homepage)
    const response = NextResponse.redirect(`${APP_URL}${returnTo}`);
    return setAuthCookies(response, accessToken, refreshToken);
  } catch (error) {
    console.error(`[OAuth] ${provider} callback error:`, error);
    return NextResponse.redirect(`${APP_URL}/login?error=oauth_failed`);
  }
}

// Apple sends POST request for callback
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  if (provider !== 'apple') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  // Apple sends form data
  const formData = await request.formData();
  const code = formData.get('code') as string;
  const state = formData.get('state') as string;
  const idToken = formData.get('id_token') as string;

  // Create URL with params and call GET handler
  const url = new URL(request.url);
  url.searchParams.set('code', code);
  url.searchParams.set('state', state);
  if (idToken) {
    url.searchParams.set('id_token', idToken);
  }

  return GET(new Request(url.toString()), { params });
}
