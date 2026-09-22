type ModelslabStatus = 'success' | 'processing' | 'error';

export type ModelslabVoice = {
  voice_id: string;
  name: string;
  language: string;
  sound_clip: string | null;
  gender: string;
  thumbnail: string;
  country: string | null;
  character: string | null;
};

export type ModelslabVoiceListType = 'trained' | 'voice_cover';

export type ModelslabVoiceListResponse = {
  status: ModelslabStatus | string;
  voices: ModelslabVoice[];
};

export type ModelslabTextToSpeechRequest = {
  prompt: string;
  voice_id: string;
  language?: string;
  speed?: number;
  emotion?: boolean;
  temp?: boolean;
  webhook?: string;
  track_id?: number;
};

export type ModelslabTextToSpeechResponse = {
  status: ModelslabStatus | string;
  generationTime?: number;
  id?: number;
  output?: string[];
  proxy_links?: string[];
  future_links?: string[];
  links?: string[];
  meta?: Record<string, unknown>;
  eta?: number;
  message?: string;
  tip?: string;
  fetch_result?: string;
  audio_time?: number;
};

export type ModelslabBase64ToUrlRequest = {
  init_audio: string;
};

export type ModelslabVoiceUploadRequest = {
  name: string;
  init_audio: string;
  language: string;
  base64?: boolean;
  gender?: string;
  thumbnail?: string;
};

export type ModelslabVoiceUploadResponse = {
  status: ModelslabStatus | string;
  message?: string;
  voice_id?: string;
};

export type ModelslabUploadedVoice = {
  voice_id: string;
  name?: string | null;
  language?: string | null;
};

export type ModelslabUploadedVoiceListResponse = {
  status: ModelslabStatus | string;
  voices: ModelslabUploadedVoice[];
  message?: string;
};

export type ModelslabTextToAudioRequest = {
  prompt: string;
  init_audio?: string;
  voice_id?: string;
  language?: string;
  speed?: number;
  base64?: boolean;
  temp?: boolean;
  stream?: boolean;
  webhook?: string;
  track_id?: number;
};

export type ModelslabSfxRequest = {
  prompt: string;
  duration?: number;
  temp?: boolean;
  webhook?: string;
  track_id?: number;
};

export type ModelslabSongGeneratorRequest = {
  prompt?: string;
  lyrics_generation?: boolean;
  lyrics?: string;
  caption?: string;
  init_audio?: string;
  duration?: number;
  webhook?: string;
  track_id?: number;
};

export type ModelslabMusicGenRequest = {
  prompt: string;
  init_audio?: string;
  sampling_rate?: number;
  max_new_token?: number;
  base64?: boolean;
  temp?: boolean;
  webhook?: string;
  track_id?: number;
};

export type ModelslabVoiceCoverRequest = {
  init_audio: string;
  model_id: string;
  pitch?: string;
  algorithm?: string;
  rate?: number;
  seed?: number;
  language?: string;
  emotion?: string;
  speed?: number;
  radius?: number;
  mix?: number;
  hop_length?: number;
  originality?: number;
  lead_voice_volume_delta?: string;
  backup_voice_volume_delta?: string;
  instrument_volume_delta?: string;
  reverb_size?: number;
  wetness?: number;
  dryness?: number;
  damping?: number;
  base64?: boolean;
  temp?: boolean;
  webhook?: string;
  track_id?: number;
};

type FetchJsonOptions = RequestInit & {
  timeoutMs?: number;
};

type HttpError = Error & {
  status?: number;
  data?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// API key rotation state (shared across all voice/audio calls)
let currentVoiceKeyIndex = 0;

/**
 * Get all available ModelsLab API keys from environment.
 * Supports both single key (MODELSLAB_API_KEY) and numbered keys
 * (MODELSLAB_API_KEY_1, MODELSLAB_API_KEY_2, etc.)
 */
function getApiKeys(): string[] {
  const keys: string[] = [];

  const singleKey = process.env.MODELSLAB_API_KEY;
  if (singleKey?.trim()) {
    keys.push(singleKey.trim());
  }

  for (let i = 1; i <= 10; i++) {
    const key = process.env[`MODELSLAB_API_KEY_${i}`];
    if (key?.trim()) {
      keys.push(key.trim());
    }
  }

  return keys;
}

/**
 * Get a ModelsLab API key using round-robin rotation.
 * Falls back to numbered keys if MODELSLAB_API_KEY is not set.
 */
export function getModelslabApiKey(): string | null {
  const keys = getApiKeys();
  if (keys.length === 0) return null;

  const key = keys[currentVoiceKeyIndex % keys.length]!;
  currentVoiceKeyIndex = (currentVoiceKeyIndex + 1) % keys.length;
  return key;
}

export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const { timeoutMs = 45_000, ...init } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();

    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!response.ok) {
      const message = isRecord(data) && typeof data.message === 'string'
        ? data.message
        : `Request failed with status ${response.status}`;
      const error: HttpError = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchVoices(type: ModelslabVoiceListType): Promise<ModelslabVoiceListResponse> {
  return fetchJson<ModelslabVoiceListResponse>(`https://modelslab.com/api/voice_list?type=${type}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    // Cache at the fetch layer when called from server components/route handlers.
    next: { revalidate: 60 * 60 },
  });
}

export async function fetchTrainedVoices(): Promise<ModelslabVoiceListResponse> {
  return fetchVoices('trained');
}

export async function modelslabTextToSpeech(
  payload: ModelslabTextToSpeechRequest,
  apiKey: string
): Promise<ModelslabTextToSpeechResponse> {
  return fetchJson<ModelslabTextToSpeechResponse>('https://modelslab.com/api/v6/voice/text_to_speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ key: apiKey, ...payload }),
    timeoutMs: 90_000,
  });
}

export async function modelslabTextToAudio(
  payload: ModelslabTextToAudioRequest,
  apiKey: string
): Promise<ModelslabTextToSpeechResponse> {
  return fetchJson<ModelslabTextToSpeechResponse>('https://modelslab.com/api/v6/voice/text_to_audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ key: apiKey, ...payload }),
    timeoutMs: 120_000,
  });
}

export async function modelslabSfx(
  payload: ModelslabSfxRequest,
  apiKey: string
): Promise<ModelslabTextToSpeechResponse> {
  return fetchJson<ModelslabTextToSpeechResponse>('https://modelslab.com/api/v6/voice/sfx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ key: apiKey, ...payload }),
    timeoutMs: 180_000,
  });
}

export async function modelslabSongGenerator(
  payload: ModelslabSongGeneratorRequest,
  apiKey: string
): Promise<ModelslabTextToSpeechResponse> {
  return fetchJson<ModelslabTextToSpeechResponse>('https://modelslab.com/api/v6/voice/song_generator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ key: apiKey, ...payload }),
    timeoutMs: 300_000,
  });
}

export async function modelslabMusicGen(
  payload: ModelslabMusicGenRequest,
  apiKey: string
): Promise<ModelslabTextToSpeechResponse> {
  return fetchJson<ModelslabTextToSpeechResponse>('https://modelslab.com/api/v6/voice/music_gen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ key: apiKey, ...payload }),
    timeoutMs: 300_000,
  });
}

export async function modelslabBase64ToUrl(
  payload: ModelslabBase64ToUrlRequest,
  apiKey: string
): Promise<ModelslabTextToSpeechResponse> {
  return fetchJson<ModelslabTextToSpeechResponse>('https://modelslab.com/api/v6/voice/base64_to_url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ key: apiKey, ...payload }),
    timeoutMs: 90_000,
  });
}

export async function modelslabVoiceUpload(
  payload: ModelslabVoiceUploadRequest,
  apiKey: string
): Promise<ModelslabVoiceUploadResponse> {
  return fetchJson<ModelslabVoiceUploadResponse>('https://modelslab.com/api/v6/voice/voice_upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ key: apiKey, ...payload }),
    timeoutMs: 90_000,
  });
}

export async function modelslabUploadedVoiceList(apiKey: string, type: string = 'manual'): Promise<ModelslabUploadedVoiceListResponse> {
  return fetchJson<ModelslabUploadedVoiceListResponse>('https://modelslab.com/api/v6/voice/voice_list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ key: apiKey, type }),
    timeoutMs: 45_000,
  });
}

export async function modelslabVoiceCover(
  payload: ModelslabVoiceCoverRequest,
  apiKey: string
): Promise<ModelslabTextToSpeechResponse> {
  return fetchJson<ModelslabTextToSpeechResponse>('https://modelslab.com/api/v6/voice/voice_cover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ key: apiKey, ...payload }),
    timeoutMs: 180_000,
  });
}

export async function modelslabFetchVoice(id: string, apiKey: string): Promise<ModelslabTextToSpeechResponse> {
  return fetchJson<ModelslabTextToSpeechResponse>(`https://modelslab.com/api/v6/voice/fetch/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ key: apiKey }),
    timeoutMs: 45_000,
  });
}
