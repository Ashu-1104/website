'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ChevronDown, Clock, Loader2, Pause, Play, RefreshCcw, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModelslabTextToSpeechResponse } from '@/lib/modelslab';
import AudioPlayerCompact from '@/components/ai-audio/AudioPlayerCompact';
import { getUserId } from '@/hooks/useApi';

const MAX_PROMPT_LENGTH = 2500;
const MAX_INPUT_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_AUDIO_DURATION_SECONDS = 30;
const MY_VOICES_STORAGE_KEY = 'veloura.voice-cloning.my-voices.v1';

type PendingVoiceFile = {
  file: File;
  url: string;
  name: string;
  duration: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function decodeAudioFromFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioContextImpl = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioContextImpl();
  try {
    const buffer = await new Promise<AudioBuffer>((resolve, reject) => {
      ctx.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
    });
    return buffer;
  } finally {
    ctx.close().catch(() => undefined);
  }
}

function encodeWav(audioBuffer: AudioBuffer): Blob {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < length; i += 1) {
    for (let ch = 0; ch < numberOfChannels; ch += 1) {
      const sample = audioBuffer.getChannelData(ch)[i] ?? 0;
      const s = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function sliceAudioBuffer(audioBuffer: AudioBuffer, startSeconds: number, endSeconds: number) {
  const start = Math.floor(startSeconds * audioBuffer.sampleRate);
  const end = Math.floor(endSeconds * audioBuffer.sampleRate);
  const frameCount = Math.max(1, end - start);
  const sliced = new AudioBuffer({
    length: frameCount,
    numberOfChannels: audioBuffer.numberOfChannels,
    sampleRate: audioBuffer.sampleRate,
  });

  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch += 1) {
    const channelData = audioBuffer.getChannelData(ch);
    sliced.copyToChannel(channelData.slice(start, end), ch, 0);
  }

  return sliced;
}

async function readAudioDuration(file: File, url: string): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.src = url;

    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('error', onError);
    };

    const onLoaded = () => {
      cleanup();
      resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
    };

    const onError = () => {
      cleanup();
      reject(new Error('Failed to load audio metadata'));
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('error', onError);
  });
}

const SUPPORTED_LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'arabic', label: 'Arabic' },
  { value: 'brazilian portuguese', label: 'Brazilian Portuguese' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'czech', label: 'Czech' },
  { value: 'dutch', label: 'Dutch' },
  { value: 'french', label: 'French' },
  { value: 'german', label: 'German' },
  { value: 'hindi', label: 'Hindi' },
  { value: 'hungarian', label: 'Hungarian' },
  { value: 'italian', label: 'Italian' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'korean', label: 'Korean' },
  { value: 'polish', label: 'Polish' },
  { value: 'russian', label: 'Russian' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'turkish', label: 'Turkish' },
];

type InputMode = 'url' | 'upload' | 'voice_id';

type VoiceListState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'error'; message: string };

type VoicePickerTab = 'community' | 'my_voice';

type GenerationState =
  | { kind: 'ready' }
  | { kind: 'generating' }
  | { kind: 'polling'; id: number; nextPollInMs?: number }
  | { kind: 'error'; message: string };

type UploadedVoice = {
  voice_id: string;
  name?: string | null;
  language?: string | null;
  sound_clip?: string | null;
};

type MyVoice = {
  voice_id: string;
  name?: string | null;
};

type HistoryItem = {
  createdAt: number;
  prompt: string;
  sourceLabel: string;
  audioUrl: string;
};

function pickPrimaryAudioUrl(response: ModelslabTextToSpeechResponse | null): string | null {
  if (!response) return null;
  const candidates = response.output ?? response.proxy_links ?? response.links ?? response.future_links;
  return candidates?.find((value) => typeof value === 'string' && value.length > 0) ?? null;
}

function getPollDelayMs(etaSeconds: number | undefined, attempt: number): number {
  if (typeof etaSeconds === 'number' && Number.isFinite(etaSeconds) && etaSeconds > 0) {
    return Math.min(5000, Math.max(1000, Math.round(etaSeconds * 250)));
  }
  return Math.min(8000, 1000 + attempt * 500);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAbortError(error: unknown): boolean {
  return isRecord(error) && typeof error.name === 'string' && error.name === 'AbortError';
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!isRecord(error) || typeof error.message !== 'string' || error.message.trim().length === 0) return fallback;
  return error.message;
}

function normalizeUrlInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^[a-z]+:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function truncate(value: string, max = 90) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function getVoiceLabel(voice: UploadedVoice) {
  const name = typeof voice.name === 'string' ? voice.name.trim() : '';
  if (name) return name;
  return voice.voice_id;
}

export default function VoiceCloningPlayground() {
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [initAudioUrl, setInitAudioUrl] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');

  const [uploadedVoices, setUploadedVoices] = useState<UploadedVoice[]>([]);
  const [voiceListState, setVoiceListState] = useState<VoiceListState>({ kind: 'idle' });
  const [selectedUploadedVoiceId, setSelectedUploadedVoiceId] = useState<string>('');
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);

  const [isVoicePickerOpen, setIsVoicePickerOpen] = useState(false);
  const [voicePickerTab, setVoicePickerTab] = useState<VoicePickerTab>('community');
  const [voiceSearchQuery, setVoiceSearchQuery] = useState('');
  const [myVoices, setMyVoices] = useState<MyVoice[]>([]);

  const [isSaveVoiceOpen, setIsSaveVoiceOpen] = useState(false);
  const [isSavingVoice, setIsSavingVoice] = useState(false);
  const [saveVoiceName, setSaveVoiceName] = useState('');
  const [saveVoiceLanguage, setSaveVoiceLanguage] = useState('english');
  const [saveVoiceError, setSaveVoiceError] = useState('');
  const [uploadedFilePreviewUrl, setUploadedFilePreviewUrl] = useState<string | null>(null);

  const [isAddMyVoiceOpen, setIsAddMyVoiceOpen] = useState(false);
  const [isAddingMyVoice, setIsAddingMyVoice] = useState(false);
  const [addMyVoiceMode, setAddMyVoiceMode] = useState<'upload' | 'url'>('upload');
  const [addMyVoiceName, setAddMyVoiceName] = useState('');
  const [addMyVoiceLanguage, setAddMyVoiceLanguage] = useState('english');
  const [addMyVoiceUrl, setAddMyVoiceUrl] = useState('');
  const [addMyVoiceFile, setAddMyVoiceFile] = useState<File | null>(null);
  const [addMyVoiceFilePreviewUrl, setAddMyVoiceFilePreviewUrl] = useState<string | null>(null);
  const [addMyVoiceError, setAddMyVoiceError] = useState('');

  const [prompt, setPrompt] = useState('Hello! This is a voice cloning test.');
  const [language, setLanguage] = useState('english');

  const [generation, setGeneration] = useState<GenerationState>({ kind: 'ready' });
  const [cloneResponse, setCloneResponse] = useState<ModelslabTextToSpeechResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [pendingVoiceFile, setPendingVoiceFile] = useState<PendingVoiceFile | null>(null);
  const [trimStartSeconds, setTrimStartSeconds] = useState(0);
  const [trimEndSeconds, setTrimEndSeconds] = useState(MAX_AUDIO_DURATION_SECONDS);
  const [isAudioTrimOpen, setIsAudioTrimOpen] = useState(false);
  const [isApplyingTrim, setIsApplyingTrim] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addMyVoiceFileInputRef = useRef<HTMLInputElement | null>(null);
  const generateAbortRef = useRef<AbortController | null>(null);
  const pollTimeoutRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const trimAudioRef = useRef<HTMLAudioElement | null>(null);

  const primaryAudioUrl = useMemo(() => pickPrimaryAudioUrl(cloneResponse), [cloneResponse]);
  const isBusy = generation.kind === 'generating' || generation.kind === 'polling';

  const normalizedVoiceSearch = voiceSearchQuery.trim().toLowerCase();

  const filteredCommunityVoices = useMemo(() => {
    if (!normalizedVoiceSearch) return uploadedVoices;
    return uploadedVoices.filter((voice) => {
      const name = typeof voice.name === 'string' ? voice.name : '';
      const languageValue = typeof voice.language === 'string' ? voice.language : '';
      return (
        voice.voice_id.toLowerCase().includes(normalizedVoiceSearch)
        || name.toLowerCase().includes(normalizedVoiceSearch)
        || languageValue.toLowerCase().includes(normalizedVoiceSearch)
      );
    });
  }, [uploadedVoices, normalizedVoiceSearch]);

  const filteredMyVoices = useMemo(() => {
    if (!normalizedVoiceSearch) return myVoices;
    return myVoices.filter((voice) => {
      const name = typeof voice.name === 'string' ? voice.name : '';
      return (
        voice.voice_id.toLowerCase().includes(normalizedVoiceSearch)
        || name.toLowerCase().includes(normalizedVoiceSearch)
      );
    });
  }, [myVoices, normalizedVoiceSearch]);

  const selectedVoice = useMemo(() => {
    const id = selectedUploadedVoiceId.trim();
    if (!id) return null;
    const myVoice = myVoices.find((voice) => voice.voice_id === id);
    if (myVoice) {
      const name = typeof myVoice.name === 'string' ? myVoice.name.trim() : '';
      return { voice_id: id, label: name || id, sound_clip: null };
    }
    const voice = uploadedVoices.find((entry) => entry.voice_id === id);
    return { voice_id: id, label: voice ? getVoiceLabel(voice) : id, sound_clip: voice?.sound_clip ?? null };
  }, [selectedUploadedVoiceId, myVoices, uploadedVoices]);

  const cancelGeneration = useCallback(() => {
    generateAbortRef.current?.abort();
    generateAbortRef.current = null;
    if (pollTimeoutRef.current) {
      window.clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    setGeneration({ kind: 'ready' });
  }, []);

  const pollForResult = useCallback(async (jobId: string | null, modelsLabId: number, historyItem: Omit<HistoryItem, 'audioUrl'>) => {
    let attempt = 0;

    const pollOnce = async () => {
      try {
        let audioUrl: string | null = null;
        let stillProcessing = false;
        let eta: number | undefined;

        if (jobId) {
          // Primary path: poll via job tracking API (handles webhook + fallback fetch)
          const response = await fetch(`/api/jobs/${jobId}`);
          const data = (await response.json()) as {
            success: boolean;
            job: { status: string; resultUrl?: string; errorMessage?: string; eta?: number };
            message?: string;
          };

          if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch job status');
          }

          if (data.job.status === 'COMPLETED' && data.job.resultUrl) {
            audioUrl = data.job.resultUrl;
          } else if (data.job.status === 'FAILED') {
            throw new Error(data.job.errorMessage || 'Voice cloning generation failed');
          } else {
            stillProcessing = true;
            eta = data.job.eta ?? undefined;
          }
        } else {
          // Fallback: direct ModelsLab fetch (when no job was created)
          const response = await fetch(`/api/modelslab/voice/fetch/${modelsLabId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          const data = (await response.json()) as ModelslabTextToSpeechResponse & { message?: string };

          if (!response.ok || data.status === 'error') {
            throw new Error(data.message || 'Failed to fetch generation result');
          }

          setCloneResponse(data);

          if (data.status === 'success') {
            audioUrl = pickPrimaryAudioUrl(data);
          } else if (data.status === 'processing') {
            stillProcessing = true;
            eta = data.eta;
          } else {
            throw new Error(data.message || 'Unexpected response status');
          }
        }

        if (audioUrl) {
          setCloneResponse({ status: 'success', output: [audioUrl] });
          setGeneration({ kind: 'ready' });
          setHistory((prev) => [{ ...historyItem, audioUrl: audioUrl! }, ...prev].slice(0, 8));
          return;
        }

        if (stillProcessing) {
          const delayMs = getPollDelayMs(eta, attempt);
          attempt += 1;
          setGeneration({ kind: 'polling', id: modelsLabId, nextPollInMs: delayMs });
          pollTimeoutRef.current = window.setTimeout(pollOnce, delayMs);
          return;
        }
      } catch (error) {
        setGeneration({ kind: 'error', message: getErrorMessage(error, 'Polling failed') });
      }
    };

    await pollOnce();
  }, []);

  const setAudioFromFile = useCallback(async (file: File) => {
    setUploadError('');
    const ext = file.name.toLowerCase();
    const isSupported = file.type === 'audio/mpeg' || file.type === 'audio/wav' || file.type === 'audio/x-wav' || ext.endsWith('.mp3') || ext.endsWith('.wav');
    if (!isSupported) {
      setUploadError('Please upload an MP3 or WAV file.');
      return;
    }
    if (file.size > MAX_INPUT_AUDIO_BYTES) {
      setUploadError(`File is too large (${formatBytes(file.size)}). Max is ${formatBytes(MAX_INPUT_AUDIO_BYTES)}.`);
      return;
    }

    const url = URL.createObjectURL(file);
    try {
      const duration = await readAudioDuration(file, url);
      if (!duration || Number.isNaN(duration)) {
        setUploadError('Could not read audio duration. Please try another file.');
        URL.revokeObjectURL(url);
        return;
      }

      if (duration <= MAX_AUDIO_DURATION_SECONDS) {
        setUploadedFile(file);
        URL.revokeObjectURL(url);
        return;
      }

      setPendingVoiceFile({ file, url, name: file.name, duration });
      setTrimStartSeconds(0);
      setTrimEndSeconds(MAX_AUDIO_DURATION_SECONDS);
      setIsAudioTrimOpen(true);
    } catch {
      setUploadError('Could not load that audio file. Please try again.');
      URL.revokeObjectURL(url);
    }
  }, []);

  const applyVoiceTrim = useCallback(async () => {
    if (!pendingVoiceFile || isApplyingTrim) return;
    setIsApplyingTrim(true);
    setUploadError('');

    try {
      const buffer = await decodeAudioFromFile(pendingVoiceFile.file);
      const start = clamp(trimStartSeconds, 0, Math.max(0, buffer.duration - 0.1));
      const end = clamp(trimEndSeconds, start + 0.1, buffer.duration);
      const sliced = sliceAudioBuffer(buffer, start, end);
      const wav = encodeWav(sliced);

      const trimmedFile = new File([wav], pendingVoiceFile.name.replace(/\.[^/.]+$/, '') + '_trimmed.wav', {
        type: 'audio/wav',
      });

      setUploadedFile(trimmedFile);
      setIsAudioTrimOpen(false);

      URL.revokeObjectURL(pendingVoiceFile.url);
      setPendingVoiceFile(null);
    } catch {
      setUploadError('Could not crop that audio. Please try again.');
    } finally {
      setIsApplyingTrim(false);
    }
  }, [isApplyingTrim, pendingVoiceFile, trimEndSeconds, trimStartSeconds]);

  const cancelVoiceTrim = useCallback(() => {
    trimAudioRef.current?.pause();
    if (pendingVoiceFile?.url) URL.revokeObjectURL(pendingVoiceFile.url);
    setPendingVoiceFile(null);
    setIsAudioTrimOpen(false);
    setIsApplyingTrim(false);
  }, [pendingVoiceFile?.url]);

  const loadUploadedVoices = useCallback(async () => {
    setVoiceListState({ kind: 'loading' });
    try {
      const response = await fetch('/api/modelslab/voice/list?type=manual', { method: 'GET' });
      const data = (await response.json()) as { status?: string; voices?: UploadedVoice[]; message?: string };
      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Failed to load voices');
      }
      const list = Array.isArray(data.voices) ? data.voices : [];
      setUploadedVoices(list);
      setVoiceListState({ kind: 'ready' });
    } catch (error) {
      setVoiceListState({ kind: 'error', message: getErrorMessage(error, 'Failed to load voices') });
    }
  }, []);

  const playVoicePreview = useCallback((voiceId: string, soundClip: string | null | undefined) => {
    if (!soundClip) return;

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }

    if (previewingVoiceId === voiceId) {
      setPreviewingVoiceId(null);
      return;
    }

    const audio = new Audio(soundClip);
    previewAudioRef.current = audio;
    setPreviewingVoiceId(voiceId);

    audio.onended = () => setPreviewingVoiceId(null);
    audio.onerror = () => setPreviewingVoiceId(null);
    void audio.play();
  }, [previewingVoiceId]);

  const closeVoicePicker = useCallback(() => {
    setIsVoicePickerOpen(false);
    setVoiceSearchQuery('');
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    setPreviewingVoiceId(null);
  }, []);

  const openVoicePicker = useCallback(() => {
    const selected = selectedUploadedVoiceId.trim();
    const isMyVoice = selected.length > 0 && myVoices.some((voice) => voice.voice_id === selected);
    setVoicePickerTab(isMyVoice ? 'my_voice' : 'community');
    setIsVoicePickerOpen(true);
    setVoiceSearchQuery('');
  }, [myVoices, selectedUploadedVoiceId]);

  const selectVoiceId = useCallback((voiceId: string) => {
    setSelectedUploadedVoiceId(voiceId);
    closeVoicePicker();
  }, [closeVoicePicker]);

  const removeMyVoice = useCallback((voiceId: string) => {
    setMyVoices((prev) => prev.filter((voice) => voice.voice_id !== voiceId));
  }, []);

  const closeAddMyVoice = useCallback(() => {
    if (isAddingMyVoice) return;
    setIsAddMyVoiceOpen(false);
    setAddMyVoiceError('');
  }, [isAddingMyVoice]);

  const openAddMyVoice = useCallback(() => {
    setAddMyVoiceMode('upload');
    setAddMyVoiceName('');
    setAddMyVoiceLanguage(language);
    setAddMyVoiceUrl('');
    setAddMyVoiceFile(null);
    setAddMyVoiceError('');
    setIsAddMyVoiceOpen(true);

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    setPreviewingVoiceId(null);
  }, [language]);

  const setAddMyVoiceFromFile = useCallback(async (file: File) => {
    setAddMyVoiceError('');
    const ext = file.name.toLowerCase();
    const isSupported = file.type === 'audio/mpeg' || file.type === 'audio/wav' || file.type === 'audio/x-wav' || ext.endsWith('.mp3') || ext.endsWith('.wav');
    if (!isSupported) {
      setAddMyVoiceError('Please upload an MP3 or WAV file.');
      return;
    }
    if (file.size > MAX_INPUT_AUDIO_BYTES) {
      setAddMyVoiceError(`File is too large (max ${formatBytes(MAX_INPUT_AUDIO_BYTES)}).`);
      return;
    }

    const url = URL.createObjectURL(file);
    try {
      const duration = await readAudioDuration(file, url);
      if (duration > MAX_AUDIO_DURATION_SECONDS) {
        setAddMyVoiceError('Please use an audio clip that is 30 seconds or less.');
        return;
      }
    } catch {
      setAddMyVoiceError('Could not read the audio file. Please try another MP3.');
      return;
    } finally {
      URL.revokeObjectURL(url);
    }

    if (addMyVoiceName.trim().length === 0) {
      setAddMyVoiceName(file.name.replace(/\.[^/.]+$/, ''));
    }
    setAddMyVoiceFile(file);
    setAddMyVoiceMode('upload');
    setAddMyVoiceUrl('');
  }, [addMyVoiceName]);

  const saveMyVoice = useCallback(async () => {
    if (isAddingMyVoice) return;

    const name = addMyVoiceName.trim();
    if (!name) {
      setAddMyVoiceError('Name is required.');
      return;
    }

    const languageValue = addMyVoiceLanguage.trim();
    if (!languageValue) {
      setAddMyVoiceError('Language is required.');
      return;
    }

    let initAudio: string;
    let initAudioFormat: 'url' | 'base64';

    if (addMyVoiceMode === 'url') {
      const normalized = normalizeUrlInput(addMyVoiceUrl);
      if (!normalized) {
        setAddMyVoiceError('Paste a URL for your voice sample.');
        return;
      }
      initAudio = normalized;
      initAudioFormat = 'url';
    } else {
      if (!addMyVoiceFile) {
        setAddMyVoiceError('Upload an MP3 file for your voice sample.');
        return;
      }
      initAudio = await fileToDataUrl(addMyVoiceFile);
      initAudioFormat = 'base64';
    }

    setIsAddingMyVoice(true);
    setAddMyVoiceError('');

    try {
      const response = await fetch('/api/modelslab/voice/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          language: languageValue,
          init_audio: initAudio,
          init_audio_format: initAudioFormat,
        }),
      });

      const data = (await response.json()) as { status?: string; voice_id?: string; message?: string };
      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Failed to save voice');
      }

      const voiceId = typeof data.voice_id === 'string' ? data.voice_id.trim() : '';
      if (!voiceId) {
        throw new Error('Voice saved, but no voice_id was returned.');
      }

      setMyVoices((prev) => {
        const exists = prev.some((voice) => voice.voice_id.toLowerCase() === voiceId.toLowerCase());
        if (exists) return prev;
        return [{ voice_id: voiceId, name }, ...prev];
      });

      setVoiceSearchQuery('');
      setVoicePickerTab('my_voice');
      setSelectedUploadedVoiceId(voiceId);
      setIsAddMyVoiceOpen(false);
    } catch (error) {
      setAddMyVoiceError(getErrorMessage(error, 'Failed to save voice'));
    } finally {
      setIsAddingMyVoice(false);
    }
  }, [isAddingMyVoice, addMyVoiceName, addMyVoiceLanguage, addMyVoiceMode, addMyVoiceUrl, addMyVoiceFile]);

  const closeSaveVoice = useCallback(() => {
    if (isSavingVoice) return;
    setIsSaveVoiceOpen(false);
    setSaveVoiceError('');
  }, [isSavingVoice]);

  const openSaveVoice = useCallback(() => {
    if (!uploadedFile) return;
    const baseName = uploadedFile.name.replace(/\.[^/.]+$/, '');
    setSaveVoiceName(baseName);
    setSaveVoiceLanguage(language);
    setSaveVoiceError('');
    setIsSaveVoiceOpen(true);
  }, [uploadedFile, language]);

  const saveVoiceToId = useCallback(async () => {
    if (isSavingVoice) return;
    if (!uploadedFile) {
      setSaveVoiceError('Upload an MP3 file to save it as a Voice ID.');
      return;
    }

    const name = saveVoiceName.trim();
    if (!name) {
      setSaveVoiceError('Name is required.');
      return;
    }

    const languageValue = saveVoiceLanguage.trim();
    if (!languageValue) {
      setSaveVoiceError('Language is required.');
      return;
    }

    setIsSavingVoice(true);
    setSaveVoiceError('');

    try {
      const initAudio = await fileToDataUrl(uploadedFile);
      const response = await fetch('/api/modelslab/voice/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          language: languageValue,
          init_audio: initAudio,
          init_audio_format: 'base64',
        }),
      });

      const data = (await response.json()) as { status?: string; voice_id?: string; message?: string };
      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Failed to save voice');
      }

      const voiceId = typeof data.voice_id === 'string' ? data.voice_id.trim() : '';
      if (!voiceId) {
        throw new Error('Voice saved, but no voice_id was returned.');
      }

      setMyVoices((prev) => {
        const exists = prev.some((voice) => voice.voice_id.toLowerCase() === voiceId.toLowerCase());
        if (exists) return prev;
        return [{ voice_id: voiceId, name }, ...prev];
      });

      setSelectedUploadedVoiceId(voiceId);
      setInputMode('voice_id');
      setIsSaveVoiceOpen(false);
    } catch (error) {
      setSaveVoiceError(getErrorMessage(error, 'Failed to save voice'));
    } finally {
      setIsSavingVoice(false);
    }
  }, [isSavingVoice, uploadedFile, saveVoiceLanguage, saveVoiceName]);

  const generateClone = useCallback(async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setGeneration({ kind: 'error', message: 'Enter a prompt to generate audio.' });
      return;
    }
    if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
      setGeneration({
        kind: 'error',
        message: `Prompt is too long (${trimmedPrompt.length}/${MAX_PROMPT_LENGTH}).`,
      });
      return;
    }

    let initAudioPayload: string | undefined;
    let initAudioFormat: 'url' | 'base64' | undefined;
    let voiceId: string | undefined;
    let sourceLabel = '';

    if (inputMode === 'voice_id') {
      const selected = selectedUploadedVoiceId.trim();
      if (!selected) {
        setGeneration({ kind: 'error', message: 'Select a voice to continue.' });
        return;
      }
      voiceId = selected;
      const myVoice = myVoices.find((voice) => voice.voice_id === selected);
      if (myVoice) {
        const name = typeof myVoice.name === 'string' ? myVoice.name.trim() : '';
        sourceLabel = name || myVoice.voice_id;
      } else {
        const voice = uploadedVoices.find((v) => v.voice_id === selected);
        sourceLabel = voice ? getVoiceLabel(voice) : selected;
      }
    } else if (inputMode === 'url') {
      const normalized = normalizeUrlInput(initAudioUrl);
      if (!normalized) {
        setGeneration({ kind: 'error', message: 'Paste a URL for your voice sample.' });
        return;
      }
      initAudioPayload = normalized;
      initAudioFormat = 'url';
      sourceLabel = truncate(normalized, 60);
    } else {
      if (!uploadedFile) {
        setGeneration({ kind: 'error', message: 'Upload an MP3 file for your voice sample.' });
        return;
      }
      initAudioPayload = await fileToDataUrl(uploadedFile);
      initAudioFormat = 'base64';
      sourceLabel = uploadedFile.name;
    }

    cancelGeneration();
    setGeneration({ kind: 'generating' });
    setCloneResponse(null);

    const controller = new AbortController();
    generateAbortRef.current = controller;

    const historyItem: Omit<HistoryItem, 'audioUrl'> = {
      createdAt: Date.now(),
      prompt: trimmedPrompt,
      sourceLabel,
    };

    try {
      const response = await fetch('/api/modelslab/voice-cloning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-vp-user-id': getUserId() },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          voice_id: voiceId,
          init_audio: initAudioPayload,
          init_audio_format: initAudioFormat,
          language: language,
        }),
        signal: controller.signal,
      });

      const data = (await response.json()) as ModelslabTextToSpeechResponse & {
        message?: string;
        job?: { id: string; trackId: number; webhookEnabled: boolean } | null;
      };
      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Generation failed');
      }

      setCloneResponse(data);

      if (data.status === 'processing' && typeof data.id === 'number') {
        const jobId = data.job?.id ?? null;
        setGeneration({ kind: 'polling', id: data.id });
        await pollForResult(jobId, data.id, historyItem);
        return;
      }

      if (data.status !== 'success') {
        throw new Error(data.message || 'Unexpected response status');
      }

      const url = pickPrimaryAudioUrl(data);
      if (url) {
        setHistory((prev) => [{ ...historyItem, audioUrl: url }, ...prev].slice(0, 8));
      }

      setGeneration({ kind: 'ready' });
    } catch (error) {
      if (isAbortError(error)) {
        setGeneration({ kind: 'ready' });
        return;
      }
      setGeneration({ kind: 'error', message: getErrorMessage(error, 'Voice cloning request failed') });
    } finally {
      generateAbortRef.current = null;
    }
  }, [
    prompt,
    inputMode,
    selectedUploadedVoiceId,
    uploadedVoices,
    myVoices,
    initAudioUrl,
    uploadedFile,
    language,
    cancelGeneration,
    pollForResult,
  ]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(MY_VOICES_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const loaded: MyVoice[] = [];
      for (const entry of parsed) {
        if (typeof entry !== 'object' || entry === null) continue;
        const record = entry as Record<string, unknown>;
        const voiceId = typeof record.voice_id === 'string' ? record.voice_id.trim() : '';
        if (!voiceId) continue;
        const name = typeof record.name === 'string' ? record.name.trim() : '';
        loaded.push({ voice_id: voiceId, name });
      }
      if (loaded.length > 0) setMyVoices(loaded);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(MY_VOICES_STORAGE_KEY, JSON.stringify(myVoices));
    } catch {
      return;
    }
  }, [myVoices]);

  useEffect(() => {
    if (!isVoicePickerOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isAddMyVoiceOpen) return;
        closeVoicePicker();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVoicePickerOpen, closeVoicePicker, isAddMyVoiceOpen]);

  useEffect(() => {
    if (!isSaveVoiceOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSaveVoice();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSaveVoiceOpen, closeSaveVoice]);

  useEffect(() => {
    if (!isAddMyVoiceOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAddMyVoice();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAddMyVoiceOpen, closeAddMyVoice]);

  useEffect(() => {
    if (!uploadedFile) {
      setUploadedFilePreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(uploadedFile);
    setUploadedFilePreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [uploadedFile]);

  useEffect(() => {
    if (!addMyVoiceFile) {
      setAddMyVoiceFilePreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(addMyVoiceFile);
    setAddMyVoiceFilePreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [addMyVoiceFile]);

  useEffect(() => {
    void loadUploadedVoices();
  }, [loadUploadedVoices]);

  useEffect(() => {
    return () => {
      cancelGeneration();
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
    };
  }, [cancelGeneration]);

  useEffect(() => {
    return () => {
      if (pendingVoiceFile?.url) URL.revokeObjectURL(pendingVoiceFile.url);
    };
  }, [pendingVoiceFile?.url]);

  useEffect(() => {
    if (!isAudioTrimOpen) {
      trimAudioRef.current?.pause();
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancelVoiceTrim();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAudioTrimOpen, cancelVoiceTrim]);

  useEffect(() => {
    if (!isAudioTrimOpen) return;
    const audio = trimAudioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (audio.currentTime >= trimEndSeconds) {
        audio.pause();
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, [isAudioTrimOpen, trimEndSeconds]);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[400px,1fr]">
      {/* LEFT COLUMN - Voice Source & Language */}
      <div className="flex flex-col gap-5">
        {/* Voice Source Section */}
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Voice source</h2>
            <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
              {(['url', 'upload', 'voice_id'] as const).map((mode) => {
                const selected = inputMode === mode;
                const label = mode === 'url' ? 'URL' : mode === 'upload' ? 'Upload' : 'Voice ID';
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setInputMode(mode);
                      setUploadError('');
                      if (mode === 'voice_id') openVoicePicker();
                    }}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                      selected ? 'bg-white/10 text-white' : 'text-text-secondary hover:text-white'
                    )}
                    disabled={isBusy}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            {inputMode === 'url' && (
              <div className="space-y-2">
                <input
                  value={initAudioUrl}
                  onChange={(e) => setInitAudioUrl(e.target.value)}
                  placeholder="https://example.com/voice-sample.mp3"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-text-muted focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20"
                  disabled={isBusy}
                />
                <p className="text-xs text-text-muted">
                  Direct link to audio (4-30 seconds recommended)
                </p>
              </div>
            )}

            {inputMode === 'upload' && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setAudioFromFile(file);
                    e.currentTarget.value = '';
                  }}
                  disabled={isBusy}
                />

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !isBusy && fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (isBusy) return;
                    if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (isBusy) return;
                    const file = e.dataTransfer.files?.[0];
                    if (file) setAudioFromFile(file);
                  }}
                  className={cn(
                    'relative flex min-h-[120px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-white/5 px-4 py-4 text-center transition-colors',
                    uploadError ? 'border-accent-pink/60' : 'border-white/15 hover:border-white/25'
                  )}
                >
	                  {uploadedFile ? (
	                    <>
	                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
	                        <Sparkles className="h-4 w-4 text-accent-pink" />
	                      </div>
	                      <div className="text-sm font-medium text-white">{uploadedFile.name}</div>
	                      <div className="text-xs text-text-muted">{formatBytes(uploadedFile.size)}</div>
	                      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
	                        <button
	                          type="button"
	                          onClick={(e) => {
	                            e.stopPropagation();
	                            setUploadedFile(null);
	                            setUploadError('');
	                          }}
	                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-white/10 hover:text-white"
	                          disabled={isBusy}
	                        >
	                          <Trash2 className="h-3 w-3" />
	                          Remove
	                        </button>
	                        <button
	                          type="button"
	                          onClick={(e) => {
	                            e.stopPropagation();
	                            openSaveVoice();
	                          }}
	                          className={cn(
	                            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition',
	                            isBusy ? 'cursor-not-allowed bg-white/10 text-text-muted' : 'bg-accent-pink hover:bg-accent-pink/90'
	                          )}
	                          disabled={isBusy}
	                        >
	                          Save to Voice ID
	                        </button>
	                      </div>
	                    </>
	                  ) : (
	                    <>
	                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
	                        <Upload className="h-4 w-4 text-text-secondary" />
                      </div>
                      <div className="text-sm font-medium text-white/90">
                        Drag &amp; drop MP3 here
                      </div>
                      <div className="text-xs text-text-muted">Max: {formatBytes(MAX_INPUT_AUDIO_BYTES)}</div>
                    </>
                  )}
                </div>

            {uploadError && <p className="text-xs text-accent-pink">{uploadError}</p>}
              </div>
            )}

            {inputMode === 'voice_id' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Voice ID</span>
                  <button
                    type="button"
                    onClick={openVoicePicker}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-text-secondary transition hover:bg-white/10 hover:text-white"
                    disabled={isBusy}
                  >
                    Choose
                  </button>
                </div>

                {selectedVoice ? (
                  <div className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left">
                    <button
                      type="button"
                      onClick={() => playVoicePreview(selectedVoice.voice_id, selectedVoice.sound_clip)}
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition',
                        selectedVoice.sound_clip
                          ? previewingVoiceId === selectedVoice.voice_id
                            ? 'bg-accent-pink text-white'
                            : 'bg-white/10 text-text-secondary hover:bg-white/20 hover:text-white'
                          : 'cursor-not-allowed bg-white/5 text-text-muted'
                      )}
                      disabled={!selectedVoice.sound_clip || isBusy}
                      title={selectedVoice.sound_clip ? 'Preview voice' : 'No preview available'}
                    >
                      {previewingVoiceId === selectedVoice.voice_id ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white">{selectedVoice.label}</div>
                      <div className="mt-0.5 truncate text-xs text-text-muted font-mono">{selectedVoice.voice_id}</div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-6 text-center">
                    <p className="text-sm text-text-muted">No voice selected</p>
                    <p className="mt-1 text-xs text-text-muted">Choose from community or your saved voices</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Language Section */}
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5 shadow-card">
          <h2 className="text-sm font-semibold text-white">Language</h2>
          <p className="mt-1 text-xs text-text-muted">Output language for the generated voice</p>

          <div className="relative mt-4">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 pr-10 text-sm text-white focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20"
              disabled={isBusy}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN - Text, Generate, Output */}
      <div className="flex flex-col gap-5">
        {/* Text to Speak Section */}
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Text to speak</h2>
              <p className="mt-1 text-xs text-text-muted">What should the cloned voice say?</p>
            </div>
            <div className="text-xs text-text-muted">
              {prompt.length}/{MAX_PROMPT_LENGTH}
            </div>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type your script here..."
            rows={6}
            className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white placeholder:text-text-muted focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20"
            disabled={isBusy}
            maxLength={MAX_PROMPT_LENGTH}
          />
        </div>

        {/* Generate Button */}
        <button
          type="button"
          onClick={generateClone}
          className={cn(
            'group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl px-6 py-4 text-base font-bold transition-all',
            isBusy
              ? 'cursor-not-allowed bg-white/10 text-text-muted'
              : 'bg-gradient-to-r from-accent-pink via-purple-500 to-accent-pink bg-[length:200%_100%] text-white shadow-lg shadow-accent-pink/25 hover:bg-[100%_0] hover:shadow-xl hover:shadow-accent-pink/30'
          )}
          disabled={isBusy}
        >
          {generation.kind === 'generating' || generation.kind === 'polling' ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{generation.kind === 'polling' ? 'Processing...' : 'Generating...'}</span>
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              <span>Generate Voice</span>
            </>
          )}
        </button>

        {(generation.kind === 'generating' || generation.kind === 'polling') && (
          <button
            type="button"
            onClick={cancelGeneration}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-text-secondary transition hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
        )}

        {generation.kind === 'polling' && cloneResponse?.eta && (
          <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
            <Clock className="h-4 w-4" />
            <span>Estimated time: ~{cloneResponse.eta}s</span>
          </div>
        )}

        {generation.kind === 'error' && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div>
              <div className="font-semibold text-white">Generation failed</div>
              <div className="mt-1 text-sm text-red-200/80">{generation.message}</div>
            </div>
          </div>
        )}

        {/* Output Section */}
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5 shadow-card">
          <div className="flex items-center gap-2">
            <div className={cn('h-2 w-2 rounded-full', primaryAudioUrl ? 'bg-green-400' : 'bg-white/30')} />
            <h2 className="text-sm font-semibold text-white">Output</h2>
          </div>

          <div className="mt-4">
            {primaryAudioUrl ? (
              <AudioPlayerCompact src={primaryAudioUrl} downloadFilename="voice-clone.mp3" />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 py-8">
                <Sparkles className="h-7 w-7 text-text-muted" />
                <p className="mt-3 text-sm text-text-secondary">
                  {generation.kind === 'polling' || generation.kind === 'generating'
                    ? 'Generating your voice...'
                    : 'Your generated audio will appear here'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* History Section */}
        {history.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-text-muted" />
                <h2 className="text-sm font-semibold text-white">Recent</h2>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-text-muted">{history.length}</span>
              </div>
              <button
                type="button"
                onClick={() => setHistory([])}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-text-muted transition hover:bg-white/10 hover:text-white"
                disabled={isBusy}
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {history.map((item) => {
                const isCurrent = primaryAudioUrl === item.audioUrl;
                return (
                  <div
                    key={item.createdAt}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3 transition',
                      isCurrent ? 'border-accent-pink/30 bg-accent-pink/10' : 'border-white/10 bg-white/5'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setCloneResponse((curr) =>
                          curr ? { ...curr, output: [item.audioUrl] } : { status: 'success', output: [item.audioUrl] }
                        );
                      }}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg transition',
                        isCurrent ? 'bg-accent-pink text-white' : 'bg-white/10 text-text-secondary hover:bg-white/20 hover:text-white'
                      )}
                      disabled={isBusy}
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white">{item.sourceLabel}</div>
                      <div className="mt-0.5 truncate text-xs text-text-muted">{truncate(item.prompt, 50)}</div>
                    </div>
                    <span className="shrink-0 text-xs text-text-muted">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Save Voice Modal */}
      {isSaveVoiceOpen && uploadedFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeSaveVoice();
          }}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Save to Voice ID</h2>
                <p className="mt-1 text-xs text-text-muted">
                  Save this voice sample to My Voices so you can reuse it without uploading again.
                </p>
              </div>
              <button
                type="button"
                onClick={closeSaveVoice}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-text-secondary transition hover:bg-white/10 hover:text-white"
                aria-label="Close"
                disabled={isSavingVoice}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-text-muted">Name</label>
                  <input
                    value={saveVoiceName}
                    onChange={(e) => setSaveVoiceName(e.target.value)}
                    placeholder="e.g. My voice"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-text-muted focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20"
                    disabled={isSavingVoice}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-text-muted">Language</label>
                  <div className="relative">
                    <select
                      value={saveVoiceLanguage}
                      onChange={(e) => setSaveVoiceLanguage(e.target.value)}
                      className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-10 text-sm text-white focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20"
                      disabled={isSavingVoice}
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.value} value={lang.value}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-muted">Audio</span>
                  <span className="text-xs text-text-muted">{uploadedFile.name}</span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white p-4">
                  {uploadedFilePreviewUrl ? (
                    <audio src={uploadedFilePreviewUrl} controls className="w-full" />
                  ) : (
                    <div className="text-xs text-text-muted">Loading audio preview…</div>
                  )}
                </div>
              </div>

              {saveVoiceError && (
                <div className="rounded-xl border border-accent-pink/30 bg-accent-pink/10 p-3 text-xs text-text-muted">
                  {saveVoiceError}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeSaveVoice}
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                  disabled={isSavingVoice}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveVoiceToId}
                  disabled={isSavingVoice || isBusy || saveVoiceName.trim().length === 0 || saveVoiceLanguage.trim().length === 0}
                  className={cn(
                    'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition',
                    !isSavingVoice && !isBusy && saveVoiceName.trim().length > 0 && saveVoiceLanguage.trim().length > 0
                      ? 'bg-accent-pink hover:bg-accent-pink/90'
                      : 'cursor-not-allowed bg-white/10 text-text-muted'
                  )}
                >
                  {isSavingVoice ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

	      {/* Voice Picker Modal */}
	      {isVoicePickerOpen && (
	        <div
	          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
	          onMouseDown={(e) => {
	            if (e.target === e.currentTarget) closeVoicePicker();
	          }}
	        >
	          <div
	            className="flex w-full max-w-4xl max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
	            onMouseDown={(e) => e.stopPropagation()}
	          >
	            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
	              <div>
	                <h2 className="text-xl font-semibold text-white">Choose a voice</h2>
	                <p className="mt-1 text-xs text-text-muted">Search community voices or add your own voice ID.</p>
	              </div>
              <button
                type="button"
                onClick={closeVoicePicker}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-text-secondary transition hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
	                <X className="h-5 w-5" />
	              </button>
	            </div>

	            <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-4">
	              <input
	                value={voiceSearchQuery}
	                onChange={(e) => setVoiceSearchQuery(e.target.value)}
	                placeholder="Search community and my voices..."
	                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-text-muted focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20"
	                disabled={isBusy}
	              />

	              <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
	                {(['community', 'my_voice'] as const).map((tab) => {
	                  const selected = voicePickerTab === tab;
	                  const label = tab === 'community' ? 'Community Upload' : 'My voice';
	                  return (
	                    <button
	                      key={tab}
	                      type="button"
	                      onClick={() => setVoicePickerTab(tab)}
	                      className={cn(
	                        'flex-1 rounded-lg border border-transparent px-3 py-2 text-xs font-semibold transition',
	                        selected
	                          ? 'border-accent-pink/50 bg-[rgb(255_62_138_/85%)] text-white'
	                          : 'text-text-secondary hover:border-accent-pink/30 hover:bg-accent-pink/10 hover:text-white'
	                      )}
	                      disabled={isBusy}
	                    >
	                      {label}
	                    </button>
	                  );
	                })}
	              </div>

	              <div>
	                {voicePickerTab === 'community' ? (
	                  <div className="space-y-3">
	                    <div className="flex items-center justify-between">
	                      <div className="flex items-center gap-2">
	                        <h3 className="text-sm font-semibold text-white">Community Upload</h3>
	                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-text-muted">
	                          {filteredCommunityVoices.length}
	                        </span>
	                      </div>
	                      <button
	                        type="button"
	                        onClick={loadUploadedVoices}
	                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-text-secondary transition hover:bg-white/10 hover:text-white"
                        disabled={isBusy || voiceListState.kind === 'loading'}
                      >
                        <RefreshCcw className={cn('h-3 w-3', voiceListState.kind === 'loading' && 'animate-spin')} />
                        Refresh
                      </button>
                    </div>

	                    {voiceListState.kind === 'error' && (
	                      <div className="rounded-xl border border-accent-pink/30 bg-accent-pink/10 p-3 text-xs text-text-muted">
	                        {voiceListState.message}
	                      </div>
	                    )}

	                    {filteredCommunityVoices.length === 0 ? (
	                      <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-6 text-center">
	                        <p className="text-sm text-text-muted">
	                          {voiceListState.kind === 'loading' ? 'Loading voices...' : 'No voices found'}
	                        </p>
	                        <p className="mt-1 text-xs text-text-muted">Try a different search</p>
	                      </div>
	                    ) : (
	                      <div className="space-y-2">
	                        {filteredCommunityVoices.map((voice) => {
	                          const isSelected = selectedUploadedVoiceId === voice.voice_id;
	                          const isPreviewing = previewingVoiceId === voice.voice_id;
	                          return (
	                            <button
	                              key={voice.voice_id}
	                              type="button"
	                              onClick={() => selectVoiceId(voice.voice_id)}
	                              className={cn(
	                                'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition',
	                                isSelected
	                                  ? 'border-accent-pink/50 bg-accent-pink/10'
	                                  : 'border-white/10 bg-white/5 hover:border-accent-pink/30 hover:bg-accent-pink/10'
	                              )}
	                              disabled={isBusy}
	                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playVoicePreview(voice.voice_id, voice.sound_clip);
                                }}
                                className={cn(
                                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition',
                                  voice.sound_clip
                                    ? isPreviewing
                                      ? 'bg-accent-pink text-white'
                                      : 'bg-white/10 text-text-secondary hover:bg-white/20 hover:text-white'
                                    : 'cursor-not-allowed bg-white/5 text-text-muted'
                              )}
                              disabled={!voice.sound_clip || isBusy}
                              title={voice.sound_clip ? 'Preview voice' : 'No preview available'}
                            >
                                {isPreviewing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                            </button>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-white">{getVoiceLabel(voice)}</div>
                                <div className="mt-0.5 truncate text-xs text-text-muted font-mono">
                                  {voice.voice_id}
                                </div>
                              </div>
                            </button>
                          );
	                        })}
	                      </div>
	                    )}
	                  </div>
	                ) : (
	                  <div className="space-y-3">
	                    <div className="flex items-center justify-between gap-3">
	                      <div className="flex items-center gap-2">
	                        <h3 className="text-sm font-semibold text-white">My voice</h3>
	                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-text-muted">
	                          {filteredMyVoices.length}
	                        </span>
	                      </div>
	                      <button
	                        type="button"
	                        onClick={openAddMyVoice}
	                        className={cn(
	                          'inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition',
		                          isBusy ? 'cursor-not-allowed bg-white/10 text-text-muted' : 'bg-accent-pink hover:bg-accent-pink/90'
		                        )}
		                        disabled={isBusy}
		                      >
		                        Add my voice
		                      </button>
		                    </div>

		                    {filteredMyVoices.length === 0 ? (
		                      <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-6 text-center">
		                        <p className="text-sm text-text-muted">{normalizedVoiceSearch ? 'No voices found' : 'No saved voices'}</p>
		                        <p className="mt-1 text-xs text-text-muted">
		                          {normalizedVoiceSearch ? 'Try a different search' : 'Add a voice sample to save it for later'}
		                        </p>
		                      </div>
		                    ) : (
		                      <div className="space-y-2">
		                        {filteredMyVoices.map((voice) => {
		                          const name = typeof voice.name === 'string' ? voice.name.trim() : '';
		                          const label = name || voice.voice_id;
		                          const isSelected = selectedUploadedVoiceId === voice.voice_id;
	                          return (
	                            <button
	                              key={voice.voice_id}
	                              type="button"
	                              onClick={() => selectVoiceId(voice.voice_id)}
	                              className={cn(
	                                'flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition',
	                                isSelected
	                                  ? 'border-accent-pink/50 bg-accent-pink/10'
	                                  : 'border-white/10 bg-white/5 hover:border-accent-pink/30 hover:bg-accent-pink/10'
	                              )}
	                              disabled={isBusy}
	                            >
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-white">{label}</div>
                                <div className="mt-0.5 truncate text-xs text-text-muted font-mono">{voice.voice_id}</div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeMyVoice(voice.voice_id);
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-text-secondary transition hover:bg-white/10 hover:text-white"
                                aria-label="Remove"
                                disabled={isBusy}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
	          </div>
	        </div>
	      )}

	      {/* Add My Voice Modal */}
	      {isAddMyVoiceOpen && (
	        <div
	          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
	          onMouseDown={(e) => {
	            if (e.target === e.currentTarget) closeAddMyVoice();
	          }}
	        >
	          <div
	            className="flex w-full max-w-2xl max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
	            onMouseDown={(e) => e.stopPropagation()}
	          >
	            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
	              <div>
	                <h2 className="text-xl font-semibold text-white">Add my voice</h2>
	                <p className="mt-1 text-xs text-text-muted">
	                  Save a voice sample to My Voices so you can reuse it without uploading again.
	                </p>
	              </div>
	              <button
	                type="button"
	                onClick={closeAddMyVoice}
	                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-text-secondary transition hover:bg-white/10 hover:text-white"
	                aria-label="Close"
	                disabled={isAddingMyVoice}
	              >
	                <X className="h-5 w-5" />
	              </button>
	            </div>

	            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
	              <div className="grid gap-4 sm:grid-cols-2">
	                <div className="space-y-2">
	                  <label className="text-xs font-medium text-text-muted">Name</label>
	                  <input
	                    value={addMyVoiceName}
	                    onChange={(e) => setAddMyVoiceName(e.target.value)}
	                    placeholder="e.g. My voice"
	                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-text-muted focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20"
	                    disabled={isAddingMyVoice}
	                  />
	                </div>

	                <div className="space-y-2">
	                  <label className="text-xs font-medium text-text-muted">Language</label>
	                  <div className="relative">
	                    <select
	                      value={addMyVoiceLanguage}
	                      onChange={(e) => setAddMyVoiceLanguage(e.target.value)}
	                      className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-10 text-sm text-white focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20"
	                      disabled={isAddingMyVoice}
	                    >
	                      {SUPPORTED_LANGUAGES.map((lang) => (
	                        <option key={lang.value} value={lang.value}>
	                          {lang.label}
	                        </option>
	                      ))}
	                    </select>
	                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
	                  </div>
	                </div>
	              </div>

	              <div className="space-y-2">
	                <div className="flex items-center justify-between">
	                  <span className="text-xs font-medium text-text-muted">Voice source</span>
	                  <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
	                    {(['upload', 'url'] as const).map((mode) => {
	                      const selected = addMyVoiceMode === mode;
	                      const label = mode === 'upload' ? 'Upload' : 'URL';
	                      return (
	                        <button
	                          key={mode}
	                          type="button"
	                          onClick={() => {
	                            setAddMyVoiceMode(mode);
	                            setAddMyVoiceError('');
	                            if (mode === 'upload') setAddMyVoiceUrl('');
	                            if (mode === 'url') setAddMyVoiceFile(null);
	                          }}
	                          className={cn(
	                            'rounded-lg border border-transparent px-3 py-1.5 text-xs font-semibold transition',
	                            selected
	                              ? 'border-accent-pink/50 bg-accent-pink/10 text-white'
	                              : 'text-text-secondary hover:border-accent-pink/30 hover:bg-accent-pink/10 hover:text-white'
	                          )}
	                          disabled={isAddingMyVoice}
	                        >
	                          {label}
	                        </button>
	                      );
	                    })}
	                  </div>
	                </div>

	                {addMyVoiceMode === 'url' ? (
	                  <div className="space-y-2">
	                    <input
	                      value={addMyVoiceUrl}
	                      onChange={(e) => setAddMyVoiceUrl(e.target.value)}
	                      placeholder="https://music.youtube.com/... or https://example.com/voice.mp3"
	                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-text-muted focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20"
	                      disabled={isAddingMyVoice}
	                    />
	                    <p className="text-xs text-text-muted">
	                      Tip: if your URL requires authentication or isn&apos;t publicly accessible, we may not be able to fetch it.
	                    </p>
	                  </div>
	                ) : (
	                  <div className="space-y-3">
	                    <input
	                      ref={addMyVoiceFileInputRef}
	                      type="file"
	                      accept="audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav"
	                      className="hidden"
	                      onChange={(e) => {
	                        const file = e.target.files?.[0];
	                        if (file) void setAddMyVoiceFromFile(file);
	                        e.currentTarget.value = '';
	                      }}
	                      disabled={isAddingMyVoice}
	                    />

	                    <div
	                      role="button"
	                      tabIndex={0}
	                      onClick={() => !isAddingMyVoice && addMyVoiceFileInputRef.current?.click()}
	                      onKeyDown={(e) => {
	                        if (isAddingMyVoice) return;
	                        if (e.key === 'Enter' || e.key === ' ') addMyVoiceFileInputRef.current?.click();
	                      }}
	                      onDragOver={(e) => e.preventDefault()}
	                      onDrop={(e) => {
	                        e.preventDefault();
	                        if (isAddingMyVoice) return;
	                        const file = e.dataTransfer.files?.[0];
	                        if (file) void setAddMyVoiceFromFile(file);
	                      }}
	                      className={cn(
	                        'relative flex min-h-[110px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-white/5 px-4 py-4 text-center transition-colors',
	                        addMyVoiceError && !addMyVoiceFile ? 'border-accent-pink/60' : 'border-white/15 hover:border-white/25'
	                      )}
	                    >
	                      {addMyVoiceFile ? (
	                        <>
	                          <div className="text-sm font-medium text-white">{addMyVoiceFile.name}</div>
	                          <div className="text-xs text-text-muted">{formatBytes(addMyVoiceFile.size)}</div>
	                          <button
	                            type="button"
	                            onClick={(e) => {
	                              e.stopPropagation();
	                              setAddMyVoiceFile(null);
	                              setAddMyVoiceError('');
	                            }}
	                            className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-white/10 hover:text-white"
	                            disabled={isAddingMyVoice}
	                          >
	                            <Trash2 className="h-3 w-3" />
	                            Remove
	                          </button>
	                        </>
	                      ) : (
	                        <>
	                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
	                            <Upload className="h-4 w-4 text-text-secondary" />
	                          </div>
	                          <div className="text-sm font-medium text-white/90">Drag &amp; drop MP3 here</div>
	                          <div className="text-xs text-text-muted">Max: {formatBytes(MAX_INPUT_AUDIO_BYTES)}</div>
	                        </>
	                      )}
	                    </div>
	                  </div>
	                )}
	              </div>

	              <div className="space-y-2">
	                <div className="flex items-center justify-between">
	                  <span className="text-xs font-medium text-text-muted">Audio</span>
	                  <span className="text-xs text-text-muted">
	                    {addMyVoiceMode === 'upload'
	                      ? (addMyVoiceFile?.name ?? '—')
	                      : (addMyVoiceUrl.trim().length > 0 ? truncate(normalizeUrlInput(addMyVoiceUrl), 40) : '—')}
	                  </span>
	                </div>
	                <div className="rounded-2xl border border-white/10 bg-white p-4">
	                  {addMyVoiceMode === 'upload' ? (
	                    addMyVoiceFilePreviewUrl ? (
	                      <audio src={addMyVoiceFilePreviewUrl} controls className="w-full" />
	                    ) : (
	                      <div className="text-xs text-text-muted">Upload an MP3 to preview it.</div>
	                    )
	                  ) : addMyVoiceUrl.trim().length > 0 ? (
	                    <audio src={normalizeUrlInput(addMyVoiceUrl)} controls className="w-full" />
	                  ) : (
	                    <div className="text-xs text-text-muted">Paste a URL to preview it.</div>
	                  )}
	                </div>
	              </div>

	              {addMyVoiceError && (
	                <div className="rounded-xl border border-accent-pink/30 bg-accent-pink/10 p-3 text-xs text-text-muted">
	                  {addMyVoiceError}
	                </div>
	              )}

	              <div className="flex flex-wrap items-center justify-end gap-3">
	                <button
	                  type="button"
	                  onClick={closeAddMyVoice}
	                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
	                  disabled={isAddingMyVoice}
	                >
	                  Cancel
	                </button>
	                <button
	                  type="button"
	                  onClick={saveMyVoice}
	                  disabled={
	                    isBusy
	                    || isAddingMyVoice
	                    || addMyVoiceName.trim().length === 0
	                    || addMyVoiceLanguage.trim().length === 0
	                    || (addMyVoiceMode === 'url'
	                      ? normalizeUrlInput(addMyVoiceUrl).trim().length === 0
	                      : !addMyVoiceFile)
	                  }
	                  className={cn(
	                    'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition',
	                    !isBusy
	                    && !isAddingMyVoice
	                    && addMyVoiceName.trim().length > 0
	                    && addMyVoiceLanguage.trim().length > 0
	                    && (addMyVoiceMode === 'url'
	                      ? normalizeUrlInput(addMyVoiceUrl).trim().length > 0
	                      : Boolean(addMyVoiceFile))
	                      ? 'bg-accent-pink hover:bg-accent-pink/90'
	                      : 'cursor-not-allowed bg-white/10 text-text-muted'
	                  )}
	                >
	                  {isAddingMyVoice ? 'Saving…' : 'Save'}
	                </button>
	              </div>
	            </div>
	          </div>
	        </div>
	      )}

	      {/* Crop Voice Modal */}
	      {isAudioTrimOpen && pendingVoiceFile && (
	        <div
	          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cancelVoiceTrim();
          }}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="text-xl font-semibold text-white">Crop Voice</h2>
              <button
                type="button"
                onClick={cancelVoiceTrim}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-text-secondary transition hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-text-secondary">
                Your voice should not be more than 30 sec. Please crop the audio.
              </p>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white p-4">
                <audio
                  ref={trimAudioRef}
                  src={pendingVoiceFile.url}
                  controls
                  className="w-full"
                />
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Start</span>
                    <span className="font-medium text-white">{formatSeconds(trimStartSeconds)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, pendingVoiceFile.duration - 0.1)}
                    step={0.1}
                    value={trimStartSeconds}
                    onChange={(e) => {
                      const nextStart = Number(e.target.value);
                      const maxEnd = Math.min(pendingVoiceFile.duration, nextStart + MAX_AUDIO_DURATION_SECONDS);
                      setTrimStartSeconds(nextStart);
                      setTrimEndSeconds((currentEnd) => clamp(currentEnd, nextStart + 0.1, maxEnd));
                    }}
                    className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-accent-pink [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-pink"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">End</span>
                    <span className="font-medium text-white">{formatSeconds(trimEndSeconds)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={pendingVoiceFile.duration}
                    step={0.1}
                    value={trimEndSeconds}
                    onChange={(e) => {
                      const nextEnd = Number(e.target.value);
                      const minStart = Math.max(0, nextEnd - MAX_AUDIO_DURATION_SECONDS);
                      setTrimEndSeconds(nextEnd);
                      setTrimStartSeconds((currentStart) => clamp(currentStart, minStart, nextEnd - 0.1));
                    }}
                    className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-accent-pink [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-pink"
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Selected</span>
                  <span className="font-semibold text-white">
                    {formatSeconds(Math.max(0, trimEndSeconds - trimStartSeconds))} (max 0:30)
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const audio = trimAudioRef.current;
                    if (!audio) return;
                    audio.currentTime = trimStartSeconds;
                    audio.play().catch(() => undefined);
                  }}
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Preview selection
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={cancelVoiceTrim}
                    className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={applyVoiceTrim}
                    disabled={isApplyingTrim || trimEndSeconds - trimStartSeconds > MAX_AUDIO_DURATION_SECONDS}
                    className={cn(
                      'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition',
                      !isApplyingTrim && trimEndSeconds - trimStartSeconds <= MAX_AUDIO_DURATION_SECONDS
                        ? 'bg-accent-pink hover:bg-accent-pink/90'
                        : 'cursor-not-allowed bg-white/10 text-text-muted'
                    )}
                  >
                    {isApplyingTrim ? 'Cropping…' : 'Crop & Apply'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
