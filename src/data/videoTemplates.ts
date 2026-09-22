/**
 * Video Templates Data
 *
 * This file contains mock data for the Video Generation playground.
 *
 * Templates are expected to be stored in the database and served via API.
 * Each template has:
 * - a thumbnail image (for the card UI)
 * - a prompt string (inserted into the prompt field on selection)
 *
 * TODO: Backend Integration
 * - Replace mock data with API calls (with pagination)
 * - Consider server-side filtering/search
 * - Cache and incrementally load templates for large collections
 */

import type { VideoCreateTab, VideoCreation, VideoTemplate } from '@/types'

const placeholder = '/images/placeholder.svg'

/**
 * Image → Video templates
 * TODO: Replace with DB-driven templates (GET /api/video/templates?mode=image-to-video)
 */
export const imageToVideoTemplates: VideoTemplate[] = [
  {
    id: 'i2v-smooth-camera',
    name: 'Smooth Camera',
    thumbnail: placeholder,
    prompt: 'Add subtle camera movement and gentle motion while preserving the original subject and composition.',
    category: 'motion',
    creditCost: 100,
  },
  {
    id: 'i2v-cinematic',
    name: 'Cinematic',
    thumbnail: placeholder,
    prompt: 'Create a cinematic scene with soft lighting, shallow depth of field, and natural motion.',
    category: 'style',
    creditCost: 120,
  },
  {
    id: 'i2v-zoom-in',
    name: 'Slow Zoom In',
    thumbnail: placeholder,
    prompt: 'Apply a slow zoom-in and subtle parallax for a dynamic, immersive feel.',
    category: 'motion',
    creditCost: 100,
  },
  {
    id: 'i2v-loop',
    name: 'Seamless Loop',
    thumbnail: placeholder,
    prompt: 'Generate a seamless looping animation with smooth transitions and consistent lighting.',
    category: 'motion',
    creditCost: 110,
  },
  {
    id: 'i2v-lighting',
    name: 'Light Sweep',
    thumbnail: placeholder,
    prompt: 'Add a subtle lighting sweep and gentle movement while keeping the subject unchanged.',
    category: 'effects',
    creditCost: 100,
  },
  {
    id: 'i2v-rain',
    name: 'Rainy Mood',
    thumbnail: placeholder,
    prompt: 'Add realistic rain and wet reflections with slight camera shake, preserving the original image content.',
    category: 'effects',
    creditCost: 120,
  },
  {
    id: 'i2v-wind',
    name: 'Wind Motion',
    thumbnail: placeholder,
    prompt: 'Add gentle wind-driven motion (hair, clothing, foliage) while keeping the main subject stable.',
    category: 'motion',
    creditCost: 110,
  },
  {
    id: 'i2v-neon',
    name: 'Neon Glow',
    thumbnail: placeholder,
    prompt: 'Add neon glow accents and subtle animated light flicker without changing the subject.',
    category: 'style',
    creditCost: 120,
  },
]

/**
 * Text → Video templates
 * TODO: Replace with DB-driven templates (GET /api/video/templates?mode=text-to-video)
 */
export const textToVideoTemplates: VideoTemplate[] = [
  {
    id: 't2v-cinematic-walk',
    name: 'Cinematic Walk',
    thumbnail: placeholder,
    prompt: 'A cinematic shot of a person walking through a softly lit scene, smooth camera movement, realistic motion, 24fps.',
    category: 'cinematic',
    creditCost: 100,
  },
  {
    id: 't2v-city-night',
    name: 'City Night',
    thumbnail: placeholder,
    prompt: 'Night city street with neon lights reflecting on wet pavement, slow dolly shot, atmospheric haze, high detail.',
    category: 'scene',
    creditCost: 110,
  },
  {
    id: 't2v-ocean-sunrise',
    name: 'Ocean Sunrise',
    thumbnail: placeholder,
    prompt: 'Sunrise over the ocean, gentle waves, warm color grading, smooth pan, natural motion, serene mood.',
    category: 'scene',
    creditCost: 100,
  },
  {
    id: 't2v-anime-action',
    name: 'Anime Action',
    thumbnail: placeholder,
    prompt: 'Anime style dynamic action sequence with motion blur, dramatic lighting, crisp linework, smooth animation.',
    category: 'anime',
    creditCost: 120,
  },
  {
    id: 't2v-studio-portrait',
    name: 'Studio Portrait',
    thumbnail: placeholder,
    prompt: 'Studio portrait video, soft key light, subtle head movement, shallow depth of field, clean background.',
    category: 'portrait',
    creditCost: 100,
  },
  {
    id: 't2v-product-spin',
    name: 'Product Spin',
    thumbnail: placeholder,
    prompt: 'A product spinning on a turntable, clean studio lighting, smooth rotation, high sharpness.',
    category: 'product',
    creditCost: 90,
  },
  {
    id: 't2v-space',
    name: 'Space Drift',
    thumbnail: placeholder,
    prompt: 'A slow drift through space with stars and nebulas, cinematic color grading, smooth camera movement.',
    category: 'scene',
    creditCost: 120,
  },
  {
    id: 't2v-fantasy-forest',
    name: 'Fantasy Forest',
    thumbnail: placeholder,
    prompt: 'A magical forest with glowing particles, volumetric light rays, slow camera push, dreamy atmosphere.',
    category: 'fantasy',
    creditCost: 120,
  },
]

/**
 * Mock user video creations for "My Creation" tab.
 * TODO: Replace with API call: GET /api/user/videos
 */
export const mockUserVideoCreations: VideoCreation[] = []

export function getVideoTemplatesByMode(mode: VideoCreateTab): VideoTemplate[] {
  return mode === 'image-to-video' ? imageToVideoTemplates : textToVideoTemplates
}

