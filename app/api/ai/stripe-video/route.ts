import { NextResponse } from 'next/server';
import { JobProvider, JobStatus, JobType } from '@prisma/client';
import { generateStripeVideo } from '@/lib/ai/modelslab';
import { prisma } from '@/lib/db';
import { getWebhookUrl, isValidUuid } from '@/lib/webhooks/utils';
import { deductCreditsForOperation, refundCredits, type DeductResult } from '@/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min — video processing takes longer

// Image upload endpoint (same as face swap / deepfake)
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
 * POST /api/ai/stripe-video
 *
 * Generate a stripe effect video from an image using ModelsLab img2video_ultra.
 *
 * Headers:
 *   x-vp-user-id: Required user ID
 *
 * Body:
 *   imageUrl: base64 data URI or URL of the source image (required)
 *   prompt: custom prompt (optional — defaults to stripe prompt)
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

  const rawImageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

  if (!rawImageUrl) {
    return NextResponse.json({ error: 'imageUrl is required.' }, { status: 400 });
  }

  // Deduct credits before processing
  let creditDeduction: DeductResult = { ok: true, creditsDeducted: 0 };
  creditDeduction = await deductCreditsForOperation(userId, 'VIDEO_GENERATION');
  if (!creditDeduction.ok) return creditDeduction.response;

  // -- Upload image to get a hosted URL --
  const apiKey = getApiKey();
  let imageUrl: string;

  try {
    imageUrl = await uploadBase64Image(rawImageUrl, apiKey);
  } catch (error) {
    console.error('[stripe-video] Image upload failed:', error);
    refundCredits(userId, creditDeduction.creditsDeducted).catch(() => {});
    return NextResponse.json(
      { error: 'Failed to upload image.', details: error instanceof Error ? error.message : 'Unknown error' },
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
        requestData: { tool: 'ai-stripe', imageUrl, prompt: prompt || null },
      },
    });
  } catch (error) {
    console.error('[stripe-video] Failed to create job:', error);
  }

  // -- Call ModelsLab img2video_ultra API --
  try {
    const webhookOptions = job
      ? { webhook: webhookUrl, trackId: job.trackId }
      : undefined;

    const result = await generateStripeVideo(
      imageUrl,
      prompt || null,
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
            tool: 'ai-stripe',
            imageUrl,
            prompt: prompt || null,
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
    console.error('[stripe-video] Error:', error);
    refundCredits(userId, creditDeduction.creditsDeducted).catch(() => {});

    if (job) {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Stripe video generation failed',
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to generate stripe video.',
        details: error instanceof Error ? error.message : 'Unknown error',
        job: job ? { id: job.id, trackId: job.trackId } : null,
      },
      { status: 500 }
    );
  }
}
