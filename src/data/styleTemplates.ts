/**
 * Style Templates Data
 *
 * This file contains mock data for image transformation style templates.
 * These templates are used in the Image-to-Image generation feature.
 *
 * TODO: Backend Integration
 * - Replace this mock data with an API call to fetch templates
 * - API endpoint suggestion: GET /api/templates
 * - Consider adding pagination for large template collections
 * - Add caching strategy for frequently accessed templates
 */

import type { StyleTemplate, UserCreation } from '@/types';

/**
 * Mock style templates for image transformation
 * Each template represents a different artistic style that can be applied to images
 *
 * Structure:
 * - id: Unique identifier (will map to backend template ID)
 * - name: Display name shown under the template card
 * - thumbnail: Image URL for the template preview
 * - category: Optional category for filtering
 * - creditCost: Optional credit cost (defaults to standard rate if not specified)
 */
export const styleTemplates: StyleTemplate[] = [
  {
    id: 'cloth-remover',
    name: 'Cloth Remover',
    thumbnail: '/images/placeholder.svg',
    category: 'transformation',
    creditCost: 40,
  },
  {
    id: 'breast-expansion',
    name: 'Breast Expansion',
    thumbnail: '/images/placeholder.svg',
    category: 'transformation',
    creditCost: 40,
  },
  {
    id: 'clay',
    name: 'Clay',
    thumbnail: '/images/placeholder.svg',
    category: 'artistic',
    creditCost: 30,
  },
  {
    id: 'pixar',
    name: 'Pixar',
    thumbnail: '/images/placeholder.svg',
    category: 'artistic',
    creditCost: 35,
  },
  {
    id: 'ghibli',
    name: 'Ghibli',
    thumbnail: '/images/placeholder.svg',
    category: 'anime',
    creditCost: 35,
  },
  {
    id: 'pixel-art',
    name: 'Pixel Art',
    thumbnail: '/images/placeholder.svg',
    category: 'artistic',
    creditCost: 25,
  },
  {
    id: 'knitting-filter',
    name: 'Knitting Filter',
    thumbnail: '/images/placeholder.svg',
    category: 'artistic',
    creditCost: 30,
  },
  {
    id: 'puppet',
    name: 'Puppet',
    thumbnail: '/images/placeholder.svg',
    category: 'artistic',
    creditCost: 30,
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    thumbnail: '/images/placeholder.svg',
    category: 'artistic',
    creditCost: 25,
  },
  {
    id: 'oil-painting',
    name: 'Oil Painting',
    thumbnail: '/images/placeholder.svg',
    category: 'artistic',
    creditCost: 30,
  },
  {
    id: 'sketch',
    name: 'Sketch',
    thumbnail: '/images/placeholder.svg',
    category: 'artistic',
    creditCost: 20,
  },
  {
    id: 'anime',
    name: 'Anime',
    thumbnail: '/images/placeholder.svg',
    category: 'anime',
    creditCost: 35,
  },
];

/**
 * Mock user creations for "My Creation" tab
 * This will be replaced with actual user data from the database
 *
 * TODO: Backend Integration
 * - Replace with API call: GET /api/user/creations
 * - Add pagination support for large collections
 * - Include sorting options (newest, oldest, etc.)
 */
export const mockUserCreations: UserCreation[] = [];

/**
 * Helper function to get template by ID
 * Useful for quick lookups when user selects a template
 *
 * @param id - Template ID to search for
 * @returns StyleTemplate if found, undefined otherwise
 *
 * TODO: When connected to backend, this can be replaced with
 * a cached lookup or direct API call for single template
 */
export function getTemplateById(id: string): StyleTemplate | undefined {
  return styleTemplates.find(template => template.id === id);
}

/**
 * Helper function to filter templates by category
 *
 * @param category - Category to filter by
 * @returns Array of templates matching the category
 */
export function getTemplatesByCategory(category: string): StyleTemplate[] {
  return styleTemplates.filter(template => template.category === category);
}
