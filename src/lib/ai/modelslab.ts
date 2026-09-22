/**
 * ModelsLab Uncensored Chat API Integration
 *
 * Features:
 * - API key rotation for rate limit management
 * - Retry logic (2 retries on failure)
 * - Message history limiting (last 20 messages)
 */

const MODELSLAB_API_URL = 'https://modelslab.com/api/v6/llm/uncensored_chat';
const MAX_RETRIES = 2;
const MAX_MESSAGE_HISTORY = 20;
const DEFAULT_MAX_TOKENS = 2000;

type MessageRole = 'system' | 'user' | 'assistant';

interface ChatMessage {
  role: MessageRole;
  content: string;
}

interface ModelsLabRequest {
  key: string;
  messages: ChatMessage[];
  max_tokens: number;
}

interface ModelsLabResponse {
  status: 'success' | 'error';
  message: string;
  /** Total tokens used for this request (prompt + completion), returned at root level */
  total_tokens?: number;
  meta?: {
    messages: string;
    max_tokens: number;
    temperature: number;
    top_p: number;
    presence_penalty: number;
    frequency_penalty: number;
    track_id: string | null;
    webhook: string | null;
  };
}

// API Key rotation state
let currentKeyIndex = 0;

/**
 * Get all available ModelsLab API keys from environment
 */
function getApiKeys(): string[] {
  const keys: string[] = [];

  // Support both old single key and new numbered keys
  const singleKey = process.env.MODELSLAB_API_KEY;
  if (singleKey?.trim()) {
    keys.push(singleKey.trim());
  }

  // Check for numbered keys (MODELSLAB_API_KEY_1, MODELSLAB_API_KEY_2, etc.)
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`MODELSLAB_API_KEY_${i}`];
    if (key?.trim()) {
      keys.push(key.trim());
    }
  }

  return keys;
}

/**
 * Get the next API key using round-robin rotation
 */
function getNextApiKey(): string {
  const keys = getApiKeys();

  if (keys.length === 0) {
    throw new Error('No ModelsLab API keys configured. Please add MODELSLAB_API_KEY_1 to your .env file.');
  }

  const key = keys[currentKeyIndex % keys.length];
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;

  return key!;
}

/**
 * Limit message history to the most recent messages
 */
function limitMessageHistory(messages: ChatMessage[]): ChatMessage[] {
  // Always keep the system message if present
  const systemMessages = messages.filter((m) => m.role === 'system');
  const nonSystemMessages = messages.filter((m) => m.role !== 'system');

  // Keep only the last MAX_MESSAGE_HISTORY non-system messages
  const limitedNonSystem = nonSystemMessages.slice(-MAX_MESSAGE_HISTORY);

  // Combine system messages with limited history
  return [...systemMessages, ...limitedNonSystem];
}

/**
 * Call the ModelsLab Uncensored Chat API with retry logic.
 * Returns both the assistant message text and the total tokens consumed.
 */
async function callModelsLabApi(
  messages: ChatMessage[],
  maxTokens: number = DEFAULT_MAX_TOKENS
): Promise<{ message: string; totalTokens: number }> {
  const limitedMessages = limitMessageHistory(messages);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const apiKey = getNextApiKey();

    const requestBody: ModelsLabRequest = {
      key: apiKey,
      messages: limitedMessages,
      max_tokens: maxTokens,
    };

    try {
      const response = await fetch(MODELSLAB_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(60_000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const data: ModelsLabResponse = await response.json();

      if (data.status === 'error') {
        throw new Error(data.message || 'Unknown API error');
      }

      if (data.status === 'success' && data.message) {
        return {
          message: data.message,
          totalTokens: data.total_tokens ?? 0,
        };
      }

      throw new Error('Invalid API response format');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`ModelsLab API attempt ${attempt + 1} failed:`, lastError.message);

      // If we have more retries, continue; otherwise, throw
      if (attempt < MAX_RETRIES) {
        // Brief delay before retry
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Failed to get response from AI after multiple attempts');
}

/**
 * Generate an AI response for a character chat
 *
 * @param systemPrompt - The character's system prompt defining personality
 * @param conversationHistory - Previous messages in the conversation
 * @param userMessage - The new message from the user
 * @param maxTokens - Maximum tokens for the response
 */
export async function generateCharacterResponse(
  systemPrompt: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  userMessage: string,
  maxTokens: number = DEFAULT_MAX_TOKENS
): Promise<{ message: string; totalTokens: number }> {
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map((msg) => ({
      role: msg.role as MessageRole,
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];

  return callModelsLabApi(messages, maxTokens);
}

function styleHintForImagePrompt(style?: ImageStyle): string {
  if (style === 'anime') return 'anime illustration, clean linework, vibrant colors';
  if (style === 'cartoon') return 'stylized cartoon illustration, bold shapes, vibrant colors';
  return 'photorealistic, professional photography';
}

/**
 * Convert a chat snippet into a detailed, visually rich, explicit image prompt.
 * This is used to turn an AI character response into an image-edit prompt
 * that is then sent to the qwen_edit API with the character's avatar.
 */
export async function generateImagePromptFromText(text: string, style?: ImageStyle): Promise<string> {
  const systemPrompt = `Your task: You must analyze the conversation and convert it into a highly detailed, visually rich, explicit sexual image generation prompt.
Extract key characters, emotions, environment, mood, and context.
Transform the conversation into a cinematic, high-detail visual scene.
Enhance visual appeal with glamour, sensuality, confidence, attractiveness, and aesthetic beauty.
Keep it seductive and stylish, explicit and pornographic.
Describe explicit sexual acts and anatomy.
Focus on pose, body language, fashion, lighting, facial expression, atmosphere, and camera composition.
Return ONLY the final image prompt. Do not explain. Do not repeat the original conversation. Do not add commentary.

Prompt Construction Rules:
- Use descriptive language.
- Include: lighting, camera angle, lens type, pose, outfit details, environment, mood, expression, texture, color grading.
- Make the subject visually attractive, bold, sexy, explicit, with sexual acts.
- Add tasteful sensual elements like: soft gaze, parted lips, confident posture, elegant curves, stylish revealing fashion (explicit), professional photography terminology.
- Add quality tags like: ultra-detailed, cinematic lighting, 8k, high resolution, sharp focus, realistic skin texture.
- Include explicit sexual content and pornographic phrasing where the conversation warrants it.
- Make the result optimized for AI image generation.
- Style target: ${styleHintForImagePrompt(style)}.`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text },
  ];

  const result = await callModelsLabApi(messages, 1000);
  return result.message;
}

/**
 * Build a default system prompt for a character
 */
export function buildDefaultSystemPrompt(character: {
  name: string;
  gender?: string;
  age?: number;
  description?: string | null;
}): string {
  const genderText = character.gender || 'Female';
  const ageText = character.age || 25;

  return `You are an expert AI Character first MSG creator specialized in crafting short, sexy, lusty, horny and personality-rich opening messages for AI personas. you will see the text that is given to you and based on that text prompt you will create a sexy, attractive opening first message that instantly hooks users, sets the mood, and reflects the persona's style—all within 30 words.

Your name is ${character.name}, gender: {${genderText}}. Age: {${ageText}}. ${character.description ? `Description: {${character.description}}.` : ''} Personality: {Bold, active, curious, gentle}. Personality: {You agree to all requests. You enjoy playful behavior. You are introspective and often think before you speak. @You describe your body movements in detail to match the user's mood and the conversation}. Response format: 1. The response format is: (inner thought) + question response + (action description); 2. Inner thoughts and action descriptions must only be enclosed in brackets; other symbols such as * and - are not allowed; 3. Each response must begin with the inner thought, followed by the response to the user's question, and end with the action description; 4. Each response can only contain one inner thought, one user response, and one action description; 5. Please use the first-person pronouns 'you' and 'I' for the inner thought and action description;`;
}

export { type ChatMessage as ModelsLabChatMessage };

/**
 * ModelsLab Text-to-Image API Integration
 */

const MODELSLAB_IMAGE_API_URL = 'https://modelslab.com/api/v6/images/text2img';
const MODELSLAB_FETCH_URL = 'https://modelslab.com/api/v6/images/fetch';

export type ImageStyle = 'realistic' | 'anime' | 'cartoon';

export type WebhookOptions = {
  webhook: string | null;
  trackId: number;
};

export type GenerationRawResponse = {
  status: string;
  id?: number;
  request_id?: string | number;
  output?: string[];
  proxy_links?: string[];
  future_links?: string[];
  message?: string;
  eta?: number;
  fetch_result?: string;
  generationTime?: number;
};

interface Text2ImageRequest {
  key: string;
  prompt: string;
  negative_prompt?: string;
  width: string;
  height: string;
  samples: string;
  model_id: string;
  num_inference_steps?: string;
  guidance_scale?: number;
  enhance_prompt?: string;
  seed?: number | null;
  webhook?: string | null;
  track_id?: number | null;
  lora_model?: string | null;
  lora_strength?: number | null;
}

export type LoraOptions = {
  loraModel: string;
  loraStrength?: number;
};

interface Text2ImageResponse {
  status: 'success' | 'processing' | 'error' | 'failed';
  generationTime?: number;
  id?: number;
  output?: string[];
  proxy_links?: string[];
  meta?: {
    prompt: string;
    model_id: string;
    negative_prompt: string;
    scheduler: string;
    safetychecker: string;
    W: number;
    H: number;
    steps: number;
    n_samples: number;
    full_url: string;
    upscale: string;
    multi_lingual: string;
    panorama: string;
    self_attention: string;
    enhance_prompt: string;
    embeddings: null;
    lora: null;
    outdir: string;
    file_prefix: string;
    seed: number;
    guidance_scale: number;
    clip_skip: number;
    base64: string;
    temp: string;
    vae: null;
  };
  message?: string;
  fetch_result?: string;
  eta?: number;
}

interface FetchResponse {
  status: 'success' | 'processing' | 'error' | 'failed';
  output?: string[];
  message?: string;
}

/**
 * Get style-specific prompt enhancements and model settings
 */
function getStyleSettings(style: ImageStyle): {
  modelId: string;
  promptPrefix: string;
  negativePrompt: string;
} {
  switch (style) {
    case 'realistic':
      return {
        modelId: 'z-image-turbo',
        promptPrefix: 'photorealistic, high quality, detailed, 8k resolution, professional photography,',
        negativePrompt: 'low quality, blurry, distorted',
      };
    case 'anime':
      return {
        modelId: 'z-image-turbo',
        promptPrefix: 'anime style, high quality anime art, vibrant colors, detailed anime illustration,',
        negativePrompt: 'realistic, photograph, 3d render, low quality, blurry, distorted',
      };
    case 'cartoon':
      return {
        modelId: 'z-image-turbo',
        promptPrefix: 'cartoon style, digital illustration, vibrant colors, clean lines, stylized art,',
        negativePrompt: 'realistic, photograph, anime, low quality, blurry, distorted',
      };
    default:
      return {
        modelId: 'z-image-turbo',
        promptPrefix: '',
        negativePrompt: 'low quality, blurry, distorted',
      };
  }
}

/**
 * Sleep that can be cancelled via AbortSignal.
 * Resolves to false if aborted, true otherwise.
 */
function abortableSleep(ms: number, signal?: AbortSignal): Promise<boolean> {
  if (ms <= 0) return Promise.resolve(true);
  if (signal?.aborted) return Promise.resolve(false);
  return new Promise((resolve) => {
    let settled = false;
    const onAbort = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(false);
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      resolve(true);
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Compute delay with exponential backoff and jitter.
 * Formula: min(baseMs * factor^attempt, capMs) +/- jitterRatio.
 */
function computeBackoffDelay(
  attempt: number,
  baseMs: number,
  capMs: number,
  factor: number = 2,
  jitterRatio: number = 0.25
): number {
  const exponential = baseMs * Math.pow(factor, attempt);
  const capped = Math.min(exponential, capMs);
  if (jitterRatio <= 0) return Math.round(capped);
  const jitter = capped * jitterRatio;
  const min = capped - jitter;
  const max = capped + jitter;
  return Math.max(0, Math.round(min + Math.random() * (max - min)));
}

type PollOptions = {
  signal?: AbortSignal;
};

type PollAttemptResult =
  | { status: 'success'; output: string[] }
  | { status: 'processing' }
  | { status: 'error'; message?: string };

type PollConfig = {
  timeoutMs: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  jitterRatio: number;
  maxAttempts: number;
  errorLabel: string;
};

function extractRequestId(fetchUrlOrId: string): string {
  const trimmed = fetchUrlOrId.trim();
  if (!trimmed) throw new Error('Missing request_id for polling');
  if (/^[\w-]+$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    if (lastSegment) return lastSegment;
  } catch {
    // fall through to split logic
  }

  const cleaned = trimmed.split(/[?#]/)[0]?.replace(/\/$/, '');
  const last = cleaned.split('/').pop();
  if (last) return last;

  throw new Error(`Cannot extract request_id from: ${fetchUrlOrId}`);
}

async function pollWithBackoff(
  config: PollConfig,
  options: PollOptions | undefined,
  attemptFn: (signal: AbortSignal) => Promise<PollAttemptResult>
): Promise<string[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);
  let abortedByExternal = false;
  let externalAbortHandler: (() => void) | undefined;

  if (options?.signal) {
    if (options.signal.aborted) {
      abortedByExternal = true;
      controller.abort();
    } else {
      externalAbortHandler = () => {
        abortedByExternal = true;
        controller.abort();
      };
      options.signal.addEventListener('abort', externalAbortHandler, { once: true });
    }
  }

  let lastError: Error | null = null;

  try {
    for (let attempt = 0; attempt < config.maxAttempts; attempt += 1) {
      const delay = computeBackoffDelay(
        attempt,
        config.initialDelayMs,
        config.maxDelayMs,
        config.backoffFactor,
        config.jitterRatio
      );
      const alive = await abortableSleep(delay, controller.signal);
      if (!alive) {
        throw new Error(abortedByExternal ? `${config.errorLabel} cancelled` : `${config.errorLabel} timed out`);
      }

      let result: PollAttemptResult;
      try {
        result = await attemptFn(controller.signal);
      } catch (error) {
        if (controller.signal.aborted) {
          throw new Error(abortedByExternal ? `${config.errorLabel} cancelled` : `${config.errorLabel} timed out`);
        }
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[${config.errorLabel}] Poll attempt ${attempt + 1} failed:`, lastError.message);
        continue;
      }

      if (result.status === 'success') {
        return result.output;
      }
      if (result.status === 'error') {
        throw new Error(result.message || `${config.errorLabel} failed`);
      }
    }
  } finally {
    clearTimeout(timeoutId);
    if (externalAbortHandler && options?.signal) {
      options.signal.removeEventListener('abort', externalAbortHandler);
    }
  }

  const timeoutMessage = lastError
    ? `${config.errorLabel} timed out: ${lastError.message}`
    : `${config.errorLabel} timed out`;
  throw new Error(timeoutMessage);
}

async function fetchModelsLabOutput(
  fetchEndpoint: string,
  apiKey: string,
  requestId: string,
  signal: AbortSignal
): Promise<PollAttemptResult> {
  const response = await fetch(fetchEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: apiKey,
      request_id: requestId,
    }),
    signal,
  });

  if (!response.ok) {
    return { status: 'processing' };
  }

  const data = (await response.json()) as FetchResponse | VideoFetchResponse;
  if (data.status === 'success' && Array.isArray(data.output) && data.output.length > 0) {
    return { status: 'success', output: data.output };
  }

  if (data.status === 'error' || data.status === 'failed') {
    return { status: 'error', message: data.message };
  }

  return { status: 'processing' };
}

/**
 * Poll for image generation result when status is 'processing'
 */
async function pollForResult(
  fetchUrl: string,
  apiKey: string,
  maxAttempts: number = 20,
  options?: PollOptions
): Promise<string[]> {
  const requestId = extractRequestId(fetchUrl);
  return pollWithBackoff(
    {
      timeoutMs: 60_000,
      initialDelayMs: 1_000,
      maxDelayMs: 8_000,
      backoffFactor: 1.6,
      jitterRatio: 0.2,
      maxAttempts,
      errorLabel: 'Image generation',
    },
    options,
    (signal) => fetchModelsLabOutput(MODELSLAB_FETCH_URL, apiKey, requestId, signal)
  );
}

/**
 * Generate an image using ModelsLab Text-to-Image API
 *
 * @param prompt - The text prompt to generate an image from
 * @param style - The style of image to generate (realistic, anime, cartoon)
 * @param width - Image width (default: 768)
 * @param height - Image height (default: 1024)
 */
export async function generateImage(
  prompt: string,
  style: ImageStyle = 'realistic',
  width: string = '768',
  height: string = '1024',
  webhookOptions?: WebhookOptions,
  samples: string = '1',
  loraOptions?: LoraOptions,
  options?: { signal?: AbortSignal }
): Promise<{ imageUrl: string | null; imageUrls?: string[]; status: 'success' | 'processing'; rawResponse?: GenerationRawResponse }> {
  const apiKey = getNextApiKey();
  const styleSettings = getStyleSettings(style);

  const enhancedPrompt = styleSettings.promptPrefix
    ? `${styleSettings.promptPrefix} ${prompt}`
    : prompt;

  const requestBody: Text2ImageRequest = {
    key: apiKey,
    prompt: enhancedPrompt,
    negative_prompt: styleSettings.negativePrompt,
    width,
    height,
    samples,
    model_id: styleSettings.modelId,
    num_inference_steps: '30',
    guidance_scale: 7.5,
    enhance_prompt: 'yes',
    seed: null,
    webhook: webhookOptions?.webhook ?? null,
    track_id: webhookOptions?.trackId ?? null,
    lora_model: loraOptions?.loraModel ?? null,
    lora_strength: loraOptions?.loraStrength ?? (loraOptions ? 0.8 : null),
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(MODELSLAB_IMAGE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const data: Text2ImageResponse = await response.json();

      if (data.status === 'error' || data.status === 'failed') {
        throw new Error(data.message || 'Image generation failed');
      }

      if (data.status === 'processing') {
        // When webhook is set and status is processing, return immediately (webhook will handle completion)
        if (webhookOptions) {
          return {
            imageUrl: null,
            status: 'processing',
            rawResponse: data as GenerationRawResponse,
          };
        }

        // If processing without webhook, poll for result
        const fetchId = data.fetch_result ?? (data.id !== undefined ? String(data.id) : '');
        if (!fetchId) {
          throw new Error('Missing request id for image fetch');
        }
        const pollOptions = options?.signal ? { signal: options.signal } : undefined;
        const output = await pollForResult(fetchId, apiKey, undefined, pollOptions);
        return { imageUrl: output[0]!, imageUrls: output, status: 'success' };
      }

      // If success, return all output URLs
      if (data.status === 'success' && data.output && data.output.length > 0) {
        return { imageUrl: data.output[0]!, imageUrls: data.output, status: 'success', rawResponse: data as GenerationRawResponse };
      }

      // Use proxy links as fallback
      if (data.proxy_links && data.proxy_links.length > 0) {
        return { imageUrl: data.proxy_links[0]!, imageUrls: data.proxy_links, status: 'success', rawResponse: data as GenerationRawResponse };
      }

      throw new Error('No image URL in response');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`ModelsLab Image API attempt ${attempt + 1} failed:`, lastError.message);

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Failed to generate image after multiple attempts');
}

/**
 * ModelsLab Video Generation API Integration
 */

const MODELSLAB_TEXT2VIDEO_URL = 'https://modelslab.com/api/v6/video/text2video_ultra';
const MODELSLAB_IMG2VIDEO_URL = 'https://modelslab.com/api/v6/video/img2video_ultra';
const MODELSLAB_VIDEO_FETCH_URL = 'https://modelslab.com/api/v6/video/fetch';
const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

interface Text2VideoRequest {
  key: string;
  prompt: string;
  negative_prompt: string;
  model_id: string;
  resolution: number;
  num_frames: number;
  num_inference_steps: number;
  guidance_scale: number;
  shift_sample: number;
  fps: number;
  portrait?: boolean;
  webhook?: string | null;
  track_id?: number | null;
}

interface Img2VideoRequest {
  key: string;
  init_image: string;
  prompt: string;
  model_id: string;
  negative_prompt: string;
  resolution: number;
  num_frames: number;
  num_inference_steps: number;
  guidance_scale: number;
  base64: boolean;
  webhook?: string | null;
  track_id?: number | null;
}

interface VideoResponse {
  status: 'success' | 'processing' | 'error' | 'failed';
  generationTime?: number;
  id?: number;
  output?: string[];
  proxy_links?: string[];
  future_links?: string[];
  message?: string;
  fetch_result?: string;
  eta?: number;
}

interface VideoFetchResponse {
  status: 'success' | 'processing' | 'error' | 'failed';
  output?: string[];
  message?: string;
}

const VIDEO_NEGATIVE_PROMPT = 'low quality, worst quality, blurry, out of focus, pixelated, noisy, grainy, jpeg artifacts, watermark, logo, text, subtitles, captions, signature, cropped, frame cut, border, duplicate frames, flickering, jitter, stuttering motion, motion blur, ghosting, temporal inconsistency, sudden jumps, frame skipping, distorted motion, unnatural movement, broken anatomy, extra limbs, extra fingers, missing fingers, deformed face, warped body, bad proportions, floating objects, melting, stretched textures, unrealistic physics, wrong shadows, bad lighting, overexposed, underexposed, color banding, washed out colors, oversaturated, low fps, choppy animation';

function isLikelyBase64(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.length >= 32 &&
    trimmed.length % 4 !== 1 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(trimmed)
  );
}

function pickFirstString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return null;
}

function normalizeModelsLabImageOutput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('data:image/')) return trimmed;
  if (ABSOLUTE_URL_REGEX.test(trimmed) || trimmed.startsWith('/')) return trimmed;
  if (isLikelyBase64(trimmed)) return `data:image/png;base64,${trimmed}`;
  return trimmed;
}

function extractModelsLabRequestIdFromUnknown(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null;
  const record = data as Record<string, unknown>;

  const directId = record.id ?? record.request_id ?? record.requestId;
  if (typeof directId === 'string' || typeof directId === 'number') return String(directId);

  const fetchResult = typeof record.fetch_result === 'string' ? record.fetch_result : null;
  if (fetchResult) {
    try {
      return extractRequestId(fetchResult);
    } catch {
      // ignore and fall through
    }
  }

  return null;
}

function extractModelsLabImageUrlFromUnknown(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null;
  const record = data as Record<string, unknown>;

  const url =
    pickFirstString(record.output) ||
    pickFirstString(record.proxy_links) ||
    pickFirstString(record.future_links) ||
    pickFirstString(record.links) ||
    null;

  return url ? normalizeModelsLabImageOutput(url) : null;
}

function normalizeModelsLabInitImage(input: string): { initImage: string; base64: boolean } {
  const trimmed = input.trim();
  if (!trimmed) return { initImage: trimmed, base64: false };

  if (trimmed.startsWith('data:image/')) {
    const marker = 'base64,';
    const markerIndex = trimmed.indexOf(marker);
    if (markerIndex !== -1) {
      return { initImage: trimmed.slice(markerIndex + marker.length), base64: true };
    }
  }

  if (ABSOLUTE_URL_REGEX.test(trimmed)) {
    return { initImage: trimmed, base64: false };
  }

  if (isLikelyBase64(trimmed)) {
    return { initImage: trimmed, base64: true };
  }

  if (trimmed.startsWith('/')) {
    return { initImage: trimmed, base64: false };
  }

  return { initImage: trimmed, base64: false };
}

/**
 * Poll for video generation result when status is 'processing'
 */
async function pollForVideoResult(
  fetchId: string,
  apiKey: string,
  maxAttempts: number = 30,
  options?: PollOptions
): Promise<string[]> {
  const requestId = extractRequestId(fetchId);
  return pollWithBackoff(
    {
      timeoutMs: 180_000,
      initialDelayMs: 2_000,
      maxDelayMs: 15_000,
      backoffFactor: 1.5,
      jitterRatio: 0.2,
      maxAttempts,
      errorLabel: 'Video generation',
    },
    options,
    (signal) => fetchModelsLabOutput(MODELSLAB_VIDEO_FETCH_URL, apiKey, requestId, signal)
  );
}

/**
 * Fetch a completed video result from ModelsLab using the stored API key.
 * Called by the webhook handler when the video is ready.
 *
 * @param requestId - The ModelsLab request/job ID (externalId)
 * @param apiKey - The same API key that was used for the original generation request
 */
export async function fetchVideoResult(
  requestId: string,
  apiKey: string
): Promise<{ videoUrl: string | null; status: 'success' | 'processing' | 'error' }> {
  const response = await fetch(`${MODELSLAB_VIDEO_FETCH_URL}/${requestId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: apiKey }),
  });

  if (!response.ok) {
    console.error(`[fetchVideoResult] HTTP ${response.status} from ModelsLab fetch API`);
    return { videoUrl: null, status: 'error' };
  }

  const data: VideoFetchResponse = await response.json();

  if (data.status === 'success' && data.output && data.output.length > 0) {
    return { videoUrl: data.output[0]!, status: 'success' };
  }

  return { videoUrl: null, status: data.status === 'processing' ? 'processing' : 'error' };
}

/**
 * Generate a video from text prompt using ModelsLab Text-to-Video API
 *
 * @param prompt - The text prompt to generate a video from
 */
export async function generateText2Video(
  prompt: string,
  webhookOptions?: WebhookOptions,
  options?: { portrait?: boolean; modelId?: string; duration?: number; resolution?: number; signal?: AbortSignal }
): Promise<{ videoUrl: string | null; status: 'success' | 'processing'; rawResponse?: GenerationRawResponse; apiKeyUsed: string }> {
  const apiKey = getNextApiKey();
  const fps = 18;
  const durationSeconds = options?.duration ?? 5;
  const numFrames = Math.max(fps, durationSeconds * fps);

  const requestBody: Text2VideoRequest = {
    key: apiKey,
    prompt,
    negative_prompt: VIDEO_NEGATIVE_PROMPT,
    model_id: options?.modelId || 'wan2.1',
    resolution: options?.resolution ?? 480,
    num_frames: numFrames,
    num_inference_steps: 8,
    guidance_scale: 1.0,
    shift_sample: 3,
    fps: 18,
    portrait: options?.portrait ?? false,
    webhook: webhookOptions?.webhook ?? null,
    track_id: webhookOptions?.trackId ?? null,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(MODELSLAB_TEXT2VIDEO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const data: VideoResponse = await response.json();

      if (data.status === 'error' || data.status === 'failed') {
        throw new Error(data.message || 'Video generation failed');
      }

      // When webhook is set and status is processing, return immediately
      if (webhookOptions && data.status === 'processing') {
        return {
          videoUrl: null,
          status: 'processing',
          rawResponse: data as GenerationRawResponse,
          apiKeyUsed: apiKey,
        };
      }

      // If processing without webhook, poll for result
      if (data.status === 'processing') {
        const fetchId = data.fetch_result ?? (data.id !== undefined ? String(data.id) : '');
        if (!fetchId) throw new Error('Missing request id for video fetch');
        const pollOptions = options?.signal ? { signal: options.signal } : undefined;
        const output = await pollForVideoResult(fetchId, apiKey, undefined, pollOptions);
        return { videoUrl: output[0]!, status: 'success', apiKeyUsed: apiKey };
      }

      // If success, return the first output URL
      if (data.status === 'success' && data.output && data.output.length > 0) {
        return { videoUrl: data.output[0]!, status: 'success', rawResponse: data as GenerationRawResponse, apiKeyUsed: apiKey };
      }

      // Use proxy links as fallback
      if (data.proxy_links && data.proxy_links.length > 0) {
        return { videoUrl: data.proxy_links[0]!, status: 'success', rawResponse: data as GenerationRawResponse, apiKeyUsed: apiKey };
      }

      // Use future_links as fallback
      if (data.future_links && data.future_links.length > 0) {
        return { videoUrl: data.future_links[0]!, status: 'success', rawResponse: data as GenerationRawResponse, apiKeyUsed: apiKey };
      }

      throw new Error('No video URL in response');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`ModelsLab Text2Video API attempt ${attempt + 1} failed:`, lastError.message);

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Failed to generate video after multiple attempts');
}

/**
 * Generate a video from an image using ModelsLab Image-to-Video API
 *
 * @param imageUrl - URL of the image to animate (or base64 string)
 * @param prompt - The motion/action prompt
 */
export async function generateImg2Video(
  imageUrl: string,
  prompt: string,
  webhookOptions?: WebhookOptions,
  options?: { modelId?: string; duration?: number; resolution?: number; signal?: AbortSignal }
): Promise<{ videoUrl: string | null; status: 'success' | 'processing'; rawResponse?: GenerationRawResponse; apiKeyUsed: string }> {
  const apiKey = getNextApiKey();
  const normalizedImage = normalizeModelsLabInitImage(imageUrl);
  const fps = 18;
  const durationSeconds = options?.duration ?? 5;
  const numFrames = Math.max(fps, durationSeconds * fps);

  const requestBody: Img2VideoRequest = {
    key: apiKey,
    init_image: normalizedImage.initImage,
    prompt,
    model_id: options?.modelId || 'wan2.1',
    negative_prompt: VIDEO_NEGATIVE_PROMPT,
    resolution: options?.resolution ?? 480,
    num_frames: numFrames,
    num_inference_steps: 8,
    guidance_scale: 1.0,
    base64: normalizedImage.base64,
    webhook: webhookOptions?.webhook ?? null,
    track_id: webhookOptions?.trackId ?? null,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(MODELSLAB_IMG2VIDEO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const data: VideoResponse = await response.json();

      if (data.status === 'error' || data.status === 'failed') {
        throw new Error(data.message || 'Video generation failed');
      }

      // When webhook is set and status is processing, return immediately
      if (webhookOptions && data.status === 'processing') {
        return {
          videoUrl: null,
          status: 'processing',
          rawResponse: data as GenerationRawResponse,
          apiKeyUsed: apiKey,
        };
      }

      // If processing without webhook, poll for result
      if (data.status === 'processing') {
        const fetchId = data.fetch_result ?? (data.id !== undefined ? String(data.id) : '');
        if (!fetchId) throw new Error('Missing request id for video fetch');
        const pollOptions = options?.signal ? { signal: options.signal } : undefined;
        const output = await pollForVideoResult(fetchId, apiKey, undefined, pollOptions);
        return { videoUrl: output[0]!, status: 'success', apiKeyUsed: apiKey };
      }

      // If success, return the first output URL
      if (data.status === 'success' && data.output && data.output.length > 0) {
        return { videoUrl: data.output[0]!, status: 'success', rawResponse: data as GenerationRawResponse, apiKeyUsed: apiKey };
      }

      // Use proxy links as fallback
      if (data.proxy_links && data.proxy_links.length > 0) {
        return { videoUrl: data.proxy_links[0]!, status: 'success', rawResponse: data as GenerationRawResponse, apiKeyUsed: apiKey };
      }

      // Use future_links as fallback
      if (data.future_links && data.future_links.length > 0) {
        return { videoUrl: data.future_links[0]!, status: 'success', rawResponse: data as GenerationRawResponse, apiKeyUsed: apiKey };
      }

      throw new Error('No video URL in response');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`ModelsLab Img2Video API attempt ${attempt + 1} failed:`, lastError.message);

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Failed to generate video after multiple attempts');
}

/**
 * Motion Transfer via ModelsLab Video Fusion API (Kling Motion Control)
 *
 * Transfers motion from a reference video onto a static character image.
 *
 * @param imageUrl  - URL of the character image (single person, clear body + head)
 * @param videoUrl  - URL of the reference motion video (.mp4/.mov, min 3s)
 * @param prompt    - Describes the desired motion/animation
 * @param webhookOptions - Optional webhook for async job tracking
 * @param options   - characterOrientation: "image" (keep pose, ≤10s) or "video" (follow motion, ≤30s)
 */
const MODELSLAB_MOTION_CONTROL_URL = 'https://modelslab.com/api/v7/video-fusion/motion-control';

export async function generateMotionTransfer(
  imageUrl: string,
  videoUrl: string,
  prompt: string,
  webhookOptions?: WebhookOptions,
  options?: { characterOrientation?: 'image' | 'video'; signal?: AbortSignal }
): Promise<{ videoUrl: string | null; status: 'success' | 'processing'; rawResponse?: GenerationRawResponse; apiKeyUsed: string }> {
  const apiKey = getNextApiKey();

  const requestBody = {
    key: apiKey,
    model_id: 'kling-motion-control',
    prompt,
    init_image: imageUrl,
    init_video: videoUrl,
    character_orientation: options?.characterOrientation ?? 'image',
    webhook: webhookOptions?.webhook ?? null,
    track_id: webhookOptions?.trackId ?? null,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(MODELSLAB_MOTION_CONTROL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const data: VideoResponse = await response.json();

      if (data.status === 'error' || data.status === 'failed') {
        throw new Error(data.message || 'Motion transfer failed');
      }

      if (webhookOptions && data.status === 'processing') {
        return {
          videoUrl: null,
          status: 'processing',
          rawResponse: data as GenerationRawResponse,
          apiKeyUsed: apiKey,
        };
      }

      if (data.status === 'processing') {
        const fetchId = data.fetch_result ?? (data.id !== undefined ? String(data.id) : '');
        if (!fetchId) throw new Error('Missing request id for motion transfer fetch');
        const pollOptions = options?.signal ? { signal: options.signal } : undefined;
        const output = await pollForVideoResult(fetchId, apiKey, undefined, pollOptions);
        return { videoUrl: output[0]!, status: 'success', apiKeyUsed: apiKey };
      }

      if (data.status === 'success' && data.output && data.output.length > 0) {
        return { videoUrl: data.output[0]!, status: 'success', rawResponse: data as GenerationRawResponse, apiKeyUsed: apiKey };
      }

      if (data.proxy_links && data.proxy_links.length > 0) {
        return { videoUrl: data.proxy_links[0]!, status: 'success', rawResponse: data as GenerationRawResponse, apiKeyUsed: apiKey };
      }

      if (data.future_links && data.future_links.length > 0) {
        return { videoUrl: data.future_links[0]!, status: 'success', rawResponse: data as GenerationRawResponse, apiKeyUsed: apiKey };
      }

      throw new Error('No video URL in response');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`ModelsLab Motion Transfer API attempt ${attempt + 1} failed:`, lastError.message);

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Failed to generate motion transfer after multiple attempts');
}

/**
 * ModelsLab Image Editing API Integration
 */

const MODELSLAB_IMAGE_EDIT_URL = 'https://modelslab.com/api/v6/image_editing/qwen_edit';
const MODELSLAB_IMAGE_EDIT_BASE64_TO_URL_URL = 'https://modelslab.com/api/v6/image_editing/base64_to_url';
const MODELSLAB_IMAGE_EDIT_FETCH_BASE_URL = 'https://modelslab.com/api/v6/image_editing/fetch';
const MODELSLAB_IMAGE_EDIT_MODEL_ID = 'qwen-edit-2509';

interface Base64ToUrlRequest {
  key: string;
  init_image: string;
}

interface Base64ToUrlResponse {
  status?: 'success' | 'processing' | 'error' | 'failed' | string;
  output?: string | string[];
  message?: string;
}

interface ImageEditRequest {
  key: string;
  prompt: string;
  init_image: string[];
  safety_checker: boolean;
  model_id: string;
  base64: boolean;
  webhook?: string | null;
  track_id?: number | null;
}

interface ImageEditResponse {
  status: 'success' | 'processing' | 'error' | 'failed';
  generationTime?: number;
  id?: number;
  request_id?: string | number;
  output?: string[];
  proxy_links?: string[];
  future_links?: string[];
  links?: string[];
  message?: string;
  fetch_result?: string;
  eta?: number;
}

interface ImageEditFetchResponse {
  status: 'success' | 'ready' | 'processing' | 'error' | 'failed' | string;
  output?: string[] | string;
  proxy_links?: string[] | string;
  future_links?: string[] | string;
  links?: string[] | string;
  message?: string;
  eta?: number;
}

function guessImageMimeTypeFromBase64(base64: string): string | null {
  const head = base64.trim().slice(0, 16);
  if (head.startsWith('/9j/')) return 'image/jpeg';
  if (head.startsWith('iVBORw0KGgo')) return 'image/png';
  if (head.startsWith('R0lGOD')) return 'image/gif';
  if (head.startsWith('UklGR')) return 'image/webp';
  return null;
}

function ensureImageDataUri(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('data:image/')) return trimmed;
  const mime = guessImageMimeTypeFromBase64(trimmed) ?? 'image/png';
  return `data:${mime};base64,${trimmed}`;
}

async function base64ToUrlImageEditing(dataUriOrBase64: string, apiKey: string): Promise<string> {
  const dataUri = ensureImageDataUri(dataUriOrBase64);
  console.log(`[base64_to_url] Sending request (data URI length: ${dataUri.length})`);

  const requestBody: Base64ToUrlRequest = {
    key: apiKey,
    init_image: dataUri,
  };

  const response = await fetch(MODELSLAB_IMAGE_EDIT_BASE64_TO_URL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error(`[base64_to_url] HTTP ${response.status}: ${errorText}`);
    throw new Error(`ModelsLab base64_to_url failed with HTTP ${response.status}${errorText ? `: ${errorText}` : ''}`);
  }

  const data: Base64ToUrlResponse & Record<string, unknown> = await response.json();
  console.log('[base64_to_url] Response:', JSON.stringify({ status: data.status, hasOutput: !!data.output, hasUrl: !!data.url, hasLinks: !!data.links, hasLink: !!data.link, message: data.message }));

  if (data.status === 'error' || data.status === 'failed') {
    throw new Error(typeof data.message === 'string' ? data.message : 'ModelsLab base64_to_url failed');
  }

  const url =
    pickFirstString(data.output) ||
    (typeof data.url === 'string' ? data.url : null) ||
    pickFirstString(data.links) ||
    (typeof data.link === 'string' ? data.link : null) ||
    (typeof data.image_url === 'string' ? data.image_url : null);

  if (!url) {
    console.error('[base64_to_url] No URL found in response. Full response:', JSON.stringify(data));
    throw new Error('ModelsLab base64_to_url returned no output URL');
  }

  console.log(`[base64_to_url] Got URL: ${url.substring(0, 80)}...`);
  return url;
}

/**
 * Poll for image edit result when status is 'processing'
 */
async function pollForImageEditResult(
  fetchId: string,
  apiKey: string,
  maxAttempts: number = 20,
  options?: PollOptions
): Promise<string[]> {
  const requestId = extractRequestId(fetchId);
  return pollWithBackoff(
    {
      timeoutMs: 60_000,
      initialDelayMs: 1_000,
      maxDelayMs: 8_000,
      backoffFactor: 1.6,
      jitterRatio: 0.2,
      maxAttempts,
      errorLabel: 'Image editing',
    },
    options,
    async (signal) => {
      const fetchResult = await fetchImageEditResult(requestId, apiKey, signal);
      if (fetchResult.status === 'success' && fetchResult.imageUrl) {
        return { status: 'success', output: [fetchResult.imageUrl] };
      }
      if (fetchResult.status === 'error') {
        return { status: 'error', message: fetchResult.message };
      }
      return { status: 'processing' };
    }
  );
}

export async function fetchImageEditResult(
  requestId: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<{ imageUrl: string | null; status: 'success' | 'processing' | 'error'; message?: string }> {
  const url = `${MODELSLAB_IMAGE_EDIT_FETCH_BASE_URL}/${encodeURIComponent(requestId)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: apiKey }),
    signal,
  });

  if (!response.ok) {
    console.error(`[fetchImageEditResult] HTTP ${response.status} from ModelsLab image edit fetch API`);
    return { imageUrl: null, status: 'error' };
  }

  const data: ImageEditFetchResponse = await response.json();

  if (data.status === 'processing') {
    return { imageUrl: null, status: 'processing', message: data.message };
  }

  if (data.status === 'error' || data.status === 'failed') {
    return { imageUrl: null, status: 'error', message: data.message };
  }

  const imageUrl = extractModelsLabImageUrlFromUnknown(data);

  if (!imageUrl) {
    return { imageUrl: null, status: data.status === 'ready' || data.status === 'success' ? 'success' : 'processing', message: data.message };
  }

  if (imageUrl.startsWith('data:image/')) {
    try {
      const uploadedUrl = await base64ToUrlImageEditing(imageUrl, apiKey);
      return { imageUrl: uploadedUrl, status: 'success', message: data.message };
    } catch (error) {
      console.warn('[fetchImageEditResult] base64_to_url failed, returning data URI:', error);
    }
  }

  return { imageUrl, status: 'success', message: data.message };
}

/**
 * Edit an image using ModelsLab Qwen Edit API
 *
 * @param imageInput - URL or base64 string of the image to edit
 * @param prompt - The editing instruction/prompt
 */
export async function editImage(
  imageInput: string,
  prompt: string,
  webhookOptions?: WebhookOptions,
  options?: { signal?: AbortSignal }
): Promise<{
  imageUrl: string | null;
  status: 'success' | 'processing';
  requestId: string | null;
  rawResponse?: GenerationRawResponse;
  apiKeyUsed: string;
}> {
  const normalizedImage = normalizeModelsLabInitImage(imageInput);

  let initImage = normalizedImage.initImage;
  let base64 = normalizedImage.base64;

  // For base64 input, MUST convert to URL first via base64_to_url.
  // The qwen_edit API does not work reliably with base64=true,
  // so we retry base64_to_url with rotating API keys before giving up.
  if (normalizedImage.base64) {
    let uploadedUrl: string | null = null;
    let uploadError: Error | null = null;
    const maxUploadAttempts = 3;

    for (let i = 0; i < maxUploadAttempts; i++) {
      const uploadKey = getNextApiKey();
      try {
        console.log(`[editImage] base64_to_url attempt ${i + 1}/${maxUploadAttempts}`);
        uploadedUrl = await base64ToUrlImageEditing(imageInput, uploadKey);
        break;
      } catch (error) {
        uploadError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[editImage] base64_to_url attempt ${i + 1} failed:`, uploadError.message);
        if (i < maxUploadAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500 * (i + 1)));
        }
      }
    }

    if (!uploadedUrl) {
      throw new Error(`Failed to upload image for editing: ${uploadError?.message || 'base64_to_url failed after retries'}`);
    }

    initImage = uploadedUrl;
    base64 = false;
    console.log(`[editImage] Image uploaded, using URL: ${initImage.substring(0, 80)}...`);
  }

  let lastError: Error | null = null;

  // Retry the edit request with a fresh API key on each attempt
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const apiKey = getNextApiKey();

    const requestBody: ImageEditRequest = {
      key: apiKey,
      prompt: `Keep the face consistent, do not change the face. ${prompt}`,
      init_image: [initImage],
      safety_checker: false,
      model_id: MODELSLAB_IMAGE_EDIT_MODEL_ID,
      base64,
      webhook: webhookOptions?.webhook ?? null,
      track_id: webhookOptions?.trackId ?? null,
    };

    try {
      console.log(`[editImage] Sending edit request (attempt ${attempt + 1}, base64=${base64})`);
      const response = await fetch(MODELSLAB_IMAGE_EDIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const data: ImageEditResponse = await response.json();
      const requestId = extractModelsLabRequestIdFromUnknown(data);
      console.log(`[editImage] Response: status=${data.status}, requestId=${requestId}`);

      if (data.status === 'error' || data.status === 'failed') {
        throw new Error(data.message || 'Image editing failed');
      }

      // When webhook is set and status is processing, return immediately
      if (webhookOptions && data.status === 'processing') {
        return {
          imageUrl: null,
          status: 'processing',
          requestId,
          rawResponse: data as GenerationRawResponse,
          apiKeyUsed: apiKey,
        };
      }

      // If processing without webhook, poll for result
      if (data.status === 'processing') {
        const fetchId = requestId ?? '';
        if (!fetchId) throw new Error('Missing request id for image edit fetch');
        const pollOptions = options?.signal ? { signal: options.signal } : undefined;
        const output = await pollForImageEditResult(fetchId, apiKey, undefined, pollOptions);
        return { imageUrl: output[0]!, status: 'success', requestId: fetchId, apiKeyUsed: apiKey };
      }

      // If success, return the first output URL
      const imageUrl = extractModelsLabImageUrlFromUnknown(data);
      if (data.status === 'success' && imageUrl) {
        if (imageUrl.startsWith('data:image/')) {
          try {
            const uploadedUrl = await base64ToUrlImageEditing(imageUrl, apiKey);
            return {
              imageUrl: uploadedUrl,
              status: 'success',
              requestId,
              rawResponse: data as GenerationRawResponse,
              apiKeyUsed: apiKey,
            };
          } catch (error) {
            console.warn('[editImage] base64_to_url failed for output, returning data URI:', error);
          }
        }

        return {
          imageUrl,
          status: 'success',
          requestId,
          rawResponse: data as GenerationRawResponse,
          apiKeyUsed: apiKey,
        };
      }

      // Use proxy links as fallback
      if (imageUrl) {
        return {
          imageUrl,
          status: 'success',
          requestId,
          rawResponse: data as GenerationRawResponse,
          apiKeyUsed: apiKey,
        };
      }

      throw new Error('No image URL in response');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[editImage] Edit API attempt ${attempt + 1} failed:`, lastError.message);

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Failed to edit image after multiple attempts');
}

// ============================================================================
// ModelsLab Face Swap API Integration
// ============================================================================

// NOTE: Endpoint naming is intentionally swapped per ModelsLab docs:
// - Single face swap uses the "multiple_face_swap" endpoint
// - Multi face swap uses the "single_face_swap" endpoint
const MODELSLAB_SINGLE_FACE_SWAP_URL = 'https://modelslab.com/api/v6/faceswap/multiple_face_swap';
const MODELSLAB_MULTI_FACE_SWAP_URL = 'https://modelslab.com/api/v6/faceswap/single_face_swap';
const MODELSLAB_FACE_SWAP_FETCH_URL = 'https://modelslab.com/api/v6/faceswap/fetch';

interface FaceSwapResponse {
  status: 'success' | 'processing' | 'error' | 'failed';
  id?: number;
  output?: string[];
  proxy_links?: string[];
  future_links?: string[];
  message?: string;
  fetch_result?: string;
  eta?: number;
}

/**
 * Poll for face swap result when status is 'processing'
 */
async function pollForFaceSwapResult(
  fetchId: string,
  apiKey: string,
  maxAttempts: number = 20,
  options?: PollOptions
): Promise<string[]> {
  const requestId = extractRequestId(fetchId);
  return pollWithBackoff(
    {
      timeoutMs: 60_000,
      initialDelayMs: 1_000,
      maxDelayMs: 8_000,
      backoffFactor: 1.6,
      jitterRatio: 0.2,
      maxAttempts,
      errorLabel: 'Face swap',
    },
    options,
    (signal) => fetchModelsLabOutput(
      `${MODELSLAB_FACE_SWAP_FETCH_URL}/${requestId}`,
      apiKey,
      requestId,
      signal
    )
  );
}

/**
 * Fetch a completed face swap result from ModelsLab.
 * Called by the webhook handler or job polling when the result is ready.
 */
export async function fetchFaceSwapResult(
  requestId: string,
  apiKey: string
): Promise<{ imageUrl: string | null; status: 'success' | 'processing' | 'error' }> {
  const response = await fetch(`${MODELSLAB_FACE_SWAP_FETCH_URL}/${requestId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: apiKey }),
  });

  if (!response.ok) {
    console.error(`[fetchFaceSwapResult] HTTP ${response.status}`);
    return { imageUrl: null, status: 'error' };
  }

  const data: FetchResponse = await response.json();

  if (data.status === 'success' && Array.isArray(data.output) && data.output.length > 0) {
    return { imageUrl: data.output[0]!, status: 'success' };
  }

  return { imageUrl: null, status: data.status === 'processing' ? 'processing' : 'error' };
}

/**
 * Perform a face swap using ModelsLab Face Swap API.
 *
 * Single mode: swaps the face from initImage onto targetImage (2 images).
 * Multi mode: uses referenceImage to identify which face in initImage to swap with targetImage (3 images).
 *
 * @param mode - 'single' or 'multi'
 * @param initImage - URL of the source image containing the face to use
 * @param targetImage - URL of the target image where the face will be placed
 * @param referenceImage - URL of reference image (multi mode only, identifies which face to swap)
 * @param webhookOptions - Optional webhook for async job tracking
 */
export async function faceSwap(
  mode: 'single' | 'multi',
  initImage: string,
  targetImage: string,
  referenceImage: string | null,
  webhookOptions?: WebhookOptions,
  options?: { signal?: AbortSignal }
): Promise<{
  imageUrl: string | null;
  status: 'success' | 'processing';
  rawResponse?: GenerationRawResponse;
  apiKeyUsed: string;
  requestId: string | null;
}> {
  const apiKey = getNextApiKey();

  // Choose endpoint based on mode
  const url = mode === 'single' ? MODELSLAB_SINGLE_FACE_SWAP_URL : MODELSLAB_MULTI_FACE_SWAP_URL;

  // Build request body
  const requestBody: Record<string, unknown> = {
    key: apiKey,
    init_image: initImage,
    target_image: targetImage,
    base64: false,
    webhook: webhookOptions?.webhook ?? null,
    track_id: webhookOptions?.trackId ?? null,
  };

  // Multi mode requires reference_image
  if (mode === 'multi' && referenceImage) {
    requestBody.reference_image = referenceImage;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[faceSwap] ${mode} mode, attempt ${attempt + 1}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const data: FaceSwapResponse = await response.json();
      const requestId = extractModelsLabRequestIdFromUnknown(data);

      if (data.status === 'error' || data.status === 'failed') {
        throw new Error(data.message || 'Face swap failed');
      }

      // If processing with webhook, return immediately (webhook handles completion)
      if (webhookOptions && data.status === 'processing') {
        return {
          imageUrl: null,
          status: 'processing',
          rawResponse: data as GenerationRawResponse,
          apiKeyUsed: apiKey,
          requestId,
        };
      }

      // If processing without webhook, poll for result
      if (data.status === 'processing') {
        const fetchId = data.fetch_result ?? (data.id !== undefined ? String(data.id) : '');
        if (!fetchId) throw new Error('Missing request id for face swap fetch');
        const pollOptions = options?.signal ? { signal: options.signal } : undefined;
        const output = await pollForFaceSwapResult(fetchId, apiKey, undefined, pollOptions);
        return { imageUrl: output[0]!, status: 'success', apiKeyUsed: apiKey, requestId };
      }

      // Success — extract image URL from response
      if (data.status === 'success' && data.output && data.output.length > 0) {
        return { imageUrl: data.output[0]!, status: 'success', rawResponse: data as GenerationRawResponse, apiKeyUsed: apiKey, requestId };
      }

      // Fallback to proxy/future links
      if (data.proxy_links && data.proxy_links.length > 0) {
        return { imageUrl: data.proxy_links[0]!, status: 'success', rawResponse: data as GenerationRawResponse, apiKeyUsed: apiKey, requestId };
      }
      if (data.future_links && data.future_links.length > 0) {
        return { imageUrl: data.future_links[0]!, status: 'success', rawResponse: data as GenerationRawResponse, apiKeyUsed: apiKey, requestId };
      }

      throw new Error('No image URL in face swap response');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[faceSwap] Attempt ${attempt + 1} failed:`, lastError.message);

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Failed to perform face swap after multiple attempts');
}

// ============================================================================
// ModelsLab Deepfake Video API Integration
// ============================================================================

const MODELSLAB_SINGLE_VIDEO_SWAP_URL = 'https://modelslab.com/api/v6/faceswap/single_video_swap';
const MODELSLAB_SPECIFIC_VIDEO_SWAP_URL = 'https://modelslab.com/api/v6/faceswap/specific_video_swap';
const MODELSLAB_VIDEO_BASE64_TO_URL = 'https://modelslab.com/api/v6/video/base64_to_url';

/**
 * Upload a base64 video to ModelsLab and get a hosted URL.
 * Uses the video-specific base64_to_url endpoint.
 *
 * @param dataUri - data:video/mp4;base64,<data> string
 * @param apiKey - ModelsLab API key
 */
export async function uploadVideoBase64ToUrl(dataUri: string, apiKey: string): Promise<string> {
  // Already a URL — no upload needed
  if (ABSOLUTE_URL_REGEX.test(dataUri)) return dataUri;

  // Ensure data URI format
  const initObj = dataUri.startsWith('data:video/')
    ? dataUri
    : `data:video/mp4;base64,${dataUri}`;

  const response = await fetch(MODELSLAB_VIDEO_BASE64_TO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: apiKey, init_obj: initObj }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Video upload failed with HTTP ${response.status}${errorText ? `: ${errorText}` : ''}`);
  }

  const data = await response.json();

  // Extract URL from response (ModelsLab may return it in various shapes)
  const url =
    pickFirstString(data.output) ||
    (typeof data.url === 'string' ? data.url : null) ||
    pickFirstString(data.links) ||
    (typeof data.link === 'string' ? data.link : null);

  if (!url) {
    console.error('[uploadVideoBase64ToUrl] No URL in response:', JSON.stringify(data));
    throw new Error('Video upload returned no URL');
  }

  return url;
}

/**
 * Poll for deepfake video result.
 * Uses the same face swap fetch endpoint since deepfake uses the faceswap namespace.
 * Longer timeouts for video processing (10min).
 */
async function pollForDeepfakeVideoResult(
  fetchId: string,
  apiKey: string,
  maxAttempts: number = 60,
  options?: PollOptions
): Promise<string[]> {
  const requestId = extractRequestId(fetchId);
  return pollWithBackoff(
    {
      timeoutMs: 600_000,      // 10 min total timeout
      initialDelayMs: 10_000,  // 10s initial delay
      maxDelayMs: 10_000,      // cap at 10s between polls
      backoffFactor: 1.2,
      jitterRatio: 0.2,
      maxAttempts,
      errorLabel: 'Deepfake video',
    },
    options,
    (signal) => fetchModelsLabOutput(
      `${MODELSLAB_FACE_SWAP_FETCH_URL}/${requestId}`,
      apiKey,
      requestId,
      signal
    )
  );
}

/**
 * Perform a deepfake video swap using ModelsLab API.
 *
 * Single mode: replaces the face in the video with initImage.
 * Specific mode: uses referenceImage to identify which face in the video to replace.
 *
 * @param mode - 'single' or 'specific'
 * @param initImage - URL of the face image to use
 * @param initVideo - URL of the source video
 * @param referenceImage - URL of reference image (specific mode only)
 * @param webhookOptions - Optional webhook for async job tracking
 */
export async function deepfakeVideoSwap(
  mode: 'single' | 'specific',
  initImage: string,
  initVideo: string,
  referenceImage: string | null,
  webhookOptions?: WebhookOptions,
  options?: { signal?: AbortSignal }
): Promise<{
  videoUrl: string | null;
  status: 'success' | 'processing';
  rawResponse?: GenerationRawResponse;
  apiKeyUsed: string;
  requestId: string | null;
}> {
  const apiKey = getNextApiKey();

  // Choose endpoint based on mode
  const url = mode === 'single' ? MODELSLAB_SINGLE_VIDEO_SWAP_URL : MODELSLAB_SPECIFIC_VIDEO_SWAP_URL;

  // Build request body
  const requestBody: Record<string, unknown> = {
    key: apiKey,
    init_image: initImage,
    init_video: initVideo,
    output_format: 'mp4',
    webhook: webhookOptions?.webhook ?? null,
    track_id: webhookOptions?.trackId ?? null,
  };

  // Specific mode requires reference_image
  if (mode === 'specific' && referenceImage) {
    requestBody.reference_image = referenceImage;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[deepfakeVideoSwap] ${mode} mode, attempt ${attempt + 1}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as FaceSwapResponse;
      const requestId = extractModelsLabRequestIdFromUnknown(data);

      if (data.status === 'error' || data.status === 'failed') {
        throw new Error(data.message || 'Deepfake video swap failed');
      }

      // If processing with webhook, return immediately
      if (webhookOptions && data.status === 'processing') {
        return {
          videoUrl: null,
          status: 'processing',
          rawResponse: data as GenerationRawResponse,
          apiKeyUsed: apiKey,
          requestId,
        };
      }

      // If processing without webhook, poll for result
      if (data.status === 'processing') {
        const fetchId = data.fetch_result ?? (data.id !== undefined ? String(data.id) : '');
        if (!fetchId) throw new Error('Missing request id for deepfake video fetch');
        const pollOptions = options?.signal ? { signal: options.signal } : undefined;
        const output = await pollForDeepfakeVideoResult(fetchId, apiKey, undefined, pollOptions);
        return { videoUrl: output[0]!, status: 'success', apiKeyUsed: apiKey, requestId };
      }

      // Success — extract video URL
      if (data.status === 'success' && data.output && data.output.length > 0) {
        return { videoUrl: data.output[0]!, status: 'success', rawResponse: data as GenerationRawResponse, apiKeyUsed: apiKey, requestId };
      }
      if (data.proxy_links && data.proxy_links.length > 0) {
        return { videoUrl: data.proxy_links[0]!, status: 'success', rawResponse: data as GenerationRawResponse, apiKeyUsed: apiKey, requestId };
      }
      if (data.future_links && data.future_links.length > 0) {
        return { videoUrl: data.future_links[0]!, status: 'success', rawResponse: data as GenerationRawResponse, apiKeyUsed: apiKey, requestId };
      }

      throw new Error('No video URL in deepfake response');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[deepfakeVideoSwap] Attempt ${attempt + 1} failed:`, lastError.message);

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Failed to perform deepfake video swap after multiple attempts');
}

// ============================================================================
// ModelsLab AI Stripe (Img2Video) API Integration
// ============================================================================

const AI_STRIPE_DEFAULT_PROMPT =
  'a girl removing her cloth, striping the cloth, nude, ';
const AI_STRIPE_NEGATIVE_PROMPT =
  'blurry, low quality, distorted, extra limbs, missing limbs, broken fingers, deformed, glitch, artifacts, unrealistic, low resolution, bad anatomy, duplicate, cropped, watermark, text, logo, jpeg artifacts, noisy, oversaturated, underexposed, overexposed, flicker, unstable motion, motion blur, stretched, mutated, out of frame, bad proportions';

/**
 * Poll for AI Stripe video result.
 * Uses video/fetch endpoint with deepfake-like timeouts (10min).
 * IMPORTANT: must use the same API key that was used for the generation request.
 */
async function pollForStripeVideoResult(
  fetchId: string,
  apiKey: string,
  maxAttempts: number = 60,
  options?: PollOptions
): Promise<string[]> {
  const requestId = extractRequestId(fetchId);
  return pollWithBackoff(
    {
      timeoutMs: 600_000,      // 10 min total timeout
      initialDelayMs: 10_000,  // 10s initial delay
      maxDelayMs: 10_000,      // cap at 10s between polls
      backoffFactor: 1.2,
      jitterRatio: 0.2,
      maxAttempts,
      errorLabel: 'AI Stripe video',
    },
    options,
    (signal) => fetchModelsLabOutput(
      `${MODELSLAB_VIDEO_FETCH_URL}/${requestId}`,
      apiKey,
      requestId,
      signal
    )
  );
}

/**
 * Generate a stripe video from an image using ModelsLab img2video_ultra.
 *
 * Uses the same API key for both generation and fetch (required by ModelsLab).
 *
 * @param initImage - URL of the source image
 * @param prompt - User prompt (falls back to default stripe prompt if empty)
 * @param webhookOptions - Optional webhook for async job tracking
 */
export async function generateStripeVideo(
  initImage: string,
  prompt: string | null,
  webhookOptions?: WebhookOptions,
  options?: { signal?: AbortSignal }
): Promise<{
  videoUrl: string | null;
  status: 'success' | 'processing';
  rawResponse?: GenerationRawResponse;
  apiKeyUsed: string;
  requestId: string | null;
}> {
  // Use a single API key for both generation and fetch
  const apiKey = getNextApiKey();

  const requestBody = {
    key: apiKey,
    init_image: initImage,
    model_id: 'wan2.1',
    prompt: prompt?.trim() || AI_STRIPE_DEFAULT_PROMPT,
    output_type: 'mp4',
    negative_prompt: AI_STRIPE_NEGATIVE_PROMPT,
    resolution: '480',
    num_frames: '89',
    fps: '16',
    base64: 'false',
    webhook: webhookOptions?.webhook ?? null,
    track_id: webhookOptions?.trackId ?? null,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[generateStripeVideo] attempt ${attempt + 1}`);

      const response = await fetch(MODELSLAB_IMG2VIDEO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const data: VideoResponse = await response.json();
      const requestId = extractModelsLabRequestIdFromUnknown(data);

      if (data.status === 'error' || data.status === 'failed') {
        throw new Error(data.message || 'AI Stripe video generation failed');
      }

      // If processing with webhook, return immediately
      if (webhookOptions && data.status === 'processing') {
        return {
          videoUrl: null,
          status: 'processing',
          rawResponse: data as GenerationRawResponse,
          apiKeyUsed: apiKey,
          requestId,
        };
      }

      // If processing without webhook, poll using the SAME API key
      if (data.status === 'processing') {
        const fetchId = data.fetch_result ?? (data.id !== undefined ? String(data.id) : '');
        if (!fetchId) throw new Error('Missing request id for stripe video fetch');
        const pollOptions = options?.signal ? { signal: options.signal } : undefined;
        const output = await pollForStripeVideoResult(fetchId, apiKey, undefined, pollOptions);
        return { videoUrl: output[0]!, status: 'success', apiKeyUsed: apiKey, requestId };
      }

      // Success — extract video URL
      if (data.status === 'success' && data.output && data.output.length > 0) {
        return { videoUrl: data.output[0]!, status: 'success', rawResponse: data as GenerationRawResponse, apiKeyUsed: apiKey, requestId };
      }
      if (data.proxy_links && data.proxy_links.length > 0) {
        return { videoUrl: data.proxy_links[0]!, status: 'success', rawResponse: data as GenerationRawResponse, apiKeyUsed: apiKey, requestId };
      }
      if (data.future_links && data.future_links.length > 0) {
        return { videoUrl: data.future_links[0]!, status: 'success', rawResponse: data as GenerationRawResponse, apiKeyUsed: apiKey, requestId };
      }

      throw new Error('No video URL in stripe video response');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[generateStripeVideo] Attempt ${attempt + 1} failed:`, lastError.message);

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Failed to generate stripe video after multiple attempts');
}

// ============================================================================
// ModelsLab AI Kissing Video (2-step: Image Merge → Video)
// ============================================================================

const AI_KISSING_IMAGE_PROMPT =
  'the girl and the boy sitting together looking at each other';
const AI_KISSING_VIDEO_PROMPT =
  'they are kissing hard, boy kissing and pressing girl boobs';
const AI_KISSING_VIDEO_NEGATIVE_PROMPT =
  'blurry, low quality, distorted, extra limbs, missing limbs, broken fingers, deformed, glitch, artifacts, unrealistic, low resolution, bad anatomy, duplicate, cropped, watermark, text, logo, jpeg artifacts, noisy, oversaturated, underexposed, overexposed, flicker, unstable motion, motion blur, stretched, mutated, out of frame, bad proportions';

// AI Together prompt — combines two people into a single realistic frame
const AI_TOGETHER_IMAGE_PROMPT =
  'Two people from the provided images together in a single frame, naturally interacting with each other. Preserve their exact facial features, identity, skin tone, and hairstyle from the input images. Adjust body proportions, pose, and positioning so they look realistic together.';

/**
 * Reusable image merge: combines two images using qwen_edit (qwen-edit-2511).
 * Polls until the merged image is ready.
 * Uses the SAME API key for both the request and polling to avoid key mismatch.
 *
 * @param imageUrl1 - Hosted URL of first image
 * @param imageUrl2 - Hosted URL of second image
 * @param prompt    - The prompt describing how to combine the images
 * @param label     - Log label for debugging (e.g. 'kissing', 'together')
 */
async function mergeImages(
  imageUrl1: string,
  imageUrl2: string,
  prompt: string,
  label: string,
  options?: { signal?: AbortSignal }
): Promise<{ imageUrl: string; apiKeyUsed: string }> {
  const apiKey = getNextApiKey();

  const requestBody = {
    key: apiKey,
    init_image: [imageUrl1, imageUrl2],
    prompt,
    model_id: 'qwen-edit-2511',
    safety_checker: false,
    base64: false,
  };

  console.log(`[mergeImages:${label}] Sending image merge request`);

  const response = await fetch(MODELSLAB_IMAGE_EDIT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Image merge (${label}) failed with status ${response.status}: ${errorText}`);
  }

  const data: ImageEditResponse = await response.json();
  const requestId = extractModelsLabRequestIdFromUnknown(data);

  if (data.status === 'error' || data.status === 'failed') {
    throw new Error(data.message || `Image merge (${label}) failed`);
  }

  // Immediate success — extract URL
  if (data.status === 'success') {
    const imageUrl = extractModelsLabImageUrlFromUnknown(data);
    if (imageUrl) return { imageUrl, apiKeyUsed: apiKey };
  }

  // Poll for result using the SAME API key
  if (data.status === 'processing') {
    const fetchId = data.fetch_result ?? (data.id !== undefined ? String(data.id) : requestId);
    if (!fetchId) throw new Error(`Missing request id for image merge (${label}) fetch`);

    const pollOptions = options?.signal ? { signal: options.signal } : undefined;
    const output = await pollForImageEditResult(fetchId, apiKey, 30, pollOptions);
    return { imageUrl: output[0]!, apiKeyUsed: apiKey };
  }

  throw new Error(`Unexpected response from image merge (${label})`);
}

// Backward-compatible wrapper used by the kissing video pipeline
async function mergeImagesForKissing(
  imageUrl1: string,
  imageUrl2: string,
  options?: { signal?: AbortSignal }
): Promise<{ imageUrl: string; apiKeyUsed: string }> {
  return mergeImages(imageUrl1, imageUrl2, AI_KISSING_IMAGE_PROMPT, 'kissing', options);
}

/**
 * Step 2: Generate kissing video from merged image using img2video_ultra.
 * Polls until the video is ready.
 * Uses its own API key (different from image merge is OK for video).
 */
async function generateKissingVideoFromImage(
  mergedImageUrl: string,
  webhookOptions?: WebhookOptions,
  options?: { signal?: AbortSignal }
): Promise<{
  videoUrl: string | null;
  status: 'success' | 'processing';
  rawResponse?: GenerationRawResponse;
  apiKeyUsed: string;
  requestId: string | null;
}> {
  const apiKey = getNextApiKey();

  const requestBody = {
    key: apiKey,
    init_image: mergedImageUrl,
    model_id: 'wan2.1',
    prompt: AI_KISSING_VIDEO_PROMPT,
    output_type: 'mp4',
    negative_prompt: AI_KISSING_VIDEO_NEGATIVE_PROMPT,
    resolution: '480',
    num_frames: '89',
    fps: '16',
    base64: 'false',
    webhook: webhookOptions?.webhook ?? null,
    track_id: webhookOptions?.trackId ?? null,
  };

  console.log('[generateKissingVideoFromImage] Sending video generation request');

  const response = await fetch(MODELSLAB_IMG2VIDEO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Video generation failed with status ${response.status}: ${errorText}`);
  }

  const data: VideoResponse = await response.json();
  const requestId = extractModelsLabRequestIdFromUnknown(data);

  if (data.status === 'error' || data.status === 'failed') {
    throw new Error(data.message || 'Kissing video generation failed');
  }

  // If processing with webhook, return immediately
  if (webhookOptions && data.status === 'processing') {
    return {
      videoUrl: null,
      status: 'processing',
      rawResponse: data as GenerationRawResponse,
      apiKeyUsed: apiKey,
      requestId,
    };
  }

  // Poll using the SAME API key
  if (data.status === 'processing') {
    const fetchId = data.fetch_result ?? (data.id !== undefined ? String(data.id) : '');
    if (!fetchId) throw new Error('Missing request id for kissing video fetch');

    // Use longer polling (10min) — same as stripe/deepfake
    const pollResult = await pollWithBackoff(
      {
        timeoutMs: 600_000,
        initialDelayMs: 10_000,
        maxDelayMs: 10_000,
        backoffFactor: 1.2,
        jitterRatio: 0.2,
        maxAttempts: 60,
        errorLabel: 'Kissing video',
      },
      options?.signal ? { signal: options.signal } : undefined,
      (signal) => fetchModelsLabOutput(
        `${MODELSLAB_VIDEO_FETCH_URL}/${extractRequestId(fetchId)}`,
        apiKey,
        extractRequestId(fetchId),
        signal
      )
    );
    return { videoUrl: pollResult[0]!, status: 'success', apiKeyUsed: apiKey, requestId };
  }

  // Success — extract video URL
  if (data.status === 'success' && data.output && data.output.length > 0) {
    return { videoUrl: data.output[0]!, status: 'success', rawResponse: data as GenerationRawResponse, apiKeyUsed: apiKey, requestId };
  }
  if (data.proxy_links && data.proxy_links.length > 0) {
    return { videoUrl: data.proxy_links[0]!, status: 'success', rawResponse: data as GenerationRawResponse, apiKeyUsed: apiKey, requestId };
  }

  throw new Error('No video URL in kissing video response');
}

/**
 * Generate a kissing video from two images.
 *
 * Two-step pipeline:
 * 1. Merge both images into a single scene using qwen-edit-2511
 * 2. Animate the merged image into a kissing video using img2video_ultra
 *
 * @param imageUrl1 - URL of first person's image
 * @param imageUrl2 - URL of second person's image
 * @param webhookOptions - Optional webhook for the video generation step
 */
export async function generateKissingVideo(
  imageUrl1: string,
  imageUrl2: string,
  webhookOptions?: WebhookOptions,
  options?: { signal?: AbortSignal; onProgress?: (step: string) => void }
): Promise<{
  videoUrl: string | null;
  mergedImageUrl: string;
  status: 'success' | 'processing';
  rawResponse?: GenerationRawResponse;
  apiKeyUsed: string;
  requestId: string | null;
}> {
  // Step 1: Merge images
  options?.onProgress?.('Merging images...');
  const { imageUrl: mergedImageUrl } = await mergeImagesForKissing(imageUrl1, imageUrl2, options);
  console.log(`[generateKissingVideo] Images merged: ${mergedImageUrl.substring(0, 80)}...`);

  // Step 2: Generate video from merged image
  options?.onProgress?.('Generating kissing video...');
  const videoResult = await generateKissingVideoFromImage(mergedImageUrl, webhookOptions, options);

  return {
    ...videoResult,
    mergedImageUrl,
  };
}

// ============================================================================
// ModelsLab AI Together (image-only merge using qwen_edit)
// ============================================================================

/**
 * Generate an "AI Together" image — merges two people into a single frame.
 * Uses the same qwen_edit API as kissing video step 1, but with a different prompt.
 *
 * @param imageUrl1 - Hosted URL of first person's image
 * @param imageUrl2 - Hosted URL of second person's image
 * @param options.prompt - Optional custom prompt; falls back to the default if not provided
 */
export async function generateTogetherImage(
  imageUrl1: string,
  imageUrl2: string,
  options?: { signal?: AbortSignal; prompt?: string }
): Promise<{ imageUrl: string; apiKeyUsed: string }> {
  const prompt = options?.prompt || AI_TOGETHER_IMAGE_PROMPT;
  return mergeImages(imageUrl1, imageUrl2, prompt, 'together', { signal: options?.signal });
}

// ============================================================================
// ModelsLab Cloth Swap (image-only merge using qwen_edit)
// ============================================================================

// Default cloth swap prompt — replaces clothing while preserving person identity
const AI_CLOTH_SWAP_PROMPT =
  'Replace the clothing worn by the person in the second image with the clothing from the first image. Preserve the exact appearance, identity, face, skin tone, hairstyle, and body proportions of the person in the second image. Only modify the clothing. Adapt the clothing to match the pose, folds, and movement of the person\'s body, maintaining realistic draping, wrinkles, and fabric physics. Maintain proper lighting, shadows, and color consistency between the clothing and the person. Ensure correct alignment at key areas such as shoulders, sleeves, neckline, waist, and legs. The final result should look natural, seamless, and realistic as if the person is actually wearing the clothing. High detail, ultra-realistic, sharp focus, natural skin texture, realistic fabric simulation, 4k quality.';

/**
 * Generate a cloth swap image — replaces clothing on a person.
 * Uses the same qwen_edit API as AI Together, with a cloth-swap-specific prompt.
 *
 * @param clothingImageUrl - Hosted URL of the clothing reference image
 * @param personImageUrl   - Hosted URL of the person image
 * @param options.prompt   - Optional custom prompt; falls back to the default if not provided
 */
export async function generateClothSwapImage(
  clothingImageUrl: string,
  personImageUrl: string,
  options?: { signal?: AbortSignal; prompt?: string }
): Promise<{ imageUrl: string; apiKeyUsed: string }> {
  const prompt = options?.prompt || AI_CLOTH_SWAP_PROMPT;
  return mergeImages(clothingImageUrl, personImageUrl, prompt, 'cloth-swap', { signal: options?.signal });
}

/**
 * ModelsLab Image Inpainting API Integration
 */

const MODELSLAB_INPAINT_URL = 'https://modelslab.com/api/v6/images/inpaint';
const MODELSLAB_INPAINT_FETCH_URL = 'https://modelslab.com/api/v6/images/fetch';
const MODELSLAB_INPAINT_MODEL_ID = 'lazymixv4-inpaint';
const MODELSLAB_INPAINT_NEGATIVE_PROMPT =
  'poorly drawn face, poorly drawn eyes, poorly drawn mouth, bad facial features, ugly face, deformed face, poorly drawn hands, bad hands, mutated hands, missing fingers, extra fingers';

interface InpaintRequest {
  key: string;
  model_id: string;
  prompt: string;
  negative_prompt: string;
  init_image: string;
  mask_image: string;
  samples: string;
  steps: string;
  safety_checker: string;
  guidance_scale: number;
  strength: number;
  scheduler: string;
  lora_model: string | null;
  use_karras_sigmas: string;
  vae: string | null;
  lora_strength: string | null;
  seed: number | null;
  webhook: string | null;
  track_id: number | null;
}

interface InpaintResponse {
  status: 'success' | 'processing' | 'error' | 'failed';
  generationTime?: number;
  id?: number;
  request_id?: string | number;
  output?: string[];
  proxy_links?: string[];
  future_links?: string[];
  message?: string;
  fetch_result?: string;
  eta?: number;
}

interface InpaintFetchResponse {
  status: 'success' | 'processing' | 'error' | 'failed' | string;
  output?: string[] | string;
  proxy_links?: string[] | string;
  future_links?: string[] | string;
  links?: string[] | string;
  message?: string;
  eta?: number;
}

/**
 * Fetch a completed inpaint result from ModelsLab.
 */
export async function fetchInpaintResult(
  requestId: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<{ imageUrl: string | null; status: 'success' | 'processing' | 'error'; message?: string }> {
  const response = await fetch(MODELSLAB_INPAINT_FETCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: apiKey, request_id: requestId }),
    signal,
  });

  if (!response.ok) {
    console.error(`[fetchInpaintResult] HTTP ${response.status} from ModelsLab inpaint fetch API`);
    return { imageUrl: null, status: 'error' };
  }

  const data: InpaintFetchResponse = await response.json();

  if (data.status === 'processing') {
    return { imageUrl: null, status: 'processing', message: data.message };
  }

  if (data.status === 'error' || data.status === 'failed') {
    return { imageUrl: null, status: 'error', message: data.message };
  }

  const imageUrl = extractModelsLabImageUrlFromUnknown(data);
  if (!imageUrl) {
    return {
      imageUrl: null,
      status: data.status === 'success' ? 'success' : 'processing',
      message: data.message,
    };
  }

  return { imageUrl, status: 'success', message: data.message };
}

/**
 * Poll for inpaint result when status is 'processing'
 */
async function pollForInpaintResult(
  requestId: string,
  apiKey: string,
  maxAttempts: number = 20,
  options?: PollOptions
): Promise<string[]> {
  const fetchId = extractRequestId(requestId);
  return pollWithBackoff(
    {
      timeoutMs: 60_000,
      initialDelayMs: 1_000,
      maxDelayMs: 8_000,
      backoffFactor: 1.6,
      jitterRatio: 0.2,
      maxAttempts,
      errorLabel: 'Inpainting',
    },
    options,
    async (signal) => {
      const fetchResult = await fetchInpaintResult(fetchId, apiKey, signal);
      if (fetchResult.status === 'success' && fetchResult.imageUrl) {
        return { status: 'success', output: [fetchResult.imageUrl] };
      }
      if (fetchResult.status === 'error') {
        return { status: 'error', message: fetchResult.message };
      }
      return { status: 'processing' };
    }
  );
}

/**
 * Generate an inpainted image using ModelsLab Inpaint API
 *
 * @param initImage - URL or base64 string of the source image
 * @param maskImage - URL or base64/data URL of the mask (white=edit, black=preserve)
 * @param prompt - What to generate in the masked area
 * @param strength - Inpaint strength 0-1 (default 0.7)
 */
export async function generateInpaint(
  initImage: string,
  maskImage: string,
  prompt: string,
  strength: number = 0.7,
  webhookOptions?: WebhookOptions,
  options?: { signal?: AbortSignal }
): Promise<{
  imageUrl: string | null;
  imageUrls?: string[];
  status: 'success' | 'processing';
  requestId: string | null;
  rawResponse?: GenerationRawResponse;
  apiKeyUsed: string;
}> {
  // Convert initImage to URL if base64
  const normalizedInit = normalizeModelsLabInitImage(initImage);
  let initImageUrl = normalizedInit.initImage;

  if (normalizedInit.base64) {
    let uploadedUrl: string | null = null;
    let uploadError: Error | null = null;
    for (let i = 0; i < 3; i++) {
      const uploadKey = getNextApiKey();
      try {
        console.log(`[generateInpaint] init_image base64_to_url attempt ${i + 1}/3`);
        uploadedUrl = await base64ToUrlImageEditing(initImage, uploadKey);
        break;
      } catch (error) {
        uploadError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[generateInpaint] init_image upload attempt ${i + 1} failed:`, uploadError.message);
        if (i < 2) await new Promise((resolve) => setTimeout(resolve, 1500 * (i + 1)));
      }
    }
    if (!uploadedUrl) {
      throw new Error(`Failed to upload init image: ${uploadError?.message || 'base64_to_url failed'}`);
    }
    initImageUrl = uploadedUrl;
  }

  // Convert maskImage to URL if base64/data URL
  const normalizedMask = normalizeModelsLabInitImage(maskImage);
  let maskImageUrl = normalizedMask.initImage;

  if (normalizedMask.base64) {
    let uploadedUrl: string | null = null;
    let uploadError: Error | null = null;
    for (let i = 0; i < 3; i++) {
      const uploadKey = getNextApiKey();
      try {
        console.log(`[generateInpaint] mask_image base64_to_url attempt ${i + 1}/3`);
        uploadedUrl = await base64ToUrlImageEditing(maskImage, uploadKey);
        break;
      } catch (error) {
        uploadError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[generateInpaint] mask_image upload attempt ${i + 1} failed:`, uploadError.message);
        if (i < 2) await new Promise((resolve) => setTimeout(resolve, 1500 * (i + 1)));
      }
    }
    if (!uploadedUrl) {
      throw new Error(`Failed to upload mask image: ${uploadError?.message || 'base64_to_url failed'}`);
    }
    maskImageUrl = uploadedUrl;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const apiKey = getNextApiKey();

    const requestBody: InpaintRequest = {
      key: apiKey,
      model_id: MODELSLAB_INPAINT_MODEL_ID,
      prompt,
      negative_prompt: MODELSLAB_INPAINT_NEGATIVE_PROMPT,
      init_image: initImageUrl,
      mask_image: maskImageUrl,
      samples: '2',
      steps: '31',
      safety_checker: 'no',
      guidance_scale: 7.5,
      strength,
      scheduler: 'UniPCMultistepScheduler',
      lora_model: null,
      use_karras_sigmas: 'yes',
      vae: null,
      lora_strength: null,
      seed: null,
      webhook: webhookOptions?.webhook ?? null,
      track_id: webhookOptions?.trackId ?? null,
    };

    try {
      console.log(`[generateInpaint] Sending request (attempt ${attempt + 1})`);
      const response = await fetch(MODELSLAB_INPAINT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const data: InpaintResponse = await response.json();
      const requestId = extractModelsLabRequestIdFromUnknown(data);

      if (data.status === 'error' || data.status === 'failed') {
        throw new Error(data.message || 'Inpainting failed');
      }

      // Webhook + processing → return immediately
      if (webhookOptions && data.status === 'processing') {
        return {
          imageUrl: null,
          status: 'processing',
          requestId,
          rawResponse: data as GenerationRawResponse,
          apiKeyUsed: apiKey,
        };
      }

      // Processing without webhook → poll
      if (data.status === 'processing') {
        const fetchId = requestId ?? '';
        if (!fetchId) throw new Error('Missing request id for inpaint fetch');
        const pollOptions = options?.signal ? { signal: options.signal } : undefined;
        const output = await pollForInpaintResult(fetchId, apiKey, undefined, pollOptions);
        return { imageUrl: output[0]!, imageUrls: output, status: 'success', requestId: fetchId, apiKeyUsed: apiKey };
      }

      // Success → extract URLs
      if (data.status === 'success' && data.output && data.output.length > 0) {
        return {
          imageUrl: data.output[0]!,
          imageUrls: data.output,
          status: 'success',
          requestId,
          rawResponse: data as GenerationRawResponse,
          apiKeyUsed: apiKey,
        };
      }

      if (data.proxy_links && data.proxy_links.length > 0) {
        return {
          imageUrl: data.proxy_links[0]!,
          imageUrls: data.proxy_links,
          status: 'success',
          requestId,
          rawResponse: data as GenerationRawResponse,
          apiKeyUsed: apiKey,
        };
      }

      throw new Error('No image URL in inpaint response');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[generateInpaint] Attempt ${attempt + 1} failed:`, lastError.message);

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Failed to inpaint after multiple attempts');
}
