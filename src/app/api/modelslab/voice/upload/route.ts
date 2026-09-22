export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getModelslabApiKey, modelslabVoiceUpload, type ModelslabVoiceUploadRequest } from '@/lib/modelslab';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getErrorStatus(error: unknown, fallback: number): number {
  if (!isRecord(error) || typeof error.status !== 'number' || !Number.isFinite(error.status)) return fallback;
  return error.status;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!isRecord(error) || typeof error.message !== 'string' || error.message.trim().length === 0) return fallback;
  return error.message;
}

function stripDataUrlPrefix(value: string): string {
  const trimmed = value.trim();
  const marker = 'base64,';
  const index = trimmed.indexOf(marker);
  if (trimmed.startsWith('data:') && index !== -1) {
    return trimmed.slice(index + marker.length);
  }
  return trimmed;
}

export async function POST(request: NextRequest) {
  const apiKey = getModelslabApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { status: 'error', message: 'Server is missing MODELSLAB_API_KEY' },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', message: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ status: 'error', message: 'Invalid request body' }, { status: 400 });
  }

  const name = body.name;
  const language = body.language;
  const initAudio = body.init_audio;

  if (!isNonEmptyString(name)) {
    return NextResponse.json({ status: 'error', message: 'name is required' }, { status: 400 });
  }
  if (!isNonEmptyString(language)) {
    return NextResponse.json({ status: 'error', message: 'language is required' }, { status: 400 });
  }
  if (!isNonEmptyString(initAudio)) {
    return NextResponse.json({ status: 'error', message: 'init_audio is required' }, { status: 400 });
  }

  const initAudioFormat = body.init_audio_format;
  const normalizedFormat = typeof initAudioFormat === 'string' ? initAudioFormat.trim().toLowerCase() : 'url';
  if (normalizedFormat !== 'url' && normalizedFormat !== 'base64') {
    return NextResponse.json(
      { status: 'error', message: 'init_audio_format must be url or base64' },
      { status: 400 }
    );
  }

  const payload: ModelslabVoiceUploadRequest = {
    name: name.trim(),
    language: language.trim(),
    init_audio: normalizedFormat === 'base64' ? stripDataUrlPrefix(initAudio) : initAudio.trim(),
    base64: normalizedFormat === 'base64',
    gender: isNonEmptyString(body.gender) ? body.gender.trim() : undefined,
    thumbnail: isNonEmptyString(body.thumbnail) ? body.thumbnail.trim() : undefined,
  };

  try {
    const data = await modelslabVoiceUpload(payload, apiKey);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const status = getErrorStatus(error, 502);
    const message = getErrorMessage(error, 'Voice upload failed');
    return NextResponse.json({ status: 'error', message }, { status });
  }
}

