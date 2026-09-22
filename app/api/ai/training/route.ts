import { NextResponse } from 'next/server';
import { JobProvider, JobStatus, JobType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getWebhookUrl, isValidUuid } from '@/lib/webhooks/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MODELSLAB_TRAINER_URL = 'https://modelslab.com/api/v6/trainer/train';
const MIN_IMAGES = 15;
const MIN_STEPS = 1500;
const MAX_STEPS = 6000;
const STEPS_PER_IMAGE = 120;

function getApiKey(): string {
  const key = process.env.MODELSLAB_API_KEY_1 || process.env.MODELSLAB_API_KEY;
  if (!key?.trim()) {
    throw new Error('No ModelsLab API key configured.');
  }
  return key.trim();
}

function calculateTrainingSteps(imageCount: number): number {
  return Math.min(MAX_STEPS, Math.max(MIN_STEPS, STEPS_PER_IMAGE * imageCount));
}

/**
 * POST /api/ai/training
 *
 * Start a LoRA model training job using ModelsLab trainer.
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Body:
 * - images: string[] — Array of image URLs (minimum 15)
 * - triggerWord: string — The trigger word for the LoRA model
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

  const images = Array.isArray(body.images) ? body.images.filter((img): img is string => typeof img === 'string' && img.trim().length > 0) : [];
  const triggerWord = typeof body.triggerWord === 'string' ? body.triggerWord.trim() : '';

  if (!triggerWord) {
    return NextResponse.json({ error: 'Trigger word is required.' }, { status: 400 });
  }

  if (images.length < MIN_IMAGES) {
    return NextResponse.json(
      { error: `Minimum ${MIN_IMAGES} images required. You provided ${images.length}.` },
      { status: 400 }
    );
  }

  // ── Plan & credit check ──────────────────────────────────────────────────────
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, monthlyCredits: true, creditsUsed: true, status: true },
  });

  const planKey = subscription?.plan ?? 'FREE';
  const planConfig = await prisma.planConfig.findUnique({
    where: { planKey },
    select: { loraTrainingCredits: true, name: true },
  });

  const loraCredits = planConfig?.loraTrainingCredits ?? 0;

  if (loraCredits === 0) {
    const planName = planConfig?.name ?? planKey;
    return NextResponse.json(
      {
        error: `LoRA training is not available on the ${planName} plan. Please upgrade to Pro or higher.`,
        code: 'PLAN_NOT_SUPPORTED',
      },
      { status: 403 }
    );
  }

  const available = (subscription?.monthlyCredits ?? 0) - (subscription?.creditsUsed ?? 0);
  if (available < loraCredits) {
    return NextResponse.json(
      {
        error: 'Insufficient credits for LoRA training.',
        required: loraCredits,
        available,
        code: 'INSUFFICIENT_CREDITS',
      },
      { status: 402 }
    );
  }

  // Deduct credits before starting training
  await prisma.subscription.update({
    where: { userId },
    data: { creditsUsed: { increment: loraCredits } },
  });
  // ─────────────────────────────────────────────────────────────────────────────

  const trainingSteps = calculateTrainingSteps(images.length);
  const apiKey = getApiKey();
  const hfUsername = process.env.HF_USERNAME || 'akash-guptag';
  const hfToken = process.env.HF_TOKEN || '';

  if (!hfToken) {
    return NextResponse.json({ error: 'HuggingFace token not configured.' }, { status: 500 });
  }

  // Create a job in the database to track this request
  const webhookUrl = getWebhookUrl('modelslab');
  let job = null;

  try {
    job = await prisma.generationJob.create({
      data: {
        userId,
        provider: JobProvider.MODELSLAB,
        jobType: JobType.LORA_TRAINING,
        status: JobStatus.PENDING,
        requestData: {
          triggerWord,
          imageCount: images.length,
          trainingSteps,
        },
      },
    });
  } catch (error) {
    console.error('Failed to create training job:', error);
  }

  try {
    const requestBody = {
      key: apiKey,
      images,
      instance_prompt: triggerWord,
      training_type: 'lora',
      trainer_id: 'z-image-turbo-lora-trainer',
      resolution: '1024',
      training_id: triggerWord,
      rank: '16',
      alpha: '16',
      max_train_steps: String(trainingSteps),
      save_steps: '250',
      batch_size: '1',
      learning_rate: '0.0001',
      hf_username: hfUsername,
      hf_token: hfToken,
      server_name: 'NVIDIA H100 80GB HBM3',
      webhook: webhookUrl ?? null,
      track_id: job?.trackId ?? null,
    };

    const response = await fetch(MODELSLAB_TRAINER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Trainer API failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (data.status === 'error' || data.status === 'failed') {
      throw new Error(data.message || 'Training request failed');
    }

    // Update job with response
    if (job) {
      const externalId =
        data.training_id?.toString() ||
        data.id?.toString() ||
        data.request_id?.toString() ||
        null;

      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          externalId,
          status: JobStatus.PROCESSING,
          responseData: data as object,
          eta: data.eta ?? null,
          startedAt: new Date(),
          requestData: {
            triggerWord,
            imageCount: images.length,
            trainingSteps,
            apiKeyUsed: apiKey,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      status: data.status || 'processing',
      trainingSteps,
      job: job
        ? {
            id: job.id,
            trackId: job.trackId,
            webhookEnabled: !!webhookUrl,
          }
        : null,
    });
  } catch (error) {
    console.error('Training error:', error);

    // Refund credits since training didn't start
    await prisma.subscription.update({
      where: { userId },
      data: { creditsUsed: { decrement: loraCredits } },
    }).catch((e) => console.error('Failed to refund LoRA credits:', e));

    if (job) {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Training failed',
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to start training.',
        details: error instanceof Error ? error.message : 'Unknown error',
        job: job ? { id: job.id, trackId: job.trackId } : null,
      },
      { status: 500 }
    );
  }
}
