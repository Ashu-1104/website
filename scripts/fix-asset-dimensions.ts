/**
 * One-time script to fix MediaAsset records that have placeholder 512x512 dimensions.
 * Downloads each image to detect its real dimensions and updates the database.
 *
 * Usage: npx tsx scripts/fix-asset-dimensions.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

async function fetchImageDimensions(
  url: string
): Promise<{ width: number; height: number } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 24) return null;

    // PNG
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }

    // GIF
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
      return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    }

    // WebP
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
      const chunk = buf.toString('ascii', 12, 16);
      if (chunk === 'VP8 ' && buf.length >= 30) {
        return {
          width: buf.readUInt16LE(26) & 0x3fff,
          height: buf.readUInt16LE(28) & 0x3fff,
        };
      }
      if (chunk === 'VP8L' && buf.length >= 25) {
        const bits = buf.readUInt32LE(21);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
      if (chunk === 'VP8X' && buf.length >= 30) {
        return {
          width: (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1,
          height: (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1,
        };
      }
    }

    // JPEG
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let offset = 2;
      while (offset < buf.length - 9) {
        if (buf[offset] !== 0xff) { offset++; continue; }
        const marker = buf[offset + 1];
        if (
          (marker >= 0xc0 && marker <= 0xc3) ||
          (marker >= 0xc5 && marker <= 0xc7) ||
          (marker >= 0xc9 && marker <= 0xcb) ||
          (marker >= 0xcd && marker <= 0xcf)
        ) {
          return { width: buf.readUInt16BE(offset + 7), height: buf.readUInt16BE(offset + 5) };
        }
        const segLen = buf.readUInt16BE(offset + 2);
        offset += 2 + segLen;
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function main() {
  const MEDIA_BASE_URL = (process.env.MEDIA_BASE_URL ?? '').replace(/\/+$/, '');

  // Find all assets with placeholder dimensions
  const assets = await prisma.mediaAsset.findMany({
    where: { width: 512, height: 512 },
    select: { id: true, r2Key: true },
  });

  console.log(`Found ${assets.length} assets with 512x512 dimensions to fix.`);

  let updated = 0;
  let failed = 0;

  for (const asset of assets) {
    const url = ABSOLUTE_URL_REGEX.test(asset.r2Key)
      ? asset.r2Key
      : MEDIA_BASE_URL
        ? `${MEDIA_BASE_URL}/${asset.r2Key}`
        : null;

    if (!url) {
      console.log(`  SKIP ${asset.id} - no resolvable URL (r2Key: ${asset.r2Key})`);
      failed++;
      continue;
    }

    const dims = await fetchImageDimensions(url);
    if (!dims || (dims.width === 512 && dims.height === 512)) {
      console.log(`  SKIP ${asset.id} - could not detect or already 512x512`);
      failed++;
      continue;
    }

    await prisma.mediaAsset.update({
      where: { id: asset.id },
      data: { width: dims.width, height: dims.height },
    });
    console.log(`  UPDATED ${asset.id} → ${dims.width}x${dims.height}`);
    updated++;
  }

  console.log(`\nDone: ${updated} updated, ${failed} skipped.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
