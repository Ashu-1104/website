import { JobProvider, JobStatus } from '@prisma/client';
import type { ModelslabWebhookPayload, NormalizedWebhookPayload, WebhookNormalizer } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Normalize ModelsLab webhook payload to standard format
 */
export function normalizeModelslabPayload(payload: unknown): NormalizedWebhookPayload | null {
  if (!isRecord(payload)) return null;

  const data = payload as ModelslabWebhookPayload;

  const fetchResultId =
    typeof data.fetch_result === 'string' ? data.fetch_result.split('/').pop() : undefined;
  const requestId =
    data.id !== undefined
      ? data.id
      : data.request_id !== undefined
        ? data.request_id
        : fetchResultId;

  // Must have either request id or track_id
  if (requestId === undefined && data.track_id === undefined) {
    return null;
  }

  // Map ModelsLab status to our JobStatus enum
  let status: JobStatus;
  switch (data.status) {
    case 'success':
    case 'ready':
      status = JobStatus.COMPLETED;
      break;
    case 'processing':
      status = JobStatus.PROCESSING;
      break;
    case 'error':
    case 'failed':
      status = JobStatus.FAILED;
      break;
    default:
      // Unknown status, treat as processing
      status = JobStatus.PROCESSING;
  }

  // Extract result URL from various possible fields
  // NOTE: future_links are excluded — they are placeholder URLs where the file
  // will be uploaded later and are NOT immediately available.
  const resultUrl =
    data.output?.[0] ||
    data.proxy_links?.[0] ||
    data.links?.[0] ||
    undefined;

  return {
    provider: JobProvider.MODELSLAB,
    externalId: requestId !== undefined ? String(requestId) : '',
    trackId: data.track_id,
    status,
    resultUrl,
    errorMessage: data.status === 'error' ? data.message : undefined,
    progress: data.status === 'success' ? 100 : undefined,
    eta: data.eta,
    rawPayload: payload,
  };
}

/**
 * Normalize Stable Diffusion API webhook payload
 * (Placeholder - implement when needed)
 */
export function normalizeStableDiffusionPayload(payload: unknown): NormalizedWebhookPayload | null {
  if (!isRecord(payload)) return null;

  // Similar structure to ModelsLab in many cases
  // Implement based on actual API documentation
  const data = payload as Record<string, unknown>;

  let status: JobStatus;
  switch (data.status) {
    case 'success':
      status = JobStatus.COMPLETED;
      break;
    case 'processing':
      status = JobStatus.PROCESSING;
      break;
    case 'error':
    case 'failed':
      status = JobStatus.FAILED;
      break;
    default:
      status = JobStatus.PROCESSING;
  }

  const output = data.output as string[] | undefined;

  return {
    provider: JobProvider.STABLE_DIFFUSION_API,
    externalId: String(data.id || ''),
    trackId: typeof data.track_id === 'number' ? data.track_id : undefined,
    status,
    resultUrl: output?.[0],
    errorMessage: status === JobStatus.FAILED ? String(data.message || 'Generation failed') : undefined,
    eta: typeof data.eta === 'number' ? data.eta : undefined,
    rawPayload: payload,
  };
}

/**
 * Normalize Replicate webhook payload
 * (Placeholder - implement when needed)
 */
export function normalizeReplicatePayload(payload: unknown): NormalizedWebhookPayload | null {
  if (!isRecord(payload)) return null;

  const data = payload as Record<string, unknown>;

  let status: JobStatus;
  switch (data.status) {
    case 'succeeded':
      status = JobStatus.COMPLETED;
      break;
    case 'processing':
    case 'starting':
      status = JobStatus.PROCESSING;
      break;
    case 'failed':
    case 'canceled':
      status = JobStatus.FAILED;
      break;
    default:
      status = JobStatus.PROCESSING;
  }

  const output = data.output as string | string[] | undefined;
  const resultUrl = Array.isArray(output) ? output[0] : output;

  return {
    provider: JobProvider.REPLICATE,
    externalId: String(data.id || ''),
    status,
    resultUrl,
    errorMessage: status === JobStatus.FAILED ? String(data.error || 'Generation failed') : undefined,
    rawPayload: payload,
  };
}

/**
 * Get the appropriate normalizer for a provider
 */
export function getNormalizer(provider: string): WebhookNormalizer | null {
  const normalizers: Record<string, WebhookNormalizer> = {
    modelslab: normalizeModelslabPayload,
    'stable-diffusion-api': normalizeStableDiffusionPayload,
    replicate: normalizeReplicatePayload,
  };

  return normalizers[provider.toLowerCase()] || null;
}

/**
 * Map URL path provider name to JobProvider enum
 */
export function getJobProvider(providerSlug: string): JobProvider | null {
  const mapping: Record<string, JobProvider> = {
    modelslab: JobProvider.MODELSLAB,
    'stable-diffusion-api': JobProvider.STABLE_DIFFUSION_API,
    replicate: JobProvider.REPLICATE,
    seaart: JobProvider.SEAART,
    civitai: JobProvider.CIVITAI,
  };

  return mapping[providerSlug.toLowerCase()] || null;
}
