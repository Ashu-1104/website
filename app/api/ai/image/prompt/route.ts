import { NextResponse } from 'next/server';
import { generateImagePromptFromText, type ImageStyle } from '@/lib/ai/modelslab';
import { isValidUuid } from '@/lib/webhooks/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeGeneratedPrompt(value: string): string {
  let text = value.trim();
  if (!text) return text;

  // Strip common wrapper formats.
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
  }

  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    text = text.slice(1, -1).trim();
  }

  return text.replace(/\s+/g, ' ').trim();
}


/**
 * POST /api/ai/image/prompt
 *
 * Convert a piece of chat text into a detailed, visually rich image prompt.
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Body:
 * - text: Source text to convert into an image prompt (required)
 * - style: Image style hint - realistic, anime, or cartoon (optional)
 */
export async function POST(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';
  if (!isValidUuid(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const styleRaw = typeof body.style === 'string' ? body.style : undefined;
  const style: ImageStyle | undefined =
    styleRaw === 'realistic' || styleRaw === 'anime' || styleRaw === 'cartoon' ? styleRaw : undefined;

  if (!text) {
    return NextResponse.json({ error: 'Text is required.' }, { status: 400 });
  }

  if (text.length > 10_000) {
    return NextResponse.json({ error: 'Text is too long.' }, { status: 400 });
  }

  try {
    const rawPrompt = await generateImagePromptFromText(text, style);
    const prompt = normalizeGeneratedPrompt(rawPrompt);

    if (!prompt) {
      return NextResponse.json({ error: 'Failed to generate a prompt.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, prompt });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate prompt.' },
      { status: 500 }
    );
  }
}
