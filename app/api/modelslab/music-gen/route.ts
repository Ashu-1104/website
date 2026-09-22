export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { JobProvider, JobStatus, JobType } from '@prisma/client';
import { getModelslabApiKey, modelslabMusicGen, type ModelslabMusicGenRequest } from '@/lib/modelslab';
import { prisma } from '@/lib/db';
import { getWebhookUrl, isValidUuid } from '@/lib/webhooks/utils';
import { deductCreditsForOperation, refundCredits } from '@/lib/credits';
import type { DeductResult } from '@/lib/credits';

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

function stripDataUrlPrefix(value: string): string {
  const trimmed = value.trim();
  const marker = 'base64,';
  const index = trimmed.indexOf(marker);
  if (trimmed.startsWith('data:') && index !== -1) {
    return trimmed.slice(index + marker.length);
  }
  return trimmed;
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
  if (!isNonEmptyString(prompt)) {
    return NextResponse.json({ status: 'error', message: 'prompt is required' }, { status: 400 });
  }

  const initAudio = body.init_audio;
  const initAudioFormat = body.init_audio_format;
  const normalizedFormat = typeof initAudioFormat === 'string' ? initAudioFormat.trim().toLowerCase() : 'url';
  if (initAudio !== undefined && normalizedFormat !== 'url' && normalizedFormat !== 'base64') {
    return NextResponse.json(
      { status: 'error', message: 'init_audio_format must be url or base64' },
      { status: 400 }
    );
  }

  const samplingRate = parseNumber(body.sampling_rate);
  if (samplingRate !== undefined && samplingRate <= 0) {
    return NextResponse.json({ status: 'error', message: 'sampling_rate must be > 0' }, { status: 400 });
  }

  const maxNewToken = parseNumber(body.max_new_token);
  if (maxNewToken !== undefined && maxNewToken <= 0) {
    return NextResponse.json({ status: 'error', message: 'max_new_token must be > 0' }, { status: 400 });
  }

  const useWebhook = body.use_webhook !== false;

  // Get user ID from header (optional)
  const userId = request.headers.get('x-vp-user-id');
  const validUserId = userId && isValidUuid(userId) ? userId : null;

  // Deduct credits if user is identified
  let creditDeduction: DeductResult = { ok: true, creditsDeducted: 0 };
  if (validUserId) {
    creditDeduction = await deductCreditsForOperation(validUserId, 'MUSIC_GENERATION');
    if (!creditDeduction.ok) return creditDeduction.response;
  }

  // Create a job in the database to track this request
  const webhookUrl = getWebhookUrl('modelslab');
  let job = null;

  if (useWebhook) {
    try {
      job = await prisma.generationJob.create({
        data: {
          userId: validUserId,
          provider: JobProvider.MODELSLAB,
          jobType: JobType.MUSIC_GENERATION,
          status: JobStatus.PENDING,
          requestData: {
            prompt: prompt.trim(),
            sampling_rate: samplingRate ?? null,
            max_new_token: maxNewToken ?? null,
            apiKeyUsed: apiKey,
          },
        },
      });
    } catch (error) {
      console.error('Failed to create job:', error);
    }
  }

  const payload: ModelslabMusicGenRequest = {
    prompt: prompt.trim(),
    sampling_rate: samplingRate,
    max_new_token: maxNewToken,
    temp: parseBoolean(body.temp),
    webhook: job && webhookUrl ? webhookUrl : undefined,
    track_id: job?.trackId,
  };

  if (isNonEmptyString(initAudio)) {
    if (normalizedFormat === 'base64') {
      payload.init_audio = stripDataUrlPrefix(initAudio);
      payload.base64 = true;
    } else {
      payload.init_audio = initAudio.trim();
      payload.base64 = false;
    }
  }

  try {
    const data = await modelslabMusicGen(payload, apiKey);

    // Update job with response
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
        },
      });
    }

    return NextResponse.json(
      {
        ...data,
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
    if (validUserId) refundCredits(validUserId, creditDeduction.creditsDeducted).catch(() => {});
    if (job) {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          errorMessage: getErrorMessage(error, 'Music generation request failed'),
          completedAt: new Date(),
        },
      });
    }

    const status = getErrorStatus(error, 502);
    const message = getErrorMessage(error, 'Music generation request failed');
    return NextResponse.json(
      { status: 'error', message, job: job ? { id: job.id, trackId: job.trackId } : null },
      { status }
    );
  }
}
