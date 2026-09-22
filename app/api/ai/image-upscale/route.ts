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

const IMAGE_UPSCALE_URL = 'https://modelslab.com/api/v6/image_editing/super_resolution';
const ABSOLUTE_URL_REGEX = /^https?:\/\//i;
const UPLOADS_PREFIX = '/uploads/';

const VALID_SCALES = ['1', '2', '3', '4'];
const MODEL_IDS: Record<string, string> = {
  upscale: 'RealESRGAN_x4plus',
  enhance: 'ultra_resolution',
};

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
 * POST /api/ai/image-upscale
 *
 * Upscale or enhance an image using ModelsLab image-upscaler API.
 *
 * Body:
 * - imageUrl: URL of the image (required)
 * - scale: 1-4 (required)
 * - mode: 'upscale' | 'enhance' (required)
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
  const scale = typeof body.scale === 'string' ? body.scale : String(body.scale ?? '2');
  const mode = typeof body.mode === 'string' && body.mode in MODEL_IDS ? body.mode : 'upscale';

  if (!rawImageUrl) {
    return NextResponse.json({ error: 'Image URL is required.' }, { status: 400 });
  }
  if (!VALID_SCALES.includes(scale)) {
    return NextResponse.json({ error: 'Scale must be 1-4.' }, { status: 400 });
  }

  // Deduct credits before processing
  let creditDeduction: DeductResult = { ok: true, creditsDeducted: 0 };
  creditDeduction = await deductCreditsForOperation(userId, 'IMAGE_EDIT');
  if (!creditDeduction.ok) return creditDeduction.response;

  // Resolve image
  let imageUrl: string;
  const uploadBase64 = await tryReadUploadedImageAsBase64(rawImageUrl);

  if (uploadBase64) {
    const uploadKey = getNextApiKey();
    try {
      imageUrl = await base64ToUrl(uploadBase64, uploadKey);
    } catch (err) {
      console.error('[image-upscale] Failed to upload image:', err);
      return NextResponse.json({ error: 'Failed to upload image.' }, { status: 500 });
    }
  } else {
    imageUrl = normalizeImageInput(rawImageUrl, request.url);
  }

  // Create job
  const webhookUrl = getWebhookUrl('modelslab');
  let job = null;

  try {
    job = await prisma.generationJob.create({
      data: {
        userId,
        provider: JobProvider.MODELSLAB,
        jobType: JobType.IMAGE_EDIT,
        status: JobStatus.PENDING,
        requestData: { imageUrl: rawImageUrl, resolvedImageUrl: imageUrl, scale, mode },
      },
    });
  } catch (error) {
    console.error('Failed to create job:', error);
  }

  try {
    const apiKey = getNextApiKey();
    const modelId = MODEL_IDS[mode] ?? MODEL_IDS.upscale;

    const requestBody = {
      key: apiKey,
      init_image: imageUrl,
      scale,
      model_id: modelId,
      face_enhance: 'false',
      track_id: job ? job.trackId : null,
      webhook: job ? webhookUrl : null,
    };

    console.log(`[image-upscale] Sending request (mode=${mode}, scale=${scale}, model=${modelId})`);
    const response = await fetch(IMAGE_UPSCALE_URL, {
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
      throw new Error(data.message || 'Image upscale failed');
    }

    const requestId = data.id ?? data.request_id ?? null;

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
          requestData: { imageUrl: rawImageUrl, resolvedImageUrl: imageUrl, scale, mode, apiKeyUsed: apiKey, requestId },
        },
      });
    }

    const resultUrl = data.output?.[0] ?? data.proxy_links?.[0] ?? data.future_links?.[0] ?? null;
    if (data.status === 'success' && resultUrl) {
      return NextResponse.json({
        success: true,
        imageUrl: resultUrl,
        status: 'success',
        job: job ? { id: job.id, trackId: job.trackId, webhookEnabled: !!webhookUrl } : null,
      });
    }

    return NextResponse.json({
      success: true,
      imageUrl: null,
      status: 'processing',
      job: job ? { id: job.id, trackId: job.trackId, webhookEnabled: !!webhookUrl } : null,
    });
  } catch (error) {
    console.error('Image upscale error:', error);
    refundCredits(userId, creditDeduction.creditsDeducted).catch(() => {});

    if (job) {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Image upscale failed',
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to upscale image.',
        details: error instanceof Error ? error.message : 'Unknown error',
        job: job ? { id: job.id, trackId: job.trackId } : null,
      },
      { status: 500 }
    );
  }
}
