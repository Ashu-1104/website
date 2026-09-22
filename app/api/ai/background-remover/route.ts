import { NextResponse } from 'next/server';
import { JobProvider, JobStatus, JobType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getWebhookUrl, isValidUuid } from '@/lib/webhooks/utils';
import { deductCreditsForOperation, refundCredits, type DeductResult } from '@/lib/credits';
import path from 'path';
import { readFile } from 'fs/promises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const BG_REMOVAL_URL = 'https://modelslab.com/api/v8/images/background-removal';
const ABSOLUTE_URL_REGEX = /^https?:\/\//i;
const UPLOADS_PREFIX = '/uploads/';

// ── API key rotation ──

function getApiKeys(): string[] {
  const keys: string[] = [];
  const singleKey = process.env.MODELSLAB_API_KEY;
  if (singleKey?.trim()) keys.push(singleKey.trim());
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`MODELSLAB_API_KEY_${i}`];
    if (key?.trim()) keys.push(key.trim());
  }
  return keys;
}

let currentKeyIndex = 0;
function getNextApiKey(): string {
  const keys = getApiKeys();
  if (keys.length === 0) throw new Error('No ModelsLab API keys configured.');
  const key = keys[currentKeyIndex % keys.length]!;
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  return key;
}

// ── Image helpers ──

function normalizeImageInput(raw: string, requestUrl: string): string {
  if (!raw) return raw;
  if (raw.startsWith('data:image/')) return raw;
  if (ABSOLUTE_URL_REGEX.test(raw)) return raw;
  if (raw.startsWith('/')) return new URL(raw, requestUrl).toString();
  return raw;
}

function isSafeUploadFilename(filename: string): boolean {
  if (!filename) return false;
  if (filename.includes('/') || filename.includes('\\')) return false;
  if (filename.includes('..')) return false;
  return true;
}

async function tryReadUploadedImageAsBase64(urlPath: string): Promise<string | null> {
  const cleanPath = urlPath.split('?')[0]?.split('#')[0] ?? urlPath;
  let pathname = cleanPath;
  if (ABSOLUTE_URL_REGEX.test(cleanPath)) {
    try { pathname = new URL(cleanPath).pathname; } catch { return null; }
  }
  if (!pathname.startsWith(UPLOADS_PREFIX)) return null;
  const filename = pathname.slice(UPLOADS_PREFIX.length);
  if (!isSafeUploadFilename(filename)) return null;
  const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
  try {
    const buffer = await readFile(filePath);
    return buffer.toString('base64');
  } catch { return null; }
}

async function base64ToUrl(base64Data: string, apiKey: string): Promise<string> {
  let dataUri = base64Data.trim();
  if (!dataUri.startsWith('data:image/')) {
    dataUri = `data:image/png;base64,${dataUri}`;
  }
  const res = await fetch('https://modelslab.com/api/v6/image_editing/base64_to_url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: apiKey, init_image: dataUri }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`base64_to_url failed: HTTP ${res.status}`);
  const data = await res.json();
  const url = data.output?.[0] ?? data.output ?? data.url ?? data.link;
  if (!url) throw new Error('base64_to_url returned no URL');
  return typeof url === 'string' ? url : String(url);
}

/**
 * POST /api/ai/background-remover
 *
 * Remove background from an image using ModelsLab background-removal API.
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Body:
 * - imageUrl: URL of the image (required)
 */
export async function POST(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!isValidUuid(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const rawImageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';

  if (!rawImageUrl) {
    return NextResponse.json({ error: 'Image URL is required.' }, { status: 400 });
  }

  // Deduct credits before processing
  let creditDeduction: DeductResult = { ok: true, creditsDeducted: 0 };
  creditDeduction = await deductCreditsForOperation(userId, 'IMAGE_EDIT');
  if (!creditDeduction.ok) return creditDeduction.response;

  // Resolve image: if it's a local upload, read as base64 and convert to URL
  let imageUrl: string;
  const uploadBase64 = await tryReadUploadedImageAsBase64(rawImageUrl);

  if (uploadBase64) {
    const uploadKey = getNextApiKey();
    try {
      imageUrl = await base64ToUrl(uploadBase64, uploadKey);
    } catch (err) {
      console.error('[background-remover] Failed to upload image:', err);
      return NextResponse.json({ error: 'Failed to upload image.' }, { status: 500 });
    }
  } else {
    imageUrl = normalizeImageInput(rawImageUrl, request.url);
  }

  // Create a job for tracking
  const webhookUrl = getWebhookUrl('modelslab');
  let job = null;

  try {
    job = await prisma.generationJob.create({
      data: {
        userId,
        provider: JobProvider.MODELSLAB,
        jobType: JobType.IMAGE_EDIT,
        status: JobStatus.PENDING,
        requestData: { imageUrl: rawImageUrl, resolvedImageUrl: imageUrl },
      },
    });
  } catch (error) {
    console.error('Failed to create job:', error);
  }

  try {
    const apiKey = getNextApiKey();

    const requestBody = {
      key: apiKey,
      image_url: imageUrl,
      only_mask: false,
      inverse_mask: false,
      seed: null,
      alpha_matting: false,
      post_process_mask: false,
      model_id: 'background-remover-1',
      base64: 'no',
      webhook: job ? webhookUrl : null,
      track_id: job ? job.trackId : null,
    };

    console.log('[background-remover] Sending request');
    const response = await fetch(BG_REMOVAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (data.status === 'error' || data.status === 'failed') {
      throw new Error(data.message || 'Background removal failed');
    }

    const requestId = data.id ?? data.request_id ?? null;

    // Update job with response
    if (job) {
      const isComplete = data.status === 'success';
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          externalId: requestId ? String(requestId) : null,
          status: isComplete ? JobStatus.COMPLETED : JobStatus.PROCESSING,
          responseData: data ?? null,
          resultUrl: data.output?.[0] ?? null,
          eta: data.eta ?? null,
          startedAt: new Date(),
          completedAt: isComplete ? new Date() : null,
          requestData: { imageUrl: rawImageUrl, resolvedImageUrl: imageUrl, apiKeyUsed: apiKey, requestId },
        },
      });
    }

    // If success immediately
    const resultUrl = data.output?.[0] ?? data.proxy_links?.[0] ?? data.future_links?.[0] ?? null;
    if (data.status === 'success' && resultUrl) {
      return NextResponse.json({
        success: true,
        imageUrl: resultUrl,
        status: 'success',
        job: job ? { id: job.id, trackId: job.trackId, webhookEnabled: !!webhookUrl } : null,
      });
    }

    // If processing (async)
    return NextResponse.json({
      success: true,
      imageUrl: null,
      status: 'processing',
      job: job ? { id: job.id, trackId: job.trackId, webhookEnabled: !!webhookUrl } : null,
    });
  } catch (error) {
    console.error('Background removal error:', error);
    refundCredits(userId, creditDeduction.creditsDeducted).catch(() => {});

    if (job) {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Background removal failed',
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to remove background.',
        details: error instanceof Error ? error.message : 'Unknown error',
        job: job ? { id: job.id, trackId: job.trackId } : null,
      },
      { status: 500 }
    );
  }
}
