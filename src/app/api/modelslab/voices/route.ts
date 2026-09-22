export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { fetchVoices, type ModelslabVoiceListType } from '@/lib/modelslab';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getErrorStatus(error: unknown, fallback: number): number {
  if (!isRecord(error) || typeof error.status !== 'number' || !Number.isFinite(error.status)) return fallback;
  return error.status;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!isRecord(error) || typeof error.message !== 'string' || error.message.trim().length === 0) return fallback;
  return error.message;
}

function isVoiceListType(value: string): value is ModelslabVoiceListType {
  return value === 'trained' || value === 'voice_cover';
}

export async function GET(request: NextRequest) {
  const typeParam = request.nextUrl.searchParams.get('type');
  const type: ModelslabVoiceListType = typeParam && isVoiceListType(typeParam) ? typeParam : 'trained';

  if (typeParam && !isVoiceListType(typeParam)) {
    return NextResponse.json({ status: 'error', message: 'Invalid type' }, { status: 400 });
  }

  try {
    const data = await fetchVoices(type);
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    const status = getErrorStatus(error, 502);
    const message = getErrorMessage(error, 'Failed to fetch voices');
    return NextResponse.json({ status: 'error', message }, { status });
  }
}
