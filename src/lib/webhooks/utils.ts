/**
 * Shared webhook utilities used across API routes
 */

/**
 * Get the webhook URL for a specific provider
 * Set WEBHOOK_BASE_URL in your environment (e.g., https://yourapp.vercel.app)
 */
export function getWebhookUrl(provider: string): string | null {
  const explicitBaseUrl = (process.env.WEBHOOK_BASE_URL ?? '').trim();
  const candidate =
    explicitBaseUrl ||
    (process.env.VERCEL_URL ?? '').trim() ||
    (process.env.NEXT_PUBLIC_APP_URL ?? '').trim();

  if (!candidate) return null;

  const rawUrl = candidate.startsWith('http') ? candidate : `https://${candidate}`;
  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase();
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.local');

    // In local dev, ModelsLab can't reach localhost. Allow local only when explicitly set
    // via WEBHOOK_BASE_URL (e.g., an ngrok URL).
    if (isLocal && !explicitBaseUrl) return null;

    return `${parsed.origin}/api/webhooks/${provider}`;
  } catch {
    return null;
  }
}

/**
 * Validate a UUID string
 */
export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
