export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getModelslabApiKey, modelslabFetchVoice } from '@/lib/modelslab';

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

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  if (!/^[0-9]+$/.test(params.id)) {
    return NextResponse.json({ status: 'error', message: 'Invalid id' }, { status: 400 });
  }

  const apiKey = getModelslabApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { status: 'error', message: 'Server is missing MODELSLAB_API_KEY' },
      { status: 500 }
    );
  }

  try {
    const data = await modelslabFetchVoice(params.id, apiKey);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const status = getErrorStatus(error, 502);
    const message = getErrorMessage(error, 'Failed to fetch voice result');
    return NextResponse.json({ status: 'error', message }, { status });
  }
}
