export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { JobProvider, JobStatus, JobType } from '@prisma/client';
import { prisma } from '@/lib/db';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Create a new generation job
 *
 * POST /api/jobs
 * Body: {
 *   userId?: string,          // Optional user ID (UUID)
 *   provider: string,         // Provider name (e.g., "MODELSLAB")
 *   jobType: string,          // Job type (e.g., "TEXT_TO_SPEECH")
 *   externalId?: string,      // Provider's job ID
 *   requestData?: object,     // Original request payload
 * }
 *
 * Returns: { success: true, job: { id, trackId, ... } }
 */
export async function POST(request: NextRequest) {
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

  // Validate provider
  const providerStr = body.provider;
  if (typeof providerStr !== 'string' || !(providerStr in JobProvider)) {
    return NextResponse.json(
      { success: false, message: `Invalid provider. Must be one of: ${Object.keys(JobProvider).join(', ')}` },
      { status: 400 }
    );
  }
  const provider = providerStr as JobProvider;

  // Validate jobType
  const jobTypeStr = body.jobType;
  if (typeof jobTypeStr !== 'string' || !(jobTypeStr in JobType)) {
    return NextResponse.json(
      { success: false, message: `Invalid jobType. Must be one of: ${Object.keys(JobType).join(', ')}` },
      { status: 400 }
    );
  }
  const jobType = jobTypeStr as JobType;

  // Validate optional userId
  const userId = body.userId;
  if (userId !== undefined && (typeof userId !== 'string' || !isValidUUID(userId))) {
    return NextResponse.json(
      { success: false, message: 'userId must be a valid UUID' },
      { status: 400 }
    );
  }

  // Create the job
  try {
    const job = await prisma.generationJob.create({
      data: {
        userId: userId || null,
        provider,
        jobType,
        status: JobStatus.PENDING,
        externalId: typeof body.externalId === 'string' ? body.externalId : null,
        requestData: isRecord(body.requestData) ? (body.requestData as object) : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        trackId: job.trackId,
        provider: job.provider,
        jobType: job.jobType,
        status: job.status,
        externalId: job.externalId,
        createdAt: job.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to create job:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create job' },
      { status: 500 }
    );
  }
}

/**
 * List generation jobs with optional filters
 *
 * GET /api/jobs
 * Query params:
 *   - userId: Filter by user ID
 *   - status: Filter by status (PENDING, PROCESSING, COMPLETED, FAILED)
 *   - provider: Filter by provider
 *   - jobType: Filter by job type
 *   - limit: Max results (default 20, max 100)
 *   - cursor: Pagination cursor (job ID)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Parse filters
  const userId = searchParams.get('userId');
  const status = searchParams.get('status');
  const provider = searchParams.get('provider');
  const jobType = searchParams.get('jobType');
  const limitStr = searchParams.get('limit');
  const cursor = searchParams.get('cursor');

  // Validate limit
  let limit = 20;
  if (limitStr) {
    const parsed = parseInt(limitStr, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      limit = parsed;
    }
  }

  // Build where clause
  const where: {
    userId?: string;
    status?: JobStatus;
    provider?: JobProvider;
    jobType?: JobType;
  } = {};

  if (userId && isValidUUID(userId)) {
    where.userId = userId;
  }

  if (status && status in JobStatus) {
    where.status = status as JobStatus;
  }

  if (provider && provider in JobProvider) {
    where.provider = provider as JobProvider;
  }

  if (jobType && jobType in JobType) {
    where.jobType = jobType as JobType;
  }

  try {
    const jobs = await prisma.generationJob.findMany({
      where,
      take: limit + 1, // Get one extra to check if there are more
      orderBy: { createdAt: 'desc' },
      ...(cursor && isValidUUID(cursor)
        ? {
            cursor: { id: cursor },
            skip: 1, // Skip the cursor item
          }
        : {}),
      select: {
        id: true,
        trackId: true,
        userId: true,
        provider: true,
        jobType: true,
        status: true,
        externalId: true,
        resultUrl: true,
        errorMessage: true,
        progress: true,
        eta: true,
        createdAt: true,
        completedAt: true,
      },
    });

    const hasMore = jobs.length > limit;
    const items = hasMore ? jobs.slice(0, limit) : jobs;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return NextResponse.json({
      success: true,
      jobs: items.map((job) => ({
        ...job,
        createdAt: job.createdAt.toISOString(),
        completedAt: job.completedAt?.toISOString() ?? null,
      })),
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('Failed to list jobs:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to list jobs' },
      { status: 500 }
    );
  }
}
