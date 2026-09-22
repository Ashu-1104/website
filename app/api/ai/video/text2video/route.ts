import { NextResponse } from 'next/server';
import { JobProvider, JobStatus, JobType } from '@prisma/client';
import { generateText2Video } from '@/lib/ai/modelslab';
import { prisma } from '@/lib/db';
import { getWebhookUrl, isValidUuid } from '@/lib/webhooks/utils';
import { deductCreditsForOperation, refundCredits } from '@/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for video generation

/**
 * POST /api/ai/video/text2video
 *
 * Generate an AI video from text using ModelsLab Text-to-Video API.
 * Supports webhook callbacks for async job tracking.
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Body:
 * - prompt: Text prompt for video generation (required)
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

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const useWebhook = body.use_webhook !== false;
  const portrait = body.portrait === true;
  const modelId = typeof body.modelId === 'string' ? body.modelId.trim() : undefined;
  const duration = typeof body.duration === 'number' && body.duration > 0 ? body.duration : undefined;
  const resolution = typeof body.resolution === 'number' && body.resolution > 0 ? body.resolution : undefined;

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
  const creditDeduction = await deductCreditsForOperation(userId, 'VIDEO_GENERATION');
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
          jobType: JobType.VIDEO_GENERATION,
          status: JobStatus.PENDING,
          requestData: { prompt, portrait },
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

    const result = await generateText2Video(prompt, webhookOptions, { portrait, modelId, duration, resolution, signal: request.signal });

    // Update job with response and store the API key used for later fetch
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
          requestData: { prompt, portrait, apiKeyUsed: result.apiKeyUsed },
        },
      });
    }

    return NextResponse.json({
      success: true,
      videoUrl: result.videoUrl,
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
    console.error('Text-to-video generation error:', error);
    refundCredits(userId, creditDeduction.creditsDeducted).catch(() => {});

    if (job) {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Video generation failed',
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to generate video.',
        details: error instanceof Error ? error.message : 'Unknown error',
        job: job ? { id: job.id, trackId: job.trackId } : null,
      },
      { status: 500 }
    );
  }
}
