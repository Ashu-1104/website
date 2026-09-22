export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { fetchJson } from '@/lib/modelslab';

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

export async function GET(request: NextRequest) {
  const typeParam = request.nextUrl.searchParams.get('type');
  const type = typeParam && typeParam.trim().length > 0 ? typeParam.trim() : 'manual';

  try {
    const url = `https://modelslab.com/api/voice_list?type=${encodeURIComponent(type)}`;
    const data = await fetchJson(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const status = getErrorStatus(error, 502);
    const message = getErrorMessage(error, 'Failed to fetch voices');
    return NextResponse.json({ status: 'error', message }, { status });
  }
}
