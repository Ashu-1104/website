import { NextResponse } from 'next/server';
import { JobProvider, JobStatus, JobType } from '@prisma/client';
import { generateClothSwapImage } from '@/lib/ai/modelslab';
import { prisma } from '@/lib/db';
import { isValidUuid } from '@/lib/webhooks/utils';
import { deductCreditsForOperation, refundCredits, type DeductResult } from '@/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min — single-step image merge

// Image upload endpoint (same as other AI apps)
const BASE64_TO_URL_ENDPOINT = 'https://modelslab.com/api/v6/image_editing/base64_to_url';

/**
 * Upload a base64 data URI to ModelsLab and return a hosted URL.
 * Skips upload if the input is already an HTTP(S) URL.
 */
async function uploadBase64Image(dataUri: string, apiKey: string): Promise<string> {
  if (/^https?:\/\//i.test(dataUri)) return dataUri;

  const image = dataUri.startsWith('data:image/')
    ? dataUri
    : `data:image/png;base64,${dataUri}`;

  const response = await fetch(BASE64_TO_URL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: apiKey, init_image: image }),
  });

  if (!response.ok) {
    throw new Error(`Image upload failed with status ${response.status}`);
  }

  const data = await response.json();
  const url =
    (Array.isArray(data.output) ? data.output[0] : data.output) ||
    data.url ||
    data.link ||
    (Array.isArray(data.links) ? data.links[0] : data.links);

  if (!url) throw new Error('Image upload returned no URL');
  return url;
}

/**
 * Get a ModelsLab API key (picks the first available from rotation)
 */
function getApiKey(): string {
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`MODELSLAB_API_KEY_${i}`]?.trim();
    if (key) return key;
  }
  const key = process.env.MODELSLAB_API_KEY?.trim();
  if (key) return key;
  throw new Error('No ModelsLab API key configured');
}

/**
 * POST /api/ai/cloth-swap
 *
 * Swaps clothing from one image onto a person in another image using qwen-edit-2511.
 *
 * Headers:
 *   x-vp-user-id: Required user ID
 *
 * Body:
 *   image1: base64 data URI or URL of the clothing reference (required)
 *   image2: base64 data URI or URL of the person (required)
 *   prompt: optional custom prompt (falls back to default cloth swap prompt)
 */
export async function POST(request: Request) {
  // -- Auth --
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';
  if (!isValidUuid(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  // -- Parse body --
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const rawImage1 = typeof body.image1 === 'string' ? body.image1.trim() : '';
  const rawImage2 = typeof body.image2 === 'string' ? body.image2.trim() : '';
  const customPrompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

  if (!rawImage1 || !rawImage2) {
    return NextResponse.json(
      { error: 'Both image1 (clothing) and image2 (person) are required.' },
      { status: 400 }
    );
  }

  // Deduct credits before processing
  let creditDeduction: DeductResult = { ok: true, creditsDeducted: 0 };
  creditDeduction = await deductCreditsForOperation(userId, 'IMAGE_EDIT');
  if (!creditDeduction.ok) return creditDeduction.response;

  // -- Upload both images to ModelsLab in parallel --
  const apiKey = getApiKey();
  let clothingUrl: string;
  let personUrl: string;

  try {
    const [url1, url2] = await Promise.all([
      uploadBase64Image(rawImage1, apiKey),
      uploadBase64Image(rawImage2, apiKey),
    ]);
    clothingUrl = url1;
    personUrl = url2;
  } catch (error) {
    console.error('[cloth-swap] Image upload failed:', error);
    refundCredits(userId, creditDeduction.creditsDeducted).catch(() => {});
    return NextResponse.json(
      { error: 'Failed to upload images.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }

  // -- Create job for tracking --
  let job = null;
  try {
    job = await prisma.generationJob.create({
      data: {
        userId,
        provider: JobProvider.MODELSLAB,
        jobType: JobType.IMAGE_GENERATION,
        status: JobStatus.PENDING,
        requestData: { tool: 'cloth-swap', clothingUrl, personUrl },
      },
    });
  } catch (error) {
    console.error('[cloth-swap] Failed to create job:', error);
  }

  // -- Generate the cloth-swapped image --
  try {
    const result = await generateClothSwapImage(clothingUrl, personUrl, {
      signal: request.signal,
      prompt: customPrompt || undefined,
    });

    // Update job on success
    if (job) {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.COMPLETED,
          resultUrl: result.imageUrl,
          startedAt: new Date(),
          completedAt: new Date(),
          requestData: {
            tool: 'cloth-swap',
            clothingUrl,
            personUrl,
            apiKeyUsed: result.apiKeyUsed,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      job: job ? { id: job.id, trackId: job.trackId } : null,
    });
  } catch (error) {
    console.error('[cloth-swap] Error:', error);
    refundCredits(userId, creditDeduction.creditsDeducted).catch(() => {});

    if (job) {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Cloth swap generation failed',
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to generate cloth swap image.',
        details: error instanceof Error ? error.message : 'Unknown error',
        job: job ? { id: job.id, trackId: job.trackId } : null,
      },
      { status: 500 }
    );
  }
}
