import type { JobProvider, JobStatus } from '@prisma/client';

/**
 * Webhook payload structure for different providers
 */

// ModelsLab webhook payload (based on their API documentation)
export type ModelslabWebhookPayload = {
  status: 'success' | 'processing' | 'error' | string;
  id?: number;
  request_id?: string | number;
  fetch_result?: string;
  track_id?: number;
  output?: string[];
  proxy_links?: string[];
  future_links?: string[];
  links?: string[];
  message?: string;
  eta?: number;
  generationTime?: number;
  audio_time?: number;
  meta?: Record<string, unknown>;
};

// Generic webhook payload that all providers are normalized to
export type NormalizedWebhookPayload = {
  provider: JobProvider;
  externalId: string;
  trackId?: number;
  status: JobStatus;
  resultUrl?: string;
  errorMessage?: string;
  errorCode?: string;
  progress?: number;
  eta?: number;
  rawPayload: unknown;
};

// Webhook handler result
export type WebhookHandlerResult = {
  success: boolean;
  jobId?: string;
  message: string;
};

// Provider-specific webhook normalizer function type
export type WebhookNormalizer = (payload: unknown) => NormalizedWebhookPayload | null;

// SSE event types for real-time updates
export type JobUpdateEvent = {
  type: 'job_update';
  jobId: string;
  trackId: number;
  status: JobStatus;
  progress?: number;
  eta?: number;
  resultUrl?: string;
  errorMessage?: string;
  completedAt?: string;
};

export type SSEEvent = JobUpdateEvent;
