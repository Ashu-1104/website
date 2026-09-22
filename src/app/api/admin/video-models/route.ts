import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AuthError, requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    throw error;
  }

  try {
    const models = await prisma.videoModel.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Failed to load video models:', error);
    return NextResponse.json({ error: 'Failed to load video models' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    throw error;
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const modelId = typeof body.modelId === 'string' ? body.modelId.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : null;
  const thumbnailUrl = typeof body.thumbnailUrl === 'string' ? body.thumbnailUrl.trim() : null;
  const resolutions = typeof body.resolutions === 'string' ? body.resolutions.trim() : '480';
  const pricingMatrix = typeof body.pricingMatrix === 'object' && body.pricingMatrix !== null
    ? (body.pricingMatrix as Prisma.InputJsonValue)
    : Prisma.DbNull;
  const supportsT2V = typeof body.supportsT2V === 'boolean' ? body.supportsT2V : false;
  const supportsI2V = typeof body.supportsI2V === 'boolean' ? body.supportsI2V : false;
  const durations = typeof body.durations === 'string' ? body.durations.trim() : '5s';
  const isNew = typeof body.isNew === 'boolean' ? body.isNew : false;
  const sortOrder = typeof body.sortOrder === 'number' ? body.sortOrder : 0;

  if (!modelId) {
    return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const existing = await prisma.videoModel.findUnique({ where: { modelId } });
  if (existing) {
    return NextResponse.json({ error: 'A model with this ID already exists' }, { status: 409 });
  }

  try {
    const model = await prisma.videoModel.create({
      data: {
        modelId, name, description, thumbnailUrl, resolutions, pricingMatrix,
        supportsT2V, supportsI2V, durations, isNew, isActive: true, sortOrder,
      },
    });
    revalidateTag('video-models');
    return NextResponse.json({ model }, { status: 201 });
  } catch (error) {
    console.error('Failed to create video model:', error);
    return NextResponse.json({ error: 'Failed to create video model' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    throw error;
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id || !UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Valid ID is required' }, { status: 400 });
  }

  const existing = await prisma.videoModel.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Video model not found' }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.modelId === 'string' && body.modelId.trim()) data.modelId = body.modelId.trim();
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (typeof body.description === 'string') data.description = body.description.trim() || null;
  if (typeof body.thumbnailUrl === 'string') data.thumbnailUrl = body.thumbnailUrl.trim() || null;
  if (typeof body.resolutions === 'string') data.resolutions = body.resolutions.trim();
  if (typeof body.pricingMatrix === 'object' && body.pricingMatrix !== null) data.pricingMatrix = body.pricingMatrix as Prisma.InputJsonValue;
  if (body.pricingMatrix === null) data.pricingMatrix = Prisma.DbNull;
  if (typeof body.supportsT2V === 'boolean') data.supportsT2V = body.supportsT2V;
  if (typeof body.supportsI2V === 'boolean') data.supportsI2V = body.supportsI2V;
  if (typeof body.durations === 'string') data.durations = body.durations.trim();
  if (typeof body.isNew === 'boolean') data.isNew = body.isNew;
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
  if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder;

  try {
    const model = await prisma.videoModel.update({ where: { id }, data });
    revalidateTag('video-models');
    return NextResponse.json({ model });
  } catch (error) {
    console.error('Failed to update video model:', error);
    return NextResponse.json({ error: 'Failed to update video model' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    throw error;
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id || !UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Valid ID is required' }, { status: 400 });
  }

  try {
    await prisma.videoModel.delete({ where: { id } });
    revalidateTag('video-models');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete video model:', error);
    return NextResponse.json({ error: 'Failed to delete video model' }, { status: 500 });
  }
}
