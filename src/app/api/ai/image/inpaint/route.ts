import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { isValidUuid } from '@/lib/webhooks/utils';
import { deductCreditsForOperation, refundCredits, type DeductResult } from '@/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;

const MODELSLAB_INPAINT_URL = 'https://modelslab.com/api/v6/images/inpaint';
const MODELSLAB_FETCH_URL = 'https://modelslab.com/api/v6/images/fetch';
const MODELSLAB_BASE64_TO_URL_URL = 'https://modelslab.com/api/v6/image_editing/base64_to_url';

const DEFAULT_MODEL_ID = 'lazymixv4-inpaint';
const NEGATIVE_PROMPT =
  'poorly drawn face, poorly drawn eyes, poorly drawn mouth, bad facial features, ugly face, deformed face, poorly drawn hands, bad hands, mutated hands, missing fingers, extra fingers';

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;
const UPLOADS_PREFIX = '/uploads/';

type ModelsLabStatus = 'success' | 'processing' | 'error' | 'failed' | string;

type InpaintResponse = {
  status: ModelsLabStatus;
  id?: number | string;
  request_id?: number | string;
  requestId?: number | string;
  fetch_result?: string;
  output?: unknown;
  proxy_links?: unknown;
  future_links?: unknown;
  links?: unknown;
  message?: string;
  eta?: number;
};

type Base64ToUrlResponse = {
  status?: 'success' | 'processing' | 'error' | 'failed' | string;
  output?: unknown;
  url?: unknown;
  links?: unknown;
  link?: unknown;
  image_url?: unknown;
  message?: unknown;
};

function getApiKeys(): string[] {
  const keys: string[] = [];

  const singleKey = process.env.MODELSLAB_API_KEY;
  if (singleKey?.trim()) keys.push(singleKey.trim());

  for (let i = 1; i <= 10; i += 1) {
    const key = process.env[`MODELSLAB_API_KEY_${i}`];
    if (key?.trim()) keys.push(key.trim());
  }

  return keys;
}

let currentKeyIndex = 0;
function getNextApiKey(): string {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error('No ModelsLab API keys configured. Please set MODELSLAB_API_KEY_1 in your .env.');
  }

  const key = keys[currentKeyIndex % keys.length]!;
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  return key;
}

function isSafeUploadFilename(filename: string): boolean {
  if (!filename) return false;
  if (filename.includes('/') || filename.includes('\\')) return false;
  if (filename.includes('..')) return false;
  return true;
}

async function tryReadUploadedImageAsBase64(urlPath: string): Promise<string | null> {
  const cleanPath = urlPath.split('?')[0]?.split('#')[0] ?? urlPath;

  let pathname = cleanPath;
  if (ABSOLUTE_URL_REGEX.test(cleanPath)) {
    try {
      pathname = new URL(cleanPath).pathname;
    } catch {
      return null;
    }
  }

  if (!pathname.startsWith(UPLOADS_PREFIX)) return null;

  const filename = pathname.slice(UPLOADS_PREFIX.length);
  if (!isSafeUploadFilename(filename)) return null;

  const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
  try {
    const buffer = await readFile(filePath);
    return buffer.toString('base64');
  } catch {
    return null;
  }
}

function isLikelyBase64(raw: string): boolean {
  const trimmed = raw.trim().replace(/\s/g, '');
  if (trimmed.length < 32) return false;
  if (trimmed.length % 4 === 1) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(trimmed);
}

function guessImageMimeTypeFromBase64(base64: string): string | null {
  const head = base64.trim().replace(/\s/g, '').slice(0, 16);
  if (!head) return null;
  if (head.startsWith('iVBOR')) return 'image/png';
  if (head.startsWith('/9j')) return 'image/jpeg';
  if (head.startsWith('R0lGOD')) return 'image/gif';
  if (head.startsWith('UklGR')) return 'image/webp';
  return null;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string') return [value];
  return [];
}

function extractImageCandidates(payload: InpaintResponse): string[] {
  const output = toStringArray(payload.output).filter(Boolean);
  if (output.length > 0) return output;

  const proxyLinks = toStringArray(payload.proxy_links).filter(Boolean);
  if (proxyLinks.length > 0) return proxyLinks;

  const futureLinks = toStringArray(payload.future_links).filter(Boolean);
  if (futureLinks.length > 0) return futureLinks;

  return toStringArray(payload.links).filter(Boolean);
}

function extractRequestId(payload: InpaintResponse): string | null {
  const direct = payload.id ?? payload.request_id ?? payload.requestId;
  if (typeof direct === 'string' || typeof direct === 'number') return String(direct);

  if (typeof payload.fetch_result === 'string' && payload.fetch_result) {
    const clean = payload.fetch_result.split(/[?#]/)[0];
    const last = clean?.split('/').pop();
    if (last) return last;
  }

  return null;
}

function pickFirstString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const found = value.find((v) => typeof v === 'string');
    return typeof found === 'string' ? found : null;
  }
  return null;
}

function ensureImageDataUri(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('data:image/')) return trimmed;

  const cleaned = trimmed.replace(/\s/g, '');
  const mime = guessImageMimeTypeFromBase64(cleaned) ?? 'image/png';
  return `data:${mime};base64,${cleaned}`;
}

async function base64ToModelsLabUrl(dataUriOrBase64: string, apiKey: string): Promise<string> {
  const init_image = ensureImageDataUri(dataUriOrBase64);

  const response = await fetch(MODELSLAB_BASE64_TO_URL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: apiKey, init_image }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `ModelsLab base64_to_url failed with HTTP ${response.status}${errorText ? `: ${errorText}` : ''}`
    );
  }

  const data = (await response.json()) as Base64ToUrlResponse & Record<string, unknown>;
  if (data.status === 'error' || data.status === 'failed') {
    throw new Error(typeof data.message === 'string' ? data.message : 'ModelsLab base64_to_url failed');
  }

  const url =
    pickFirstString(data.output) ||
    (typeof data.url === 'string' ? data.url : null) ||
    pickFirstString(data.links) ||
    (typeof data.link === 'string' ? data.link : null) ||
    (typeof data.image_url === 'string' ? data.image_url : null);

  if (!url) throw new Error('ModelsLab base64_to_url returned no output URL');
  return url;
}

function dedupePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }

  return result;
}

async function uploadToModelsLabUrl(input: string, maxAttempts: number = 3): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const apiKey = getNextApiKey();
    try {
      return await base64ToModelsLabUrl(input, apiKey);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error('Failed to upload image to ModelsLab');
}

async function normalizeOutputUrls(candidates: string[]): Promise<string[]> {
  const uniqueCandidates = dedupePreserveOrder(candidates.map((item) => item.trim()).filter(Boolean));
  const urls: string[] = [];

  for (const value of uniqueCandidates) {
    if (!value) continue;

    if (ABSOLUTE_URL_REGEX.test(value)) {
      urls.push(value);
      continue;
    }

    if (value.startsWith('data:image/') || isLikelyBase64(value)) {
      const uploaded = await uploadToModelsLabUrl(value);
      urls.push(uploaded);
      continue;
    }

    urls.push(value);
  }

  return dedupePreserveOrder(urls);
}

async function pollForResult(requestId: string, apiKey: string, maxAttempts: number): Promise<string[]> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const response = await fetch(MODELSLAB_FETCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: apiKey, request_id: requestId }),
    });

    if (!response.ok) continue;
    const data = (await response.json()) as InpaintResponse;

    if (data.status === 'processing') continue;
    if (data.status === 'error' || data.status === 'failed') {
      throw new Error(data.message || 'Inpainting failed');
    }

    const candidates = extractImageCandidates(data);
    if (candidates.length > 0) return await normalizeOutputUrls(candidates);
  }

  throw new Error('Inpainting timed out');
}

function resolveModelsLabImageInput(rawInput: string, requestUrl: string): string {
  if (!rawInput) return rawInput;
  const trimmed = rawInput.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('data:image/')) return trimmed;
  if (ABSOLUTE_URL_REGEX.test(trimmed)) return trimmed;
  if (isLikelyBase64(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return new URL(trimmed, requestUrl).toString();
  return trimmed;
}

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

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const rawInit = typeof body.init_image === 'string' ? body.init_image.trim() : '';
  const rawMask = typeof body.mask_image === 'string' ? body.mask_image.trim() : '';
  const modelId = typeof body.model_id === 'string' && body.model_id.trim() ? body.model_id.trim() : DEFAULT_MODEL_ID;
  const strengthRaw = typeof body.strength === 'number' ? body.strength : Number(body.strength);
  const strength = Number.isFinite(strengthRaw) ? Math.min(1, Math.max(0, strengthRaw)) : 0.7;

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
  }
  if (prompt.length > 5000) {
    return NextResponse.json({ error: 'Prompt is too long. Maximum 5,000 characters.' }, { status: 400 });
  }
  if (!rawInit) {
    return NextResponse.json({ error: 'init_image is required.' }, { status: 400 });
  }
  if (!rawMask) {
    return NextResponse.json({ error: 'mask_image is required.' }, { status: 400 });
  }

  const initFromUploadsBase64 = await tryReadUploadedImageAsBase64(rawInit);
  const maskFromUploadsBase64 = await tryReadUploadedImageAsBase64(rawMask);

  if (rawInit.startsWith(UPLOADS_PREFIX) && !initFromUploadsBase64) {
    return NextResponse.json({ error: 'Uploaded init_image not found.' }, { status: 400 });
  }
  if (rawMask.startsWith(UPLOADS_PREFIX) && !maskFromUploadsBase64) {
    return NextResponse.json({ error: 'Uploaded mask_image not found.' }, { status: 400 });
  }

  // Deduct credits before processing
  let creditDeduction: DeductResult = { ok: true, creditsDeducted: 0 };
  creditDeduction = await deductCreditsForOperation(userId, 'IMAGE_EDIT');
  if (!creditDeduction.ok) return creditDeduction.response;

  const resolvedInit = initFromUploadsBase64 ?? resolveModelsLabImageInput(rawInit, request.url);
  const resolvedMask = maskFromUploadsBase64 ?? resolveModelsLabImageInput(rawMask, request.url);

  let initImageUrl = resolvedInit;
  let maskImageUrl = resolvedMask;

  // Ensure init/mask are URLs for the inpaint API:
  // - if user uploaded locally (/uploads/...), we read as base64 and upload to ModelsLab
  // - if the client sends base64/data URL, upload to ModelsLab
  try {
    if (initFromUploadsBase64 || resolvedInit.startsWith('data:image/') || isLikelyBase64(resolvedInit)) {
      initImageUrl = await uploadToModelsLabUrl(resolvedInit);
    }
    if (maskFromUploadsBase64 || resolvedMask.startsWith('data:image/') || isLikelyBase64(resolvedMask)) {
      maskImageUrl = await uploadToModelsLabUrl(resolvedMask);
    }
  } catch (error) {
    refundCredits(userId, creditDeduction.creditsDeducted).catch(() => {});
    return NextResponse.json(
      {
        error: 'Failed to upload init/mask image.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 }
    );
  }

  const requestBody = {
    // IMPORTANT: We always send URLs to ModelsLab (no base64 param).
    model_id: modelId,
    prompt,
    negative_prompt: NEGATIVE_PROMPT,
    init_image: initImageUrl,
    mask_image: maskImageUrl,
    samples: '2',
    steps: '31',
    safety_checker: 'no',
    guidance_scale: 7.5,
    strength,
    scheduler: 'UniPCMultistepScheduler',
    lora_model: null,
    use_karras_sigmas: 'yes',
    vae: null,
    lora_strength: null,
    seed: null,
    webhook: null,
    track_id: null,
  };

  try {
    let apiKey: string;
    try {
      apiKey = getNextApiKey();
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Missing ModelsLab API key.' },
        { status: 500 }
      );
    }

    const response = await fetch(MODELSLAB_INPAINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...requestBody, key: apiKey }),
    });

    const text = await response.text();
    const data: InpaintResponse = text ? JSON.parse(text) : { status: 'error', message: 'Empty response' };

    if (!response.ok) {
      return NextResponse.json(
        { error: 'ModelsLab request failed.', details: data.message || text || `HTTP ${response.status}` },
        { status: 502 }
      );
    }

    if (data.status === 'error' || data.status === 'failed') {
      return NextResponse.json({ error: data.message || 'Inpainting failed.' }, { status: 502 });
    }

    const immediateCandidates = extractImageCandidates(data);
    if (data.status === 'success' && immediateCandidates.length > 0) {
      const imageUrls = await normalizeOutputUrls(immediateCandidates);
      if (imageUrls.length === 0) {
        return NextResponse.json(
          { error: 'ModelsLab returned success but no image output.' },
          { status: 502 }
        );
      }
      return NextResponse.json({
        success: true,
        status: 'success',
        imageUrl: imageUrls[0]!,
        imageUrls,
        requestId: extractRequestId(data),
      });
    }

    const requestId = extractRequestId(data);
    if (!requestId) {
      return NextResponse.json(
        { error: 'ModelsLab did not return a request_id for fetch.' },
        { status: 502 }
      );
    }

    const imageUrls = await pollForResult(requestId, apiKey, 45);
    if (imageUrls.length === 0) throw new Error('No image returned from ModelsLab fetch');

    return NextResponse.json({
      success: true,
      status: 'success',
      imageUrl: imageUrls[0]!,
      imageUrls,
      requestId,
    });
  } catch (error) {
    refundCredits(userId, creditDeduction.creditsDeducted).catch(() => {});
    return NextResponse.json(
      { error: 'Failed to inpaint image.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
