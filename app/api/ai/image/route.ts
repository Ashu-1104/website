import { NextResponse } from 'next/server';
import { JobProvider, JobStatus, JobType } from '@prisma/client';
import { generateImage, ImageStyle, LoraOptions } from '@/lib/ai/modelslab';
import { prisma } from '@/lib/db';
import { getWebhookUrl, isValidUuid } from '@/lib/webhooks/utils';
import { deductCreditsForOperation, refundCredits } from '@/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/image
 *
 * Generate an AI image using ModelsLab Text-to-Image API.
 * Supports webhook callbacks for async job tracking.
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Body:
 * - prompt: Text prompt for image generation (required)
 * - style: Image style - realistic, anime, or cartoon (optional, defaults to realistic)
 * - width: Image width (optional, defaults to 768)
 * - height: Image height (optional, defaults to 1024)
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
  const styleRaw = typeof body.style === 'string' ? body.style : 'realistic';
  const width = typeof body.width === 'string' ? body.width : '768';
  const height = typeof body.height === 'string' ? body.height : '1024';
  const samples = typeof body.samples === 'string' ? body.samples : '1';
  const loraModel = typeof body.lora_model === 'string' ? body.lora_model.trim() : '';
  const loraStrength = typeof body.lora_strength === 'number' ? body.lora_strength : undefined;
  const loraOptions: LoraOptions | undefined = loraModel ? { loraModel, loraStrength } : undefined;
  const useWebhook = body.use_webhook !== false;

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

  // Validate style
  const validStyles: ImageStyle[] = ['realistic', 'anime', 'cartoon'];
  const style: ImageStyle = validStyles.includes(styleRaw as ImageStyle)
    ? (styleRaw as ImageStyle)
    : 'realistic';

  // Deduct credits before calling the API
  const creditDeduction = await deductCreditsForOperation(userId, 'IMAGE_GENERATION');
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
          jobType: JobType.IMAGE_GENERATION,
          status: JobStatus.PENDING,
          requestData: { prompt, style, width, height, samples, ...(loraModel ? { loraModel, loraStrength } : {}) },
        },
      });
    } catch (error) {
      console.error('Failed to create job:', error);
    }
  }

  try {
    const webhookOptions =
      job && webhookUrl
        ? { webhook: webhookUrl, trackId: job.trackId }
        : undefined;

    const result = await generateImage(
      prompt,
      style,
      width,
      height,
      webhookOptions,
      samples,
      loraOptions,
      { signal: request.signal }
    );

    // Update job with response
    if (job) {
      const now = new Date();
      const isComplete = result.status === 'success';

      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          externalId: result.rawResponse?.id?.toString() ?? null,
          status: isComplete ? JobStatus.COMPLETED : JobStatus.PROCESSING,
          responseData: (result.rawResponse as object) ?? null,
          resultUrl: result.imageUrl ?? null,
          eta: result.rawResponse?.eta ?? null,
          startedAt: now,
          completedAt: isComplete ? now : null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      imageUrls: result.imageUrls ?? (result.imageUrl ? [result.imageUrl] : []),
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
    console.error('Image generation error:', error);
    refundCredits(userId, creditDeduction.creditsDeducted).catch(() => {});

    // Update job status to failed
    if (job) {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Image generation failed',
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to generate image.',
        details: error instanceof Error ? error.message : 'Unknown error',
        job: job ? { id: job.id, trackId: job.trackId } : null,
      },
      { status: 500 }
    );
  }
}
