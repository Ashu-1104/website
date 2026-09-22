import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthError, requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/admin/ai-apps
 * List all AI apps (admin sees everything including inactive)
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
    const apps = await prisma.aIApp.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ apps });
  } catch (error) {
    console.error('Failed to load AI apps:', error);
    return NextResponse.json({ error: 'Failed to load apps' }, { status: 500 });
  }
}

/**
 * POST /api/admin/ai-apps
 * Create a new AI app
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

  const label = typeof body.label === 'string' ? body.label.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const longDescription = typeof body.longDescription === 'string' ? body.longDescription.trim() : null;
  const thumbnailUrl = typeof body.thumbnailUrl === 'string' ? body.thumbnailUrl.trim() : '';
  const bannerUrl = typeof body.bannerUrl === 'string' ? body.bannerUrl.trim() : null;
  const category = typeof body.category === 'string' ? body.category.trim() : null;
  const creditCost = typeof body.creditCost === 'number' ? body.creditCost : 10;
  const sortOrder = typeof body.sortOrder === 'number' ? body.sortOrder : 0;
  const isNsfw = typeof body.isNsfw === 'boolean' ? body.isNsfw : false;
  const isFeatured = typeof body.isFeatured === 'boolean' ? body.isFeatured : false;

  if (!label) {
    return NextResponse.json({ error: 'Label is required' }, { status: 400 });
  }
  if (!description) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 });
  }

  // Generate slug from label
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Check for duplicate slug
  const existing = await prisma.aIApp.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: 'An app with this name already exists' }, { status: 409 });
  }

  try {
    const app = await prisma.aIApp.create({
      data: {
        slug,
        label,
        description,
        longDescription,
        thumbnailUrl: thumbnailUrl || '/images/placeholder.svg',
        bannerUrl,
        category,
        creditCost,
        sortOrder,
        isActive: true,
        isNsfw,
        isFeatured,
      },
    });

    return NextResponse.json({ app }, { status: 201 });
  } catch (error) {
    console.error('Failed to create AI app:', error);
    return NextResponse.json({ error: 'Failed to create app' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/ai-apps
 * Update an existing AI app
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
    return NextResponse.json({ error: 'Valid app ID is required' }, { status: 400 });
  }

  const existing = await prisma.aIApp.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'App not found' }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  if (typeof body.label === 'string' && body.label.trim()) {
    data.label = body.label.trim();
  }
  if (typeof body.description === 'string') {
    data.description = body.description.trim();
  }
  if (typeof body.longDescription === 'string') {
    data.longDescription = body.longDescription.trim() || null;
  }
  if (typeof body.thumbnailUrl === 'string') {
    data.thumbnailUrl = body.thumbnailUrl.trim();
  }
  if (typeof body.bannerUrl === 'string') {
    data.bannerUrl = body.bannerUrl.trim() || null;
  }
  if (typeof body.category === 'string') {
    data.category = body.category.trim() || null;
  }
  if (typeof body.creditCost === 'number') {
    data.creditCost = body.creditCost;
  }
  if (typeof body.sortOrder === 'number') {
    data.sortOrder = body.sortOrder;
  }
  if (typeof body.isActive === 'boolean') {
    data.isActive = body.isActive;
  }
  if (typeof body.isNsfw === 'boolean') {
    data.isNsfw = body.isNsfw;
  }
  if (typeof body.isFeatured === 'boolean') {
    data.isFeatured = body.isFeatured;
  }

  try {
    const app = await prisma.aIApp.update({
      where: { id },
      data,
    });

    return NextResponse.json({ app });
  } catch (error) {
    console.error('Failed to update AI app:', error);
    return NextResponse.json({ error: 'Failed to update app' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/ai-apps
 * Delete an AI app
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
    return NextResponse.json({ error: 'Valid app ID is required' }, { status: 400 });
  }

  try {
    await prisma.aIApp.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete AI app:', error);
    return NextResponse.json({ error: 'Failed to delete app' }, { status: 500 });
  }
}
