export const aiAppsTools = [
  {
    slug: 'background-remover',
    label: 'Background Remover',
    description: 'Instantly remove backgrounds from any image with one click',
    likes: 2100,
    favorites: 1800,
  },
  {
    slug: 'background-changer',
    label: 'Background Changer',
    description: 'Replace backgrounds with AI-generated scenes from your prompts',
    likes: 1900,
    favorites: 1500,
  },
  {
    slug: 'face-swap',
    label: 'Face Swap',
    description: 'Seamlessly swap faces between photos in seconds',
    likes: 3200,
    favorites: 2800,
  },
  {
    slug: 'deepfake-videos',
    label: 'Deepfake Videos',
    description: 'Transform any video with AI-powered face replacement',
    likes: 2800,
    favorites: 2400,
  },
  {
    slug: 'ai-eraser',
    label: 'AI Eraser',
    description: 'Remove unwanted objects or people from your photos',
    likes: 1600,
    favorites: 1200,
  },
  {
    slug: 'ai-image-upscale',
    label: 'AI Image Upscale',
    description: 'Enhance and upscale images up to 4x without losing quality',
    likes: 1400,
    favorites: 980,
  },
  {
    slug: 'inpainting',
    label: 'Inpainting',
    description: 'Edit specific areas of your image using masks and prompts',
    likes: 1100,
    favorites: 850,
  },
  {
    slug: 'nsfw-comic-book-reference-image',
    label: 'NSFW Comic Book (Reference Image)',
    description: 'Generate comic-style artwork from reference images',
    likes: 2400,
    favorites: 2100,
  },
  {
    slug: 'ai-filters',
    label: 'AI Filters',
    description: 'Apply stunning AI-powered filters and effects to photos',
    likes: 1300,
    favorites: 920,
  },
  {
    slug: 'ai-avatar-generator',
    label: 'AI Avatar Generator',
    description: 'Generate stunning AI avatars and headshots from your photos with custom prompts',
    likes: 1700,
    favorites: 1400,
  },
  {
    slug: 'manga-coloring',
    label: 'Manga Coloring',
    description: 'Bring black & white manga pages to life with vibrant colors',
    likes: 1900,
    favorites: 1600,
  },
  {
    slug: 'ai-together',
    label: 'AI Together',
    description: 'Combine two people into the same frame magically',
    likes: 2600,
    favorites: 2200,
  },
  {
    slug: 'ai-kissing-video-creator',
    label: 'AI Kissing Video Creator',
    description: 'Create romantic kissing videos from two photos',
    likes: 3100,
    favorites: 2700,
  },
  {
    slug: 'ai-stripe',
    label: 'AI Stripe',
    description: 'Generate stunning stripe effect videos from images',
    likes: 890,
    favorites: 650,
  },
  {
    slug: 'sketch-to-image',
    label: 'Sketch to Image',
    description: 'Transform your sketches and drawings into realistic images',
    likes: 2300,
    favorites: 1950,
  },
  {
    slug: 'cloth-swap',
    label: 'Cloth Swap',
    description: 'Swap outfits on any person using AI — upload a person and a clothing reference',
    likes: 1500,
    favorites: 1100,
  },
] as const;

export type AIAppsTool = (typeof aiAppsTools)[number];
export type AIAppsToolSlug = AIAppsTool['slug'];

const aiAppsToolBySlug: Record<AIAppsToolSlug, AIAppsTool> = Object.fromEntries(
  aiAppsTools.map((tool) => [tool.slug, tool])
) as Record<AIAppsToolSlug, AIAppsTool>;

export function isAIAppsToolSlug(slug: string): slug is AIAppsToolSlug {
  return Object.prototype.hasOwnProperty.call(aiAppsToolBySlug, slug);
}

export function getAIAppsToolBySlug(slug: string): AIAppsTool | null {
  if (!isAIAppsToolSlug(slug)) return null;
  return aiAppsToolBySlug[slug];
}
