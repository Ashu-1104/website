'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  AlertCircle,
  Check,
  Clock,
  Download,
  HelpCircle,
  Loader2,
  Pause,
  Play,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModelslabTextToSpeechResponse, ModelslabVoice } from '@/lib/modelslab';
import { getUserId } from '@/hooks/useApi';

const MAX_INPUT_AUDIO_BYTES = 25 * 1024 * 1024;
const DEFAULT_PAGE_SIZE = 40;

type GenderFilter = 'all' | 'female' | 'male';

type InputMode = 'url' | 'upload';

type GenerationState =
  | { kind: 'loadingVoices' }
  | { kind: 'ready' }
  | { kind: 'generating' }
  | { kind: 'polling'; id: number; jobId?: string; nextPollInMs?: number }
  | { kind: 'error'; message: string };

type GenerationHistoryItem = {
  createdAt: number;
  voice_id: string;
  voice_name: string;
  initAudioLabel: string;
  audioUrl: string;
};

function normalize(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeUrlInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^[a-z]+:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function pickPrimaryAudioUrl(response: ModelslabTextToSpeechResponse | null): string | null {
  if (!response) return null;
  const candidates = response.output ?? response.proxy_links ?? response.links ?? response.future_links;
  if (!Array.isArray(candidates)) return null;
  return candidates.find((value: unknown) => typeof value === 'string' && (value as string).length > 0) as string | undefined ?? null;
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

function truncate(value: string, max = 90) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  });
}

function getMetaValue(value: unknown): string {
  if (typeof value !== 'string') return 'unknown';
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : 'unknown';
}

function getVoiceLabel(voice: ModelslabVoice): string {
  if (typeof voice.name === 'string') {
    const trimmed = voice.name.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return voice.voice_id;
}

// Female avatar icon - with feminine features (bow/hair accessory)
function FemaleAvatarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="10" r="4" />
      <path d="M6 21v-1a6 6 0 0 1 12 0v1" />
      {/* Long hair on sides */}
      <path d="M8 6c-1 1-2 3-2 5" />
      <path d="M16 6c1 1 2 3 2 5" />
      {/* Hair bow */}
      <path d="M10 4l2-2 2 2" />
      <circle cx="12" cy="4" r="1" fill="currentColor" />
    </svg>
  );
}

// Male avatar icon - with masculine features (short hair, no accessories)
function MaleAvatarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="10" r="4" />
      <path d="M6 21v-1a6 6 0 0 1 12 0v1" />
      {/* Short flat hair */}
      <path d="M8 7h8" />
      <path d="M9 5h6" />
    </svg>
  );
}

export default function VoiceCoverPlayground() {
  const [voices, setVoices] = useState<ModelslabVoice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [characterFilter, setCharacterFilter] = useState<string>('all');

  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [initAudioUrl, setInitAudioUrl] = useState('');
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const [tempLinks, setTempLinks] = useState<boolean>(false);
  const [pitch, setPitch] = useState<string>('none');
  const [algorithm, setAlgorithm] = useState<string>('rmvpe');
  const [rate, setRate] = useState<number>(0.75);
  const [mix, setMix] = useState<number>(0);
  const [originality, setOriginality] = useState<number>(0.33);
  const [radius, setRadius] = useState<number>(3);
  const [speed, setSpeed] = useState<number>(1);
  const [hopLength, setHopLength] = useState<number>(128);
  const [emotion, setEmotion] = useState<string>('neutral');
  const [reverbSize, setReverbSize] = useState<number>(0.15);
  const [wetness, setWetness] = useState<number>(0.2);
  const [dryness, setDryness] = useState<number>(0.8);
  const [damping, setDamping] = useState<number>(0.7);
  const [leadVolDelta, setLeadVolDelta] = useState<number>(0);
  const [backupVolDelta, setBackupVolDelta] = useState<number>(0);
  const [instrumentVolDelta, setInstrumentVolDelta] = useState<number>(0);

  const [generation, setGeneration] = useState<GenerationState>({ kind: 'loadingVoices' });
  const [coverResponse, setCoverResponse] = useState<ModelslabTextToSpeechResponse | null>(null);
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);

  const generateAbortRef = useRef<AbortController | null>(null);
  const pollTimeoutRef = useRef<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(DEFAULT_PAGE_SIZE);

  // Audio player state for custom controls
  const outputAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const voiceMap = useMemo(() => {
    const map = new Map<string, ModelslabVoice>();
    for (const voice of voices) map.set(voice.voice_id, voice);
    return map;
  }, [voices]);

  const searchIndex = useMemo(() => {
    const index = new Map<string, string>();
    for (const voice of voices) {
      const country = getMetaValue(voice.country);
      const character = getMetaValue(voice.character);
      const language = getMetaValue(voice.language);
      index.set(
        voice.voice_id,
        `${getVoiceLabel(voice)} ${voice.voice_id} ${language} ${voice.gender} ${country} ${character}`.toLowerCase()
      );
    }
    return index;
  }, [voices]);

  const languages = useMemo(() => {
    const unique = new Set<string>();
    for (const voice of voices) unique.add(getMetaValue(voice.language));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [voices]);

  const countries = useMemo(() => {
    const unique = new Set<string>();
    for (const voice of voices) unique.add(getMetaValue(voice.country));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [voices]);

  const characters = useMemo(() => {
    const unique = new Set<string>();
    for (const voice of voices) unique.add(getMetaValue(voice.character));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [voices]);

  const isBusy = generation.kind === 'generating' || generation.kind === 'polling' || generation.kind === 'loadingVoices';

  const selectedVoice = selectedVoiceId ? voiceMap.get(selectedVoiceId) ?? null : null;

  const filteredVoices = useMemo(() => {
    const q = normalize(searchQuery);
    const language = languageFilter === 'all' ? null : languageFilter;
    const gender = genderFilter === 'all' ? null : genderFilter;
    const country = countryFilter === 'all' ? null : countryFilter;
    const character = characterFilter === 'all' ? null : characterFilter;

    const filtered: ModelslabVoice[] = [];
    for (const voice of voices) {
      const voiceLanguage = getMetaValue(voice.language);
      const voiceGender = normalize(voice.gender);
      const voiceCountry = getMetaValue(voice.country);
      const voiceCharacter = getMetaValue(voice.character);

      if (language && voiceLanguage !== language) continue;
      if (gender && voiceGender !== gender) continue;
      if (country && voiceCountry !== country) continue;
      if (character && voiceCharacter !== character) continue;
      if (q && !searchIndex.get(voice.voice_id)?.includes(q)) continue;
      filtered.push(voice);
    }

    filtered.sort((a, b) => getVoiceLabel(a).localeCompare(getVoiceLabel(b)));
    return filtered;
  }, [voices, searchQuery, languageFilter, genderFilter, countryFilter, characterFilter, searchIndex]);

  const voicesMatchingFilters = useMemo(() => {
    const language = languageFilter === 'all' ? null : languageFilter;
    const gender = genderFilter === 'all' ? null : genderFilter;
    const country = countryFilter === 'all' ? null : countryFilter;
    const character = characterFilter === 'all' ? null : characterFilter;

    const filtered: ModelslabVoice[] = [];
    for (const voice of voices) {
      const voiceLanguage = getMetaValue(voice.language);
      const voiceGender = normalize(voice.gender);
      const voiceCountry = getMetaValue(voice.country);
      const voiceCharacter = getMetaValue(voice.character);

      if (language && voiceLanguage !== language) continue;
      if (gender && voiceGender !== gender) continue;
      if (country && voiceCountry !== country) continue;
      if (character && voiceCharacter !== character) continue;
      filtered.push(voice);
    }

    filtered.sort((a, b) => getVoiceLabel(a).localeCompare(getVoiceLabel(b)));
    return filtered;
  }, [voices, languageFilter, genderFilter, countryFilter, characterFilter]);

  useEffect(() => {
    if (isBusy) return;
    if (!voicesMatchingFilters.length) return;
    if (selectedVoiceId && voicesMatchingFilters.some((voice) => voice.voice_id === selectedVoiceId)) return;
    setSelectedVoiceId(voicesMatchingFilters[0]?.voice_id ?? null);
  }, [voicesMatchingFilters, isBusy, selectedVoiceId]);

  useEffect(() => {
    setVisibleCount(DEFAULT_PAGE_SIZE);
  }, [searchQuery, languageFilter, genderFilter, countryFilter, characterFilter]);

  useEffect(() => {
    const container = listContainerRef.current;
    const sentinel = loadMoreRef.current;
    if (!container || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setVisibleCount((prev) => {
          if (prev >= filteredVoices.length) return prev;
          return Math.min(filteredVoices.length, prev + DEFAULT_PAGE_SIZE);
        });
      },
      { root: container, rootMargin: '160px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredVoices.length]);

  const visibleVoices = useMemo(() => filteredVoices.slice(0, visibleCount), [filteredVoices, visibleCount]);

  const primaryAudioUrl = useMemo(() => pickPrimaryAudioUrl(coverResponse), [coverResponse]);

  const cancelGeneration = useCallback(() => {
    generateAbortRef.current?.abort();
    generateAbortRef.current = null;
    if (pollTimeoutRef.current) {
      window.clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    setGeneration({ kind: 'ready' });
  }, []);

  const pollForResult = useCallback(async (jobId: string | null, modelsLabId: number, initAudioLabel: string) => {
    let attempt = 0;

    const pollOnce = async () => {
      try {
        // Primary path: poll via /api/jobs/{jobId} (standardized job tracking)
        // Fallback: poll ModelsLab directly if no job was created
        if (jobId) {
          const response = await fetch(`/api/jobs/${jobId}`);
          const data = (await response.json()) as {
            success: boolean;
            job?: { status: string; resultUrl?: string; errorMessage?: string; progress?: number; eta?: number };
            message?: string;
          };

          if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch job status');
          }

          const job = data.job;
          if (!job) throw new Error('Job data missing');

          if (job.status === 'COMPLETED' && job.resultUrl) {
            setCoverResponse({ status: 'success', output: [job.resultUrl] });
            setGeneration({ kind: 'ready' });
            if (selectedVoice) {
              setHistory((prev) => {
                const next: GenerationHistoryItem[] = [
                  {
                    createdAt: Date.now(),
                    voice_id: selectedVoice.voice_id,
                    voice_name: selectedVoice.name,
                    initAudioLabel,
                    audioUrl: job.resultUrl!,
                  },
                  ...prev,
                ];
                return next.slice(0, 8);
              });
            }
            return;
          }

          if (job.status === 'FAILED') {
            throw new Error(job.errorMessage || 'Generation failed');
          }

          // Still processing
          const delayMs = getPollDelayMs(job.eta, attempt);
          attempt += 1;
          setGeneration({ kind: 'polling', id: modelsLabId, jobId, nextPollInMs: delayMs });
          pollTimeoutRef.current = window.setTimeout(pollOnce, delayMs);
        } else {
          // Fallback: poll ModelsLab directly
          const response = await fetch(`/api/modelslab/voice/fetch/${modelsLabId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          const data = (await response.json()) as ModelslabTextToSpeechResponse & { message?: string };

          if (!response.ok || data.status === 'error') {
            throw new Error(data.message || 'Failed to fetch generation result');
          }

          setCoverResponse(data);

          if (data.status === 'success') {
            setGeneration({ kind: 'ready' });
            const url = pickPrimaryAudioUrl(data);
            if (url && selectedVoice) {
              setHistory((prev) => {
                const next: GenerationHistoryItem[] = [
                  {
                    createdAt: Date.now(),
                    voice_id: selectedVoice.voice_id,
                    voice_name: selectedVoice.name,
                    initAudioLabel,
                    audioUrl: url,
                  },
                  ...prev,
                ];
                return next.slice(0, 8);
              });
            }
            return;
          }

          if (data.status === 'processing') {
            const delayMs = getPollDelayMs(data.eta, attempt);
            attempt += 1;
            setGeneration({ kind: 'polling', id: modelsLabId, nextPollInMs: delayMs });
            pollTimeoutRef.current = window.setTimeout(pollOnce, delayMs);
            return;
          }

          throw new Error(data.message || 'Unexpected response status');
        }
      } catch (error) {
        setGeneration({ kind: 'error', message: getErrorMessage(error, 'Polling failed') });
      }
    };

    await pollOnce();
  }, [selectedVoice]);

  const setAudioFromFile = useCallback((file: File) => {
    setUploadError('');

    const isMp3 = file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3');
    if (!isMp3) {
      setUploadError('Please upload an MP3 file.');
      return;
    }

    if (file.size > MAX_INPUT_AUDIO_BYTES) {
      setUploadError(`File is too large (${formatBytes(file.size)}). Max is ${formatBytes(MAX_INPUT_AUDIO_BYTES)}.`);
      return;
    }

    setUploadedFile(file);
  }, []);

  const generateCover = useCallback(async () => {
    if (!selectedVoice) {
      setGeneration({ kind: 'error', message: 'Select a voice to continue.' });
      return;
    }

    let initAudioPayload = '';
    let initAudioFormat: 'url' | 'base64' = 'url';
    let initAudioLabel = '';

    if (inputMode === 'url') {
      const normalized = normalizeUrlInput(initAudioUrl);
      if (!normalized) {
        setGeneration({ kind: 'error', message: 'Paste a URL to your audio (YouTube Music link or direct MP3 URL).' });
        return;
      }
      initAudioPayload = normalized;
      initAudioFormat = 'url';
      initAudioLabel = truncate(normalized, 70);
    } else {
      if (!uploadedFile) {
        setGeneration({ kind: 'error', message: 'Upload an MP3 file to continue.' });
        return;
      }
      initAudioFormat = 'base64';
      initAudioLabel = uploadedFile.name;
    }

    cancelGeneration();
    setGeneration({ kind: 'generating' });
    setCoverResponse(null);

    const controller = new AbortController();
    generateAbortRef.current = controller;

    try {
      if (initAudioFormat === 'base64' && uploadedFile) {
        initAudioPayload = await fileToDataUrl(uploadedFile);
      }

      const response = await fetch('/api/modelslab/voice-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-vp-user-id': getUserId() },
        body: JSON.stringify({
          voice_id: selectedVoice.voice_id,
          init_audio: initAudioPayload,
          init_audio_format: initAudioFormat,
          language: selectedVoice.language,
          temp: tempLinks,
          pitch,
          algorithm,
          rate,
          mix,
          originality,
          radius,
          speed,
          hop_length: algorithm === 'mangio-crepe' ? hopLength : undefined,
          emotion,
          reverb_size: reverbSize,
          wetness,
          dryness,
          damping,
          lead_voice_volume_delta: leadVolDelta !== 0 ? String(leadVolDelta) : undefined,
          backup_voice_volume_delta: backupVolDelta !== 0 ? String(backupVolDelta) : undefined,
          instrument_volume_delta: instrumentVolDelta !== 0 ? String(instrumentVolDelta) : undefined,
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

      const jobId = data.job?.id ?? null;

      setCoverResponse(data);

      if (data.status === 'processing' && typeof data.id === 'number') {
        setGeneration({ kind: 'polling', id: data.id, jobId: jobId ?? undefined });
        await pollForResult(jobId, data.id, initAudioLabel);
        return;
      }

      if (data.status !== 'success') {
        throw new Error(data.message || 'Unexpected response status');
      }

      const url = pickPrimaryAudioUrl(data);
      if (url) {
        setHistory((prev) => {
          const next: GenerationHistoryItem[] = [
            {
              createdAt: Date.now(),
              voice_id: selectedVoice.voice_id,
              voice_name: selectedVoice.name,
              initAudioLabel,
              audioUrl: url,
            },
            ...prev,
          ];
          return next.slice(0, 8);
        });
      }

      setGeneration({ kind: 'ready' });
    } catch (error) {
      if (isAbortError(error)) {
        setGeneration({ kind: 'ready' });
        return;
      }

      setGeneration({ kind: 'error', message: getErrorMessage(error, 'Voice cover request failed') });
    } finally {
      generateAbortRef.current = null;
    }
  }, [selectedVoice, inputMode, initAudioUrl, uploadedFile, tempLinks, pitch, algorithm, rate, mix, originality, radius, speed, hopLength, emotion, reverbSize, wetness, dryness, damping, leadVolDelta, backupVolDelta, instrumentVolDelta, cancelGeneration, pollForResult]);

  const togglePlayPause = useCallback(() => {
    const audio = outputAudioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      void audio.play();
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = outputAudioRef.current;
    if (!audio) return;
    const newTime = Number(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = outputAudioRef.current;
    if (!audio) return;
    const newVolume = Number(e.target.value);
    audio.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = outputAudioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.volume = volume || 1;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const controller = new AbortController();

    async function loadVoices() {
      setGeneration({ kind: 'loadingVoices' });
      try {
        const response = await fetch('/api/modelslab/voices?type=voice_cover', { signal: controller.signal });
        const data = (await response.json()) as { status?: string; voices?: ModelslabVoice[]; message?: string };
        if (!response.ok || data.status === 'error') {
          throw new Error(data.message || 'Failed to load voices');
        }

        const list = Array.isArray(data.voices) ? data.voices : [];
        setVoices(list);
        setSelectedVoiceId((prev) => prev ?? list[0]?.voice_id ?? null);
        setGeneration({ kind: 'ready' });
      } catch (error) {
        if (isAbortError(error)) return;
        setGeneration({ kind: 'error', message: getErrorMessage(error, 'Failed to load voices') });
      }
    }

    void loadVoices();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    return () => {
      cancelGeneration();
    };
  }, [cancelGeneration]);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[380px,1fr]">
      <audio
        ref={outputAudioRef}
        preload="metadata"
        src={primaryAudioUrl ?? undefined}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />

      {/* Voice Library */}
      <section className="flex max-h-[calc(100vh-200px)] flex-col rounded-2xl border border-white/10 bg-[var(--bg-secondary)] shadow-card lg:h-[calc(100vh-160px)] lg:max-h-none">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
          <div>
            <h2 className="text-base font-semibold text-white">Voice Library</h2>
            <p className="mt-0.5 text-xs text-text-muted">{filteredVoices.length} of {voices.length} voices</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent-pink/20 to-purple-500/20">
            <Volume2 className="h-4 w-4 text-accent-pink" />
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3 border-b border-white/10 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search voice, country, character…"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-text-muted focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20"
              aria-label="Search voices"
              disabled={isBusy}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-xs text-text-muted">
              <span>Language</span>
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20"
                disabled={isBusy}
              >
                <option value="all">All</option>
                {languages.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-xs text-text-muted">
              <span>Country</span>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20"
                disabled={isBusy}
              >
                <option value="all">All</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country === 'unknown' ? 'Unknown' : country}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-xs text-text-muted">
              <span>Character</span>
              <select
                value={characterFilter}
                onChange={(e) => setCharacterFilter(e.target.value)}
                className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20"
                disabled={isBusy}
              >
                <option value="all">All</option>
                {characters.map((character) => (
                  <option key={character} value={character}>
                    {character === 'unknown' ? 'Unknown' : character}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-1 text-xs text-text-muted">
              <span>Gender</span>
              <div className="flex gap-2">
                {(['all', 'female', 'male'] as const).map((value) => {
                  const selected = genderFilter === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setGenderFilter(value)}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium transition',
                        selected
                          ? 'border-accent-pink/50 bg-accent-pink/15 text-white'
                          : 'border-white/10 bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white'
                      )}
                      disabled={isBusy}
                      title={value === 'all' ? 'All genders' : value === 'female' ? 'Female' : 'Male'}
                    >
                      {value === 'all' ? (
                        <Users className="h-5 w-5" />
                      ) : value === 'female' ? (
                        <FemaleAvatarIcon className="h-5 w-5" />
                      ) : (
                        <MaleAvatarIcon className="h-5 w-5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div ref={listContainerRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
          <div className="grid gap-2">
            {generation.kind === 'loadingVoices' && (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-accent-pink" />
                <p className="text-sm text-text-secondary">Loading voices…</p>
              </div>
            )}

            {generation.kind === 'error' && voices.length === 0 && (
              <div className="rounded-xl border border-accent-pink/30 bg-accent-pink/10 p-4">
                <div className="flex items-center gap-2 text-white">
                  <AlertCircle className="h-4 w-4 text-accent-pink" />
                  <span className="font-medium">Failed to load voices</span>
                </div>
                <p className="mt-2 text-xs text-text-muted">{generation.message}</p>
              </div>
            )}

            {generation.kind !== 'loadingVoices' && filteredVoices.length === 0 && voices.length > 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <Search className="h-8 w-8 text-text-muted" />
                <p className="text-sm text-text-secondary">No voices match your filters</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setLanguageFilter('all');
                    setGenderFilter('all');
                    setCountryFilter('all');
                    setCharacterFilter('all');
                  }}
                  className="mt-2 text-sm text-accent-pink hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}

            {visibleVoices.map((voice) => {
              const isSelected = selectedVoiceId === voice.voice_id;
              const voiceLanguage = getMetaValue(voice.language);
              const voiceCountry = getMetaValue(voice.country);
              const voiceCharacter = getMetaValue(voice.character);
              const voiceName = getVoiceLabel(voice);
              return (
                <button
                  key={voice.voice_id}
                  type="button"
                  className={cn(
                    'group relative flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                    isSelected
                      ? 'border-accent-pink/50 bg-gradient-to-r from-accent-pink/15 to-purple-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                  )}
                  onClick={() => !isBusy && setSelectedVoiceId(voice.voice_id)}
                  disabled={isBusy}
                >
                  {isSelected && (
                    <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-pink shadow-lg">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}

                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/20">
                    <Image src={voice.thumbnail} alt="" fill sizes="48px" className="object-cover" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{voiceName}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-muted">
                      <span className="truncate">{voiceLanguage === 'unknown' ? 'Unknown' : voiceLanguage}</span>
                      <span>•</span>
                      <span className="capitalize">{normalize(voice.gender) || 'unknown'}</span>
                      {voiceCountry !== 'unknown' ? (
                        <>
                          <span>•</span>
                          <span className="truncate">{voiceCountry}</span>
                        </>
                      ) : null}
                      {voiceCharacter !== 'unknown' ? (
                        <>
                          <span>•</span>
                          <span className="truncate">{voiceCharacter}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}

            <div ref={loadMoreRef} />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="flex flex-col gap-5">
        {selectedVoice ? (
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-accent-pink/10 via-purple-500/10 to-transparent p-4 shadow-card">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-accent-pink/30 bg-black/20 shadow-lg">
              <Image src={selectedVoice.thumbnail} alt="" fill sizes="64px" className="object-cover" priority />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium uppercase tracking-wider text-accent-pink">Selected Voice</div>
              <div className="mt-1 truncate text-lg font-bold text-white">{getVoiceLabel(selectedVoice)}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-muted">
                <span>{getMetaValue(selectedVoice.language) === 'unknown' ? 'Unknown' : getMetaValue(selectedVoice.language)}</span>
                <span>•</span>
                <span className="capitalize">{normalize(selectedVoice.gender) || 'unknown'}</span>
                {getMetaValue(selectedVoice.country) !== 'unknown' ? (
                  <>
                    <span>•</span>
                    <span className="truncate">{getMetaValue(selectedVoice.country)}</span>
                  </>
                ) : null}
                {getMetaValue(selectedVoice.character) !== 'unknown' ? (
                  <>
                    <span>•</span>
                    <span className="truncate">{getMetaValue(selectedVoice.character)}</span>
                  </>
                ) : null}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-muted">
              <div className="font-medium text-white/80">Model ID</div>
              <div className="mt-0.5 font-mono text-[11px]">{selectedVoice.voice_id}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-2xl border border-dashed border-white/20 bg-white/5 p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-white/5">
              <Volume2 className="h-8 w-8 text-text-muted" />
            </div>
            <div>
              <div className="text-base font-semibold text-white">No voice selected</div>
              <div className="mt-1 text-sm text-text-muted">Choose a voice from the library to get started</div>
            </div>
          </div>
        )}

        {/* Input Card */}
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">Input song</div>
              <div className="mt-1 text-xs text-text-muted">Use a YouTube Music link or upload an MP3.</div>
            </div>
            <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setInputMode('url')}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-semibold transition',
                  inputMode === 'url' ? 'bg-white/10 text-white' : 'text-text-secondary hover:text-white'
                )}
                disabled={isBusy}
              >
                URL
              </button>
              <button
                type="button"
                onClick={() => setInputMode('upload')}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-semibold transition',
                  inputMode === 'upload' ? 'bg-white/10 text-white' : 'text-text-secondary hover:text-white'
                )}
                disabled={isBusy}
              >
                MP3
              </button>
            </div>
          </div>

          {inputMode === 'url' ? (
            <div className="mt-4">
              <input
                value={initAudioUrl}
                onChange={(e) => setInitAudioUrl(e.target.value)}
                placeholder="https://music.youtube.com/... or https://example.com/song.mp3"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-text-muted focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20"
                disabled={isBusy}
              />
              <div className="mt-2 text-xs text-text-muted">
                Tip: if your URL requires authentication or isn&apos;t publicly accessible, we may not be able to fetch it.
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
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
                  'relative flex min-h-[10rem] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-white/5 px-6 py-8 text-center transition-colors',
                  uploadError ? 'border-accent-pink/60' : 'border-white/15 hover:border-white/25'
                )}
              >
                <input
                  id="voice-cover-audio-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="audio/mpeg,.mp3"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setAudioFromFile(file);
                    e.currentTarget.value = '';
                  }}
                />

                {uploadedFile ? (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
                      <Volume2 className="h-6 w-6 text-text-secondary" aria-hidden="true" />
                    </div>
                    <div className="text-base font-semibold text-white/90">{uploadedFile.name}</div>
                    <div className="text-sm text-text-muted">{formatBytes(uploadedFile.size)}</div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedFile(null);
                        setUploadError('');
                      }}
                      className="mt-2 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-text-secondary transition hover:bg-white/10 hover:text-white"
                      disabled={isBusy}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
                      <Upload className="h-6 w-6 text-text-secondary" aria-hidden="true" />
                    </div>
                    <div className="text-base font-semibold text-white/90">Drag &amp; drop MP3 here, or click to select</div>
                    <div className="text-sm text-text-muted">Max size: {formatBytes(MAX_INPUT_AUDIO_BYTES)}</div>
                  </>
                )}
              </div>

              {uploadError ? <div className="text-sm text-accent-pink">{uploadError}</div> : null}
            </div>
          )}
        </div>

        {/* Options */}
        <details className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5 shadow-card">
          <summary className="cursor-pointer select-none text-sm font-semibold text-white">Advanced settings</summary>

          {/* Voice Processing */}
          <div className="mt-4 space-y-1">
            <div className="text-xs font-medium uppercase tracking-wider text-accent-pink">Voice Processing</div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-1 text-xs text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  Pitch
                  <span className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 cursor-help text-text-muted hover:text-white transition" />
                    <span className="pointer-events-none absolute left-1/2 bottom-full mb-2 -translate-x-1/2 rounded-lg bg-black/90 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50 max-w-[260px] whitespace-normal text-center">
                      Pitch transformation between voices. Use m2f/f2m when singer&apos;s gender differs from voice.
                    </span>
                  </span>
                </span>
                <select
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20"
                  disabled={isBusy}
                >
                  <option value="none">none</option>
                  <option value="m2f">m2f (Male → Female)</option>
                  <option value="f2m">f2m (Female → Male)</option>
                </select>
              </label>

              <label className="space-y-1 text-xs text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  Algorithm
                  <span className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 cursor-help text-text-muted hover:text-white transition" />
                    <span className="pointer-events-none absolute left-1/2 bottom-full mb-2 -translate-x-1/2 rounded-lg bg-black/90 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50 max-w-[260px] whitespace-normal text-center">
                      rmvpe: Best for clarity &amp; general vocals. mangio-crepe: Smoother, better for soft/whispery vocals.
                    </span>
                  </span>
                </span>
                <select
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value)}
                  className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20"
                  disabled={isBusy}
                >
                  <option value="rmvpe">rmvpe</option>
                  <option value="mangio-crepe">mangio-crepe</option>
                </select>
              </label>

              <label className="space-y-1 text-xs text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  Emotion
                  <span className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 cursor-help text-text-muted hover:text-white transition" />
                    <span className="pointer-events-none absolute left-1/2 bottom-full mb-2 -translate-x-1/2 rounded-lg bg-black/90 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50 max-w-[260px] whitespace-normal text-center">
                      Emotional coloring applied to the cloned voice. Affects prosody and tone.
                    </span>
                  </span>
                </span>
                <select
                  value={emotion}
                  onChange={(e) => setEmotion(e.target.value)}
                  className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20"
                  disabled={isBusy}
                >
                  <option value="neutral">neutral</option>
                  <option value="happy">happy</option>
                  <option value="sad">sad</option>
                  <option value="angry">angry</option>
                  <option value="dull">dull</option>
                </select>
              </label>
            </div>
          </div>

          {/* Voice Resemblance */}
          <div className="mt-5 space-y-1">
            <div className="text-xs font-medium uppercase tracking-wider text-accent-pink">Voice Resemblance</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-xs text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  Rate <span className="text-text-muted/60">(voice similarity)</span>
                  <span className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 cursor-help text-text-muted hover:text-white transition" />
                    <span className="pointer-events-none absolute left-1/2 bottom-full mb-2 -translate-x-1/2 rounded-lg bg-black/90 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50 max-w-[260px] whitespace-normal text-center">
                      How closely the output resembles the voice model. Higher = closer to model. Best: 0.6–0.8
                    </span>
                  </span>
                </span>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <input type="range" min={0} max={1} step={0.05} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent-pink [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-pink [&::-webkit-slider-thumb]:shadow-lg" disabled={isBusy} />
                  <span className="w-12 rounded-lg bg-white/10 px-2 py-1 text-center text-xs font-semibold text-white">{rate.toFixed(2)}</span>
                </div>
              </label>

              <label className="space-y-1 text-xs text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  Originality <span className="text-text-muted/60">(consonant preservation)</span>
                  <span className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 cursor-help text-text-muted hover:text-white transition" />
                    <span className="pointer-events-none absolute left-1/2 bottom-full mb-2 -translate-x-1/2 rounded-lg bg-black/90 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50 max-w-[260px] whitespace-normal text-center">
                      Controls similarity to original vocals&apos; voiceless consonants. Higher = more original character preserved.
                    </span>
                  </span>
                </span>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <input type="range" min={0} max={1} step={0.01} value={originality} onChange={(e) => setOriginality(Number(e.target.value))} className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent-pink [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-pink [&::-webkit-slider-thumb]:shadow-lg" disabled={isBusy} />
                  <span className="w-12 rounded-lg bg-white/10 px-2 py-1 text-center text-xs font-semibold text-white">{originality.toFixed(2)}</span>
                </div>
              </label>

              <label className="space-y-1 text-xs text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  Mix <span className="text-text-muted/60">(loudness match)</span>
                  <span className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 cursor-help text-text-muted hover:text-white transition" />
                    <span className="pointer-events-none absolute left-1/2 bottom-full mb-2 -translate-x-1/2 rounded-lg bg-black/90 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50 max-w-[260px] whitespace-normal text-center">
                      Controls loudness similarity. 0 = keep original dynamics. Higher = more fixed loudness. Best: 0
                    </span>
                  </span>
                </span>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <input type="range" min={0} max={1} step={0.05} value={mix} onChange={(e) => setMix(Number(e.target.value))} className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent-pink [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-pink [&::-webkit-slider-thumb]:shadow-lg" disabled={isBusy} />
                  <span className="w-12 rounded-lg bg-white/10 px-2 py-1 text-center text-xs font-semibold text-white">{mix.toFixed(2)}</span>
                </div>
              </label>

              <label className="space-y-1 text-xs text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  Radius <span className="text-text-muted/60">(artifact filtering)</span>
                  <span className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 cursor-help text-text-muted hover:text-white transition" />
                    <span className="pointer-events-none absolute left-1/2 bottom-full mb-2 -translate-x-1/2 rounded-lg bg-black/90 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50 max-w-[260px] whitespace-normal text-center">
                      Median filtering length to reduce artifacts. Higher = smoother but may dull detail. Best: 3
                    </span>
                  </span>
                </span>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <input type="range" min={0} max={3} step={1} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent-pink [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-pink [&::-webkit-slider-thumb]:shadow-lg" disabled={isBusy} />
                  <span className="w-12 rounded-lg bg-white/10 px-2 py-1 text-center text-xs font-semibold text-white">{radius}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Speed & Hop Length */}
          <div className="mt-5 space-y-1">
            <div className="text-xs font-medium uppercase tracking-wider text-accent-pink">Playback</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-xs text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  Speed
                  <span className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 cursor-help text-text-muted hover:text-white transition" />
                    <span className="pointer-events-none absolute left-1/2 bottom-full mb-2 -translate-x-1/2 rounded-lg bg-black/90 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50 max-w-[260px] whitespace-normal text-center">
                      Playback speed of the output. 1.0 = original speed. Range: 0.5–2.0
                    </span>
                  </span>
                </span>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <input type="range" min={0.5} max={2} step={0.1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent-pink [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-pink [&::-webkit-slider-thumb]:shadow-lg" disabled={isBusy} />
                  <span className="w-12 rounded-lg bg-white/10 px-2 py-1 text-center text-xs font-semibold text-white">{speed.toFixed(1)}x</span>
                </div>
              </label>

              {algorithm === 'mangio-crepe' && (
                <label className="space-y-1 text-xs text-text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    Hop Length
                    <span className="group relative">
                      <HelpCircle className="h-3.5 w-3.5 cursor-help text-text-muted hover:text-white transition" />
                      <span className="pointer-events-none absolute left-1/2 bottom-full mb-2 -translate-x-1/2 rounded-lg bg-black/90 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50 max-w-[260px] whitespace-normal text-center">
                        Pitch analysis frequency for mangio-crepe. Lower = more precise but slower. Best: 128
                      </span>
                    </span>
                  </span>
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                    <input type="range" min={64} max={192} step={32} value={hopLength} onChange={(e) => setHopLength(Number(e.target.value))} className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent-pink [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-pink [&::-webkit-slider-thumb]:shadow-lg" disabled={isBusy} />
                    <span className="w-12 rounded-lg bg-white/10 px-2 py-1 text-center text-xs font-semibold text-white">{hopLength}</span>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Volume Mixing */}
          <div className="mt-5 space-y-1">
            <div className="text-xs font-medium uppercase tracking-wider text-accent-pink">Volume Mixing</div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-1 text-xs text-text-muted">
                <span>Lead Vocals</span>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <input type="range" min={-5} max={5} step={1} value={leadVolDelta} onChange={(e) => setLeadVolDelta(Number(e.target.value))} className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent-pink [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-pink [&::-webkit-slider-thumb]:shadow-lg" disabled={isBusy} />
                  <span className="w-12 rounded-lg bg-white/10 px-2 py-1 text-center text-xs font-semibold text-white">{leadVolDelta > 0 ? '+' : ''}{leadVolDelta}</span>
                </div>
              </label>
              <label className="space-y-1 text-xs text-text-muted">
                <span>Backup Vocals</span>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <input type="range" min={-5} max={5} step={1} value={backupVolDelta} onChange={(e) => setBackupVolDelta(Number(e.target.value))} className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent-pink [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-pink [&::-webkit-slider-thumb]:shadow-lg" disabled={isBusy} />
                  <span className="w-12 rounded-lg bg-white/10 px-2 py-1 text-center text-xs font-semibold text-white">{backupVolDelta > 0 ? '+' : ''}{backupVolDelta}</span>
                </div>
              </label>
              <label className="space-y-1 text-xs text-text-muted">
                <span>Instruments</span>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <input type="range" min={-5} max={5} step={1} value={instrumentVolDelta} onChange={(e) => setInstrumentVolDelta(Number(e.target.value))} className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent-pink [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-pink [&::-webkit-slider-thumb]:shadow-lg" disabled={isBusy} />
                  <span className="w-12 rounded-lg bg-white/10 px-2 py-1 text-center text-xs font-semibold text-white">{instrumentVolDelta > 0 ? '+' : ''}{instrumentVolDelta}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Reverb */}
          <div className="mt-5 space-y-1">
            <div className="text-xs font-medium uppercase tracking-wider text-accent-pink">Reverb</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-xs text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  Room Size
                  <span className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 cursor-help text-text-muted hover:text-white transition" />
                    <span className="pointer-events-none absolute left-1/2 bottom-full mb-2 -translate-x-1/2 rounded-lg bg-black/90 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50 max-w-[260px] whitespace-normal text-center">
                      Simulated room size. Small = intimate, close-miked. Large = spacious, cathedral-like.
                    </span>
                  </span>
                </span>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <input type="range" min={0} max={1} step={0.05} value={reverbSize} onChange={(e) => setReverbSize(Number(e.target.value))} className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent-pink [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-pink [&::-webkit-slider-thumb]:shadow-lg" disabled={isBusy} />
                  <span className="w-12 rounded-lg bg-white/10 px-2 py-1 text-center text-xs font-semibold text-white">{reverbSize.toFixed(2)}</span>
                </div>
              </label>
              <label className="space-y-1 text-xs text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  Wetness <span className="text-text-muted/60">(generated vocals reverb)</span>
                </span>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <input type="range" min={0} max={1} step={0.05} value={wetness} onChange={(e) => setWetness(Number(e.target.value))} className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent-pink [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-pink [&::-webkit-slider-thumb]:shadow-lg" disabled={isBusy} />
                  <span className="w-12 rounded-lg bg-white/10 px-2 py-1 text-center text-xs font-semibold text-white">{wetness.toFixed(2)}</span>
                </div>
              </label>
              <label className="space-y-1 text-xs text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  Dryness <span className="text-text-muted/60">(original vocals reverb)</span>
                </span>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <input type="range" min={0} max={1} step={0.05} value={dryness} onChange={(e) => setDryness(Number(e.target.value))} className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent-pink [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-pink [&::-webkit-slider-thumb]:shadow-lg" disabled={isBusy} />
                  <span className="w-12 rounded-lg bg-white/10 px-2 py-1 text-center text-xs font-semibold text-white">{dryness.toFixed(2)}</span>
                </div>
              </label>
              <label className="space-y-1 text-xs text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  Damping <span className="text-text-muted/60">(high-freq absorption)</span>
                </span>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <input type="range" min={0} max={1} step={0.05} value={damping} onChange={(e) => setDamping(Number(e.target.value))} className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent-pink [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-pink [&::-webkit-slider-thumb]:shadow-lg" disabled={isBusy} />
                  <span className="w-12 rounded-lg bg-white/10 px-2 py-1 text-center text-xs font-semibold text-white">{damping.toFixed(2)}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Temp links toggle */}
          <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-white">Temporary links</div>
                <div className="mt-0.5 text-xs text-text-muted">Output URLs expire after 24 hours</div>
              </div>
              <button
                type="button"
                onClick={() => !isBusy && setTempLinks((prev) => !prev)}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  tempLinks ? 'bg-accent-pink' : 'bg-white/20',
                  isBusy && 'opacity-60'
                )}
                aria-pressed={tempLinks}
                disabled={isBusy}
              >
                <div
                  className={cn(
                    'absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform',
                    tempLinks ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
          </div>
        </details>

        {/* Generate */}
        <button
          type="button"
          onClick={() => void generateCover()}
          className={cn(
            'group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl px-6 py-4 text-base font-bold transition-all',
            isBusy || !selectedVoice
              ? 'cursor-not-allowed bg-white/10 text-text-muted'
              : 'bg-gradient-to-r from-accent-pink via-purple-500 to-accent-pink bg-[length:200%_100%] text-white shadow-lg shadow-accent-pink/25 hover:bg-[100%_0] hover:shadow-xl hover:shadow-accent-pink/30'
          )}
          disabled={isBusy || !selectedVoice}
        >
          {generation.kind === 'generating' || generation.kind === 'polling' ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{generation.kind === 'polling' ? 'Processing…' : 'Generating…'}</span>
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              <span>Generate Voice Cover</span>
            </>
          )}
        </button>

        {(generation.kind === 'generating' || generation.kind === 'polling') && (
          <button
            type="button"
            onClick={cancelGeneration}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-text-secondary transition hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
        )}

        {generation.kind === 'polling' && coverResponse?.eta && (
          <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
            <Clock className="h-4 w-4" />
            <span>Estimated time: ~{coverResponse.eta}s</span>
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

        {/* Output */}
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn('h-2 w-2 rounded-full', primaryAudioUrl ? 'bg-green-400' : 'bg-white/30')} />
              <span className="text-sm font-semibold text-white">Output</span>
            </div>
            {primaryAudioUrl && (
              <a
                href={primaryAudioUrl}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-secondary transition hover:bg-white/10 hover:text-white"
                download
                target="_blank"
                rel="noreferrer"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            )}
          </div>

          {primaryAudioUrl ? (
            <div className="mt-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-pink text-white shadow-lg transition hover:bg-accent-pink/80"
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                  </button>

                  <div className="flex-1">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      step={0.1}
                      value={currentTime}
                      onChange={handleSeek}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-accent-pink [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                    />
                    <div className="mt-1 flex justify-between text-xs text-text-muted">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button type="button" onClick={toggleMute} className="text-text-secondary hover:text-white">
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/20 accent-white [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 py-12">
              <Volume2 className="h-10 w-10 text-text-muted" />
              <p className="mt-3 text-sm text-text-secondary">
                {generation.kind === 'polling' || generation.kind === 'generating'
                  ? 'Generating your cover…'
                  : 'Your generated audio will appear here'}
              </p>
            </div>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-text-muted" />
                <span className="text-sm font-semibold text-white">Recent Generations</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-text-muted">{history.length}</span>
              </div>
              <button
                type="button"
                onClick={() => setHistory([])}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-text-muted transition hover:bg-white/10 hover:text-white"
                disabled={isBusy}
              >
                <Trash2 className="h-3 w-3" />
                Clear all
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              {history.map((item) => {
                const isCurrentAudio = primaryAudioUrl === item.audioUrl;
                return (
                  <div
                    key={item.createdAt}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3 transition',
                      isCurrentAudio ? 'border-accent-pink/30 bg-accent-pink/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setCoverResponse((current) =>
                          current ? { ...current, output: [item.audioUrl] } : { status: 'success', output: [item.audioUrl] }
                        );
                        setTimeout(() => {
                          const audio = outputAudioRef.current;
                          if (audio) void audio.play();
                        }, 100);
                      }}
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg transition',
                        isCurrentAudio ? 'bg-accent-pink text-white' : 'bg-white/10 text-text-secondary hover:bg-white/20 hover:text-white'
                      )}
                      disabled={isBusy}
                    >
                      <Play className="h-4 w-4 ml-0.5" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-white">{item.voice_name}</span>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-text-muted">{truncate(item.initAudioLabel, 70)}</div>
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
      </section>
    </div>
  );
}
