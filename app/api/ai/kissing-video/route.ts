import { NextResponse } from 'next/server';
import { JobProvider, JobStatus, JobType } from '@prisma/client';
import { generateKissingVideo } from '@/lib/ai/modelslab';
import { prisma } from '@/lib/db';
import { getWebhookUrl, isValidUuid } from '@/lib/webhooks/utils';
import { deductExactCredits, refundCredits, type DeductResult } from '@/lib/credits';

// IMAGE_EDIT (5) + VIDEO_GENERATION (40) = 45 credits
const KISSING_VIDEO_CREDITS = 45;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min — hobby plan limit (two-step pipeline: image merge + video)

// Image upload endpoint
const BASE64_TO_URL_ENDPOINT = 'https://modelslab.com/api/v6/image_editing/base64_to_url';

/**
 * Upload a base64 image to ModelsLab and return a hosted URL.
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
 * POST /api/ai/kissing-video
 *
 * Two-step pipeline:
 * 1. Merge two images into a single scene (qwen-edit-2511)
 * 2. Generate a kissing video from the merged image (img2video_ultra)
 *
 * Headers:
 *   x-vp-user-id: Required user ID
 *
 * Body:
 *   image1: base64 data URI or URL of first person (required)
 *   image2: base64 data URI or URL of second person (required)
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

  const rawImage1 = typeof body.image1 === 'string' ? body.image1.trim() : '';
  const rawImage2 = typeof body.image2 === 'string' ? body.image2.trim() : '';

  if (!rawImage1 || !rawImage2) {
    return NextResponse.json(
      { error: 'Both image1 and image2 are required.' },
      { status: 400 }
    );
  }

  // Deduct combined credits (image merge + video generation)
  let creditDeduction: DeductResult = { ok: true, creditsDeducted: 0 };
  creditDeduction = await deductExactCredits(userId, KISSING_VIDEO_CREDITS, 'AI Kissing Video', 'VIDEO_GENERATION', 'video');
  if (!creditDeduction.ok) return creditDeduction.response;

  // -- Upload both images in parallel --
  const apiKey = getApiKey();
  let imageUrl1: string;
  let imageUrl2: string;

  try {
    const [url1, url2] = await Promise.all([
      uploadBase64Image(rawImage1, apiKey),
      uploadBase64Image(rawImage2, apiKey),
    ]);
    imageUrl1 = url1;
    imageUrl2 = url2;
  } catch (error) {
    console.error('[kissing-video] Image upload failed:', error);
    refundCredits(userId, creditDeduction.creditsDeducted).catch(() => {});
    return NextResponse.json(
      { error: 'Failed to upload images.', details: error instanceof Error ? error.message : 'Unknown error' },
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
        jobType: JobType.VIDEO_GENERATION,
        status: JobStatus.PENDING,
        requestData: { tool: 'ai-kissing-video', imageUrl1, imageUrl2 },
      },
    });
  } catch (error) {
    console.error('[kissing-video] Failed to create job:', error);
  }

  // -- Run the two-step pipeline --
  try {
    const webhookOptions = job
      ? { webhook: webhookUrl, trackId: job.trackId }
      : undefined;

    const result = await generateKissingVideo(
      imageUrl1,
      imageUrl2,
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
            tool: 'ai-kissing-video',
            imageUrl1,
            imageUrl2,
            mergedImageUrl: result.mergedImageUrl,
            apiKeyUsed: result.apiKeyUsed,
            requestId: result.requestId,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      videoUrl: result.videoUrl,
      mergedImageUrl: result.mergedImageUrl,
      status: result.status,
      job: job
        ? { id: job.id, trackId: job.trackId, webhookEnabled: !!webhookUrl }
        : null,
    });
  } catch (error) {
    console.error('[kissing-video] Error:', error);
    refundCredits(userId, creditDeduction.creditsDeducted).catch(() => {});

    if (job) {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Kissing video generation failed',
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to generate kissing video.',
        details: error instanceof Error ? error.message : 'Unknown error',
        job: job ? { id: job.id, trackId: job.trackId } : null,
      },
      { status: 500 }
    );
  }
}
