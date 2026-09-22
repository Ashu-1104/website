'use client';
/* eslint-disable @next/next/no-img-element */

/**
 * Create Page - AI Image Generation Playground
 *
 * This page provides two main generation modes:
 * 1. Image to Image: Transform existing images using style templates
 * 2. Text to Image: Generate new images from text prompts
 *
 * Architecture Notes:
 * - State is managed locally with React hooks
 * - All data fetching points are marked with TODO for backend integration
 * - File uploads are handled client-side with FileReader API
 * - Memoization is used extensively to prevent unnecessary re-renders
 *
 * Backend Integration Points:
 * - Style templates: Replace mock data with API call
 * - User creations: Fetch from user's gallery endpoint
 * - Image generation: POST to generation API with settings
 * - File upload: Consider pre-signed URLs for large files
 */

import { useState, Suspense, useCallback, useMemo, useRef, useEffect, ChangeEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Sparkles,
  Shuffle,
  Settings2,
  Plus,
  ArrowRightLeft,
  Coins,
  X,
  Search,
  Heart,
	  Upload,
	  Download,
	  Loader2,
	  Filter,
	  Check,
	} from 'lucide-react';
import type { CreateTab, PreviewTab, AIModel, LoRAModel, ModelCategory, AspectRatio, StyleTemplate } from '@/types';
import { promptCategories } from '@/data/promptIdeas';
import { mockUserCreations } from '@/data/styleTemplates';
import { useStyleTemplates, apiFetch, getUserId } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';
import CreateSeoShell, { CREATE_FAQ } from './CreateSeoShell';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Navigation tabs for the model selector header
 */
const MODEL_NAV_TABS = ['Favourite', 'Checkpoints', 'Mine'] as const;
type ModelNavTab = typeof MODEL_NAV_TABS[number];

/**
 * Tag filters for the model selector
 */
const MODEL_TAGS: ModelCategory[] = [
  'Recommended', 'Character', 'Cartoon', 'Realistic', 'Celebrity', 'Role',
  'Style', 'Landscape', 'Clothing', 'Sci-Fi', 'Furry', 'Design',
];

/**
 * Checkpoint filter options for the model selector (sorted A-Z)
 */
const MODEL_FILTER_OPTIONS = ['Flux', 'Illustrious', 'Pony', 'SDXL', 'Z Image'] as const;
type ModelFilterOption = typeof MODEL_FILTER_OPTIONS[number];

/** Map display filter names to database baseModel enum values */
const FILTER_TO_BASE_MODEL: Record<ModelFilterOption, string> = {
  'Flux': 'FLUX',
  'Illustrious': 'ILLUSTRIOUS',
  'Pony': 'PONY',
  'SDXL': 'SDXL',
  'Z Image': 'SD_1_5',
};

/**
 * Mock AI models for text-to-image generation
 * TODO: Replace with API call to fetch available models
 * API endpoint suggestion: GET /api/models
 */
const mockModels: AIModel[] = [
  { id: '1', name: 'SeaArt Infinity', thumbnail: '/images/placeholder.svg', category: 'Recommended', baseModel: 'SDXL' },
  { id: '2', name: 'SeaArt Film', thumbnail: '/images/placeholder.svg', category: 'Recommended', baseModel: 'SDXL' },
  { id: '3', name: 'Z Image Turbo', thumbnail: '/images/placeholder.svg', category: 'Recommended', baseModel: 'Flux' },
  { id: '4', name: 'CyberRealistic Pony', thumbnail: '/images/placeholder.svg', category: 'Recommended', baseModel: 'Pony' },
  { id: '5', name: 'Illustrious Simple', thumbnail: '/images/placeholder.svg', category: 'Recommended', baseModel: 'Illustrious' },
  { id: '6', name: 'GR Multi-Style', thumbnail: '/images/placeholder.svg', category: 'Recommended', baseModel: 'Illustrious' },
  { id: '7', name: 'Cartoon Master', thumbnail: '/images/placeholder.svg', category: 'Cartoon', baseModel: 'SDXL' },
  { id: '8', name: 'Anime Style Pro', thumbnail: '/images/placeholder.svg', category: 'Cartoon', baseModel: 'Pony' },
  { id: '9', name: 'Toon Generator', thumbnail: '/images/placeholder.svg', category: 'Cartoon', baseModel: 'Flux' },
  { id: '10', name: 'Photo Realistic V2', thumbnail: '/images/placeholder.svg', category: 'Realistic', baseModel: 'SDXL' },
  { id: '11', name: 'Ultra Realistic', thumbnail: '/images/placeholder.svg', category: 'Realistic', baseModel: 'SDXL' },
  { id: '12', name: 'Real Vision XL', thumbnail: '/images/placeholder.svg', category: 'Realistic', baseModel: 'SDXL' },
  { id: '13', name: 'Celebrity Look', thumbnail: '/images/placeholder.svg', category: 'Celebrity', baseModel: 'Illustrious' },
  { id: '14', name: 'Star Portrait', thumbnail: '/images/placeholder.svg', category: 'Celebrity', baseModel: 'Pony' },
  { id: '15', name: 'Sci-Fi Explorer', thumbnail: '/images/placeholder.svg', category: 'Sci-Fi', baseModel: 'Flux' },
  { id: '16', name: 'Cyberpunk Dreams', thumbnail: '/images/placeholder.svg', category: 'Sci-Fi', baseModel: 'SDXL' },
  { id: '17', name: 'Furry Art Pro', thumbnail: '/images/placeholder.svg', category: 'Furry', baseModel: 'Pony' },
  { id: '18', name: 'Landscape Master', thumbnail: '/images/placeholder.svg', category: 'Landscape', baseModel: 'Flux' },
];

/**
 * Navigation tabs for the LoRA selector header
 */
const LORA_NAV_TABS = ['Favourite', 'LoRA Model', 'Mine'] as const;
type LoRANavTab = typeof LORA_NAV_TABS[number];

/**
 * Mock LoRA models for text-to-image generation
 * TODO: Replace with API call: GET /api/models?type=LORA
 */
const mockLoRAs: LoRAModel[] = [
  { id: 'l1', name: 'Detail Enhancer XL', thumbnail: '/images/placeholder.svg', strength: 0.7, baseModel: 'SDXL' },
  { id: 'l2', name: 'Face Fix SDXL', thumbnail: '/images/placeholder.svg', strength: 0.8, baseModel: 'SDXL' },
  { id: 'l3', name: 'Aesthetic SDXL', thumbnail: '/images/placeholder.svg', strength: 0.6, baseModel: 'SDXL' },
  { id: 'l4', name: 'Sharp Focus XL', thumbnail: '/images/placeholder.svg', strength: 0.5, baseModel: 'SDXL' },
  { id: 'l5', name: 'Cinematic Light XL', thumbnail: '/images/placeholder.svg', strength: 0.7, baseModel: 'SDXL' },
  { id: 'l6', name: 'Anime LoRA XL', thumbnail: '/images/placeholder.svg', strength: 0.8, baseModel: 'SDXL' },
  { id: 'l7', name: 'Pony Style LoRA', thumbnail: '/images/placeholder.svg', strength: 0.7, baseModel: 'Pony' },
  { id: 'l8', name: 'Pony Detail Fix', thumbnail: '/images/placeholder.svg', strength: 0.6, baseModel: 'Pony' },
  { id: 'l9', name: 'Pony Face Enhance', thumbnail: '/images/placeholder.svg', strength: 0.8, baseModel: 'Pony' },
  { id: 'l10', name: 'Pony Smooth Skin', thumbnail: '/images/placeholder.svg', strength: 0.5, baseModel: 'Pony' },
  { id: 'l11', name: 'Illustrious Detail', thumbnail: '/images/placeholder.svg', strength: 0.7, baseModel: 'Illustrious' },
  { id: 'l12', name: 'Illustrious Eyes', thumbnail: '/images/placeholder.svg', strength: 0.6, baseModel: 'Illustrious' },
  { id: 'l13', name: 'Illustrious Hair', thumbnail: '/images/placeholder.svg', strength: 0.5, baseModel: 'Illustrious' },
  { id: 'l14', name: 'Flux Realism LoRA', thumbnail: '/images/placeholder.svg', strength: 0.8, baseModel: 'Flux' },
  { id: 'l15', name: 'Flux Art Style', thumbnail: '/images/placeholder.svg', strength: 0.6, baseModel: 'Flux' },
  { id: 'l16', name: 'Flux Cinematic', thumbnail: '/images/placeholder.svg', strength: 0.7, baseModel: 'Flux' },
  { id: 'l17', name: 'Z Image Enhancer', thumbnail: '/images/placeholder.svg', strength: 0.7, baseModel: 'Z Image' },
  { id: 'l18', name: 'Z Image Sharp', thumbnail: '/images/placeholder.svg', strength: 0.6, baseModel: 'Z Image' },
];

/**
 * Supported image file types for upload
 * Used in the file input accept attribute
 */
const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/gif';

/**
 * Aspect ratio to pixel dimensions mapping (max 1024 on longest side)
 */
const ASPECT_RATIO_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '1:2': { width: 512, height: 1024 },
  '2:1': { width: 1024, height: 512 },
  '2:3': { width: 688, height: 1024 },
  '3:2': { width: 1024, height: 688 },
  '3:4': { width: 768, height: 1024 },
  '4:3': { width: 1024, height: 768 },
  '4:5': { width: 816, height: 1024 },
  '5:4': { width: 1024, height: 816 },
  '9:16': { width: 576, height: 1024 },
  '16:9': { width: 1024, height: 576 },
};

const PORTRAIT_RATIOS: AspectRatio[] = ['1:2', '2:3', '3:4', '4:5', '9:16'];
const LANDSCAPE_RATIOS: AspectRatio[] = ['2:1', '3:2', '4:3', '5:4', '16:9'];

/**
 * Maximum file size for image upload (10MB)
 * TODO: Adjust based on backend limits
 */
const MAX_FILE_SIZE = 8 * 1024 * 1024;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parses a comma-separated prompt string into an array
 * Used for managing prompt tags/keywords
 */
const parsePromptToArray = (prompt: string): string[] => {
  if (!prompt.trim()) return [];
  return prompt.split(',').map(item => item.trim()).filter(Boolean);
};

/**
 * Converts an array of prompt keywords back to comma-separated string
 */
const arrayToPrompt = (arr: string[]): string => arr.join(', ');

/**
 * Validates uploaded file
 * @returns Error message if invalid, null if valid
 */
const validateImageFile = (file: File): string | null => {
  if (!file.type.startsWith('image/')) {
    return 'Please upload an image file';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File size must be less than 8MB';
  }
  return null;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function CreatePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const filterWrapperRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  // -------------------------------------------------------------------------
  // URL-based State
  // -------------------------------------------------------------------------

  /**
   * Active generation mode from URL parameter
   * Default: 'image-to-image' (first tab)
   */
  const activeTab: CreateTab = useMemo(() => {
    const type = searchParams.get('type');
    return type === 'text-to-image' ? 'text-to-image' : 'image-to-image';
  }, [searchParams]);

  // -------------------------------------------------------------------------
  // Image to Image State
  // -------------------------------------------------------------------------

  // Base image for transformation (stored as data URL for preview)
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [baseImageFile, setBaseImageFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Prompt for image-to-image transformation
  const [imageToImagePrompt, setImageToImagePrompt] = useState('');

  // Selected style template for transformation
  const [selectedTemplate, setSelectedTemplate] = useState<StyleTemplate | null>(null);

  // -------------------------------------------------------------------------
  // Text to Image State
  // -------------------------------------------------------------------------

  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [showNegativePrompt, setShowNegativePrompt] = useState(false);
  const [numberOfImages, setNumberOfImages] = useState<1 | 2 | 3 | 4>(2);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('2:3');
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>(mockModels[0]);
  const [selectedLoras, setSelectedLoras] = useState<LoRAModel[]>([]);
  const [showPromptIdeas, setShowPromptIdeas] = useState(false);
  const [showImageSettings, setShowImageSettings] = useState(false);
  const [activeCategory, setActiveCategory] = useState(promptCategories[0].id);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [generatingCount, setGeneratingCount] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [generatedAspectRatio, setGeneratedAspectRatio] = useState<AspectRatio>('2:3');

  // -------------------------------------------------------------------------
  // Model Selector State
  // -------------------------------------------------------------------------

  const [showModelSelector, setShowModelSelector] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [activeNavTab, setActiveNavTab] = useState<ModelNavTab>('Checkpoints');
  const [activeModelTag, setActiveModelTag] = useState<ModelCategory>('Recommended');
  const [favoriteModelIds, setFavoriteModelIds] = useState<Set<string>>(new Set());
  const [showModelFilter, setShowModelFilter] = useState(false);
  const [activeModelFilters, setActiveModelFilters] = useState<Set<ModelFilterOption>>(new Set());

  // Database-fetched models
  const [dbModels, setDbModels] = useState<AIModel[]>([]);
  const [dbLoRAs, setDbLoRAs] = useState<LoRAModel[]>([]);

  // Fetch checkpoint models from database
  useEffect(() => {
    let cancelled = false;
    async function fetchModels() {
      try {
        const data = await apiFetch<{ items: Array<{ id: string; name: string; thumbnailUrl: string | null; modelType: string; baseModel: string; badge: string | null; description: string | null }> }>('/api/models?type=CHECKPOINT&limit=50&includeNsfw=true&publicOnly=false');
        if (cancelled) return;
        const models: AIModel[] = data.items.map(item => ({
          id: item.id,
          name: item.name,
          thumbnail: item.thumbnailUrl || '/images/placeholder.svg',
          category: 'Recommended' as ModelCategory,
          baseModel: item.baseModel,
        }));
        setDbModels(models);
        if (models.length > 0) {
          setSelectedModel(prev => {
            // Only update if still using a mock model
            const isMock = mockModels.some(m => m.id === prev.id);
            return isMock ? models[0] : prev;
          });
        }
      } catch (err) {
        console.error('Failed to fetch checkpoint models:', err);
      }
    }
    fetchModels();
    return () => { cancelled = true; };
  }, []);

  // Fetch LoRA models from database
  useEffect(() => {
    let cancelled = false;
    async function fetchLoRAs() {
      try {
        const data = await apiFetch<{ items: Array<{ id: string; name: string; thumbnailUrl: string | null; modelType: string; baseModel: string; badge: string | null; description: string | null }> }>('/api/models?type=LORA&limit=50&includeNsfw=true&publicOnly=false');
        if (cancelled) return;
        const loras: LoRAModel[] = data.items.map(item => ({
          id: item.id,
          name: item.name,
          thumbnail: item.thumbnailUrl || '/images/placeholder.svg',
          strength: 0.7,
          baseModel: item.baseModel,
        }));
        setDbLoRAs(loras);
      } catch (err) {
        console.error('Failed to fetch LoRA models:', err);
      }
    }
    fetchLoRAs();
    return () => { cancelled = true; };
  }, []);

  // -------------------------------------------------------------------------
  // Remix: pre-fill fields from sessionStorage when navigating from Remix button
  // -------------------------------------------------------------------------

  const [remixApplied, setRemixApplied] = useState(false);
  const [remixWaiting, setRemixWaiting] = useState(false);

  // Set waiting flag immediately so we know to retry when models load
  useEffect(() => {
    if (searchParams.get('remix') && !remixApplied) setRemixWaiting(true);
  }, [searchParams, remixApplied]);

  useEffect(() => {
    if (remixApplied) return;
    const remixParam = searchParams.get('remix');
    if (!remixParam) return;

    // Wait for both model sources to load (retry when dbModels/dbLoRAs change)
    // After 2 seconds, proceed anyway (models may have failed to load)
    if ((dbModels.length === 0 || dbLoRAs.length === 0) && remixWaiting) {
      const timer = setTimeout(() => setRemixWaiting(false), 2000);
      return () => clearTimeout(timer);
    }

    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem('vp_remix_data');
    } catch { /* ignore */ }
    if (!raw) return;

    try {
      const data = JSON.parse(raw) as {
        prompt?: string;
        negativePrompt?: string;
        seed?: string;
        sampler?: string;
        checkpoint?: { name: string; modelSlug?: string | null; modelId?: string | null } | null;
        loras?: Array<{
          name: string;
          weight?: number | null;
          modelSlug?: string | null;
          modelId?: string | null;
          thumbnailUrl?: string | null;
        }>;
      };

      // Prompt
      if (data.prompt) setPrompt(data.prompt);

      // Negative prompt
      if (data.negativePrompt) {
        setNegativePrompt(data.negativePrompt);
        setShowNegativePrompt(true);
      }

      // Checkpoint model — match by modelId first, then by name
      if (data.checkpoint) {
        const allCheckpoints = [...dbModels, ...mockModels];
        const match =
          (data.checkpoint.modelId
            ? allCheckpoints.find((m) => m.id === data.checkpoint!.modelId)
            : null) ??
          allCheckpoints.find(
            (m) => m.name.toLowerCase() === data.checkpoint!.name.toLowerCase()
          );
        if (match) setSelectedModel(match);
      }

      // LoRA models — match by modelId first, then by name
      if (Array.isArray(data.loras) && data.loras.length > 0) {
        const allLoRAs = [...dbLoRAs, ...mockLoRAs];
        const matched: LoRAModel[] = [];
        const seen = new Set<string>();
        for (const loraData of data.loras) {
          const match =
            (loraData.modelId
              ? allLoRAs.find((l) => l.id === loraData.modelId)
              : null) ??
            allLoRAs.find(
              (l) => l.name.toLowerCase() === loraData.name.toLowerCase()
            );
          if (match) {
            if (!seen.has(match.id)) {
              matched.push({
                ...match,
                strength: typeof loraData.weight === 'number' ? loraData.weight : match.strength,
              });
              seen.add(match.id);
            }
            continue;
          }
          const fallbackId = loraData.modelId ?? loraData.name;
          if (!fallbackId || seen.has(fallbackId)) continue;
          matched.push({
            id: fallbackId,
            name: loraData.name,
            thumbnail: loraData.thumbnailUrl ?? '/images/placeholder.svg',
            strength: typeof loraData.weight === 'number' ? loraData.weight : 0.7,
          });
          seen.add(fallbackId);
        }
        if (matched.length > 0) setSelectedLoras(matched);
      }

      // Enable advanced config if checkpoint or LoRA data exists
      if (data.checkpoint || (Array.isArray(data.loras) && data.loras.length > 0)) {
        setShowAdvancedConfig(true);
      }

      // Clean up so it doesn't re-apply on next visit
      sessionStorage.removeItem('vp_remix_data');
    } catch { /* ignore parse errors */ }

    setRemixApplied(true);
  }, [dbModels, dbLoRAs, remixApplied, remixWaiting, searchParams]);

  // -------------------------------------------------------------------------
  // LoRA Selector State
  // -------------------------------------------------------------------------

  const [showLoRASelector, setShowLoRASelector] = useState(false);
  const [loraSearchQuery, setLoraSearchQuery] = useState('');
  const [activeLoRANavTab, setActiveLoRANavTab] = useState<LoRANavTab>('LoRA Model');
  const [favoriteLoRAIds, setFavoriteLoRAIds] = useState<Set<string>>(new Set());

  // -------------------------------------------------------------------------
  // Right Panel State (Templates / My Creation)
  // -------------------------------------------------------------------------

  const [previewTab, setPreviewTab] = useState<PreviewTab>('templates');

  const {
    data: styleTemplatesData,
    loading: styleTemplatesLoading,
    error: styleTemplatesError,
  } = useStyleTemplates({ limit: 100 });

  const styleTemplates = useMemo<StyleTemplate[]>(() => {
    const items = styleTemplatesData?.items ?? [];
    return items.map((template) => ({
      id: template.id,
      name: template.name,
      thumbnail: template.thumbnailUrl || '/images/placeholder.svg',
      category: template.category,
      creditCost: template.creditCost,
    }));
  }, [styleTemplatesData]);

  // -------------------------------------------------------------------------
  // Memoized Values (Performance Optimization)
  // -------------------------------------------------------------------------

  /**
   * Calculate credits needed based on number of images
   * TODO: Adjust calculation based on actual pricing from backend
   */
  const creditsNeeded = useMemo(() => {
    if (activeTab === 'image-to-image') {
      return selectedTemplate?.creditCost ?? 40;
    }
    return numberOfImages * 3;
  }, [activeTab, numberOfImages, selectedTemplate]);

  /**
   * Get the currently active prompt category data
   */
  const activeCategoryData = useMemo(
    () => promptCategories.find(cat => cat.id === activeCategory),
    [activeCategory]
  );

  /**
   * Parse prompt into array for tag management
   */
  const promptArray = useMemo(() => parsePromptToArray(prompt), [prompt]);

  /**
   * Filter models based on search query and selected category
   * Uses efficient filtering with early termination
   */
  const filteredModels = useMemo(() => {
    // Use database models if available, fall back to mock data
    const source = dbModels.length > 0 ? dbModels : mockModels;
    let models = source;

    // Filter by nav tab
    if (activeNavTab === 'Favourite') {
      models = models.filter(model => favoriteModelIds.has(model.id));
    }

    // Filter by baseModel filter selection
    if (activeModelFilters.size > 0) {
      const allowedBaseModels = new Set(
        [...activeModelFilters].map(f => FILTER_TO_BASE_MODEL[f])
      );
      models = models.filter(model => model.baseModel && allowedBaseModels.has(model.baseModel));
    }

    // Filter by search query (case-insensitive)
    if (modelSearchQuery.trim()) {
      const query = modelSearchQuery.toLowerCase();
      models = models.filter(model => model.name.toLowerCase().includes(query));
    }

    return models;
  }, [activeNavTab, favoriteModelIds, modelSearchQuery, dbModels, activeModelFilters]);

  /**
   * Filter LoRAs based on search, nav tab, and checkpoint compatibility
   */
  const filteredLoras = useMemo(() => {
    // Use database LoRAs if available, fall back to mock data
    const source = dbLoRAs.length > 0 ? dbLoRAs : mockLoRAs;
    let loras = source;

    // Auto-filter by selected checkpoint base model
    if (activeModelFilters.size > 0) {
      const allowedBaseModels = new Set(
        [...activeModelFilters].map(f => FILTER_TO_BASE_MODEL[f])
      );
      loras = loras.filter(lora => lora.baseModel && allowedBaseModels.has(lora.baseModel));
    }

    // Filter by nav tab
    if (activeLoRANavTab === 'Favourite') {
      loras = loras.filter(lora => favoriteLoRAIds.has(lora.id));
    }

    // Filter by search query
    if (loraSearchQuery.trim()) {
      const query = loraSearchQuery.toLowerCase();
      loras = loras.filter(lora => lora.name.toLowerCase().includes(query));
    }

    return loras;
  }, [activeLoRANavTab, favoriteLoRAIds, loraSearchQuery, activeModelFilters, dbLoRAs]);

  // -------------------------------------------------------------------------
  // Callbacks - Tab Navigation
  // -------------------------------------------------------------------------

  /**
   * Handle main tab change (Image to Image / Text to Image)
   * Updates URL for shareable links and browser history
   */
  const handleTabChange = useCallback((tab: CreateTab) => {
    router.push(`/create?type=${tab}`);
  }, [router]);

  /**
   * Handle preview panel tab change (Templates / My Creation)
   */
  const handlePreviewTabChange = useCallback((tab: PreviewTab) => {
    setPreviewTab(tab);
  }, []);

  // -------------------------------------------------------------------------
  // Callbacks - Image Upload
  // -------------------------------------------------------------------------

  /**
   * Trigger file input click
   */
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Handle file selection from input
   * Validates file and converts to data URL for preview
   */
  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const error = validateImageFile(file);
    if (error) {
      setUploadError(error);
      return;
    }

    setUploadError(null);
    setBaseImageFile(file);

    // Convert to data URL for preview
    // TODO: For production, consider uploading to cloud storage
    // and using the returned URL instead
    const reader = new FileReader();
    reader.onload = (event) => {
      setBaseImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  /**
   * Clear uploaded base image
   */
  const handleClearBaseImage = useCallback(() => {
    setBaseImage(null);
    setBaseImageFile(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // -------------------------------------------------------------------------
  // Callbacks - Template Selection
  // -------------------------------------------------------------------------

  /**
   * Handle template selection from the grid
   */
  const handleTemplateSelect = useCallback((template: StyleTemplate) => {
    setSelectedTemplate(prev =>
      prev?.id === template.id ? null : template
    );
  }, []);

  // -------------------------------------------------------------------------
  // Callbacks - Prompt Management
  // -------------------------------------------------------------------------

  /**
   * Generate a random prompt by picking one random item from each prompt category
   * Combines items from style, scene, vibe, pose, clothing, etc. into a single prompt
   */
  const handleRandomPrompt = useCallback(() => {
    const randomValues = promptCategories.map(category => {
      const randomIndex = Math.floor(Math.random() * category.values.length);
      return category.values[randomIndex];
    });
    setPrompt(arrayToPrompt(randomValues));
  }, []);

  /**
   * Toggle a prompt idea tag - adds if not present, removes if present
   */
  const handlePromptIdeaClick = useCallback((value: string) => {
    setPrompt(currentPrompt => {
      const currentArray = parsePromptToArray(currentPrompt);
      const lowerValue = value.toLowerCase();
      const existingIndex = currentArray.findIndex(item => item.toLowerCase() === lowerValue);

      if (existingIndex !== -1) {
        currentArray.splice(existingIndex, 1);
      } else {
        currentArray.push(value);
      }
      return arrayToPrompt(currentArray);
    });
  }, []);

  /**
   * Check if a prompt idea value is currently selected
   */
  const isValueSelected = useCallback((value: string): boolean => {
    return promptArray.some(item => item.toLowerCase() === value.toLowerCase());
  }, [promptArray]);

  // -------------------------------------------------------------------------
  // Callbacks - UI Toggles
  // -------------------------------------------------------------------------

  /**
   * Get pixel dimensions for the current aspect ratio
   */
  const currentDimensions = useMemo(() => ASPECT_RATIO_DIMENSIONS[aspectRatio], [aspectRatio]);

  const QUICK_RATIOS: AspectRatio[] = ['1:1', '9:16', '2:3'];
  const isMoreRatioSelected = !QUICK_RATIOS.includes(aspectRatio);

  const openPromptIdeas = useCallback(() => setShowPromptIdeas(true), []);
  const closePromptIdeas = useCallback(() => setShowPromptIdeas(false), []);
  const openImageSettings = useCallback(() => {
    if (moreButtonRef.current) {
      const rect = moreButtonRef.current.getBoundingClientRect();
      const popoverWidth = 270;
      const popoverHeight = 420;
      const gap = 12;

      // Horizontal: prefer right of button, fall back to left
      let left = rect.right + gap;
      if (left + popoverWidth > window.innerWidth - 16) {
        left = rect.left - popoverWidth - gap;
      }

      // Vertical: align top with button, shift up if overflows bottom
      let top = rect.top;
      if (top + popoverHeight > window.innerHeight - 16) {
        top = window.innerHeight - popoverHeight - 16;
      }
      if (top < 16) top = 16;

      setPopoverPos({ top, left });
    }
    setShowImageSettings(true);
  }, []);
  const closeImageSettings = useCallback(() => {
    setShowImageSettings(false);
    setPopoverPos(null);
  }, []);

  const handleAspectRatioSelect = useCallback((ratio: AspectRatio) => {
    setAspectRatio(ratio);
    setShowImageSettings(false);
  }, []);
  const toggleNegativePrompt = useCallback(() => setShowNegativePrompt(prev => !prev), []);
  const toggleAdvancedConfig = useCallback(() => setShowAdvancedConfig(prev => !prev), []);

  // -------------------------------------------------------------------------
  // Callbacks - Model Selector
  // -------------------------------------------------------------------------

  const openModelSelector = useCallback(() => setShowModelSelector(true), []);
  const closeModelSelector = useCallback(() => {
    setShowModelSelector(false);
    setModelSearchQuery('');
    setShowModelFilter(false);
  }, []);

  // Close model selector on ESC key
  useEffect(() => {
    if (!showModelSelector) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModelSelector();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModelSelector, closeModelSelector]);

  const handleModelSelect = useCallback((model: AIModel) => {
    setSelectedModel(model);
    closeModelSelector();
  }, [closeModelSelector]);

  const toggleFavoriteModel = useCallback((modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteModelIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(modelId)) {
        newSet.delete(modelId);
      } else {
        newSet.add(modelId);
      }
      return newSet;
    });
  }, []);

  const handleDownloadImage = useCallback(async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `generation-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  }, []);

  // Close lightbox on ESC key
  useEffect(() => {
    if (!lightboxImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxImage(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage]);

  const handleModelSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setModelSearchQuery(e.target.value);
  }, []);

  const handleNavTabChange = useCallback((tab: ModelNavTab) => {
    setActiveNavTab(tab);
  }, []);

  const handleModelTagChange = useCallback((tag: ModelCategory) => {
    setActiveModelTag(tag);
  }, []);

  const toggleModelFilter = useCallback(() => {
    setShowModelFilter(prev => !prev);
  }, []);

  // Close filter dropdown on click outside
  useEffect(() => {
    if (!showModelFilter) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (filterWrapperRef.current && !filterWrapperRef.current.contains(e.target as Node)) {
        setShowModelFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModelFilter]);

  const toggleModelFilterOption = useCallback((option: ModelFilterOption) => {
    setActiveModelFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(option)) {
        newSet.delete(option);
      } else {
        newSet.add(option);
      }
      return newSet;
    });
  }, []);

  const resetModelFilters = useCallback(() => {
    setActiveModelFilters(new Set());
  }, []);

  // -------------------------------------------------------------------------
  // Callbacks - LoRA Selector
  // -------------------------------------------------------------------------

  const openLoRASelector = useCallback(() => setShowLoRASelector(true), []);
  const closeLoRASelector = useCallback(() => {
    setShowLoRASelector(false);
    setLoraSearchQuery('');
  }, []);

  const handleLoRASelect = useCallback((lora: LoRAModel) => {
    setSelectedLoras(prev => {
      if (prev.some(l => l.id === lora.id)) return prev;
      return [...prev, lora];
    });
    closeLoRASelector();
  }, [closeLoRASelector]);

  const removeLoRA = useCallback((loraId: string) => {
    setSelectedLoras(prev => prev.filter(l => l.id !== loraId));
  }, []);

  const updateLoRAStrength = useCallback((loraId: string, strength: number) => {
    setSelectedLoras(prev =>
      prev.map(l => l.id === loraId ? { ...l, strength: Math.round(strength * 10) / 10 } : l)
    );
  }, []);

  const toggleFavoriteLoRA = useCallback((loraId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteLoRAIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(loraId)) {
        newSet.delete(loraId);
      } else {
        newSet.add(loraId);
      }
      return newSet;
    });
  }, []);

  const handleLoRASearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLoraSearchQuery(e.target.value);
  }, []);

  const handleLoRANavTabChange = useCallback((tab: LoRANavTab) => {
    setActiveLoRANavTab(tab);
  }, []);

  // Close LoRA selector on ESC key
  useEffect(() => {
    if (!showLoRASelector) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLoRASelector();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showLoRASelector, closeLoRASelector]);

  // -------------------------------------------------------------------------
  // Callbacks - Generation
  // -------------------------------------------------------------------------

  /**
   * Handle generate button click
   */
  const handleGenerate = useCallback(async () => {
    if (activeTab === 'image-to-image') {
      if (!baseImage || !baseImageFile) {
        setUploadError('Please upload a base image first');
        return;
      }

      const editPrompt = imageToImagePrompt.trim() || (selectedTemplate ? `Apply ${selectedTemplate.name} style` : 'Enhance this image');

      setIsGenerating(true);
      setGenerationError(null);
      setGeneratingCount(1);
      setGeneratedImages([]);
      setGeneratedAspectRatio('1:1');

      // Switch to My Creation tab to show results
      setPreviewTab('my-creation');

      try {
        // Step 1: Upload the source image
        const formData = new FormData();
        formData.append('file', baseImageFile);

        const uploadResponse = await fetch('/api/uploads', {
          method: 'POST',
          headers: { 'x-vp-user-id': getUserId() },
          body: formData,
        });

        const uploadData = (await uploadResponse.json()) as { url?: string; error?: string };
        if (!uploadResponse.ok || !uploadData.url) {
          throw new Error(uploadData.error || 'Failed to upload image');
        }

        // Step 2: Call the AI Edit API
        type ImageEditApiResponse = {
          success: boolean;
          imageUrl: string | null;
          status: string;
          error?: string;
          job?: { id: string; trackId: number; webhookEnabled: boolean } | null;
        };

        const result = await apiFetch<ImageEditApiResponse>('/api/ai/image/edit', {
          method: 'POST',
          body: { imageUrl: uploadData.url, prompt: editPrompt },
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to edit image');
        }

        // Step 3: Handle response
        if (result.status === 'success' && result.imageUrl) {
          // Immediate result
          setGeneratedImages([result.imageUrl]);
          setIsGenerating(false);
          setGeneratingCount(0);
        } else if (result.status === 'processing' && result.job) {
          // Async — poll for result
          const jobId = result.job.id;
          const initialDelayMs = 30_000;
          const pollIntervalMs = 5_000;
          const maxTotalMs = 5 * 60_000;

          await new Promise(resolve => setTimeout(resolve, initialDelayMs));

          const startedAt = Date.now();
          while (Date.now() - startedAt < maxTotalMs) {
            try {
              const jobResponse = await apiFetch<{
                success: boolean;
                job: { status: string; resultUrl?: string; errorMessage?: string };
              }>(`/api/jobs/${jobId}`);

              if (jobResponse.job.status === 'COMPLETED' && jobResponse.job.resultUrl) {
                setGeneratedImages([jobResponse.job.resultUrl]);
                setIsGenerating(false);
                setGeneratingCount(0);
                return;
              }
              if (jobResponse.job.status === 'FAILED') {
                throw new Error(jobResponse.job.errorMessage || 'Image edit failed');
              }
            } catch (pollError) {
              if (pollError instanceof Error && (
                pollError.message.includes('Image edit failed') ||
                pollError.message.includes('timed out')
              )) {
                throw pollError;
              }
              // Network error — keep polling
            }
            await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
          }
          throw new Error('Image edit timed out');
        } else {
          throw new Error(result.error || 'Failed to edit image');
        }
      } catch (err) {
        setGenerationError(err instanceof Error ? err.message : 'Image edit failed');
        setIsGenerating(false);
        setGeneratingCount(0);
      }
      return;
    }

    // Text-to-image generation
    if (!prompt.trim()) return;

    const dims = ASPECT_RATIO_DIMENSIONS[aspectRatio];
    setIsGenerating(true);
    setGenerationError(null);
    setGeneratingCount(numberOfImages);
    setGeneratedImages([]);
    setGeneratedAspectRatio(aspectRatio);

    // Switch to My Creation tab to show results
    setPreviewTab('my-creation');

    try {
      const result = await apiFetch<{
        success: boolean;
        imageUrl: string;
        imageUrls: string[];
        status: string;
        error?: string;
      }>('/api/ai/image', {
        method: 'POST',
        body: {
          prompt,
          style: 'realistic',
          width: String(dims.width),
          height: String(dims.height),
          samples: String(numberOfImages),
        },
      });

      if (result.success && result.imageUrls && result.imageUrls.length > 0) {
        setGeneratedImages(result.imageUrls);
      } else if (result.success && result.imageUrl) {
        setGeneratedImages([result.imageUrl]);
      } else {
        setGenerationError(result.error || 'Generation failed');
      }
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
      setGeneratingCount(0);
    }
  }, [activeTab, baseImage, baseImageFile, selectedTemplate, imageToImagePrompt, prompt, numberOfImages, aspectRatio]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <SidebarProvider>
      <div className="app-layout">
        <Sidebar />
        <Header />
        <main className="main-content">
          <div className="create-page">
            <div className="create-container">
              {/* ============================================================
                  LEFT PANEL - Generation Settings
                  ============================================================ */}
              <div className="create-panel">
                {/* Main Tabs: Image to Image / Text to Image */}
                <div className="create-tabs">
                  <button
                    className={cn('create-tab', activeTab === 'image-to-image' && 'create-tab-active')}
                    onClick={() => handleTabChange('image-to-image')}
                  >
                    Image to Image
                  </button>
                  <button
                    className={cn('create-tab', activeTab === 'text-to-image' && 'create-tab-active')}
                    onClick={() => handleTabChange('text-to-image')}
                  >
                    Text to Image
                  </button>
                </div>

                <div className="create-divider" />

                {/* --------------------------------------------------------
                    IMAGE TO IMAGE TAB CONTENT
                    -------------------------------------------------------- */}
                {activeTab === 'image-to-image' ? (
                  <>
                    {/* Base Image Upload Section */}
                    <div className="create-section">
                      <div className="create-section-header">
                        <span className="create-section-title">
                          Base Image
                          <span className="create-required">*</span>
                        </span>
                      </div>

                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED_IMAGE_TYPES}
                        onChange={handleFileChange}
                        className="hidden"
                        aria-label="Upload base image"
                      />

                      {/* Upload area or preview */}
                      {baseImage ? (
                        <div className="base-image-preview">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={baseImage}
                            alt="Base image preview"
                            className="base-image-preview-img"
                          />
                          <button
                            className="base-image-remove"
                            onClick={handleClearBaseImage}
                            aria-label="Remove image"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="base-image-upload"
                          onClick={handleUploadClick}
                          aria-label="Click to upload base image"
                        >
                          <Upload className="base-image-upload-icon" />
                          <span className="base-image-upload-text">
                            Click to upload or select image
                          </span>
                        </button>
                      )}

                      {/* Upload error message */}
                      {uploadError && (
                        <p className="base-image-error">{uploadError}</p>
                      )}
                    </div>

                    {/* Prompt Section for Image to Image */}
                    <div className="create-section">
                      <div className="create-section-header">
                        <span className="create-section-title">
                          Prompts
                          <span className="create-required">*</span>
                        </span>
                      </div>
                      <textarea
                        className="create-textarea"
                        placeholder="Describe what you want to create from the images"
                        value={imageToImagePrompt}
                        onChange={e => setImageToImagePrompt(e.target.value)}
                        rows={4}
                      />
                    </div>

                    {/* Generate Button */}
                    <button
                      className="generate-btn"
                      onClick={handleGenerate}
                      disabled={!baseImage}
                    >
                      <Sparkles size={18} />
                      Generate
                      <span className="generate-credits">
                        {creditsNeeded}+
                        <Coins size={14} />
                      </span>
                    </button>
                  </>
                ) : (
                  /* --------------------------------------------------------
                     TEXT TO IMAGE TAB CONTENT
                     -------------------------------------------------------- */
                  <>
                    {/* Prompt Section */}
                    <div className="create-section">
                      <div className="create-section-header">
                        <span className="create-section-title">Prompt</span>
                        <button className="create-help-btn" aria-label="Help with prompts">
                          <HelpCircle size={16} />
                        </button>
                      </div>
                      <textarea
                        className="create-textarea"
                        placeholder="Type a prompt..."
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        rows={4}
                      />
                      <div className="prompt-actions">
                        <button className="prompt-action-btn" onClick={openPromptIdeas}>
                          <Sparkles size={16} />
                          Prompt Ideas
                        </button>
                        <button className="prompt-action-btn" onClick={handleRandomPrompt}>
                          <Shuffle size={16} />
                          Random
                        </button>
                      </div>
                    </div>

                    {/* Prompt Ideas Modal */}
                    {showPromptIdeas && (
                      <div className="modal-overlay" onClick={closePromptIdeas}>
                        <div className="modal-content prompt-ideas-modal" onClick={e => e.stopPropagation()}>
                          <div className="modal-header">
                            <h3>Prompt Ideas</h3>
                            <button className="modal-close" onClick={closePromptIdeas}>
                              <X size={20} />
                            </button>
                          </div>

                          <div className="prompt-ideas-tabs">
                            {promptCategories.map(category => (
                              <button
                                key={category.id}
                                className={cn(
                                  'prompt-ideas-tab',
                                  activeCategory === category.id && 'prompt-ideas-tab-active'
                                )}
                                onClick={() => setActiveCategory(category.id)}
                              >
                                {category.name}
                              </button>
                            ))}
                          </div>

                          <div className="prompt-ideas-content">
                            <div className="prompt-ideas-grid">
                              {activeCategoryData?.values.map(value => (
                                <button
                                  key={value}
                                  className={cn(
                                    'prompt-idea-card',
                                    isValueSelected(value) && 'prompt-idea-card-selected'
                                  )}
                                  onClick={() => handlePromptIdeaClick(value)}
                                >
                                  <div className="prompt-idea-thumbnail">
                                    {value.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="prompt-idea-label">{value}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="prompt-ideas-footer">
                            <button className="prompt-ideas-done-btn" onClick={closePromptIdeas}>
                              Done
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Model Selector Modal - Full Page */}
                    {showModelSelector && (
                      <div className="modal-overlay model-overlay-fullpage" onClick={closeModelSelector}>
                        <div className="model-selector-fullpage" onClick={e => e.stopPropagation()}>
                          {/* Header Row: Title + Nav Tabs + Search + Close */}
                          <div className="model-fullpage-header">
                            <div className="model-header-left">
                              <h3 className="model-header-title">Select Model</h3>
                              <div className="model-nav-tabs">
                                {MODEL_NAV_TABS.map(tab => (
                                  <button
                                    key={tab}
                                    className={cn(
                                      'model-nav-tab',
                                      activeNavTab === tab && 'model-nav-tab-active'
                                    )}
                                    onClick={() => handleNavTabChange(tab)}
                                  >
                                    {tab}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="model-header-right">
                              <div className="model-search-wrapper">
                                <Search size={16} className="model-search-icon" />
                                <input
                                  type="text"
                                  className="model-search-input"
                                  placeholder="Search for Models"
                                  value={modelSearchQuery}
                                  onChange={handleModelSearchChange}
                                />
                              </div>
	                              <div className="model-filter-wrapper" ref={filterWrapperRef}>
	                                <button
	                                  className={cn('model-filter-btn', showModelFilter && 'model-filter-btn-active')}
	                                  onClick={toggleModelFilter}
	                                >
	                                  <Filter size={20} />
	                                </button>
	                                {showModelFilter && (
	                                  <div className="model-filter-dropdown" onClick={e => e.stopPropagation()}>
	                                    {MODEL_FILTER_OPTIONS.map(option => (
	                                      <button
                                        key={option}
                                        className={cn(
                                          'model-filter-option',
                                          activeModelFilters.has(option) && 'model-filter-option-active'
                                        )}
                                        onClick={() => toggleModelFilterOption(option)}
                                      >
                                        <span className="model-filter-check">
                                          {activeModelFilters.has(option) && <Check size={14} />}
                                        </span>
                                        {option}
                                      </button>
                                    ))}
                                    <button className="model-filter-reset" onClick={resetModelFilters}>
                                      Reset Selection
                                    </button>
                                  </div>
                                )}
                              </div>
                              <button className="modal-close" onClick={closeModelSelector}>
                                <X size={20} />
                              </button>
                            </div>
                          </div>

                          {/* Tag Filters Row */}
                          <div className="model-tag-filters">
                            {MODEL_TAGS.map(tag => (
                              <button
                                key={tag}
                                className={cn(
                                  'model-tag',
                                  activeModelTag === tag && 'model-tag-active'
                                )}
                                onClick={() => handleModelTagChange(tag)}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>

                          {/* Scrollable Grid Content */}
                          <div className="model-grid-content">
                            {filteredModels.length > 0 ? (
                              <div className="model-grid">
                                {filteredModels.map(model => (
                                  <div key={model.id} className="model-card">
                                    <div className="model-card-thumbnail">
                                      <span className="model-card-category">
                                        {model.category}
                                      </span>
                                      <button
                                        className={cn(
                                          'model-card-favorite',
                                          favoriteModelIds.has(model.id) && 'model-card-favorite-active'
                                        )}
                                        onClick={(e) => toggleFavoriteModel(model.id, e)}
                                      >
                                        <Heart
                                          size={16}
                                          fill={favoriteModelIds.has(model.id) ? '#ff3e8a' : 'none'}
                                        />
                                      </button>
                                    </div>
                                    <div className="model-card-info">
                                      <span className="model-card-name">{model.name}</span>
                                      <button
                                        className="model-card-apply-btn"
                                        onClick={() => handleModelSelect(model)}
                                      >
                                        Apply
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="model-empty-state">
                                {activeNavTab === 'Favourite' ? (
                                  <p>No favorite models yet. Click the heart icon to add models to your favorites.</p>
                                ) : (
                                  <p>No models found matching your search.</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* LoRA Selector Modal - Full Page */}
                    {showLoRASelector && (
                      <div className="modal-overlay model-overlay-fullpage" onClick={closeLoRASelector}>
                        <div className="model-selector-fullpage" onClick={e => e.stopPropagation()}>
                          {/* Header Row: Title + Nav Tabs + Train Button + Search + Close */}
                          <div className="model-fullpage-header">
                            <div className="model-header-left">
                              <h3 className="model-header-title">Select LoRA</h3>
                              <div className="model-nav-tabs">
                                {LORA_NAV_TABS.map(tab => (
                                  <button
                                    key={tab}
                                    className={cn(
                                      'model-nav-tab',
                                      activeLoRANavTab === tab && 'model-nav-tab-active'
                                    )}
                                    onClick={() => handleLoRANavTabChange(tab)}
                                  >
                                    {tab}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="model-header-right">
                              <button className="lora-train-btn">
                                <Plus size={16} />
                                Train My LoRA
                              </button>
                              <div className="model-search-wrapper">
                                <Search size={16} className="model-search-icon" />
                                <input
                                  type="text"
                                  className="model-search-input"
                                  placeholder="Search for LoRAs"
                                  value={loraSearchQuery}
                                  onChange={handleLoRASearchChange}
                                />
                              </div>
                              <button className="modal-close" onClick={closeLoRASelector}>
                                <X size={20} />
                              </button>
                            </div>
                          </div>

                          {/* Scrollable Grid Content - No tag filters for LoRA */}
                          <div className="model-grid-content">
                            {filteredLoras.length > 0 ? (
                              <div className="model-grid">
                                {filteredLoras.map(lora => (
                                  <div key={lora.id} className="model-card">
                                    <div className="model-card-thumbnail">
                                      <span className="model-card-category">
                                        {lora.baseModel}
                                      </span>
                                      <button
                                        className={cn(
                                          'model-card-favorite',
                                          favoriteLoRAIds.has(lora.id) && 'model-card-favorite-active'
                                        )}
                                        onClick={(e) => toggleFavoriteLoRA(lora.id, e)}
                                      >
                                        <Heart
                                          size={16}
                                          fill={favoriteLoRAIds.has(lora.id) ? '#ff3e8a' : 'none'}
                                        />
                                      </button>
                                    </div>
                                    <div className="model-card-info">
                                      <span className="model-card-name">{lora.name}</span>
                                      <button
                                        className="model-card-apply-btn"
                                        onClick={() => handleLoRASelect(lora)}
                                      >
                                        Apply
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="model-empty-state">
                                {activeLoRANavTab === 'Favourite' ? (
                                  <p>No favorite LoRAs yet. Click the heart icon to add LoRAs to your favorites.</p>
                                ) : activeModelFilters.size > 0 ? (
                                  <p>No LoRA models found for the selected checkpoint. Try changing the checkpoint filter.</p>
                                ) : (
                                  <p>No LoRA models found matching your search.</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Negative Prompt Section */}
                    <div className="create-section">
                      <button className="create-section-toggle" onClick={toggleNegativePrompt}>
                        <span className="create-section-title">
                          <span className="negative-icon">~</span>
                          Negative Prompt
                        </span>
                        <div className="toggle-icons">
                          <span className="create-help-btn">
                            <HelpCircle size={16} />
                          </span>
                          {showNegativePrompt ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </button>
                      {showNegativePrompt && (
                        <textarea
                          className="create-textarea"
                          placeholder="Things to avoid in the generation..."
                          value={negativePrompt}
                          onChange={e => setNegativePrompt(e.target.value)}
                          rows={3}
                        />
                      )}
                    </div>

                    {/* Number of Images */}
                    <div className="create-section">
                      <div className="create-section-header">
                        <span className="create-section-title">Number of Images</span>
                      </div>
                      <div className="number-selector">
                        {([1, 2, 3, 4] as const).map(num => (
                          <button
                            key={num}
                            className={cn('number-btn', numberOfImages === num && 'number-btn-active')}
                            onClick={() => setNumberOfImages(num)}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Aspect Ratio */}
                    <div className="create-section create-section-aspect-ratio">
                      <div className="create-section-header">
                        <span className="create-section-title">Aspect Ratio</span>
                      </div>
                      <div className="aspect-ratio-selector">
                        <button
                          className={cn('aspect-ratio-btn', aspectRatio === '1:1' && 'aspect-ratio-btn-active')}
                          onClick={() => setAspectRatio('1:1')}
                        >
                          <div className="aspect-ratio-icon aspect-ratio-square">
                            <span>1:1</span>
                          </div>
                          <span className="aspect-ratio-label">Square</span>
                        </button>
                        <button
                          className={cn('aspect-ratio-btn', aspectRatio === '9:16' && 'aspect-ratio-btn-active')}
                          onClick={() => setAspectRatio('9:16')}
                        >
                          <div className="aspect-ratio-icon aspect-ratio-landscape">
                            <span>9:16</span>
                          </div>
                          <span className="aspect-ratio-label">Landscape</span>
                        </button>
                        <button
                          className={cn('aspect-ratio-btn', aspectRatio === '2:3' && 'aspect-ratio-btn-active')}
                          onClick={() => setAspectRatio('2:3')}
                        >
                          <div className="aspect-ratio-icon aspect-ratio-portrait">
                            <span>2:3</span>
                          </div>
                          <span className="aspect-ratio-label">Portrait</span>
                        </button>
                        <button
                          ref={moreButtonRef}
                          className={cn(
                            'aspect-ratio-btn aspect-ratio-more-btn',
                            isMoreRatioSelected && 'aspect-ratio-btn-active'
                          )}
                          onClick={openImageSettings}
                        >
                          <div className="aspect-ratio-icon aspect-ratio-square">
                            {isMoreRatioSelected ? <span>{aspectRatio}</span> : <Settings2 size={14} />}
                          </div>
                          <span className="aspect-ratio-label">More</span>
                        </button>
                      </div>
                      <div className="aspect-ratio-dimensions">
                        {currentDimensions.width} &times; {currentDimensions.height}
                      </div>
                    </div>

                    {/* Image Settings Popover */}
                    {showImageSettings && popoverPos && (
                      <>
                        <div className="image-settings-backdrop" onClick={closeImageSettings} />
                        <div
                          className="image-settings-popover"
                          style={{ top: popoverPos.top, left: popoverPos.left }}
                        >
                          <div className="image-settings-popover-header">
                            <h3>Image Settings</h3>
                            <button className="modal-close" onClick={closeImageSettings}>
                              <X size={18} />
                            </button>
                          </div>

                          <div className="image-settings-columns">
                            <div className="image-settings-column">
                              <div className="image-settings-column-header">
                                <div className="image-settings-column-icon image-settings-portrait-icon" />
                                <span>Portrait</span>
                              </div>
                              {PORTRAIT_RATIOS.map(ratio => (
                                <button
                                  key={ratio}
                                  className={cn(
                                    'image-settings-ratio-btn',
                                    aspectRatio === ratio && 'image-settings-ratio-btn-active'
                                  )}
                                  onClick={() => handleAspectRatioSelect(ratio)}
                                >
                                  {ratio}
                                </button>
                              ))}
                            </div>

                            <div className="image-settings-column">
                              <div className="image-settings-column-header">
                                <div className="image-settings-column-icon image-settings-landscape-icon" />
                                <span>Landscape</span>
                              </div>
                              {LANDSCAPE_RATIOS.map(ratio => (
                                <button
                                  key={ratio}
                                  className={cn(
                                    'image-settings-ratio-btn',
                                    aspectRatio === ratio && 'image-settings-ratio-btn-active'
                                  )}
                                  onClick={() => handleAspectRatioSelect(ratio)}
                                >
                                  {ratio}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Advanced Config Toggle */}
                    <div className="create-section advanced-toggle-section">
                      <div className="advanced-toggle">
                        <div className="advanced-toggle-label">
                          <Settings2 size={18} />
                          <span>Advanced Config</span>
                        </div>
                        <button
                          className={cn('toggle-switch', showAdvancedConfig && 'toggle-switch-active')}
                          onClick={toggleAdvancedConfig}
                        >
                          <span className="toggle-switch-knob" />
                        </button>
                      </div>
                    </div>

                    {/* Advanced Config Section */}
                    {showAdvancedConfig && (
                      <div className="advanced-config">
                        {/* Model Section */}
                        <div className="create-section">
                          <div className="create-section-header">
                            <span className="create-section-title">Model</span>
                            <button className="create-help-btn">
                              <HelpCircle size={16} />
                            </button>
                          </div>
                          <div
                            className="model-selected model-selected-clickable"
                            onClick={openModelSelector}
                            style={{
                              backgroundImage: selectedModel.thumbnail
                                ? `linear-gradient(90deg, rgba(12, 12, 18, 0.9), rgba(12, 12, 18, 0.45)), url(${selectedModel.thumbnail})`
                                : undefined,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          >
                            <div className="model-info">
                              <span className="model-name">{selectedModel.name}</span>
                            </div>
                            <button className="model-swap-btn">
                              <ArrowRightLeft size={14} />
                              Swap
                            </button>
                          </div>
                        </div>

                        {/* LoRA Section */}
                        <div className="create-section">
                          <div className="create-section-header">
                            <span className="create-section-title">LoRA Model</span>
                            <button className="create-help-btn">
                              <HelpCircle size={16} />
                            </button>
                          </div>
                          {selectedLoras.length > 0 ? (
                            <div className="lora-list">
                              {selectedLoras.map(lora => (
                                <div key={lora.id} className="lora-item-card">
                                  <div className="lora-item-card-header">
                                    <span className="lora-item-label">LoRA</span>
                                    <button className="lora-remove-btn" onClick={() => removeLoRA(lora.id)}>
                                      <X size={16} />
                                    </button>
                                  </div>
                                  <div className="lora-item-card-body">
                                    <div className="lora-item-thumb">
                                      <img src={lora.thumbnail} alt={lora.name} />
                                    </div>
                                    <div className="lora-item-details">
                                      <span className="lora-item-name">{lora.name}</span>
                                      <div className="lora-strength-row">
                                        <span className="lora-strength-label">Strength</span>
                                        <input
                                          type="number"
                                          className="lora-strength-input"
                                          value={lora.strength}
                                          min={0}
                                          max={1}
                                          step={0.1}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val)) updateLoRAStrength(lora.id, Math.min(1, Math.max(0, val)));
                                          }}
                                        />
                                      </div>
                                      <input
                                        type="range"
                                        className="lora-strength-slider"
                                        min={0}
                                        max={1}
                                        step={0.1}
                                        value={lora.strength}
                                        onChange={(e) => updateLoRAStrength(lora.id, parseFloat(e.target.value))}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                              <button className="lora-add-btn" onClick={openLoRASelector}>
                                <Plus size={16} />
                                Add More
                              </button>
                            </div>
                          ) : (
                            <button className="lora-add-btn" onClick={openLoRASelector}>
                              <Plus size={16} />
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Generate Button */}
                    <button
                      className="generate-btn"
                      onClick={handleGenerate}
                      disabled={!prompt.trim()}
                    >
                      Generate {numberOfImages} Image{numberOfImages > 1 ? 's' : ''}
                      <span className="generate-credits">
                        {creditsNeeded}
                        <Coins size={14} />
                      </span>
                    </button>
                  </>
                )}
              </div>

              {/* ============================================================
                  RIGHT PANEL - Templates / My Creation
                  ============================================================ */}
              <div className="create-preview">
                {/* Preview Panel Tabs */}
                <div className="preview-tabs">
                  <button
                    className={cn('preview-tab', previewTab === 'templates' && 'preview-tab-active')}
                    onClick={() => handlePreviewTabChange('templates')}
                  >
                    Templates
                  </button>
                  <button
                    className={cn('preview-tab', previewTab === 'my-creation' && 'preview-tab-active')}
                    onClick={() => handlePreviewTabChange('my-creation')}
                  >
                    My Creation
                  </button>
                </div>

                {/* Templates Grid */}
                {previewTab === 'templates' ? (
                  <div className="templates-grid">
                    {styleTemplatesLoading ? (
                      <div className="creation-empty-state">
                        <p>Loading templates…</p>
                      </div>
                    ) : styleTemplatesError ? (
                      <div className="creation-empty-state">
                        <p className="text-red-400">Failed to load templates</p>
                        <span>{styleTemplatesError}</span>
                      </div>
                    ) : styleTemplates.length === 0 ? (
                      <div className="creation-empty-state">
                        <p>No templates found</p>
                        <span>Seed the database or add templates to get started.</span>
                      </div>
                    ) : (
                      styleTemplates.map(template => (
                        <div
                          key={template.id}
                          className={cn(
                            'template-card',
                            selectedTemplate?.id === template.id && 'template-card-selected'
                          )}
                          onClick={() => handleTemplateSelect(template)}
                        >
                          <div className="template-card-image">
                            {/* Placeholder for template thumbnail */}
                            <div className="template-card-placeholder">
                              {template.name.charAt(0)}
                            </div>

                            {/* Action buttons */}
                            <div className="template-card-actions">
                              <button
                                className="template-card-action"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTemplateSelect(template);
                                }}
                                aria-label="Select template"
                              >
                                <Plus size={14} />
                              </button>
                              <button
                                className="template-card-action template-card-action-remove"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // TODO: Implement remove from favorites
                                }}
                                aria-label="Remove from favorites"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                          <span className="template-card-name">{template.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  /* My Creation Grid */
                  <div className="my-creation-grid">
                    {/* Show generating placeholders */}
                    {isGenerating && Array.from({ length: generatingCount }).map((_, i) => (
                      <div
                        key={`generating-${i}`}
                        className="creation-card creation-card-generating"
                        style={activeTab === 'image-to-image' ? undefined : { aspectRatio: generatedAspectRatio.replace(':', ' / ') }}
                      >
                        <div className="creation-generating-content">
                          <Loader2 size={32} className="creation-generating-spinner" />
                          <span className="creation-generating-text">Generating...</span>
                        </div>
                      </div>
                    ))}

	                    {/* Show generated images */}
	                    {generatedImages.map((url, i) => (
	                      activeTab === 'image-to-image' ? (
	                        <div
	                          key={`generated-${i}`}
	                          className="base-image-preview base-image-preview-clickable"
	                          role="button"
	                          tabIndex={0}
	                          onClick={() => setLightboxImage(url)}
	                          onKeyDown={(e) => {
	                            if (e.key === 'Enter' || e.key === ' ') {
	                              e.preventDefault();
	                              setLightboxImage(url);
	                            }
	                          }}
	                          aria-label={`Open generated image ${i + 1}`}
	                        >
	                          {/* eslint-disable-next-line @next/next/no-img-element */}
	                          <img
	                            src={url}
	                            alt={`Generated image ${i + 1}`}
	                            className="base-image-preview-img"
	                          />
	                          <div className="creation-card-overlay creation-card-overlay-visible">
	                            <button
	                              type="button"
	                              className="creation-card-action-btn"
	                              onClick={(e) => {
	                                e.stopPropagation();
	                                setLightboxImage(url);
	                              }}
	                              aria-label="View full size"
	                            >
	                              <ImageIcon size={16} />
	                            </button>
	                            <button
	                              type="button"
	                              className="creation-card-action-btn"
	                              onClick={(e) => {
	                                e.stopPropagation();
	                                handleDownloadImage(url);
	                              }}
	                              aria-label="Download image"
	                            >
	                              <Download size={16} />
	                            </button>
	                          </div>
	                        </div>
	                      ) : (
	                        <div
	                          key={`generated-${i}`}
	                          className="creation-card"
	                          style={{ aspectRatio: generatedAspectRatio.replace(':', ' / ') }}
	                          role="button"
	                          tabIndex={0}
	                          onClick={() => setLightboxImage(url)}
	                          onKeyDown={(e) => {
	                            if (e.key === 'Enter' || e.key === ' ') {
	                              e.preventDefault();
	                              setLightboxImage(url);
	                            }
	                          }}
	                          aria-label={`Open generated image ${i + 1}`}
	                        >
	                          <div className="creation-card-image">
	                            <Image
	                              src={url}
	                              alt={`Generated image ${i + 1}`}
                              fill
                              className="creation-card-img"
	                            />
	                            <div className="creation-card-overlay">
	                              <button
	                                type="button"
	                                className="creation-card-action-btn"
	                                onClick={(e) => {
	                                  e.stopPropagation();
	                                  setLightboxImage(url);
	                                }}
	                                aria-label="View full size"
	                              >
	                                <ImageIcon size={16} />
	                              </button>
	                              <button
	                                type="button"
	                                className="creation-card-action-btn"
	                                onClick={(e) => {
	                                  e.stopPropagation();
	                                  handleDownloadImage(url);
	                                }}
	                                aria-label="Download image"
	                              >
	                                <Download size={16} />
	                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    ))}

                    {/* Show generation error */}
                    {generationError && (
                      <div className="creation-empty-state">
                        <p className="text-red-400">Generation failed</p>
                        <span>{generationError}</span>
                      </div>
                    )}

                    {/* Show past creations */}
                    {!isGenerating && generatedImages.length === 0 && mockUserCreations.length > 0 && (
                      mockUserCreations.map(creation => (
                        <div key={creation.id} className="creation-card">
                          <div className="creation-card-image">
                            <Image
                              src={creation.thumbnail}
                              alt={creation.prompt || 'User creation'}
                              fill
                              className="creation-card-img"
                            />
                          </div>
                        </div>
                      ))
                    )}

                    {/* Empty state */}
                    {!isGenerating && generatedImages.length === 0 && mockUserCreations.length === 0 && !generationError && (
                      <div className="creation-empty-state">
                        <ImageIcon size={48} />
                        <p>No creations yet</p>
                        <span>Your generated images will appear here</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

	          {/* Lightbox for full-size image viewing */}
	          {lightboxImage && (
	            <div
	              className="chat-lightbox"
	              role="dialog"
	              aria-modal="true"
	              aria-label="Image preview"
	              onClick={() => setLightboxImage(null)}
	            >
	              <div className="chat-lightbox-actions">
	                <button
	                  type="button"
	                  className="chat-lightbox-action-btn"
	                  onClick={(e) => {
	                    e.stopPropagation();
	                    handleDownloadImage(lightboxImage);
	                  }}
	                  aria-label="Download image"
	                >
	                  <Download className="chat-lightbox-action-icon" />
	                </button>
	                <button
	                  type="button"
	                  className="chat-lightbox-action-btn"
	                  onClick={() => setLightboxImage(null)}
	                  aria-label="Close"
	                >
	                  <X className="chat-lightbox-action-icon" />
	                </button>
	              </div>
	              <div className="chat-lightbox-content" onClick={(e) => e.stopPropagation()}>
	                {/* eslint-disable-next-line @next/next/no-img-element */}
	                <img
	                  src={lightboxImage}
	                  alt="Full size preview"
	                  className="chat-lightbox-image"
	                />
	              </div>
	            </div>
	          )}
	        </main>
	      </div>
	    </SidebarProvider>
	  );
}

// JSON-LD schemas are rendered OUTSIDE the Suspense boundary so they stream to
// crawlers immediately — the playground below uses useSearchParams() which would
// otherwise suspend the entire tree and emit only the fallback.
const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Veloura.ai AI Image Generator',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Any',
  description:
    'Free NSFW AI image generator with no filters and no restrictions. Text-to-image and image-to-image generation with Flux, SDXL, Pony, Illustrious, and LoRA support. No watermark.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', ratingCount: '2140' },
  url: `${APP_URL}/create`,
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: CREATE_FAQ.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: APP_URL },
    { '@type': 'ListItem', position: 2, name: 'AI Image Generator', item: `${APP_URL}/create` },
  ],
};

/**
 * Create Page with Suspense boundary.
 *
 * useSearchParams() inside CreatePageContent forces a Suspense boundary during
 * SSR. The fallback is what crawlers see on first byte, so we render the full
 * SEO shell (H1, features, how-it-works, FAQ) there instead of "Loading…".
 * JSON-LD schemas are emitted outside Suspense so they stream regardless.
 */
export default function CreatePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Suspense fallback={<CreateSeoShell />}>
        <CreatePageContent />
      </Suspense>
    </>
  );
}
