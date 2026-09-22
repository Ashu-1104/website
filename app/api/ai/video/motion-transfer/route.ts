import { NextResponse } from 'next/server';
import { JobProvider, JobStatus, JobType } from '@prisma/client';
import { generateMotionTransfer } from '@/lib/ai/modelslab';
import { prisma } from '@/lib/db';
import { getWebhookUrl, isValidUuid } from '@/lib/webhooks/utils';
import { deductExactCredits, getOperationCreditCost, refundCredits, type DeductResult } from '@/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/ai/video/motion-transfer
 *
 * Transfer motion from a reference video onto a static character image
 * using ModelsLab's Kling Motion Control model.
 *
 * Headers:
 * - x-vp-user-id: Required UUID.
 *
 * Body:
 * - imageUrl: URL of the character image (required)
 * - videoUrl: URL of the reference motion video (required)
 * - prompt: Motion description (required)
 * - characterOrientation: "image" | "video" (optional, defaults to "image")
 * - use_webhook: boolean (optional, defaults to true)
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

  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
  const videoUrl = typeof body.videoUrl === 'string' ? body.videoUrl.trim() : '';
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const characterOrientation =
    body.characterOrientation === 'video' ? 'video' as const : 'image' as const;
  const useWebhook = body.use_webhook !== false;
  // Duration in seconds — required for per-second credit billing
  const duration = typeof body.duration === 'number' && body.duration > 0 ? Math.ceil(body.duration) : null;

  if (!imageUrl) {
    return NextResponse.json({ error: 'Character image URL is required.' }, { status: 400 });
  }
  if (!videoUrl) {
    return NextResponse.json({ error: 'Reference video URL is required.' }, { status: 400 });
  }
  if (!duration) {
    return NextResponse.json({ error: 'duration (seconds) is required and must be > 0.' }, { status: 400 });
  }

  // Per-second credit billing: look up rate then deduct duration × rate
  const perSecondRate = await getOperationCreditCost('MOTION_TRANSFER_PER_SECOND', 7);
  const creditsNeeded = Math.ceil(duration * perSecondRate);
  let creditDeduction: DeductResult = { ok: true, creditsDeducted: 0 };
  creditDeduction = await deductExactCredits(userId, creditsNeeded, `Motion Transfer (${duration}s)`, 'MOTION_TRANSFER_PER_SECOND', 'video');
  if (!creditDeduction.ok) return creditDeduction.response;

  const webhookUrl = getWebhookUrl('modelslab');
  let job = null;

  if (useWebhook) {
    try {
      job = await prisma.generationJob.create({
        data: {
          userId,
          provider: JobProvider.MODELSLAB,
          jobType: JobType.VIDEO_GENERATION,
          status: JobStatus.PENDING,
          requestData: { imageUrl, videoUrl, prompt, characterOrientation, type: 'motion-transfer' },
        },
      });
    } catch (error) {
      console.error('Failed to create job:', error);
    }
  }

  try {
    const webhookOptions =
      job ? { webhook: webhookUrl, trackId: job.trackId } : undefined;

    const effectivePrompt = prompt || 'make this image accurately animate to the video';

    const result = await generateMotionTransfer(
      imageUrl,
      videoUrl,
      effectivePrompt,
      webhookOptions,
      { characterOrientation, signal: request.signal }
    );

    if (job) {
      const now = new Date();
      const isComplete = result.status === 'success';

      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          externalId:
            result.rawResponse?.fetch_result?.split('/').pop() ||
            result.rawResponse?.request_id?.toString() ||
            result.rawResponse?.id?.toString() ||
            null,
          status: isComplete ? JobStatus.COMPLETED : JobStatus.PROCESSING,
          responseData: (result.rawResponse as object) ?? null,
          resultUrl: result.videoUrl ?? null,
          eta: result.rawResponse?.eta ?? null,
          startedAt: now,
          completedAt: isComplete ? now : null,
          requestData: {
            imageUrl, videoUrl, prompt, characterOrientation,
            type: 'motion-transfer',
            apiKeyUsed: result.apiKeyUsed,
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
    console.error('Motion transfer generation error:', error);
    refundCredits(userId, creditDeduction.creditsDeducted).catch(() => {});

    if (job) {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Motion transfer failed',
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to generate motion transfer video.',
        details: error instanceof Error ? error.message : 'Unknown error',
        job: job ? { id: job.id, trackId: job.trackId } : null,
      },
      { status: 500 }
    );
  }
}
