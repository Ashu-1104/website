export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { JobProvider, JobStatus, JobType } from '@prisma/client';
import { getModelslabApiKey, modelslabTextToSpeech, type ModelslabTextToSpeechRequest } from '@/lib/modelslab';
import { prisma } from '@/lib/db';
import { getWebhookUrl } from '@/lib/webhooks/utils';
import { deductCreditsForOperation, refundCredits, type DeductResult } from '@/lib/credits';

const MAX_PROMPT_LENGTH = 2500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  return undefined;
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value !== 'number') return undefined;
  if (!Number.isFinite(value)) return undefined;
  return value;
}

function getErrorStatus(error: unknown, fallback: number): number {
  if (!isRecord(error) || typeof error.status !== 'number' || !Number.isFinite(error.status)) return fallback;
  return error.status;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!isRecord(error) || typeof error.message !== 'string' || error.message.trim().length === 0) return fallback;
  return error.message;
}

export async function POST(request: NextRequest) {
  const apiKey = getModelslabApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { status: 'error', message: 'Server is missing MODELSLAB_API_KEY' },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', message: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ status: 'error', message: 'Invalid request body' }, { status: 400 });
  }

  const prompt = body.prompt;
  const voiceId = body.voice_id;
  const language = body.language;
  const speed = body.speed;
  const useWebhook = body.use_webhook !== false; // Default to true if webhook URL is available

  if (!isNonEmptyString(prompt)) {
    return NextResponse.json({ status: 'error', message: 'prompt is required' }, { status: 400 });
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { status: 'error', message: `prompt must be <= ${MAX_PROMPT_LENGTH} characters` },
      { status: 400 }
    );
  }
  if (!isNonEmptyString(voiceId)) {
    return NextResponse.json({ status: 'error', message: 'voice_id is required' }, { status: 400 });
  }

  const speedNumber = parseNumber(speed);
  if (speedNumber !== undefined && speedNumber <= 0) {
    return NextResponse.json({ status: 'error', message: 'speed must be > 0' }, { status: 400 });
  }

  // Get user ID from header (optional)
  const userId = request.headers.get('x-vp-user-id');
  const isValidUserId = userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);

  // Deduct credits if user is identified
  let creditDeduction: DeductResult = { ok: true, creditsDeducted: 0 };
  if (isValidUserId && userId) {
    creditDeduction = await deductCreditsForOperation(userId, 'TEXT_TO_SPEECH');
    if (!creditDeduction.ok) return creditDeduction.response;
  }

  // Create a job in the database to track this request
  let job = null;
  const webhookUrl = getWebhookUrl('modelslab');

  if (useWebhook) {
    try {
      job = await prisma.generationJob.create({
        data: {
          userId: isValidUserId ? userId : null,
          provider: JobProvider.MODELSLAB,
          jobType: JobType.TEXT_TO_SPEECH,
          status: JobStatus.PENDING,
          requestData: {
            prompt,
            voice_id: voiceId,
            language: typeof language === 'string' ? language : null,
            speed: speedNumber ?? null,
            emotion: parseBoolean(body.emotion) ?? null,
          },
        },
      });
    } catch (error) {
      console.error('Failed to create job:', error);
      // Continue without job tracking if DB fails
    }
  }

  // Build the ModelsLab request payload
  const payload: ModelslabTextToSpeechRequest = {
    prompt,
    voice_id: voiceId,
    language: typeof language === 'string' ? language : undefined,
    speed: speedNumber,
    emotion: parseBoolean(body.emotion),
    temp: parseBoolean(body.temp),
    // Use webhook if we have a URL and created a job successfully
    webhook: job && webhookUrl ? webhookUrl : undefined,
    track_id: job?.trackId,
  };

  try {
    const data = await modelslabTextToSpeech(payload, apiKey);

    // Update the job with the external ID and initial status
    if (job) {
      const now = new Date();
      const isComplete = data.status === 'success';
      const isFailed = data.status === 'error';

      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          externalId: data.id?.toString() ?? null,
          status: isComplete
            ? JobStatus.COMPLETED
            : isFailed
              ? JobStatus.FAILED
              : JobStatus.PROCESSING,
          responseData: data as object,
          resultUrl: data.output?.[0] || data.proxy_links?.[0] || null,
          errorMessage: isFailed ? data.message : null,
          eta: data.eta ?? null,
          startedAt: now,
          completedAt: isComplete || isFailed ? now : null,
          requestData: {
            prompt,
            voice_id: voiceId,
            language: typeof language === 'string' ? language : null,
            speed: speedNumber ?? null,
            emotion: parseBoolean(body.emotion) ?? null,
            apiKeyUsed: apiKey,
          },
        },
      });
    }

    // Return response with job tracking info
    return NextResponse.json(
      {
        ...data,
        // Include job info for client-side tracking
        job: job
          ? {
              id: job.id,
              trackId: job.trackId,
              webhookEnabled: !!webhookUrl,
            }
          : null,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    if (isValidUserId && userId) refundCredits(userId, creditDeduction.creditsDeducted).catch(() => {});
    // Update job status to failed
    if (job) {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          errorMessage: getErrorMessage(error, 'Text-to-speech request failed'),
          completedAt: new Date(),
        },
      });
    }

    const status = getErrorStatus(error, 502);
    const message = getErrorMessage(error, 'Text-to-speech request failed');
    return NextResponse.json({ status: 'error', message, job: job ? { id: job.id, trackId: job.trackId } : null }, { status });
  }
}
