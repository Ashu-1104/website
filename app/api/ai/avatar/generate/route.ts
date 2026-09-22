import { NextResponse } from 'next/server';
import { JobProvider, JobStatus, JobType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getWebhookUrl, isValidUuid } from '@/lib/webhooks/utils';
import path from 'path';
import { readFile } from 'fs/promises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// ── Model version endpoints ──
const MODEL_ENDPOINTS: Record<string, string> = {
  v1: 'https://modelslab.com/api/v6/image_editing/head_shot',
  v2: 'https://modelslab.com/api/v6/image_editing/flux_headshot',
  v3: 'https://modelslab.com/api/v6/images/img2img',
  v4: 'https://modelslab.com/api/v6/image_editing/qwen_edit',
};
const VALID_VERSIONS = Object.keys(MODEL_ENDPOINTS);
const DEFAULT_VERSION = 'v4';

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;
const UPLOADS_PREFIX = '/uploads/';

// ── API key rotation (reuse same keys as other modelslab endpoints) ──

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

// ── Base64 to URL conversion via ModelsLab ──

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
 * POST /api/ai/avatar/generate
 *
 * Generate an AI avatar/headshot using ModelsLab head_shot API.
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Body:
 * - faceImageUrl: URL of the face image (required)
 * - prompt: The avatar prompt (required)
 * - version: Model version – v1 | v2 | v3 | v4 (default v4)
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

  const rawFaceImageUrl = typeof body.faceImageUrl === 'string' ? body.faceImageUrl.trim() : '';
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const version = typeof body.version === 'string' && VALID_VERSIONS.includes(body.version) ? body.version : DEFAULT_VERSION;

  if (!rawFaceImageUrl) {
    return NextResponse.json({ error: 'Face image URL is required.' }, { status: 400 });
  }
  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
  }

  if (prompt.length > 5000) {
    return NextResponse.json({ error: 'Prompt is too long. Maximum 5,000 characters.' }, { status: 400 });
  }

  // Resolve face image: if it's a local upload, read as base64 and convert to URL
  let faceImageUrl: string;
  const uploadBase64 = await tryReadUploadedImageAsBase64(rawFaceImageUrl);

  if (uploadBase64) {
    // Convert base64 to a public URL via ModelsLab
    const uploadKey = getNextApiKey();
    try {
      faceImageUrl = await base64ToUrl(uploadBase64, uploadKey);
    } catch (err) {
      console.error('[avatar/generate] Failed to upload face image:', err);
      return NextResponse.json({ error: 'Failed to upload face image.' }, { status: 500 });
    }
  } else {
    faceImageUrl = normalizeImageInput(rawFaceImageUrl, request.url);
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
        requestData: { faceImageUrl: rawFaceImageUrl, resolvedFaceImageUrl: faceImageUrl, prompt, version },
      },
    });
  } catch (error) {
    console.error('Failed to create job:', error);
  }

  try {
    const apiKey = getNextApiKey();
    const endpoint = MODEL_ENDPOINTS[version]!;

    // Build version-specific request body
    let requestBody: Record<string, unknown>;

    switch (version) {
      case 'v1':
        requestBody = {
          key: apiKey,
          prompt,
          negative_prompt: '',
          face_image: faceImageUrl,
          width: 512,
          height: 768,
          num_inference_steps: 31,
          guidance_scale: 7.5,
          s_scale: 2,
          samples: 1,
          safety_checker: false,
          safety_checker_type: 'black',
          base64: false,
          webhook: job ? webhookUrl : null,
          track_id: job ? job.trackId : null,
        };
        break;

      case 'v2':
        requestBody = {
          key: apiKey,
          prompt,
          face_image: faceImageUrl,
          width: 768,
          height: 1024,
          num_inference_steps: 21,
          guidance_scale: 7.5,
          samples: 1,
          safety_checker: false,
          safety_checker_type: 'black',
          base64: false,
          webhook: job ? webhookUrl : null,
          track_id: job ? job.trackId : null,
        };
        break;

      case 'v3':
        requestBody = {
          key: apiKey,
          model_id: 'flux-kontext-dev',
          prompt,
          negative_prompt: '',
          init_image: faceImageUrl,
          width: 768,
          height: 1024,
          samples: 1,
          num_inference_steps: 28,
          strength: 0.5,
          guidance_scale: 2.5,
          safety_checker: false,
          safety_checker_type: 'black',
          base64: false,
          webhook: job ? webhookUrl : null,
          track_id: job ? job.trackId : null,
        };
        break;

      case 'v4':
      default:
        requestBody = {
          key: apiKey,
          model_id: 'qwen-edit-2509',
          prompt,
          init_image: [faceImageUrl],
          width: 768,
          height: 1024,
          samples: 1,
          num_inference_steps: 28,
          guidance_scale: 3.5,
          safety_checker: false,
          safety_checker_type: 'black',
          base64: false,
          webhook: job ? webhookUrl : null,
          track_id: job ? job.trackId : null,
        };
        break;
    }

    console.log(`[avatar/generate] Sending ${version} request to ${endpoint}`);
    const response = await fetch(endpoint, {
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
      throw new Error(data.message || 'Avatar generation failed');
    }

    // Extract request ID
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
          requestData: { faceImageUrl: rawFaceImageUrl, resolvedFaceImageUrl: faceImageUrl, prompt, version, apiKeyUsed: apiKey, requestId },
        },
      });
    }

    // If success immediately
    const imageUrl = data.output?.[0] ?? data.proxy_links?.[0] ?? data.future_links?.[0] ?? null;
    if (data.status === 'success' && imageUrl) {
      return NextResponse.json({
        success: true,
        imageUrl,
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
    console.error('Avatar generation error:', error);

    if (job) {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Avatar generation failed',
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to generate avatar.',
        details: error instanceof Error ? error.message : 'Unknown error',
        job: job ? { id: job.id, trackId: job.trackId } : null,
      },
      { status: 500 }
    );
  }
}
