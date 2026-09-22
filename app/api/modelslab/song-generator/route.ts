export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { JobProvider, JobStatus, JobType } from '@prisma/client';
import {
  getModelslabApiKey,
  modelslabBase64ToUrl,
  modelslabSongGenerator,
  type ModelslabSongGeneratorRequest,
  type ModelslabTextToSpeechResponse,
} from '@/lib/modelslab';
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

function pickPrimaryAudioUrl(response: ModelslabTextToSpeechResponse | null): string | null {
  if (!response) return null;
  const candidates: unknown = response.output ?? response.proxy_links ?? response.links ?? response.future_links;
  if (typeof candidates === 'string' && candidates.length > 0) return candidates;
  if (!Array.isArray(candidates)) return null;
  return candidates.find((value) => typeof value === 'string' && value.length > 0) ?? null;
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

  const lyricsGeneration = parseBoolean(body.lyrics_generation);
  const lyrics = body.lyrics;
  const prompt = body.prompt;
  const caption = body.caption;
  const duration = typeof body.duration === 'number' ? Math.min(body.duration, 180) : 180;

  // Handle optional init_audio (reference audio)
  const initAudio = body.init_audio;
  const initAudioFormat = typeof body.init_audio_format === 'string' ? body.init_audio_format.trim().toLowerCase() : 'url';

  let initAudioUrl: string | undefined;
  if (isNonEmptyString(initAudio)) {
    if (initAudioFormat === 'base64') {
      try {
        const uploaded = await modelslabBase64ToUrl({ init_audio: stripDataUrlPrefix(initAudio as string) }, apiKey);
        const uploadedUrl = pickPrimaryAudioUrl(uploaded);
        if (!uploadedUrl) {
          return NextResponse.json(
            { status: 'error', message: 'Failed to upload reference audio' },
            { status: 502 }
          );
        }
        initAudioUrl = uploadedUrl;
      } catch (error) {
        const status = getErrorStatus(error, 502);
        const message = getErrorMessage(error, 'Failed to upload reference audio');
        return NextResponse.json({ status: 'error', message }, { status });
      }
    } else {
      initAudioUrl = (initAudio as string).trim();
    }
  }

  // If lyrics_generation is false, lyrics must be provided in LRC format
  if (lyricsGeneration === false && !isNonEmptyString(lyrics)) {
    return NextResponse.json(
      { status: 'error', message: 'lyrics is required when lyrics_generation is false (must be in LRC format)' },
      { status: 400 }
    );
  }

  // If lyrics_generation is true, prompt should be provided
  if (lyricsGeneration === true && !isNonEmptyString(prompt)) {
    return NextResponse.json(
      { status: 'error', message: 'prompt is required when lyrics_generation is true' },
      { status: 400 }
    );
  }

  const useWebhook = body.use_webhook !== false;

  // Get user ID from header (optional)
  const userId = request.headers.get('x-vp-user-id');
  const validUserId = userId && isValidUuid(userId) ? userId : null;

  // Deduct credits if user is identified
  let creditDeduction: DeductResult = { ok: true, creditsDeducted: 0 };
  if (validUserId) {
    creditDeduction = await deductCreditsForOperation(validUserId, 'SONG_GENERATION');
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
          jobType: JobType.SONG_GENERATION,
          status: JobStatus.PENDING,
          requestData: {
            prompt: isNonEmptyString(prompt) ? (prompt as string).trim() : null,
            lyrics_generation: lyricsGeneration ?? null,
            lyrics: isNonEmptyString(lyrics) ? (lyrics as string).trim() : null,
            caption: isNonEmptyString(caption) ? (caption as string).trim() : null,
            init_audio: initAudioUrl ?? null,
            duration,
            apiKeyUsed: apiKey,
          },
        },
      });
    } catch (error) {
      console.error('Failed to create job:', error);
    }
  }

  const payload: ModelslabSongGeneratorRequest = {
    prompt: isNonEmptyString(prompt) ? (prompt as string).trim() : undefined,
    lyrics_generation: lyricsGeneration,
    lyrics: isNonEmptyString(lyrics) ? (lyrics as string).trim() : undefined,
    caption: isNonEmptyString(caption) ? (caption as string).trim() : undefined,
    init_audio: initAudioUrl,
    duration,
    webhook: job && webhookUrl ? webhookUrl : undefined,
    track_id: job?.trackId,
  };

  try {
    const data = await modelslabSongGenerator(payload, apiKey);

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
          errorMessage: getErrorMessage(error, 'Song generator request failed'),
          completedAt: new Date(),
        },
      });
    }

    const status = getErrorStatus(error, 502);
    const message = getErrorMessage(error, 'Song generator request failed');
    return NextResponse.json(
      { status: 'error', message, job: job ? { id: job.id, trackId: job.trackId } : null },
      { status }
    );
  }
}
