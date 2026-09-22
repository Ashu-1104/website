export type Gender = 'MALE' | 'FEMALE' | 'OTHER'

export type Style = 'realistic' | 'semi-realistic' | 'cartoon' | 'anime'

// Legacy Character type for existing components
export interface Character {
  id: string
  name: string
  age: number
  image: string
  tags: string[]
  description: string
  personality: string
  role: string
  gender: Gender
  style: Style
  isOnline: boolean
  isLivecam?: boolean
}

// API Character type from database
export interface APICharacter {
  id: string
  name: string
  description: string | null
  age: number
  style: string
  gender: string
  tags: string[]
  isNsfw: boolean
  favoriteCount: number
  usageCount: number
  createdAt: string
  creator: {
    id: string
    handle: string
    avatarUrl: string | null
  }
  characterAvatarUrl?: string | null
  avatarAsset: {
    url: string
  } | null
  loraModel?: {
    id: string
    name: string
    loraModelUrl: string | null
    triggerWord: string | null
    modelId?: string | null
  } | null
  metadata: {
    role?: string
    isOnline?: boolean
    isLivecam?: boolean
    personality?: string
  } | null
}

// Convert API character to legacy Character format
export function apiCharacterToLegacy(apiChar: APICharacter): Character {
  const metadata = apiChar.metadata || {}
  return {
    id: apiChar.id,
    name: apiChar.name,
    age: apiChar.age,
    image: apiChar.characterAvatarUrl || apiChar.avatarAsset?.url || '/images/placeholder.svg',
    tags: apiChar.tags || [],
    description: apiChar.description || '',
    personality: metadata.personality || '',
    role: metadata.role || '',
    gender: apiChar.gender as Gender,
    style: apiChar.style.toLowerCase() as Style,
    isOnline: metadata.isOnline ?? false,
    isLivecam: metadata.isLivecam ?? false,
  }
}

// Gallery Types - For user generated content
export type GeneratedContentType = 'image' | 'video'

export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface GeneratedImage {
  id: string
  userId: string
  url: string
  thumbnailUrl?: string
  prompt: string
  characterId?: string
  characterName?: string
  style?: Style
  width: number
  height: number
  status: GenerationStatus
  createdAt: Date
  updatedAt: Date
}

export interface GeneratedVideo {
  id: string
  userId: string
  url: string
  thumbnailUrl: string
  prompt: string
  characterId?: string
  characterName?: string
  duration: number // in seconds
  width: number
  height: number
  status: GenerationStatus
  createdAt: Date
  updatedAt: Date
}

export interface GalleryData {
  images: GeneratedImage[]
  videos: GeneratedVideo[]
}

export type GalleryTab = 'images' | 'videos' | 'partners'

// AI Character type
export interface AICharacter {
  id: string
  userId: string
  name: string
  image: string
  thumbnailUrl?: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

// Image Generation Types
// CreateTab: Defines the generation mode in the playground
// - 'image-to-image': Transform an existing image using AI
// - 'text-to-image': Generate new images from text prompts
export type CreateTab = 'image-to-image' | 'text-to-image'

// PreviewTab: Defines the right panel view mode
// - 'templates': Show available style templates for image transformation
// - 'my-creation': Show user's previously generated images
export type PreviewTab = 'templates' | 'my-creation'

export type AspectRatio = '1:1' | '1:2' | '2:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9'

// StyleTemplate: Represents a transformation style template
// Used in image-to-image generation to apply artistic styles
// TODO: Replace mock data with API call to fetch templates from backend
export interface StyleTemplate {
  id: string
  name: string
  thumbnail: string
  // Category for filtering (e.g., 'artistic', 'realistic', 'anime')
  category?: string
  // Number of credits required to use this template
  creditCost?: number
}

// UserCreation: Represents a user's previously generated image
// TODO: This will be populated from the database when backend is connected
export interface UserCreation {
  id: string
  thumbnail: string
  prompt?: string
  styleTemplateName?: string
  createdAt: Date
}

export type ModelCategory = 'Recommended' | 'Character' | 'Cartoon' | 'Realistic' | 'Celebrity' | 'Role' | 'Style' | 'Landscape' | 'Clothing' | 'Sci-Fi' | 'Furry' | 'Design'

export interface AIModel {
  id: string
  name: string
  thumbnail: string
  category: ModelCategory
  description?: string
  baseModel?: string
}

export interface LoRAModel {
  id: string
  name: string
  thumbnail: string
  strength: number
  baseModel?: string
}

// ImageGenerationSettings: Configuration for text-to-image generation
// TODO: Send this payload to the backend API for image generation
export interface ImageGenerationSettings {
  prompt: string
  negativePrompt: string
  numberOfImages: 1 | 2 | 3 | 4
  aspectRatio: AspectRatio
  model: AIModel | null
  loras: LoRAModel[]
}

// ImageToImageSettings: Configuration for image-to-image transformation
// TODO: Send this payload along with the base image to the backend API
export interface ImageToImageSettings {
  // Base64 encoded image or URL from uploaded file
  baseImage: string | null
  // Selected style template for transformation
  selectedTemplate: StyleTemplate | null
}

// Video Generation Types
// VideoCreateTab: Defines the generation mode in the video playground
// - 'image-to-video': Animate/extend an uploaded image into a video
// - 'text-to-video': Generate a video from text prompts
export type VideoCreateTab = 'image-to-video' | 'text-to-video'

// VideoAspectRatio: Aspect ratios supported in video generation
export type VideoAspectRatio = '16:9' | '9:16'

// VideoTemplate: Represents a video template card sourced from DB/API
// Each template has an image + an associated prompt that is inserted when selected.
export interface VideoTemplate {
  id: string
  name: string
  thumbnail: string
  prompt: string
  category?: string
  creditCost?: number
}

// VideoCreation: Represents a user's previously generated video entry
export interface VideoCreation {
  id: string
  thumbnail: string
  prompt?: string
  duration?: number // in seconds
  createdAt: Date
}
