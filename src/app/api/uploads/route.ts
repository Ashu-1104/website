import { NextResponse } from 'next/server';

import crypto from 'crypto';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type MediaType = 'IMAGE' | 'VIDEO' | 'AUDIO';

function getMediaType(mimeType: string): MediaType | null {
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  return null;
}

function normalizeExtension(ext: string): string {
  const normalized = ext.trim().replace(/^\./, '').toLowerCase();
  if (!normalized) return '';
  if (!/^[a-z0-9]{1,10}$/.test(normalized)) return '';
  return normalized;
}

function guessExtensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
  };

  return map[mimeType] ?? '';
}

function maxBytesForMediaType(type: MediaType): number {
  switch (type) {
    case 'IMAGE':
      return 10 * 1024 * 1024; // 10MB
    case 'AUDIO':
      return 20 * 1024 * 1024; // 20MB
    case 'VIDEO':
      return 60 * 1024 * 1024; // 60MB
    default:
      return 10 * 1024 * 1024;
  }
}

/**
 * POST /api/uploads
 *
 * Upload a user-selected media file (image/video/audio) and return a public URL.
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Body (multipart/form-data):
 * - file: File (required)
 */
export async function POST(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file.' }, { status: 400 });
  }

  const mimeType = file.type?.trim() ?? '';
  const mediaType = getMediaType(mimeType);
  if (!mediaType) {
    return NextResponse.json({ error: 'Unsupported file type.' }, { status: 415 });
  }

  const maxBytes = maxBytesForMediaType(mediaType);
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large. Max size is ${Math.floor(maxBytes / (1024 * 1024))}MB.` },
      { status: 413 }
    );
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadDir, { recursive: true });

  const id = crypto.randomUUID();
  const fromName = normalizeExtension(path.extname(file.name));
  const fromMime = normalizeExtension(guessExtensionFromMime(mimeType));
  const ext = fromName || fromMime;
  const filename = ext ? `${id}.${ext}` : id;
  const target = path.join(uploadDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(target, buffer);

  return NextResponse.json(
    {
      url: `/uploads/${filename}`,
      mediaType,
      mimeType: mimeType || null,
      size: file.size,
      originalName: file.name || null,
    },
    { status: 201 }
  );
}

