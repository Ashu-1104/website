export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getModelslabApiKey } from '@/lib/modelslab';

export const runtime = 'nodejs';

const IMAGE_ENDPOINT = 'https://modelslab.com/api/v6/image_editing/base64_to_url';
const VOICE_ENDPOINT = 'https://modelslab.com/api/v6/voice/base64_to_url';

function pickFirstString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item.trim()) return item.trim();
    }
  }
  return null;
}

/**
 * POST /api/modelslab/base64-to-url
 *
 * Converts a base64-encoded image or audio file to a hosted URL via ModelsLab.
 *
 * Body (JSON):
 * - base64_string: string (required) — data URI (e.g. "data:image/png;base64,...")
 * - type: "image" | "voice" (required)
 */
export async function POST(request: NextRequest) {
  const apiKey = getModelslabApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { status: 'error', message: 'Server is missing MODELSLAB_API_KEY' },
      { status: 500 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const base64String = typeof body.base64_string === 'string' ? body.base64_string.trim() : '';
  const type = typeof body.type === 'string' ? body.type.trim() : '';

  if (!base64String) {
    return NextResponse.json(
      { status: 'error', message: 'base64_string is required' },
      { status: 400 }
    );
  }

  if (type !== 'image' && type !== 'voice') {
    return NextResponse.json(
      { status: 'error', message: 'type must be "image" or "voice"' },
      { status: 400 }
    );
  }

  try {
    let endpoint: string;
    let payload: Record<string, string>;

    if (type === 'image') {
      endpoint = IMAGE_ENDPOINT;
      // ModelsLab image_editing/base64_to_url expects init_image with full data URI
      const imageDataUri = base64String.startsWith('data:')
        ? base64String
        : `data:image/png;base64,${base64String}`;
      payload = { key: apiKey, init_image: imageDataUri };
    } else {
      endpoint = VOICE_ENDPOINT;
      payload = { key: apiKey, init_audio: base64String };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return NextResponse.json(
        { status: 'error', message: `ModelsLab returned HTTP ${response.status}: ${errorText}` },
        { status: 502 }
      );
    }

    const data = (await response.json()) as Record<string, unknown>;

    if (data.status === 'error' || data.status === 'failed') {
      return NextResponse.json(
        { status: 'error', message: typeof data.message === 'string' ? data.message : 'Conversion failed' },
        { status: 502 }
      );
    }

    // ModelsLab returns URL in various fields depending on the endpoint
    const url =
      pickFirstString(data.output) ||
      pickFirstString(data.link) ||
      pickFirstString(data.links) ||
      pickFirstString(data.url) ||
      pickFirstString(data.image_url);

    if (!url) {
      console.error('[base64-to-url] No URL in response:', JSON.stringify(data));
      return NextResponse.json(
        { status: 'error', message: 'No URL returned from ModelsLab' },
        { status: 502 }
      );
    }

    return NextResponse.json({ status: 'success', url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Conversion failed';
    return NextResponse.json(
      { status: 'error', message },
      { status: 502 }
    );
  }
}
