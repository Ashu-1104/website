/**
 * Script to add thumbnail images to a model.
 *
 * Usage:
 *   npx tsx scripts/add-thumbnails.ts <MODEL_ID_OR_SLUG>
 *
 * It will add the 4 sample images below. Edit the IMAGES array to change them.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ---- Edit these URLs to whatever images you want ----
const IMAGES = [
  'https://i.pinimg.com/736x/fd/d8/88/fdd88zd04fe63dcc64a9648101236c99.jpg',
  'https://i.pinimg.com/1200x/d5/3c/d5/d53cd5767aa42956571007cb5f89f445.jpg',
  'https://i.pinimg.com/736x/14/ac/1e/14ac1e1e054ed7a7e4ce69b527788da5.jpg',
  'https://i.pinimg.com/1200x/7b/b8/c3/7bb8c3a277d3f22223c4c9b2acc615f9.jpg',
];

async function main() {
  const idOrSlug = process.argv[2];
  if (!idOrSlug) {
    console.error('Usage: npx tsx scripts/add-thumbnails.ts <MODEL_ID_OR_SLUG>');
    process.exit(1);
  }

  // Find the model
  const model = await prisma.userUploadedModel.findFirst({
    where: UUID_REGEX.test(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
    select: { id: true, name: true },
  });

  if (!model) {
    console.error(`Model not found: ${idOrSlug}`);
    process.exit(1);
  }

  console.log(`Found model: "${model.name}" (${model.id})`);

  // Delete existing thumbnails
  const deleted = await prisma.modelThumbnail.deleteMany({
    where: { modelId: model.id },
  });
  console.log(`Deleted ${deleted.count} existing thumbnails`);

  // Create new thumbnails
  const created = await prisma.modelThumbnail.createMany({
    data: IMAGES.map((imageUrl, index) => ({
      modelId: model.id,
      imageUrl,
      sortOrder: index,
    })),
  });
  console.log(`Created ${created.count} thumbnails`);

  // Verify
  const thumbnails = await prisma.modelThumbnail.findMany({
    where: { modelId: model.id },
    orderBy: { sortOrder: 'asc' },
  });
  console.log('\nThumbnails:');
  for (const t of thumbnails) {
    console.log(`  [${t.sortOrder}] ${t.imageUrl}`);
  }

  console.log('\nDone! Refresh your model page to see the images.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
