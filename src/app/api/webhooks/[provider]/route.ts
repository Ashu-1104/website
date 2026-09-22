export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { JobStatus, JobType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getNormalizer, getJobProvider } from '@/lib/webhooks/normalizers';
import { jobEvents } from '@/lib/webhooks/events';
import { fetchImageEditResult, fetchVideoResult } from '@/lib/ai/modelslab';
import { modelslabFetchVoice } from '@/lib/modelslab';
import type { JobUpdateEvent } from '@/lib/webhooks/types';

type RouteParams = {
  params: Promise<{ provider: string }>;
};

/**
 * Webhook handler for receiving callbacks from AI service providers
 *
 * URL format: POST /api/webhooks/[provider]
 * Example: POST /api/webhooks/modelslab
 *
 * The handler:
 * 1. Validates the provider
 * 2. Parses and normalizes the webhook payload
 * 3. Finds the corresponding job in the database (by trackId or externalId)
 * 4. Updates the job status
 * 5. Emits an event for SSE subscribers
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { provider } = await params;

  // Validate provider
  const jobProvider = getJobProvider(provider);
  if (!jobProvider) {
    return NextResponse.json(
      { success: false, message: `Unknown provider: ${provider}` },
      { status: 400 }
    );
  }

  // Get the normalizer for this provider
  const normalizer = getNormalizer(provider);
  if (!normalizer) {
    return NextResponse.json(
      { success: false, message: `No webhook handler for provider: ${provider}` },
      { status: 400 }
    );
  }

  // Parse the webhook payload
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  // Log the raw payload for debugging
  console.log(`[Webhook] Received from ${provider}:`, JSON.stringify(payload, null, 2));

  // Normalize the payload
  const normalized = normalizer(payload);
  if (!normalized) {
    console.error(`[Webhook] Failed to normalize payload from ${provider}`);
    return NextResponse.json(
      { success: false, message: 'Could not parse webhook payload' },
      { status: 400 }
    );
  }

  // Find the job in the database
  // First try by trackId (most reliable), then by externalId
  let job = null;

  if (normalized.trackId !== undefined) {
    job = await prisma.generationJob.findUnique({
      where: { trackId: normalized.trackId },
    });
  }

  if (!job && normalized.externalId) {
    job = await prisma.generationJob.findFirst({
      where: {
        provider: jobProvider,
        externalId: normalized.externalId,
      },
    });
  }

  if (!job) {
    console.warn(`[Webhook] No job found for trackId=${normalized.trackId}, externalId=${normalized.externalId}`);
    // Return 200 to prevent retries from the provider
    return NextResponse.json({
      success: false,
      message: 'Job not found',
    });
  }

  // Update the job in the database
  const now = new Date();
  const isCompleted = normalized.status === JobStatus.COMPLETED || normalized.status === JobStatus.FAILED;

  const updatedJob = await prisma.generationJob.update({
    where: { id: job.id },
    data: {
      status: normalized.status,
      resultUrl: normalized.resultUrl || job.resultUrl,
      errorMessage: normalized.errorMessage,
      errorCode: normalized.errorCode,
      progress: normalized.progress,
      eta: normalized.eta,
      webhookReceivedAt: now,
      webhookPayload: normalized.rawPayload as object,
      completedAt: isCompleted ? now : job.completedAt,
      startedAt: job.startedAt || (normalized.status === JobStatus.PROCESSING ? now : null),
    },
  });

  console.log(`[Webhook] Updated job ${job.id} to status ${normalized.status}`);

  // For completed VIDEO_GENERATION jobs, fetch the video if no resultUrl from webhook
  let finalResultUrl = updatedJob.resultUrl;

  if (
    updatedJob.status === JobStatus.COMPLETED &&
    updatedJob.jobType === JobType.VIDEO_GENERATION &&
    !updatedJob.resultUrl
  ) {
    const requestData = job.requestData as Record<string, unknown> | null;
    const apiKeyUsed = typeof requestData?.apiKeyUsed === 'string' ? requestData.apiKeyUsed : null;
    const externalId = updatedJob.externalId || normalized.externalId;

    if (apiKeyUsed && externalId) {
      console.log(`[Webhook] Fetching video result for job ${job.id} with externalId=${externalId}`);
      try {
        const fetchResult = await fetchVideoResult(externalId, apiKeyUsed);
        if (fetchResult.status === 'success' && fetchResult.videoUrl) {
          finalResultUrl = fetchResult.videoUrl;
          await prisma.generationJob.update({
            where: { id: updatedJob.id },
            data: { resultUrl: finalResultUrl },
          });
          console.log(`[Webhook] Fetched video URL for job ${job.id}: ${finalResultUrl}`);
        } else {
          console.warn(`[Webhook] Video fetch returned status=${fetchResult.status} for job ${job.id}`);
        }
      } catch (fetchError) {
        console.error(`[Webhook] Failed to fetch video for job ${job.id}:`, fetchError);
      }
    } else {
      console.warn(`[Webhook] Cannot fetch video for job ${job.id}: missing apiKeyUsed or externalId`);
    }
  }

  // For completed IMAGE_EDIT jobs, fetch the image if no resultUrl from webhook
  if (
    updatedJob.status === JobStatus.COMPLETED &&
    updatedJob.jobType === JobType.IMAGE_EDIT &&
    !updatedJob.resultUrl
  ) {
    const requestData = job.requestData as Record<string, unknown> | null;
    const apiKeyUsed = typeof requestData?.apiKeyUsed === 'string' ? requestData.apiKeyUsed : null;
    const externalId = updatedJob.externalId || normalized.externalId;

    if (apiKeyUsed && externalId) {
      console.log(`[Webhook] Fetching image edit result for job ${job.id} with externalId=${externalId}`);
      try {
        const fetchResult = await fetchImageEditResult(externalId, apiKeyUsed);
        if (fetchResult.status === 'success' && fetchResult.imageUrl) {
          finalResultUrl = fetchResult.imageUrl;
          await prisma.generationJob.update({
            where: { id: updatedJob.id },
            data: { resultUrl: finalResultUrl },
          });
          console.log(`[Webhook] Fetched image URL for job ${job.id}: ${finalResultUrl}`);
        } else {
          console.warn(`[Webhook] Image edit fetch returned status=${fetchResult.status} for job ${job.id}`);
        }
      } catch (fetchError) {
        console.error(`[Webhook] Failed to fetch image edit result for job ${job.id}:`, fetchError);
      }
    } else {
      console.warn(`[Webhook] Cannot fetch image edit result for job ${job.id}: missing apiKeyUsed or externalId`);
    }
  }

  // For completed TEXT_TO_SPEECH jobs, fetch the audio if no resultUrl from webhook
  if (
    updatedJob.status === JobStatus.COMPLETED &&
    updatedJob.jobType === JobType.TEXT_TO_SPEECH &&
    !updatedJob.resultUrl
  ) {
    const requestData = job.requestData as Record<string, unknown> | null;
    const apiKeyUsed = typeof requestData?.apiKeyUsed === 'string' ? requestData.apiKeyUsed : null;
    const externalId = updatedJob.externalId || normalized.externalId;

    if (apiKeyUsed && externalId) {
      console.log(`[Webhook] Fetching TTS result for job ${job.id} with externalId=${externalId}`);
      try {
        const fetchResult = await modelslabFetchVoice(externalId, apiKeyUsed);
        const audioUrl = fetchResult.output?.[0] || fetchResult.proxy_links?.[0] || null;
        if (fetchResult.status === 'success' && audioUrl) {
          finalResultUrl = audioUrl;
          await prisma.generationJob.update({
            where: { id: updatedJob.id },
            data: { resultUrl: finalResultUrl },
          });
          console.log(`[Webhook] Fetched audio URL for job ${job.id}: ${finalResultUrl}`);
        } else {
          console.warn(`[Webhook] TTS fetch returned status=${fetchResult.status} for job ${job.id}`);
        }
      } catch (fetchError) {
        console.error(`[Webhook] Failed to fetch TTS result for job ${job.id}:`, fetchError);
      }
    } else {
      console.warn(`[Webhook] Cannot fetch TTS result for job ${job.id}: missing apiKeyUsed or externalId`);
    }
  }

  // For completed VOICE_CLONING jobs, fetch the audio if no resultUrl from webhook
  if (
    updatedJob.status === JobStatus.COMPLETED &&
    updatedJob.jobType === JobType.VOICE_CLONING &&
    !updatedJob.resultUrl
  ) {
    const requestData = job.requestData as Record<string, unknown> | null;
    const apiKeyUsed = typeof requestData?.apiKeyUsed === 'string' ? requestData.apiKeyUsed : null;
    const externalId = updatedJob.externalId || normalized.externalId;

    if (apiKeyUsed && externalId) {
      console.log(`[Webhook] Fetching voice cloning result for job ${job.id} with externalId=${externalId}`);
      try {
        const fetchResult = await modelslabFetchVoice(externalId, apiKeyUsed);
        const audioUrl = fetchResult.output?.[0] || fetchResult.proxy_links?.[0] || null;
        if (fetchResult.status === 'success' && audioUrl) {
          finalResultUrl = audioUrl;
          await prisma.generationJob.update({
            where: { id: updatedJob.id },
            data: { resultUrl: finalResultUrl },
          });
          console.log(`[Webhook] Fetched voice cloning audio URL for job ${job.id}: ${finalResultUrl}`);
        } else {
          console.warn(`[Webhook] Voice cloning fetch returned status=${fetchResult.status} for job ${job.id}`);
        }
      } catch (fetchError) {
        console.error(`[Webhook] Failed to fetch voice cloning result for job ${job.id}:`, fetchError);
      }
    } else {
      console.warn(`[Webhook] Cannot fetch voice cloning result for job ${job.id}: missing apiKeyUsed or externalId`);
    }
  }

  // For completed SOUND_EFFECT jobs, fetch the audio if no resultUrl from webhook
  if (
    updatedJob.status === JobStatus.COMPLETED &&
    updatedJob.jobType === JobType.SOUND_EFFECT &&
    !updatedJob.resultUrl
  ) {
    const requestData = job.requestData as Record<string, unknown> | null;
    const apiKeyUsed = typeof requestData?.apiKeyUsed === 'string' ? requestData.apiKeyUsed : null;
    const externalId = updatedJob.externalId || normalized.externalId;

    if (apiKeyUsed && externalId) {
      console.log(`[Webhook] Fetching SFX result for job ${job.id} with externalId=${externalId}`);
      try {
        const fetchResult = await modelslabFetchVoice(externalId, apiKeyUsed);
        const audioUrl = fetchResult.output?.[0] || fetchResult.proxy_links?.[0] || null;
        if (fetchResult.status === 'success' && audioUrl) {
          finalResultUrl = audioUrl;
          await prisma.generationJob.update({
            where: { id: updatedJob.id },
            data: { resultUrl: finalResultUrl },
          });
          console.log(`[Webhook] Fetched SFX audio URL for job ${job.id}: ${finalResultUrl}`);
        } else {
          console.warn(`[Webhook] SFX fetch returned status=${fetchResult.status} for job ${job.id}`);
        }
      } catch (fetchError) {
        console.error(`[Webhook] Failed to fetch SFX result for job ${job.id}:`, fetchError);
      }
    } else {
      console.warn(`[Webhook] Cannot fetch SFX result for job ${job.id}: missing apiKeyUsed or externalId`);
    }
  }

  // For completed VOICE_COVER jobs, fetch the audio if no resultUrl from webhook
  if (
    updatedJob.status === JobStatus.COMPLETED &&
    updatedJob.jobType === JobType.VOICE_COVER &&
    !updatedJob.resultUrl
  ) {
    const requestData = job.requestData as Record<string, unknown> | null;
    const apiKeyUsed = typeof requestData?.apiKeyUsed === 'string' ? requestData.apiKeyUsed : null;
    const externalId = updatedJob.externalId || normalized.externalId;

    if (apiKeyUsed && externalId) {
      console.log(`[Webhook] Fetching voice cover result for job ${job.id} with externalId=${externalId}`);
      try {
        const fetchResult = await modelslabFetchVoice(externalId, apiKeyUsed);
        const audioUrl = fetchResult.output?.[0] || fetchResult.proxy_links?.[0] || null;
        if (fetchResult.status === 'success' && audioUrl) {
          finalResultUrl = audioUrl;
          await prisma.generationJob.update({
            where: { id: updatedJob.id },
            data: { resultUrl: finalResultUrl },
          });
          console.log(`[Webhook] Fetched voice cover audio URL for job ${job.id}: ${finalResultUrl}`);
        } else {
          console.warn(`[Webhook] Voice cover fetch returned status=${fetchResult.status} for job ${job.id}`);
        }
      } catch (fetchError) {
        console.error(`[Webhook] Failed to fetch voice cover result for job ${job.id}:`, fetchError);
      }
    } else {
      console.warn(`[Webhook] Cannot fetch voice cover result for job ${job.id}: missing apiKeyUsed or externalId`);
    }
  }

  // For completed SONG_GENERATION jobs, fetch the audio if no resultUrl from webhook
  if (
    updatedJob.status === JobStatus.COMPLETED &&
    updatedJob.jobType === JobType.SONG_GENERATION &&
    !updatedJob.resultUrl
  ) {
    const requestData = job.requestData as Record<string, unknown> | null;
    const apiKeyUsed = typeof requestData?.apiKeyUsed === 'string' ? requestData.apiKeyUsed : null;
    const externalId = updatedJob.externalId || normalized.externalId;

    if (apiKeyUsed && externalId) {
      console.log(`[Webhook] Fetching song generation result for job ${job.id} with externalId=${externalId}`);
      try {
        const fetchResult = await modelslabFetchVoice(externalId, apiKeyUsed);
        const audioUrl = fetchResult.output?.[0] || fetchResult.proxy_links?.[0] || null;
        if (fetchResult.status === 'success' && audioUrl) {
          finalResultUrl = audioUrl;
          await prisma.generationJob.update({
            where: { id: updatedJob.id },
            data: { resultUrl: finalResultUrl },
          });
          console.log(`[Webhook] Fetched song generation audio URL for job ${job.id}: ${finalResultUrl}`);
        } else {
          console.warn(`[Webhook] Song generation fetch returned status=${fetchResult.status} for job ${job.id}`);
        }
      } catch (fetchError) {
        console.error(`[Webhook] Failed to fetch song generation result for job ${job.id}:`, fetchError);
      }
    } else {
      console.warn(`[Webhook] Cannot fetch song generation result for job ${job.id}: missing apiKeyUsed or externalId`);
    }
  }

  // For completed MUSIC_GENERATION jobs, fetch the audio if no resultUrl from webhook
  if (
    updatedJob.status === JobStatus.COMPLETED &&
    updatedJob.jobType === JobType.MUSIC_GENERATION &&
    !updatedJob.resultUrl
  ) {
    const requestData = job.requestData as Record<string, unknown> | null;
    const apiKeyUsed = typeof requestData?.apiKeyUsed === 'string' ? requestData.apiKeyUsed : null;
    const externalId = updatedJob.externalId || normalized.externalId;

    if (apiKeyUsed && externalId) {
      console.log(`[Webhook] Fetching music generation result for job ${job.id} with externalId=${externalId}`);
      try {
        const fetchResult = await modelslabFetchVoice(externalId, apiKeyUsed);
        const audioUrl = fetchResult.output?.[0] || fetchResult.proxy_links?.[0] || null;
        if (fetchResult.status === 'success' && audioUrl) {
          finalResultUrl = audioUrl;
          await prisma.generationJob.update({
            where: { id: updatedJob.id },
            data: { resultUrl: finalResultUrl },
          });
          console.log(`[Webhook] Fetched music generation audio URL for job ${job.id}: ${finalResultUrl}`);
        } else {
          console.warn(`[Webhook] Music generation fetch returned status=${fetchResult.status} for job ${job.id}`);
        }
      } catch (fetchError) {
        console.error(`[Webhook] Failed to fetch music generation result for job ${job.id}:`, fetchError);
      }
    } else {
      console.warn(`[Webhook] Cannot fetch music generation result for job ${job.id}: missing apiKeyUsed or externalId`);
    }
  }

  // Emit event for SSE subscribers
  const event: JobUpdateEvent = {
    type: 'job_update',
    jobId: updatedJob.id,
    trackId: updatedJob.trackId,
    status: updatedJob.status,
    progress: updatedJob.progress ?? undefined,
    eta: updatedJob.eta ?? undefined,
    resultUrl: finalResultUrl ?? undefined,
    errorMessage: updatedJob.errorMessage ?? undefined,
    completedAt: updatedJob.completedAt?.toISOString(),
  };

  jobEvents.emit(event);

  return NextResponse.json({
    success: true,
    jobId: updatedJob.id,
    message: `Job updated to ${normalized.status}`,
  });
}

/**
 * GET handler for webhook verification (some providers require this)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { provider } = await params;
  const searchParams = request.nextUrl.searchParams;

  // Handle verification challenges from different providers
  // Example: Some providers send a challenge that needs to be echoed back

  const challenge = searchParams.get('challenge') || searchParams.get('hub.challenge');
  if (challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // Default response for webhook endpoint discovery
  return NextResponse.json({
    provider,
    status: 'active',
    message: `Webhook endpoint for ${provider} is active`,
  });
}
