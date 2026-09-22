export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { JobProvider, JobStatus, JobType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { fetchImageEditResult, fetchVideoResult } from '@/lib/ai/modelslab';
import { modelslabFetchVoice } from '@/lib/modelslab';

type RouteParams = {
  params: Promise<{ id: string }>;
};

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractModelsLabRequestId(payload: unknown): string | null {
  if (!isRecord(payload)) return null;

  const directId = payload.id ?? payload.request_id ?? payload.requestId;
  if (typeof directId === 'string' || typeof directId === 'number') return String(directId);

  const fetchResult = typeof payload.fetch_result === 'string' ? payload.fetch_result : null;
  if (fetchResult) {
    const clean = fetchResult.split(/[?#]/)[0];
    const last = clean?.split('/').pop();
    if (last) return last;
  }

  return null;
}

function deriveModelsLabExternalId(job: {
  externalId: string | null;
  requestData: unknown;
  responseData: unknown;
}): string | null {
  if (typeof job.externalId === 'string' && job.externalId.trim()) return job.externalId.trim();

  if (isRecord(job.requestData)) {
    const requestId = job.requestData.requestId;
    if (typeof requestId === 'string' && requestId.trim()) return requestId.trim();
  }

  return extractModelsLabRequestId(job.responseData);
}

/**
 * Get a specific job by ID or trackId
 *
 * GET /api/jobs/[id]
 *
 * The [id] can be either:
 * - A UUID (job ID)
 * - A number (trackId)
 *
 * Returns the full job details including request/response data
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  let job;

  // Check if it's a UUID or a trackId (number)
  if (isValidUUID(id)) {
    job = await prisma.generationJob.findUnique({
      where: { id },
    });
  } else {
    // Try parsing as trackId
    const trackId = parseInt(id, 10);
    if (!isNaN(trackId)) {
      job = await prisma.generationJob.findUnique({
        where: { trackId },
      });
    }
  }

  if (!job) {
    return NextResponse.json(
      { success: false, message: 'Job not found' },
      { status: 404 }
    );
  }

  // Fallback: for PROCESSING ModelsLab jobs older than 30s with no webhook response,
  // try fetching from ModelsLab directly using the stored API key.
  if (
    job.status === JobStatus.PROCESSING &&
    job.provider === JobProvider.MODELSLAB &&
    (job.jobType === JobType.VIDEO_GENERATION || job.jobType === JobType.IMAGE_EDIT || job.jobType === JobType.TEXT_TO_SPEECH || job.jobType === JobType.VOICE_CLONING || job.jobType === JobType.SOUND_EFFECT || job.jobType === JobType.VOICE_COVER || job.jobType === JobType.SONG_GENERATION || job.jobType === JobType.MUSIC_GENERATION) &&
    !job.webhookReceivedAt
  ) {
    const ageMs = Date.now() - job.createdAt.getTime();
    const maxAgeMs =
      job.jobType === JobType.IMAGE_EDIT || job.jobType === JobType.TEXT_TO_SPEECH || job.jobType === JobType.VOICE_CLONING || job.jobType === JobType.SOUND_EFFECT
        ? 5 * 60 * 1000 // 5 minutes
        : 10 * 60 * 1000; // 10 minutes

    if (ageMs > 30_000) {
      const requestData = isRecord(job.requestData) ? job.requestData : null;
      const apiKeyUsed = typeof requestData?.apiKeyUsed === 'string' ? requestData.apiKeyUsed : null;
      const externalId = deriveModelsLabExternalId({
        externalId: job.externalId,
        requestData: job.requestData,
        responseData: job.responseData,
      });

      if (apiKeyUsed && externalId) {
        try {
          if (!job.externalId) {
            job = await prisma.generationJob.update({
              where: { id: job.id },
              data: { externalId },
            });
          }

          if (job.jobType === JobType.VIDEO_GENERATION) {
            const fetchResult = await fetchVideoResult(externalId, apiKeyUsed);

            if (fetchResult.status === 'success' && fetchResult.videoUrl) {
              // Video is ready — update job to COMPLETED
              const now = new Date();
              job = await prisma.generationJob.update({
                where: { id: job.id },
                data: {
                  status: JobStatus.COMPLETED,
                  resultUrl: fetchResult.videoUrl,
                  completedAt: now,
                },
              });
              console.log(`[Jobs] Completed video job ${job.id} via fallback fetch`);
            } else if (ageMs > maxAgeMs) {
              // Timed out after 10 minutes — mark as failed
              job = await prisma.generationJob.update({
                where: { id: job.id },
                data: {
                  status: JobStatus.FAILED,
                  errorMessage: 'Video generation timed out after 10 minutes',
                  completedAt: new Date(),
                },
              });
            }
          } else if (job.jobType === JobType.IMAGE_EDIT) {
            const fetchResult = await fetchImageEditResult(externalId, apiKeyUsed);

            if (fetchResult.status === 'success' && fetchResult.imageUrl) {
              // Image is ready — update job to COMPLETED
              const now = new Date();
              job = await prisma.generationJob.update({
                where: { id: job.id },
                data: {
                  status: JobStatus.COMPLETED,
                  resultUrl: fetchResult.imageUrl,
                  completedAt: now,
                },
              });
              console.log(`[Jobs] Completed image edit job ${job.id} via fallback fetch`);
            } else if (ageMs > maxAgeMs) {
              // Timed out — mark as failed
              job = await prisma.generationJob.update({
                where: { id: job.id },
                data: {
                  status: JobStatus.FAILED,
                  errorMessage: 'Image edit timed out after 5 minutes',
                  completedAt: new Date(),
                },
              });
            }
          } else if (job.jobType === JobType.TEXT_TO_SPEECH) {
            const fetchResult = await modelslabFetchVoice(externalId, apiKeyUsed);
            const audioUrl = fetchResult.output?.[0] || fetchResult.proxy_links?.[0] || null;

            if (fetchResult.status === 'success' && audioUrl) {
              // Audio is ready — update job to COMPLETED
              const now = new Date();
              job = await prisma.generationJob.update({
                where: { id: job.id },
                data: {
                  status: JobStatus.COMPLETED,
                  resultUrl: audioUrl,
                  completedAt: now,
                },
              });
              console.log(`[Jobs] Completed TTS job ${job.id} via fallback fetch`);
            } else if (ageMs > maxAgeMs) {
              // Timed out after 5 minutes — mark as failed
              job = await prisma.generationJob.update({
                where: { id: job.id },
                data: {
                  status: JobStatus.FAILED,
                  errorMessage: 'Text-to-speech timed out after 5 minutes',
                  completedAt: new Date(),
                },
              });
            }
          } else if (job.jobType === JobType.VOICE_CLONING) {
            const fetchResult = await modelslabFetchVoice(externalId, apiKeyUsed);
            const audioUrl = fetchResult.output?.[0] || fetchResult.proxy_links?.[0] || null;

            if (fetchResult.status === 'success' && audioUrl) {
              const now = new Date();
              job = await prisma.generationJob.update({
                where: { id: job.id },
                data: {
                  status: JobStatus.COMPLETED,
                  resultUrl: audioUrl,
                  completedAt: now,
                },
              });
              console.log(`[Jobs] Completed voice cloning job ${job.id} via fallback fetch`);
            } else if (ageMs > maxAgeMs) {
              job = await prisma.generationJob.update({
                where: { id: job.id },
                data: {
                  status: JobStatus.FAILED,
                  errorMessage: 'Voice cloning timed out after 5 minutes',
                  completedAt: new Date(),
                },
              });
            }
          } else if (job.jobType === JobType.SOUND_EFFECT) {
            const fetchResult = await modelslabFetchVoice(externalId, apiKeyUsed);
            const audioUrl = fetchResult.output?.[0] || fetchResult.proxy_links?.[0] || null;

            if (fetchResult.status === 'success' && audioUrl) {
              const now = new Date();
              job = await prisma.generationJob.update({
                where: { id: job.id },
                data: {
                  status: JobStatus.COMPLETED,
                  resultUrl: audioUrl,
                  completedAt: now,
                },
              });
              console.log(`[Jobs] Completed SFX job ${job.id} via fallback fetch`);
            } else if (ageMs > maxAgeMs) {
              job = await prisma.generationJob.update({
                where: { id: job.id },
                data: {
                  status: JobStatus.FAILED,
                  errorMessage: 'Sound effect timed out after 5 minutes',
                  completedAt: new Date(),
                },
              });
            }
          } else if (job.jobType === JobType.VOICE_COVER) {
            const fetchResult = await modelslabFetchVoice(externalId, apiKeyUsed);
            const audioUrl = fetchResult.output?.[0] || fetchResult.proxy_links?.[0] || null;

            if (fetchResult.status === 'success' && audioUrl) {
              const now = new Date();
              job = await prisma.generationJob.update({
                where: { id: job.id },
                data: {
                  status: JobStatus.COMPLETED,
                  resultUrl: audioUrl,
                  completedAt: now,
                },
              });
              console.log(`[Jobs] Completed voice cover job ${job.id} via fallback fetch`);
            } else if (ageMs > maxAgeMs) {
              job = await prisma.generationJob.update({
                where: { id: job.id },
                data: {
                  status: JobStatus.FAILED,
                  errorMessage: 'Voice cover timed out after 10 minutes',
                  completedAt: new Date(),
                },
              });
            }
          } else if (job.jobType === JobType.SONG_GENERATION || job.jobType === JobType.MUSIC_GENERATION) {
            const fetchResult = await modelslabFetchVoice(externalId, apiKeyUsed);
            const audioUrl = fetchResult.output?.[0] || fetchResult.proxy_links?.[0] || null;

            if (fetchResult.status === 'success' && audioUrl) {
              const now = new Date();
              job = await prisma.generationJob.update({
                where: { id: job.id },
                data: {
                  status: JobStatus.COMPLETED,
                  resultUrl: audioUrl,
                  completedAt: now,
                },
              });
              console.log(`[Jobs] Completed ${job.jobType === JobType.SONG_GENERATION ? 'song generation' : 'music generation'} job ${job.id} via fallback fetch`);
            } else if (ageMs > maxAgeMs) {
              job = await prisma.generationJob.update({
                where: { id: job.id },
                data: {
                  status: JobStatus.FAILED,
                  errorMessage: `${job.jobType === JobType.SONG_GENERATION ? 'Song' : 'Music'} generation timed out after 10 minutes`,
                  completedAt: new Date(),
                },
              });
            }
          }
          // Otherwise still processing — return current status
        } catch (error) {
          console.error(`[Jobs] Fallback fetch failed for job ${job.id}:`, error);
          // If timed out, mark as failed even if fetch errored
          if (ageMs > maxAgeMs) {
            job = await prisma.generationJob.update({
              where: { id: job.id },
              data: {
                status: JobStatus.FAILED,
                errorMessage:
                  job.jobType === JobType.IMAGE_EDIT
                    ? 'Image edit timed out after 5 minutes'
                    : job.jobType === JobType.TEXT_TO_SPEECH
                      ? 'Text-to-speech timed out after 5 minutes'
                      : job.jobType === JobType.VOICE_CLONING
                        ? 'Voice cloning timed out after 5 minutes'
                        : job.jobType === JobType.SOUND_EFFECT
                          ? 'Sound effect timed out after 5 minutes'
                          : job.jobType === JobType.VOICE_COVER
                            ? 'Voice cover timed out after 10 minutes'
                            : job.jobType === JobType.VIDEO_GENERATION
                              ? 'Video generation timed out after 10 minutes'
                              : 'Generation timed out after 10 minutes',
                completedAt: new Date(),
              },
            });
          }
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    job: {
      id: job.id,
      trackId: job.trackId,
      userId: job.userId,
      provider: job.provider,
      jobType: job.jobType,
      status: job.status,
      externalId: job.externalId,
      requestData: job.requestData,
      responseData: job.responseData,
      resultUrl: job.resultUrl,
      errorMessage: job.errorMessage,
      errorCode: job.errorCode,
      progress: job.progress,
      eta: job.eta,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
      webhookReceivedAt: job.webhookReceivedAt?.toISOString() ?? null,
    },
  });
}

/**
 * Update a job (for manual status updates, cancellation, etc.)
 *
 * PATCH /api/jobs/[id]
 * Body: {
 *   status?: string,         // New status
 *   externalId?: string,     // Provider's job ID (set after initial request)
 *   responseData?: object,   // Response data from provider
 *   resultUrl?: string,      // Direct URL to result
 *   errorMessage?: string,   // Error message if failed
 * }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  // Find the job first
  let job;
  if (isValidUUID(id)) {
    job = await prisma.generationJob.findUnique({
      where: { id },
    });
  } else {
    const trackId = parseInt(id, 10);
    if (!isNaN(trackId)) {
      job = await prisma.generationJob.findUnique({
        where: { trackId },
      });
    }
  }

  if (!job) {
    return NextResponse.json(
      { success: false, message: 'Job not found' },
      { status: 404 }
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { success: false, message: 'Invalid request body' },
      { status: 400 }
    );
  }

  // Build update data
  const updateData: {
    status?: JobStatus;
    externalId?: string;
    responseData?: object;
    resultUrl?: string;
    errorMessage?: string;
    progress?: number;
    eta?: number;
    startedAt?: Date;
    completedAt?: Date;
  } = {};

  // Validate and set status
  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !(body.status in JobStatus)) {
      return NextResponse.json(
        { success: false, message: `Invalid status. Must be one of: ${Object.keys(JobStatus).join(', ')}` },
        { status: 400 }
      );
    }
    updateData.status = body.status as JobStatus;

    // Set timestamps based on status
    const now = new Date();
    if (body.status === 'PROCESSING' && !job.startedAt) {
      updateData.startedAt = now;
    }
    if ((body.status === 'COMPLETED' || body.status === 'FAILED') && !job.completedAt) {
      updateData.completedAt = now;
    }
  }

  if (typeof body.externalId === 'string') {
    updateData.externalId = body.externalId;
  }

  if (isRecord(body.responseData)) {
    updateData.responseData = body.responseData as object;
  }

  if (typeof body.resultUrl === 'string') {
    updateData.resultUrl = body.resultUrl;
  }

  if (typeof body.errorMessage === 'string') {
    updateData.errorMessage = body.errorMessage;
  }

  if (typeof body.progress === 'number' && body.progress >= 0 && body.progress <= 100) {
    updateData.progress = Math.round(body.progress);
  }

  if (typeof body.eta === 'number' && body.eta >= 0) {
    updateData.eta = Math.round(body.eta);
  }

  // Update the job
  try {
    const updatedJob = await prisma.generationJob.update({
      where: { id: job.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      job: {
        id: updatedJob.id,
        trackId: updatedJob.trackId,
        status: updatedJob.status,
        externalId: updatedJob.externalId,
        resultUrl: updatedJob.resultUrl,
        errorMessage: updatedJob.errorMessage,
        progress: updatedJob.progress,
        eta: updatedJob.eta,
        updatedAt: updatedJob.updatedAt.toISOString(),
        completedAt: updatedJob.completedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error('Failed to update job:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update job' },
      { status: 500 }
    );
  }
}
