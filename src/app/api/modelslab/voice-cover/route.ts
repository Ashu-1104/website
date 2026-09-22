export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { JobProvider, JobStatus, JobType } from '@prisma/client';
import {
  getModelslabApiKey,
  modelslabBase64ToUrl,
  modelslabVoiceCover,
  type ModelslabTextToSpeechResponse,
  type ModelslabVoiceCoverRequest,
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

function pickPrimaryAudioUrl(response: ModelslabTextToSpeechResponse | null): string | null {
  if (!response) return null;
  const candidates = response.output ?? response.proxy_links ?? response.links ?? response.future_links;
  return candidates?.find((value) => typeof value === 'string' && value.length > 0) ?? null;
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

  const voiceId = body.voice_id;
  const initAudio = body.init_audio;
  const initAudioFormat = body.init_audio_format;

  if (!isNonEmptyString(voiceId)) {
    return NextResponse.json({ status: 'error', message: 'voice_id is required' }, { status: 400 });
  }
  if (!isNonEmptyString(initAudio)) {
    return NextResponse.json({ status: 'error', message: 'init_audio is required' }, { status: 400 });
  }

  const normalizedFormat = typeof initAudioFormat === 'string' ? initAudioFormat.trim().toLowerCase() : 'url';
  if (normalizedFormat !== 'url' && normalizedFormat !== 'base64') {
    return NextResponse.json(
      { status: 'error', message: 'init_audio_format must be url or base64' },
      { status: 400 }
    );
  }

  const rate = parseNumber(body.rate);
  if (rate !== undefined && (rate < 0 || rate > 1)) {
    return NextResponse.json({ status: 'error', message: 'rate must be between 0 and 1' }, { status: 400 });
  }

  // Parse all optional numeric parameters with defaults
  const mix = parseNumber(body.mix) ?? 0;
  const originality = parseNumber(body.originality) ?? 0.33;
  const radius = parseNumber(body.radius) ?? 3;
  const speed = parseNumber(body.speed) ?? 1;
  const hopLength = parseNumber(body.hop_length);
  const reverbSize = parseNumber(body.reverb_size) ?? 0.15;
  const wetness = parseNumber(body.wetness) ?? 0.2;
  const dryness = parseNumber(body.dryness) ?? 0.8;
  const damping = parseNumber(body.damping) ?? 0.7;

  let initAudioUrl = initAudio.trim();
  if (normalizedFormat === 'base64') {
    try {
      const uploaded = await modelslabBase64ToUrl({ init_audio: stripDataUrlPrefix(initAudio) }, apiKey);
      const uploadedUrl = pickPrimaryAudioUrl(uploaded);
      if (!uploadedUrl) {
        return NextResponse.json(
          { status: 'error', message: 'Failed to upload init audio' },
          { status: 502 }
        );
      }
      initAudioUrl = uploadedUrl;
    } catch (error) {
      const status = getErrorStatus(error, 502);
      const message = getErrorMessage(error, 'Failed to upload init audio');
      return NextResponse.json({ status: 'error', message }, { status });
    }
  }

  const useWebhook = body.use_webhook !== false;

  // Get user ID from header (optional)
  const userId = request.headers.get('x-vp-user-id');
  const validUserId = userId && isValidUuid(userId) ? userId : null;

  // Deduct credits if user is identified
  let creditDeduction: DeductResult = { ok: true, creditsDeducted: 0 };
  if (validUserId) {
    creditDeduction = await deductCreditsForOperation(validUserId, 'VOICE_COVER');
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
          jobType: JobType.VOICE_COVER,
          status: JobStatus.PENDING,
          requestData: {
            voice_id: voiceId.trim(),
            init_audio_url: initAudioUrl,
            pitch: isNonEmptyString(body.pitch) ? body.pitch.trim() : null,
            algorithm: isNonEmptyString(body.algorithm) ? body.algorithm.trim() : null,
            rate: rate ?? null,
          },
        },
      });
    } catch (error) {
      console.error('Failed to create voice cover job:', error);
    }
  }

  const payload: ModelslabVoiceCoverRequest = {
    init_audio: initAudioUrl,
    model_id: voiceId.trim(),
    base64: false,
    temp: parseBoolean(body.temp),
    language: isNonEmptyString(body.language) ? body.language.trim() : undefined,
    pitch: isNonEmptyString(body.pitch) ? body.pitch.trim() : undefined,
    algorithm: isNonEmptyString(body.algorithm) ? body.algorithm.trim() : undefined,
    rate: rate ?? 0.75,
    mix,
    originality,
    radius,
    speed,
    hop_length: hopLength,
    emotion: isNonEmptyString(body.emotion) ? body.emotion.trim() : undefined,
    reverb_size: reverbSize,
    wetness,
    dryness,
    damping,
    lead_voice_volume_delta: isNonEmptyString(body.lead_voice_volume_delta) ? body.lead_voice_volume_delta.trim() : undefined,
    backup_voice_volume_delta: isNonEmptyString(body.backup_voice_volume_delta) ? body.backup_voice_volume_delta.trim() : undefined,
    instrument_volume_delta: isNonEmptyString(body.instrument_volume_delta) ? body.instrument_volume_delta.trim() : undefined,
    webhook: job && webhookUrl ? webhookUrl : undefined,
    track_id: job?.trackId,
  };

  try {
    const data = await modelslabVoiceCover(payload, apiKey);

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
          resultUrl: pickPrimaryAudioUrl(data),
          errorMessage: isFailed ? data.message : null,
          eta: data.eta ?? null,
          startedAt: now,
          completedAt: isComplete || isFailed ? now : null,
          requestData: {
            voice_id: voiceId.trim(),
            init_audio_url: initAudioUrl,
            pitch: isNonEmptyString(body.pitch) ? body.pitch.trim() : null,
            algorithm: isNonEmptyString(body.algorithm) ? body.algorithm.trim() : null,
            rate: rate ?? null,
            apiKeyUsed: apiKey,
          },
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
          errorMessage: getErrorMessage(error, 'Voice cover request failed'),
          completedAt: new Date(),
        },
      });
    }

    const status = getErrorStatus(error, 502);
    const message = getErrorMessage(error, 'Voice cover request failed');
    return NextResponse.json(
      { status: 'error', message, job: job ? { id: job.id, trackId: job.trackId } : null },
      { status }
    );
  }
}
