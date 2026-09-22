import { NextResponse } from 'next/server';
import { JobProvider, JobStatus, JobType } from '@prisma/client';
import { deepfakeVideoSwap, uploadVideoBase64ToUrl } from '@/lib/ai/modelslab';
import { prisma } from '@/lib/db';
import { getWebhookUrl, isValidUuid } from '@/lib/webhooks/utils';
import { deductCreditsForOperation, refundCredits } from '@/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min — video processing takes longer

// Image upload endpoint (same as face swap)
const BASE64_TO_URL_ENDPOINT = 'https://modelslab.com/api/v6/image_editing/base64_to_url';

/**
 * Upload a base64 image to ModelsLab and return a hosted URL.
 * Skips upload if the input is already a URL.
 */
async function uploadBase64Image(dataUri: string, apiKey: string): Promise<string> {
  if (/^https?:\/\//i.test(dataUri)) return dataUri;

  const image = dataUri.startsWith('data:image/')
    ? dataUri
    : `data:image/png;base64,${dataUri}`;

  const response = await fetch(BASE64_TO_URL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: apiKey, init_image: image }),
  });

  if (!response.ok) {
    throw new Error(`Image upload failed with status ${response.status}`);
  }

  const data = await response.json();
  const url =
    (Array.isArray(data.output) ? data.output[0] : data.output) ||
    data.url ||
    data.link ||
    (Array.isArray(data.links) ? data.links[0] : data.links);

  if (!url) throw new Error('Image upload returned no URL');
  return url;
}

/**
 * Get a ModelsLab API key for uploads
 */
function getApiKey(): string {
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`MODELSLAB_API_KEY_${i}`]?.trim();
    if (key) return key;
  }
  const key = process.env.MODELSLAB_API_KEY?.trim();
  if (key) return key;
  throw new Error('No ModelsLab API key configured');
}

/**
 * POST /api/ai/deepfake-video
 *
 * Perform deepfake video swap using ModelsLab API.
 *
 * Headers:
 *   x-vp-user-id: Required user ID
 *
 * Body:
 *   mode: 'single' | 'specific' (required)
 *   initImage: base64 data URI or URL of the face to use (required)
 *   initVideo: base64 data URI or URL of the source video (required)
 *   referenceImage: base64 data URI or URL of reference face (required for specific mode)
 */
export async function POST(request: Request) {
  // -- Auth --
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';
  if (!isValidUuid(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  // -- Parse body --
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const mode = body.mode === 'specific' ? 'specific' : 'single';
  const rawInitImage = typeof body.initImage === 'string' ? body.initImage.trim() : '';
  const rawInitVideo = typeof body.initVideo === 'string' ? body.initVideo.trim() : '';
  const rawReferenceImage = typeof body.referenceImage === 'string' ? body.referenceImage.trim() : '';

  // -- Validation --
  if (!rawInitImage || !rawInitVideo) {
    return NextResponse.json(
      { error: 'initImage and initVideo are required.' },
      { status: 400 }
    );
  }

  if (mode === 'specific' && !rawReferenceImage) {
    return NextResponse.json(
      { error: 'referenceImage is required for specific (multi-face) mode.' },
      { status: 400 }
    );
  }

  // Deduct credits before calling the API
  const creditDeduction = await deductCreditsForOperation(userId, 'DEEPFAKE_VIDEO');
  if (!creditDeduction.ok) return creditDeduction.response;

  // -- Upload media to get hosted URLs --
  const apiKey = getApiKey();
  let initImageUrl: string;
  let initVideoUrl: string;
  let referenceImageUrl: string | null = null;

  try {
    // Upload image(s) and video in parallel
    const uploads: Promise<string>[] = [
      uploadBase64Image(rawInitImage, apiKey),
      uploadVideoBase64ToUrl(rawInitVideo, apiKey),
    ];
    if (mode === 'specific' && rawReferenceImage) {
      uploads.push(uploadBase64Image(rawReferenceImage, apiKey));
    }

    const results = await Promise.all(uploads);
    initImageUrl = results[0]!;
    initVideoUrl = results[1]!;
    referenceImageUrl = results[2] ?? null;

    console.log('[deepfake-video] Media uploaded:', { initImageUrl: initImageUrl.substring(0, 60), initVideoUrl: initVideoUrl.substring(0, 60) });
  } catch (error) {
    console.error('[deepfake-video] Media upload failed:', error);
    return NextResponse.json(
      { error: 'Failed to upload media.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }

  // -- Create job for tracking --
  const webhookUrl = getWebhookUrl('modelslab');
  let job = null;

  try {
    job = await prisma.generationJob.create({
      data: {
        userId,
        provider: JobProvider.MODELSLAB,
        jobType: JobType.DEEPFAKE_VIDEO,
        status: JobStatus.PENDING,
        requestData: { mode, initImageUrl, initVideoUrl, referenceImageUrl },
      },
    });
  } catch (error) {
    console.error('[deepfake-video] Failed to create job:', error);
  }

  // -- Call ModelsLab Deepfake Video API --
  try {
    const webhookOptions = job
      ? { webhook: webhookUrl, trackId: job.trackId }
      : undefined;

    const result = await deepfakeVideoSwap(
      mode,
      initImageUrl,
      initVideoUrl,
      referenceImageUrl,
      webhookOptions,
      { signal: request.signal }
    );

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
          resultUrl: result.videoUrl ?? null,
          startedAt: now,
          completedAt: isComplete ? now : null,
          requestData: {
            mode,
            initImageUrl,
            initVideoUrl,
            referenceImageUrl,
            apiKeyUsed: result.apiKeyUsed,
            requestId: result.requestId,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      videoUrl: result.videoUrl,
      status: result.status,
      job: job
        ? { id: job.id, trackId: job.trackId, webhookEnabled: !!webhookUrl }
        : null,
    });
  } catch (error) {
    console.error('[deepfake-video] Error:', error);
    refundCredits(userId, creditDeduction.creditsDeducted).catch(() => {});

    if (job) {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Deepfake video failed',
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to create deepfake video.',
        details: error instanceof Error ? error.message : 'Unknown error',
        job: job ? { id: job.id, trackId: job.trackId } : null,
      },
      { status: 500 }
    );
  }
}
