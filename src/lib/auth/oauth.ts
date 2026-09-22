export type OAuthProvider = 'google' | 'discord' | 'twitter' | 'apple';

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

interface OAuthUserProfile {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const OAUTH_CONFIGS: Record<OAuthProvider, OAuthConfig> = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['openid', 'email', 'profile'],
  },
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    authorizationUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userInfoUrl: 'https://discord.com/api/users/@me',
    scopes: ['identify', 'email'],
  },
  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID || '',
    clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
    authorizationUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    userInfoUrl: 'https://api.twitter.com/2/users/me',
    scopes: ['tweet.read', 'users.read'],
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID || '',
    clientSecret: process.env.APPLE_CLIENT_SECRET || '',
    authorizationUrl: 'https://appleid.apple.com/auth/authorize',
    tokenUrl: 'https://appleid.apple.com/auth/token',
    userInfoUrl: '', // Apple doesn't have userinfo endpoint, info comes in id_token
    scopes: ['name', 'email'],
  },
};

/**
 * Generate OAuth authorization URL
 */
export function getOAuthUrl(provider: OAuthProvider, state: string): string {
  const config = OAUTH_CONFIGS[provider];
  const redirectUri = `${APP_URL}/api/auth/${provider}/callback`;

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
  });

  // Provider-specific params
  if (provider === 'google') {
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
  } else if (provider === 'twitter') {
    params.set('code_challenge', state); // Simplified PKCE
    params.set('code_challenge_method', 'plain');
  } else if (provider === 'apple') {
    params.set('response_mode', 'form_post');
  }

  return `${config.authorizationUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCode(
  provider: OAuthProvider,
  code: string
): Promise<{ accessToken: string; refreshToken?: string; idToken?: string }> {
  const config = OAUTH_CONFIGS[provider];
  const redirectUri = `${APP_URL}/api/auth/${provider}/callback`;

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OAuth token exchange failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    idToken: data.id_token,
  };
}

/**
 * Get user profile from OAuth provider
 */
export async function getOAuthProfile(
  provider: OAuthProvider,
  accessToken: string,
  idToken?: string
): Promise<OAuthUserProfile> {
  const config = OAUTH_CONFIGS[provider];

  // Apple uses id_token instead of userinfo endpoint
  if (provider === 'apple' && idToken) {
    const payload = JSON.parse(
      Buffer.from(idToken.split('.')[1], 'base64').toString()
    );
    return {
      id: payload.sub,
      email: payload.email || null,
      name: null, // Apple only sends name on first authorization
      avatarUrl: null,
    };
  }

  const response = await fetch(config.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch OAuth user profile');
  }

  const data = await response.json();

  // Normalize profile data across providers
  switch (provider) {
    case 'google':
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        avatarUrl: data.picture,
      };
    case 'discord':
      return {
        id: data.id,
        email: data.email,
        name: data.username,
        avatarUrl: data.avatar
          ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
          : null,
      };
    case 'twitter':
      return {
        id: data.data.id,
        email: null, // Twitter doesn't provide email in basic scope
        name: data.data.name,
        avatarUrl: data.data.profile_image_url,
      };
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Check if OAuth provider is configured
 */
export function isProviderConfigured(provider: OAuthProvider): boolean {
  const config = OAUTH_CONFIGS[provider];
  return Boolean(config.clientId && config.clientSecret);
}

/**
 * Get list of configured OAuth providers
 */
export function getConfiguredProviders(): OAuthProvider[] {
  return (['google', 'discord', 'twitter', 'apple'] as OAuthProvider[]).filter(
    isProviderConfigured
  );
}

/**
 * Generate a random state for OAuth CSRF protection
 */
export function generateOAuthState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
