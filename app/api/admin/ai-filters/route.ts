import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/db';
import { AuthError, requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/admin/ai-filters
 * List all AI filters (StyleTemplates)
 */
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
    const filters = await prisma.styleTemplate.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ filters });
  } catch (error) {
    console.error('Failed to load AI filters:', error);
    return NextResponse.json({ error: 'Failed to load filters' }, { status: 500 });
  }
}

/**
 * POST /api/admin/ai-filters
 * Create a new AI filter
 */
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

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const thumbnailUrl = typeof body.thumbnailUrl === 'string' ? body.thumbnailUrl.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : null;
  const sortOrder = typeof body.sortOrder === 'number' ? body.sortOrder : 0;

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  // Generate slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Check for duplicate slug
  const existing = await prisma.styleTemplate.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: 'A filter with this name already exists' }, { status: 409 });
  }

  try {
    const filter = await prisma.styleTemplate.create({
      data: {
        slug,
        name,
        description,
        thumbnailUrl: thumbnailUrl || '',
        prompt,
        category: 'ARTISTIC',
        sortOrder,
        isActive: true,
      },
    });

    revalidateTag('ai-filters');
    return NextResponse.json({ filter }, { status: 201 });
  } catch (error) {
    console.error('Failed to create AI filter:', error);
    return NextResponse.json({ error: 'Failed to create filter' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/ai-filters
 * Update an existing AI filter
 */
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
    return NextResponse.json({ error: 'Valid filter ID is required' }, { status: 400 });
  }

  const existing = await prisma.styleTemplate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Filter not found' }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  if (typeof body.name === 'string' && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (typeof body.prompt === 'string') {
    data.prompt = body.prompt.trim();
  }
  if (typeof body.thumbnailUrl === 'string') {
    data.thumbnailUrl = body.thumbnailUrl.trim();
  }
  if (typeof body.description === 'string') {
    data.description = body.description.trim() || null;
  }
  if (typeof body.sortOrder === 'number') {
    data.sortOrder = body.sortOrder;
  }
  if (typeof body.isActive === 'boolean') {
    data.isActive = body.isActive;
  }

  try {
    const filter = await prisma.styleTemplate.update({
      where: { id },
      data,
    });

    revalidateTag('ai-filters');
    return NextResponse.json({ filter });
  } catch (error) {
    console.error('Failed to update AI filter:', error);
    return NextResponse.json({ error: 'Failed to update filter' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/ai-filters
 * Delete an AI filter
 */
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
    return NextResponse.json({ error: 'Valid filter ID is required' }, { status: 400 });
  }

  try {
    await prisma.styleTemplate.delete({ where: { id } });
    revalidateTag('ai-filters');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete AI filter:', error);
    return NextResponse.json({ error: 'Failed to delete filter' }, { status: 500 });
  }
}
