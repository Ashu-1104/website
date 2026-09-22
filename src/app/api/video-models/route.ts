export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const revalidate = 3600; // 1 hour — video models rarely change

export async function GET() {
  try {
    const models = await prisma.videoModel.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Failed to load video models:', error);
    return NextResponse.json({ error: 'Failed to load video models' }, { status: 500 });
  }
}
