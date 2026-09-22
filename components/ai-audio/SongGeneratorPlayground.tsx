'use client';

import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import {
  AlertCircle,
  Clock,
  Download,
  FileAudio,
  Loader2,
  Mic,
  Music2,
  Pause,
  PenLine,
  Play,
  Shuffle,
  Sparkles,
  Timer,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModelslabTextToSpeechResponse } from '@/lib/modelslab';
import AudioPlayerCompact from '@/components/ai-audio/AudioPlayerCompact';
import { getUserId } from '@/hooks/useApi';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MAX_INIT_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_LYRICS_LENGTH = 5000;
const MAX_PROMPT_LENGTH = 500;
const MAX_CAPTION_LENGTH = 500;
const MIN_DURATION = 30;
const MAX_DURATION = 180;
const DEFAULT_DURATION = 180;

const GENRE_PRESETS = [
  { id: 'pop', label: 'Pop', caption: 'female vocal, pop, catchy melody, synth, upbeat rhythm, modern production' },
  { id: 'rock', label: 'Rock', caption: 'male vocal, rock, electric guitar, drums, bass, powerful vocals, stadium energy' },
  { id: 'hiphop', label: 'Hip-Hop', caption: 'male vocal, hip-hop, trap beats, 808 bass, hi-hats, rhythmic flow' },
  { id: 'rnb', label: 'R&B', caption: 'female vocal, R&B, smooth, soulful, neo-soul, warm bass, silky harmonies' },
  { id: 'edm', label: 'EDM', caption: 'female vocal, EDM, electro, synth drops, bass, build-up, euphoric' },
  { id: 'folk', label: 'Folk', caption: 'male vocal, folk, acoustic guitar, harmonium, gentle, storytelling, warm' },
  { id: 'jazz', label: 'Jazz', caption: 'female vocal, jazz, piano, saxophone, double bass, smoky, intimate' },
  { id: 'metal', label: 'Metal', caption: 'male vocal, folk metal, heavy guitar, violin, drums, epic, powerful' },
] as const;

const DEFAULT_PROMPTS = [
  'A dreamy love song about meeting someone under the stars on a warm summer night',
  'An empowering anthem about overcoming challenges and rising to the top',
  'A melancholy ballad about a long-distance relationship and the ache of missing someone',
  'An uplifting pop song about chasing your dreams and never giving up',
  'A nostalgic song about childhood memories and the innocence of youth',
  'A high-energy party track about dancing all night with friends',
  'A soulful song about self-discovery and learning to love yourself',
  'A heartfelt song about gratitude for the people who stand by you',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type InputMode = 'url' | 'upload';

type GenerationState =
  | { kind: 'ready' }
  | { kind: 'generating' }
  | { kind: 'polling'; id: number; jobId?: string; nextPollInMs?: number }
  | { kind: 'error'; message: string };

type HistoryItem = {
  id: number;
  createdAt: number;
  label: string;
  lyricsMode: 'auto' | 'manual';
  audioUrl: string;
  caption?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

function pickPrimaryAudioUrl(response: ModelslabTextToSpeechResponse | null): string | null {
  if (!response) return null;
  const candidates: unknown = response.output ?? response.proxy_links ?? response.links ?? response.future_links;
  if (typeof candidates === 'string' && candidates.length > 0) return candidates;
  if (!Array.isArray(candidates)) return null;
  return candidates.find((v) => typeof v === 'string' && v.length > 0) ?? null;
}

function getPollDelayMs(eta: number | undefined, attempt: number): number {
  if (typeof eta === 'number' && Number.isFinite(eta) && eta > 0) {
    return Math.min(5000, Math.max(1000, Math.round(eta * 250)));
  }
  return Math.min(8000, 1000 + attempt * 500);
}

function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: string }).name === 'AbortError';
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const msg = (error as { message?: string }).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return fallback;
}

function truncate(value: string, max = 60): string {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return secs === 0 ? `${mins}m` : `${mins}m ${secs}s`;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────────────────────

const Toggle = memo(function Toggle({
  enabled,
  onToggle,
  disabled,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'relative h-6 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent-pink/40',
        enabled ? 'bg-accent-pink' : 'bg-white/20',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
          enabled ? 'translate-x-6' : 'translate-x-0'
        )}
      />
    </button>
  );
});

const SectionCard = memo(function SectionCard({
  title,
  subtitle,
  icon: Icon,
  children,
  headerRight,
}: {
  title: string;
  subtitle?: string;
  icon?: typeof Music2;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-pink/20 to-purple-500/20">
              <Icon className="h-4 w-4 text-accent-pink" />
            </div>
          )}
          <div>
            <div className="text-sm font-semibold text-white">{title}</div>
            {subtitle && <div className="mt-0.5 text-xs text-text-muted">{subtitle}</div>}
          </div>
        </div>
        {headerRight}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function SongGeneratorPlayground() {
  // Reference Audio State
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [initAudioUrl, setInitAudioUrl] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');

  // Lyrics State
  const [lyricsGeneration, setLyricsGeneration] = useState(true);
  const [lyrics, setLyrics] = useState('');
  const [prompt, setPrompt] = useState('');

  // Caption (style) State
  const [caption, setCaption] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Duration State
  const [duration, setDuration] = useState(DEFAULT_DURATION);

  // Generation State
  const [generation, setGeneration] = useState<GenerationState>({ kind: 'ready' });
  const [response, setResponse] = useState<ModelslabTextToSpeechResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Audio Player State
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [volume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pollTimeoutRef = useRef<number | null>(null);
  const historyIdRef = useRef(0);

  // Derived
  const primaryAudioUrl = useMemo(() => pickPrimaryAudioUrl(response), [response]);
  const isBusy = generation.kind === 'generating' || generation.kind === 'polling';
  const hasAudio = Boolean(primaryAudioUrl);
  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  // Reset audio player when URL changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioDuration(0);
  }, [primaryAudioUrl]);

  // ─────────────────────────────────────────────────────────────────────────
  // File Upload Handling
  // ─────────────────────────────────────────────────────────────────────────

  const clearUploadedFile = useCallback(() => {
    if (uploadedFileUrl) URL.revokeObjectURL(uploadedFileUrl);
    setUploadedFile(null);
    setUploadedFileUrl(null);
    setUploadError('');
  }, [uploadedFileUrl]);

  const handleFileSelect = useCallback(
    (file: File) => {
      clearUploadedFile();

      const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|flac)$/i.test(file.name);
      if (!isAudio) {
        setUploadError('Please upload an audio file (MP3, WAV, M4A, OGG, FLAC)');
        return;
      }

      if (file.size > MAX_INIT_AUDIO_BYTES) {
        setUploadError(`File too large (${formatBytes(file.size)}). Max: ${formatBytes(MAX_INIT_AUDIO_BYTES)}`);
        return;
      }

      setUploadedFile(file);
      setUploadedFileUrl(URL.createObjectURL(file));
    },
    [clearUploadedFile]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Genre preset handler
  // ─────────────────────────────────────────────────────────────────────────

  const handlePresetClick = useCallback(
    (presetId: string, presetCaption: string) => {
      if (isBusy) return;
      if (activePreset === presetId) {
        setActivePreset(null);
        setCaption('');
      } else {
        setActivePreset(presetId);
        setCaption(presetCaption);
      }
    },
    [activePreset, isBusy]
  );

  const handleRandomPrompt = useCallback(() => {
    if (isBusy) return;
    const randomIndex = Math.floor(Math.random() * DEFAULT_PROMPTS.length);
    setPrompt(DEFAULT_PROMPTS[randomIndex]);
  }, [isBusy]);

  // ─────────────────────────────────────────────────────────────────────────
  // Audio player controls
  // ─────────────────────────────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !hasAudio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      void audio.play();
    }
  }, [hasAudio, isPlaying]);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      const bar = progressRef.current;
      if (!audio || !bar || !hasAudio || audioDuration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * audioDuration;
      audio.currentTime = Math.max(0, Math.min(audioDuration, newTime));
    },
    [hasAudio, audioDuration]
  );

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  // ─────────────────────────────────────────────────────────────────────────
  // Generation Logic
  // ─────────────────────────────────────────────────────────────────────────

  const cancelGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (pollTimeoutRef.current) {
      window.clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    setGeneration({ kind: 'ready' });
  }, []);

  const pollForResult = useCallback(
    async (jobId: string | null, modelsLabId: number, historyData: Omit<HistoryItem, 'audioUrl'>) => {
      let attempt = 0;

      const pollOnce = async () => {
        try {
          if (jobId) {
            const res = await fetch(`/api/jobs/${jobId}`);
            const data = (await res.json()) as {
              success: boolean;
              job?: { status: string; resultUrl?: string; errorMessage?: string; progress?: number; eta?: number };
              message?: string;
            };

            if (!res.ok) throw new Error(data.message || 'Failed to fetch job status');

            const job = data.job;
            if (!job) throw new Error('Job data missing');

            if (job.status === 'COMPLETED' && job.resultUrl) {
              setResponse({ status: 'success', output: [job.resultUrl] });
              setGeneration({ kind: 'ready' });
              setHistory((prev) => [{ ...historyData, audioUrl: job.resultUrl! }, ...prev].slice(0, 10));
              return;
            }

            if (job.status === 'FAILED') {
              throw new Error(job.errorMessage || 'Generation failed');
            }

            const delayMs = getPollDelayMs(job.eta, attempt);
            attempt += 1;
            setGeneration({ kind: 'polling', id: modelsLabId, jobId, nextPollInMs: delayMs });
            pollTimeoutRef.current = window.setTimeout(pollOnce, delayMs);
          } else {
            const res = await fetch(`/api/modelslab/voice/fetch/${modelsLabId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            const data = (await res.json()) as ModelslabTextToSpeechResponse & { message?: string };

            if (!res.ok || data.status === 'error') {
              throw new Error(data.message || 'Failed to fetch result');
            }

            setResponse(data);

            if (data.status === 'success') {
              setGeneration({ kind: 'ready' });
              const url = pickPrimaryAudioUrl(data);
              if (url) {
                setHistory((prev) => [{ ...historyData, audioUrl: url }, ...prev].slice(0, 10));
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

            throw new Error(data.message || 'Unexpected status');
          }
        } catch (error) {
          setGeneration({ kind: 'error', message: getErrorMessage(error, 'Polling failed') });
        }
      };

      await pollOnce();
    },
    []
  );

  const generate = useCallback(async () => {
    // Validate lyrics / prompt
    if (lyricsGeneration) {
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt) {
        setGeneration({ kind: 'error', message: 'Please enter a prompt to describe what the song should be about' });
        return;
      }
      if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
        setGeneration({ kind: 'error', message: `Prompt too long (max ${MAX_PROMPT_LENGTH} characters)` });
        return;
      }
    } else {
      const trimmedLyrics = lyrics.trim();
      if (!trimmedLyrics) {
        setGeneration({ kind: 'error', message: 'Please enter your lyrics in LRC format or enable AI lyrics generation' });
        return;
      }
      if (trimmedLyrics.length > MAX_LYRICS_LENGTH) {
        setGeneration({ kind: 'error', message: `Lyrics too long (max ${MAX_LYRICS_LENGTH} characters)` });
        return;
      }
    }

    // Build reference audio payload (optional)
    let audioPayload: string | undefined;
    let audioFormat: 'url' | 'base64' | undefined;

    if (inputMode === 'url') {
      const normalized = normalizeUrl(initAudioUrl);
      if (normalized) {
        audioPayload = normalized;
        audioFormat = 'url';
      }
    } else if (uploadedFile) {
      audioFormat = 'base64';
    }

    cancelGeneration();
    setGeneration({ kind: 'generating' });
    setResponse(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Convert file to base64 if needed
      if (audioFormat === 'base64' && uploadedFile) {
        audioPayload = await fileToDataUrl(uploadedFile);
      }

      historyIdRef.current += 1;
      const historyData: Omit<HistoryItem, 'audioUrl'> = {
        id: historyIdRef.current,
        createdAt: Date.now(),
        label: truncate(lyricsGeneration ? prompt.trim() : 'Custom Lyrics', 40),
        lyricsMode: lyricsGeneration ? 'auto' : 'manual',
        caption: caption.trim() || undefined,
      };

      const bodyObj: Record<string, unknown> = {
        prompt: lyricsGeneration ? prompt.trim() : undefined,
        lyrics_generation: lyricsGeneration,
        lyrics: lyricsGeneration ? undefined : lyrics.trim(),
        duration,
      };

      // Only include caption if non-empty
      const trimmedCaption = caption.trim();
      if (trimmedCaption) {
        bodyObj.caption = trimmedCaption;
      }

      // Include reference audio if provided
      if (audioPayload && audioFormat) {
        bodyObj.init_audio = audioPayload;
        bodyObj.init_audio_format = audioFormat;
      }

      const res = await fetch('/api/modelslab/song-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-vp-user-id': getUserId() },
        body: JSON.stringify(bodyObj),
        signal: controller.signal,
      });

      const data = (await res.json()) as ModelslabTextToSpeechResponse & {
        message?: string;
        job?: { id: string; trackId: number; webhookEnabled: boolean } | null;
      };

      if (!res.ok || data.status === 'error') {
        throw new Error(data.message || 'Generation failed');
      }

      const jobId = data.job?.id ?? null;

      setResponse(data);

      if (data.status === 'processing' && typeof data.id === 'number') {
        setGeneration({ kind: 'polling', id: data.id, jobId: jobId ?? undefined });
        await pollForResult(jobId, data.id, historyData);
        return;
      }

      if (data.status !== 'success') {
        throw new Error(data.message || 'Unexpected status');
      }

      const url = pickPrimaryAudioUrl(data);
      if (url) {
        setHistory((prev) => [{ ...historyData, audioUrl: url }, ...prev].slice(0, 10));
      }

      setGeneration({ kind: 'ready' });
    } catch (error) {
      if (isAbortError(error)) {
        setGeneration({ kind: 'ready' });
        return;
      }
      setGeneration({ kind: 'error', message: getErrorMessage(error, 'Generation failed') });
    } finally {
      abortRef.current = null;
    }
  }, [inputMode, initAudioUrl, uploadedFile, lyricsGeneration, lyrics, prompt, caption, duration, cancelGeneration, pollForResult]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelGeneration();
      if (uploadedFileUrl) URL.revokeObjectURL(uploadedFileUrl);
    };
  }, [cancelGeneration, uploadedFileUrl]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[420px,1fr]">
      {/* ───────────────────── Left Column: Inputs ───────────────────── */}
      <section className="flex flex-col gap-4">
        {/* Song Style / Caption Section */}
        <SectionCard
          title="Song Style"
          subtitle="Choose a genre preset or describe the style manually"
          icon={Mic}
        >
          {/* Genre Presets */}
          <div className="flex flex-wrap gap-2">
            {GENRE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetClick(preset.id, preset.caption)}
                disabled={isBusy}
                className={cn(
                  'rounded-xl border px-3.5 py-2 text-sm font-medium transition',
                  activePreset === preset.id
                    ? 'border-accent-pink/50 bg-accent-pink/15 text-white shadow-sm shadow-accent-pink/10'
                    : 'border-white/10 bg-white/5 text-text-secondary hover:border-white/20 hover:bg-white/10 hover:text-white',
                  isBusy && 'cursor-not-allowed opacity-50'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Caption */}
          <div className="mt-3 space-y-2">
            <textarea
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value);
                setActivePreset(null);
              }}
              placeholder="e.g. female vocal, folk metal, electro, violin, piano, child's voice, lofi beats..."
              rows={2}
              disabled={isBusy}
              className={cn(
                'w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-text-muted transition focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20',
                isBusy && 'cursor-not-allowed opacity-50'
              )}
            />
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Describe voice type, instruments, genre, mood</span>
              <span>{caption.length}/{MAX_CAPTION_LENGTH}</span>
            </div>
          </div>
        </SectionCard>

        {/* Reference Audio Section (optional) */}
        <SectionCard
          title="Reference Audio"
          subtitle="Optional — upload a file or paste a URL to copy the music style"
          icon={FileAudio}
        >
          {/* Input Mode Tabs */}
          <div className="flex gap-2">
            {(['upload', 'url'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setInputMode(mode);
                  setUploadError('');
                }}
                disabled={isBusy}
                className={cn(
                  'flex-1 rounded-xl border py-2.5 text-sm font-medium transition',
                  inputMode === mode
                    ? 'border-accent-pink/50 bg-accent-pink/15 text-white'
                    : 'border-white/10 bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white',
                  isBusy && 'cursor-not-allowed opacity-50'
                )}
              >
                {mode === 'upload' ? 'Upload File' : 'Paste URL'}
              </button>
            ))}
          </div>

          {/* Upload Mode */}
          {inputMode === 'upload' && (
            <div className="mt-3 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                  e.target.value = '';
                }}
                disabled={isBusy}
              />

              {!uploadedFile ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy}
                  className={cn(
                    'flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 bg-white/5 px-4 py-6 text-sm transition hover:border-accent-pink/40 hover:bg-white/10',
                    isBusy && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <Upload className="h-5 w-5 text-text-muted" />
                  <span className="font-medium text-white">Choose audio file</span>
                  <span className="text-xs text-text-muted">MP3, WAV, M4A, OGG, FLAC (max 25MB)</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white">{uploadedFile.name}</div>
                      <div className="mt-0.5 text-xs text-text-muted">{formatBytes(uploadedFile.size)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={clearUploadedFile}
                      disabled={isBusy}
                      className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition hover:bg-white/10 hover:text-white"
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {uploadedFileUrl && (
                    <AudioPlayerCompact src={uploadedFileUrl} downloadFilename={uploadedFile.name} />
                  )}
                </div>
              )}

              {uploadError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {uploadError}
                </div>
              )}
            </div>
          )}

          {/* URL Mode */}
          {inputMode === 'url' && (
            <input
              type="url"
              value={initAudioUrl}
              onChange={(e) => setInitAudioUrl(e.target.value)}
              placeholder="https://example.com/audio.mp3"
              disabled={isBusy}
              className={cn(
                'mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-text-muted transition focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20',
                isBusy && 'cursor-not-allowed opacity-50'
              )}
            />
          )}
        </SectionCard>

        {/* Lyrics Section */}
        <SectionCard
          title="Lyrics"
          subtitle={lyricsGeneration ? 'AI will generate lyrics from your prompt' : 'Enter custom lyrics in LRC format'}
          icon={lyricsGeneration ? Sparkles : PenLine}
          headerRight={
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">{lyricsGeneration ? 'AI' : 'Manual'}</span>
              <Toggle
                enabled={lyricsGeneration}
                onToggle={() => setLyricsGeneration((p) => !p)}
                disabled={isBusy}
                label="Auto-generate lyrics"
              />
            </div>
          }
        >
          {lyricsGeneration ? (
            <div className="space-y-2">
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the song theme, mood, or topic...&#10;e.g., An uplifting pop song about chasing dreams"
                  rows={4}
                  disabled={isBusy}
                  className={cn(
                    'w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 pr-10 text-sm text-white placeholder:text-text-muted transition focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20',
                    isBusy && 'cursor-not-allowed opacity-50'
                  )}
                />
                <button
                  type="button"
                  onClick={handleRandomPrompt}
                  disabled={isBusy}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition hover:bg-white/10 hover:text-white"
                  title="Random prompt"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>{prompt.length}/{MAX_PROMPT_LENGTH}</span>
                {prompt.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPrompt('')}
                    disabled={isBusy}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-white/10 hover:text-white"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder={"[00:00.00] Your lyrics here\n[00:05.00] Second line...\n\nLyrics must be in LRC format\nwith timestamps and lyric lines."}
                rows={8}
                disabled={isBusy}
                className={cn(
                  'w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 font-mono text-sm text-white placeholder:text-text-muted transition focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20',
                  isBusy && 'cursor-not-allowed opacity-50'
                )}
              />
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>LRC format required (with timestamps)</span>
                </div>
                <span className="shrink-0 text-xs text-text-muted">{lyrics.length}/{MAX_LYRICS_LENGTH}</span>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Duration Section */}
        <SectionCard
          title="Duration"
          subtitle={`Song length: ${formatDuration(duration)}`}
          icon={Timer}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={MIN_DURATION}
                max={MAX_DURATION}
                step={10}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                disabled={isBusy}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent-pink [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-pink [&::-webkit-slider-thumb]:shadow-lg"
              />
              <span className="w-16 rounded-lg bg-white/10 px-2.5 py-1.5 text-center text-sm font-semibold text-white">
                {formatDuration(duration)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-text-muted">
              <span>{formatDuration(MIN_DURATION)}</span>
              <span>{formatDuration(MAX_DURATION)}</span>
            </div>
          </div>
        </SectionCard>
      </section>

      {/* ───────────────────── Right Column: Output ───────────────────── */}
      <section className="flex flex-col gap-4">
        {/* Generate Button */}
        <button
          type="button"
          onClick={() => void generate()}
          disabled={isBusy}
          className={cn(
            'group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl px-6 py-4 text-base font-bold transition-all',
            isBusy
              ? 'cursor-not-allowed bg-white/10 text-text-muted'
              : 'bg-gradient-to-r from-accent-pink via-purple-500 to-accent-pink bg-[length:200%_100%] text-white shadow-lg shadow-accent-pink/25 hover:bg-[100%_0] hover:shadow-xl hover:shadow-accent-pink/30'
          )}
        >
          {isBusy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{generation.kind === 'polling' ? 'Processing...' : 'Generating...'}</span>
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              <span>Generate Song</span>
            </>
          )}
        </button>

        {isBusy && (
          <button
            type="button"
            onClick={cancelGeneration}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-text-secondary transition hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
        )}

        {generation.kind === 'polling' && response?.eta && (
          <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
            <Clock className="h-4 w-4" />
            <span>Estimated time: ~{response.eta}s</span>
          </div>
        )}

        {/* Error */}
        {generation.kind === 'error' && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div>
              <p className="font-semibold text-white">Generation failed</p>
              <p className="mt-1 text-sm text-red-200/80">{generation.message}</p>
            </div>
          </div>
        )}

        {/* Main Output Card */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[var(--bg-secondary)] to-[#1a1625] shadow-card">
          {/* Header */}
          <div className="border-b border-white/5 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-pink/20 to-purple-500/20">
                  <Music2 className="h-5 w-5 text-accent-pink" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Generated Song</h3>
                  <p className="text-xs text-text-muted">
                    {isBusy ? 'Creating your song...' : hasAudio ? 'Ready to play' : 'Waiting for generation'}
                  </p>
                </div>
              </div>
              {generation.kind === 'polling' && (
                <div className="flex items-center gap-2 rounded-full bg-accent-pink/10 px-3 py-1.5 text-xs font-medium text-accent-pink">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-accent-pink" />
                  Processing
                </div>
              )}
              {hasAudio && !isBusy && (
                <a
                  href={primaryAudioUrl ?? '#'}
                  download="generated-song.mp3"
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-secondary transition hover:bg-white/10 hover:text-white"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Processing State */}
            {isBusy && (
              <div className="flex flex-col items-center py-12">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full border-4 border-white/10" />
                  <div className="absolute inset-0 h-20 w-20 animate-spin rounded-full border-4 border-transparent border-t-accent-pink" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Music2 className="h-8 w-8 text-accent-pink" />
                  </div>
                </div>
                <p className="mt-6 font-medium text-white">Creating your song</p>
                <p className="mt-1 text-sm text-text-muted">This may take a few minutes...</p>
                {generation.kind === 'polling' && (
                  <p className="mt-3 rounded-full bg-white/5 px-3 py-1 text-xs text-text-muted">
                    Job #{generation.id}
                  </p>
                )}
              </div>
            )}

            {/* Empty State */}
            {!isBusy && !hasAudio && generation.kind !== 'error' && (
              <div className="flex flex-col items-center py-12">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
                  <Music2 className="h-10 w-10 text-text-muted" />
                </div>
                <p className="mt-6 font-medium text-white">No song yet</p>
                <p className="mt-1 text-sm text-text-muted">
                  Choose a style, describe your song, and hit generate
                </p>
              </div>
            )}

            {/* Audio Player */}
            {hasAudio && !isBusy && (
              <div className="space-y-6">
                <audio
                  ref={audioRef}
                  src={primaryAudioUrl ?? undefined}
                  preload="metadata"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
                />

                {/* Waveform-style Progress */}
                <div
                  ref={progressRef}
                  onClick={handleProgressClick}
                  className="group relative h-16 cursor-pointer overflow-hidden rounded-xl bg-white/5"
                >
                  <div className="absolute inset-0 flex items-center justify-around px-2">
                    {Array.from({ length: 50 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'w-1 rounded-full transition-all duration-150',
                          (i / 50) * 100 < progress ? 'bg-accent-pink' : 'bg-white/20'
                        )}
                        style={{
                          height: `${20 + Math.sin(i * 0.5) * 15 + Math.cos(i * 0.8) * 10}px`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                </div>

                {/* Controls */}
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-pink to-purple-500 text-white shadow-lg shadow-accent-pink/25 transition hover:shadow-accent-pink/40"
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6" />
                    ) : (
                      <Play className="ml-1 h-6 w-6" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="tabular-nums text-white">{formatTime(currentTime)}</span>
                      <span className="tabular-nums text-text-muted">{formatTime(audioDuration)}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent-pink to-purple-500 transition-all duration-150"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={toggleMute}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-text-muted transition hover:bg-white/10 hover:text-white"
                  >
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History Card */}
        {history.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-text-muted" />
                <h3 className="font-semibold text-white">Recent Generations</h3>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-text-muted">
                  {history.length}
                </span>
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

            <div className="mt-4 space-y-2">
              {history.map((item) => {
                const isCurrentAudio = primaryAudioUrl === item.audioUrl;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3 transition',
                      isCurrentAudio
                        ? 'border-accent-pink/30 bg-accent-pink/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setResponse({ status: 'success', output: [item.audioUrl] });
                        setTimeout(() => {
                          const audio = audioRef.current;
                          if (audio) void audio.play();
                        }, 100);
                      }}
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition',
                        isCurrentAudio
                          ? 'bg-accent-pink text-white'
                          : 'bg-white/10 text-text-secondary hover:bg-white/20 hover:text-white'
                      )}
                      disabled={isBusy}
                    >
                      <Play className="ml-0.5 h-4 w-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{item.label}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
                        <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">
                          {item.lyricsMode === 'auto' ? 'AI Lyrics' : 'Custom'}
                        </span>
                        {item.caption && (
                          <span className="truncate rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-300">
                            {truncate(item.caption, 20)}
                          </span>
                        )}
                      </div>
                    </div>
                    <a
                      href={item.audioUrl}
                      download="generated-song.mp3"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition hover:bg-white/10 hover:text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="h-4 w-4" />
                    </a>
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
