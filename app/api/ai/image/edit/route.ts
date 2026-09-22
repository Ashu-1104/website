import { NextResponse } from 'next/server';
import { JobProvider, JobStatus, JobType } from '@prisma/client';
import { editImage } from '@/lib/ai/modelslab';
import { prisma } from '@/lib/db';
import { getWebhookUrl, isValidUuid } from '@/lib/webhooks/utils';
import { deductCreditsForOperation, refundCredits } from '@/lib/credits';
import path from 'path';
import { readFile } from 'fs/promises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes for image editing

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;
const UPLOADS_PREFIX = '/uploads/';

function normalizeImageInput(raw: string, requestUrl: string): string {
  if (!raw) return raw;
  if (raw.startsWith('data:image/')) return raw;
  if (ABSOLUTE_URL_REGEX.test(raw)) return raw;

  const looksLikeBase64 =
    raw.length >= 32 &&
    raw.length % 4 !== 1 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(raw);
  if (looksLikeBase64) return raw;

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
    try {
      pathname = new URL(cleanPath).pathname;
    } catch {
      return null;
    }
  }

  if (!pathname.startsWith(UPLOADS_PREFIX)) return null;

  const filename = pathname.slice(UPLOADS_PREFIX.length);
  if (!isSafeUploadFilename(filename)) return null;

  const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
  try {
    const buffer = await readFile(filePath);
    return buffer.toString('base64');
  } catch {
    return null;
  }
}

/**
 * POST /api/ai/image/edit
 *
 * Edit an image using ModelsLab Qwen Edit API.
 * Supports webhook callbacks for async job tracking.
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Body:
 * - imageUrl: URL of the source image to edit (required)
 * - prompt: Editing instruction/prompt (required)
 * - use_webhook: Whether to use webhook for async tracking (optional, defaults to true)
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
  const resolvedImageUrl = normalizeImageInput(rawImageUrl, request.url);
  const uploadBase64 = await tryReadUploadedImageAsBase64(rawImageUrl);
  if (rawImageUrl.startsWith(UPLOADS_PREFIX) && !uploadBase64) {
    return NextResponse.json({ error: 'Uploaded image not found.' }, { status: 400 });
  }
  const modelsLabInitImage = uploadBase64 ?? resolvedImageUrl;
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const useWebhook = body.use_webhook !== false;

  if (!modelsLabInitImage) {
    return NextResponse.json(
      { error: 'Image URL is required.' },
      { status: 400 }
    );
  }

  if (!prompt) {
    return NextResponse.json(
      { error: 'Prompt is required.' },
      { status: 400 }
    );
  }

  if (prompt.length > 5000) {
    return NextResponse.json(
      { error: 'Prompt is too long. Maximum 5,000 characters.' },
      { status: 400 }
    );
  }

  // Deduct credits before calling the API
  const creditDeduction = await deductCreditsForOperation(userId, 'IMAGE_EDIT');
  if (!creditDeduction.ok) return creditDeduction.response;

  // Create a job in the database to track this request
  const webhookUrl = getWebhookUrl('modelslab');
  let job = null;

  if (useWebhook) {
    try {
      job = await prisma.generationJob.create({
        data: {
          userId,
          provider: JobProvider.MODELSLAB,
          jobType: JobType.IMAGE_EDIT,
          status: JobStatus.PENDING,
          requestData: { imageUrl: rawImageUrl, resolvedImageUrl, prompt, usedUploadBase64: !!uploadBase64 },
        },
      });
    } catch (error) {
      console.error('Failed to create job:', error);
    }
  }

  try {
    const webhookOptions =
      job
        ? { webhook: webhookUrl, trackId: job.trackId }
        : undefined;

    const result = await editImage(modelsLabInitImage, prompt, webhookOptions, { signal: request.signal });

    // Update job with response
    if (job) {
      const now = new Date();
      const isComplete = result.status === 'success';

      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          externalId: result.requestId,
          status: isComplete ? JobStatus.COMPLETED : JobStatus.PROCESSING,
          responseData: (result.rawResponse as object) ?? null,
          resultUrl: result.imageUrl ?? null,
          eta: result.rawResponse?.eta ?? null,
          startedAt: now,
          completedAt: isComplete ? now : null,
          requestData: { imageUrl: rawImageUrl, resolvedImageUrl, prompt, usedUploadBase64: !!uploadBase64, apiKeyUsed: result.apiKeyUsed, requestId: result.requestId },
        },
      });
    }

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      status: result.status,
      job: job
        ? {
            id: job.id,
            trackId: job.trackId,
            webhookEnabled: !!webhookUrl,
          }
        : null,
    });
  } catch (error) {
    console.error('Image edit error:', error);
    refundCredits(userId, creditDeduction.creditsDeducted).catch(() => {});

    if (job) {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Image edit failed',
          completedAt: new Date(),
          requestData: { imageUrl: rawImageUrl, resolvedImageUrl, prompt, usedUploadBase64: !!uploadBase64 },
        },
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to edit image.',
        details: error instanceof Error ? error.message : 'Unknown error',
        job: job ? { id: job.id, trackId: job.trackId } : null,
      },
      { status: 500 }
    );
  }
}
