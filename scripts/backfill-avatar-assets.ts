/**
 * One-time script to backfill MediaAsset records for AI characters that store
 * their avatar URL in metadata.imageUrl instead of a proper avatarAsset relation.
 *
 * This normalizes avatar storage so all characters use avatarAssetId → MediaAsset.
 *
 * Usage: npx tsx scripts/backfill-avatar-assets.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

async function main() {
  // Find all characters with no avatarAsset but with metadata.imageUrl
  const characters = await prisma.aICharacter.findMany({
    where: {
      avatarAssetId: null,
    },
    select: {
      id: true,
      name: true,
      metadata: true,
    },
  });

  let updated = 0;
  let skipped = 0;

  for (const character of characters) {
    const meta = character.metadata as Record<string, unknown> | null;
    const imageUrl = typeof meta?.imageUrl === 'string' ? meta.imageUrl.trim() : '';

    if (!imageUrl || !ABSOLUTE_URL_REGEX.test(imageUrl)) {
      skipped++;
      continue;
    }

    try {
      const asset = await prisma.mediaAsset.create({
        data: {
          type: 'IMAGE',
          r2Key: imageUrl,
          width: 600,
          height: 800,
          mimeType: 'image/jpeg',
        },
      });

      await prisma.aICharacter.update({
        where: { id: character.id },
        data: { avatarAssetId: asset.id },
      });

      updated++;
      console.log(`[OK] ${character.name} (${character.id}) → asset ${asset.id}`);
    } catch (err) {
      console.error(`[FAIL] ${character.name} (${character.id}):`, err);
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped (no valid URL): ${skipped}, Total: ${characters.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
