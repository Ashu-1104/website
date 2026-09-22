'use client';

import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import {
  AlertCircle,
  Clock,
  Download,
  Loader2,
  Pause,
  Play,
  Shuffle,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModelslabTextToSpeechResponse } from '@/lib/modelslab';
import { getUserId } from '@/hooks/useApi';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MAX_PROMPT_LENGTH = 2500;
const MIN_DURATION_SECONDS = 1;
const MAX_DURATION_SECONDS = 10;

const SFX_CATEGORY_PRESETS = [
  { id: 'impact', label: 'Impacts', icon: '💥', prompt: 'A punchy impact sound with a deep bass hit and short reverb tail' },
  { id: 'nature', label: 'Nature', icon: '🌿', prompt: 'Birds chirping in a forest with a gentle breeze and distant stream' },
  { id: 'ui', label: 'UI / UX', icon: '🔔', prompt: 'A clean, modern UI notification click with a subtle pop and sparkle' },
  { id: 'scifi', label: 'Sci-Fi', icon: '🚀', prompt: 'A futuristic sci-fi laser zap with electronic warble and short reverb' },
  { id: 'foley', label: 'Foley', icon: '👣', prompt: 'Footsteps walking on wooden floorboards in a quiet room, close microphone' },
  { id: 'ambient', label: 'Ambient', icon: '🌊', prompt: 'Ocean waves crashing on a beach with distant seagulls and wind' },
] as const;

const DESCRIPTOR_TAGS = [
  'punchy', 'soft', 'bright', 'dark', 'metallic',
  'organic', 'crisp', 'muffled', 'echoing', 'sharp',
] as const;

const ENVIRONMENT_TAGS = [
  'indoor', 'outdoor', 'underwater', 'cave', 'stadium',
  'forest', 'city', 'space', 'desert', 'rain',
] as const;

const RANDOM_PROMPTS = [
  'Thunderstorm with rain',
  'A punchy impact sound with a short tail',
  'A quick whoosh transitioning into a deep bass hit',
  'A cute UI click with a subtle pop',
  'A distant explosion echoing in a canyon',
  'Footsteps running on wet concrete',
  'A glass bottle shattering on tile, crisp and bright',
  'A retro arcade coin pickup sound',
  'A sci-fi laser zap with a short reverb tail',
  'A wooden door creak slowly opening',
  'A camera shutter click with mechanical whirr',
  'Wind chimes softly in a gentle breeze',
  'A magical sparkle burst, bright and airy',
  'A short vinyl scratch followed by a beat drop cue',
  'A car engine revving quickly, close microphone',
  'A crowd cheer swell and fade',
  'Water splash into a pool, medium size',
  'A metallic sword clang with ring-out',
  'A playful cartoon boing',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type GenerationState =
  | { kind: 'ready' }
  | { kind: 'generating' }
  | { kind: 'polling'; id: number; progress?: number }
  | { kind: 'error'; message: string };

type HistoryItem = {
  id: string;
  createdAt: number;
  prompt: string;
  duration?: number;
  audioUrl: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

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

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────────────────────

const TagButton = memo(function TagButton({
  label,
  isActive,
  onClick,
  disabled,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200',
        isActive
          ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-white ring-1 ring-purple-500/50'
          : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-white',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      {label}
    </button>
  );
});

const CategoryCard = memo(function CategoryCard({
  preset,
  isActive,
  onClick,
  disabled,
}: {
  preset: typeof SFX_CATEGORY_PRESETS[number];
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group relative flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition-all duration-300',
        isActive
          ? 'border-purple-500/50 bg-gradient-to-br from-purple-500/20 to-pink-500/20 shadow-lg shadow-purple-500/10'
          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <span className={cn(
        'text-2xl transition-transform duration-200',
        !disabled && 'group-hover:scale-110'
      )}>
        {preset.icon}
      </span>
      <span className={cn(
        'text-sm font-medium',
        isActive ? 'text-white' : 'text-text-secondary'
      )}>
        {preset.label}
      </span>
    </button>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Waveform Audio Player
// ─────────────────────────────────────────────────────────────────────────────

const WaveformPlayer = memo(function WaveformPlayer({
  src,
  downloadFilename = 'sfx.mp3',
}: {
  src: string | null;
  downloadFilename?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0);

  const hasSource = Boolean(src);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const waveformBars = useMemo(() => {
    const bars = [];
    for (let i = 0; i < 60; i++) {
      const height = 20 + Math.sin(i * 0.3) * 15 + Math.cos(i * 0.7) * 10 + Math.random() * 10;
      bars.push(Math.min(100, Math.max(15, height)));
    }
    return bars;
  }, []);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !hasSource) return;
    if (isPlaying) {
      audio.pause();
    } else {
      void audio.play();
    }
  }, [hasSource, isPlaying]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !hasSource || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = (x / rect.width) * duration;
    audio.currentTime = Math.max(0, Math.min(duration, newTime));
  }, [hasSource, duration]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setHoverPosition((x / rect.width) * 100);
  }, []);

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

  if (!hasSource) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-gradient-to-br from-white/5 to-white/[0.02] p-12">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-purple-500/20 blur-xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
            <Zap className="h-10 w-10 text-text-muted" />
          </div>
        </div>
        <p className="mt-6 text-lg font-medium text-white">Ready to create</p>
        <p className="mt-1 text-sm text-text-muted">Your generated sound effect will appear here</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1625] to-[#0d0a12]">
      <audio
        ref={audioRef}
        src={src ?? undefined}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />

      {/* Waveform Visualization */}
      <div
        className="relative cursor-pointer px-6 py-8"
        onClick={handleSeek}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onMouseMove={handleMouseMove}
      >
        <div
          className="absolute inset-0 opacity-30 blur-3xl transition-opacity duration-500"
          style={{
            background: `radial-gradient(ellipse at ${progress}% 50%, rgba(168, 85, 247, 0.4), transparent 70%)`
          }}
        />

        <div className="relative flex h-24 items-center justify-between gap-[2px]">
          {waveformBars.map((height, i) => {
            const barProgress = (i / waveformBars.length) * 100;
            const isActive = barProgress < progress;
            const isHovered = isHovering && barProgress < hoverPosition;

            return (
              <div
                key={i}
                className={cn(
                  'flex-1 rounded-full transition-all duration-150',
                  isActive
                    ? 'bg-gradient-to-t from-purple-500 to-pink-400'
                    : isHovered
                    ? 'bg-white/30'
                    : 'bg-white/10'
                )}
                style={{
                  height: `${height}%`,
                  transform: isPlaying && isActive ? `scaleY(${1 + Math.sin(Date.now() / 200 + i) * 0.1})` : 'scaleY(1)',
                }}
              />
            );
          })}
        </div>

        {isHovering && duration > 0 && (
          <div
            className="absolute top-2 -translate-x-1/2 rounded-md bg-black/80 px-2 py-1 text-xs text-white"
            style={{ left: `${hoverPosition}%` }}
          >
            {formatTime((hoverPosition / 100) * duration)}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 border-t border-white/5 bg-black/20 px-6 py-4">
        <button
          type="button"
          onClick={togglePlay}
          className="group relative flex h-14 w-14 shrink-0 items-center justify-center"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 opacity-80 blur-md transition-all group-hover:opacity-100 group-hover:blur-lg" />
          <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg transition-transform group-hover:scale-105">
            {isPlaying ? (
              <Pause className="h-6 w-6 text-white" />
            ) : (
              <Play className="ml-1 h-6 w-6 text-white" />
            )}
          </div>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-sm">
            <span className="tabular-nums text-white">{formatTime(currentTime)}</span>
            <span className="tabular-nums text-text-muted">{formatTime(duration)}</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="group relative">
          <button
            type="button"
            onClick={toggleMute}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-text-muted transition hover:bg-white/10 hover:text-white"
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 rounded-xl border border-white/10 bg-[#1a1625] p-3 shadow-xl group-hover:block">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v);
                if (audioRef.current) audioRef.current.volume = v;
                setIsMuted(v === 0);
              }}
              className="h-20 w-1.5 cursor-pointer appearance-none rounded-full bg-white/20 accent-purple-500 [writing-mode:vertical-lr] [direction:rtl]"
            />
          </div>
        </div>

        <a
          href={src ?? '#'}
          download={downloadFilename}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-text-muted transition hover:bg-white/10 hover:text-white"
        >
          <Download className="h-5 w-5" />
        </a>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// History Panel
// ─────────────────────────────────────────────────────────────────────────────

const HistoryPanel = memo(function HistoryPanel({
  history,
  onSelect,
  onClear,
}: {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
}) {
  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
        <Clock className="mx-auto h-8 w-8 text-text-muted" />
        <p className="mt-3 text-sm text-text-muted">Your generation history will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">Recent Generations</span>
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-text-muted transition hover:bg-white/10 hover:text-white"
        >
          <Trash2 className="h-3 w-3" />
          Clear
        </button>
      </div>
      <div className="space-y-2">
        {history.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="group flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-purple-500/30 hover:bg-white/10"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 transition group-hover:bg-purple-500/20">
              <Play className="h-4 w-4 text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{truncate(item.prompt, 40)}</p>
              <p className="mt-0.5 text-xs text-text-muted">
                {new Date(item.createdAt).toLocaleString()}
                {item.duration ? ` • ${item.duration}s` : ''}
              </p>
            </div>
            <a
              href={item.audioUrl}
              download
              onClick={(e) => e.stopPropagation()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
            >
              <Download className="h-4 w-4" />
            </a>
          </button>
        ))}
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function SfxPlayground() {
  const [prompt, setPrompt] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDescriptors, setSelectedDescriptors] = useState<string[]>([]);
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([]);
  const [duration, setDuration] = useState<number>(6);

  const [generation, setGeneration] = useState<GenerationState>({ kind: 'ready' });
  const [sfxResponse, setSfxResponse] = useState<ModelslabTextToSpeechResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const generateAbortRef = useRef<AbortController | null>(null);
  const pollTimeoutRef = useRef<number | null>(null);

  const primaryAudioUrl = useMemo(() => pickPrimaryAudioUrl(sfxResponse), [sfxResponse]);
  const isBusy = generation.kind === 'generating' || generation.kind === 'polling';
  const randomPromptIndexRef = useRef<number | null>(null);

  const applyRandomPrompt = useCallback(() => {
    setPrompt((current) => {
      const trimmed = current.trim();
      const currentIndex = RANDOM_PROMPTS.findIndex((p) => p === trimmed);
      const avoidIndex = currentIndex >= 0 ? currentIndex : randomPromptIndexRef.current;
      let nextIndex: number;
      if (RANDOM_PROMPTS.length <= 1) {
        nextIndex = 0;
      } else if (avoidIndex === null) {
        nextIndex = Math.floor(Math.random() * RANDOM_PROMPTS.length);
      } else {
        const pick = Math.floor(Math.random() * (RANDOM_PROMPTS.length - 1));
        nextIndex = pick >= avoidIndex ? pick + 1 : pick;
      }
      randomPromptIndexRef.current = nextIndex;
      return RANDOM_PROMPTS[nextIndex] ?? current;
    });
    setSelectedCategory(null);
  }, []);

  // Build composite prompt from selections
  const compositePrompt = useMemo(() => {
    const parts: string[] = [];
    if (prompt.trim()) parts.push(prompt.trim());
    if (selectedDescriptors.length > 0) parts.push(selectedDescriptors.join(', '));
    if (selectedEnvironments.length > 0) parts.push(selectedEnvironments.join(', '));
    return parts.join(', ');
  }, [prompt, selectedDescriptors, selectedEnvironments]);

  const handleCategorySelect = useCallback((category: typeof SFX_CATEGORY_PRESETS[number]) => {
    if (selectedCategory === category.id) {
      setSelectedCategory(null);
      if (prompt === category.prompt) setPrompt('');
    } else {
      setSelectedCategory(category.id);
      setPrompt(category.prompt);
    }
  }, [selectedCategory, prompt]);

  const toggleDescriptor = useCallback((tag: string) => {
    setSelectedDescriptors((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const toggleEnvironment = useCallback((tag: string) => {
    setSelectedEnvironments((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const randomizePrompt = useCallback(() => {
    const randomCategory = SFX_CATEGORY_PRESETS[Math.floor(Math.random() * SFX_CATEGORY_PRESETS.length)];
    const randomDescriptors = DESCRIPTOR_TAGS.slice().sort(() => 0.5 - Math.random()).slice(0, 2);
    const randomEnvironments = ENVIRONMENT_TAGS.slice().sort(() => 0.5 - Math.random()).slice(0, 1);

    setSelectedCategory(randomCategory.id);
    setPrompt(randomCategory.prompt);
    setSelectedDescriptors([...randomDescriptors]);
    setSelectedEnvironments([...randomEnvironments]);
  }, []);

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
            setSfxResponse({ status: 'success', output: [job.resultUrl] });
            setGeneration({ kind: 'ready' });
            setHistory((prev) => [{ ...historyItem, audioUrl: job.resultUrl! }, ...prev].slice(0, 10));
            return;
          }

          if (job.status === 'FAILED') {
            throw new Error(job.errorMessage || 'Generation failed');
          }

          // Still processing
          const delayMs = getPollDelayMs(job.eta, attempt);
          attempt += 1;
          setGeneration({ kind: 'polling', id: modelsLabId, progress: Math.min(90, attempt * 10) });
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

          setSfxResponse(data);

          if (data.status === 'success') {
            setGeneration({ kind: 'ready' });
            const url = pickPrimaryAudioUrl(data);
            if (url) {
              setHistory((prev) => [{ ...historyItem, audioUrl: url }, ...prev].slice(0, 10));
            }
            return;
          }

          if (data.status === 'processing') {
            const delayMs = getPollDelayMs(data.eta, attempt);
            attempt += 1;
            setGeneration({ kind: 'polling', id: modelsLabId, progress: Math.min(90, attempt * 10) });
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
  }, []);

  const generateSfx = useCallback(async () => {
    const finalPrompt = compositePrompt.trim();
    if (!finalPrompt) {
      setGeneration({ kind: 'error', message: 'Enter a prompt or select a category to generate a sound effect.' });
      return;
    }
    if (finalPrompt.length > MAX_PROMPT_LENGTH) {
      setGeneration({
        kind: 'error',
        message: `Prompt is too long (${finalPrompt.length}/${MAX_PROMPT_LENGTH}).`,
      });
      return;
    }

    if (!Number.isFinite(duration) || duration < MIN_DURATION_SECONDS || duration > MAX_DURATION_SECONDS) {
      setGeneration({
        kind: 'error',
        message: `Duration must be between ${MIN_DURATION_SECONDS} and ${MAX_DURATION_SECONDS} seconds.`,
      });
      return;
    }

    cancelGeneration();
    setGeneration({ kind: 'generating' });
    setSfxResponse(null);

    const controller = new AbortController();
    generateAbortRef.current = controller;

    const historyItem: Omit<HistoryItem, 'audioUrl'> = {
      id: generateId(),
      createdAt: Date.now(),
      prompt: finalPrompt,
      duration,
    };

    try {
      const response = await fetch('/api/modelslab/sfx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-vp-user-id': getUserId() },
        body: JSON.stringify({
          prompt: finalPrompt,
          duration,
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

      setSfxResponse(data);

      if (data.status === 'processing' && typeof data.id === 'number') {
        setGeneration({ kind: 'polling', id: data.id, progress: 0 });
        await pollForResult(jobId, data.id, historyItem);
        return;
      }

      if (data.status !== 'success') {
        throw new Error(data.message || 'Unexpected response status');
      }

      const url = pickPrimaryAudioUrl(data);
      if (url) {
        setHistory((prev) => [{ ...historyItem, audioUrl: url }, ...prev].slice(0, 10));
      }

      setGeneration({ kind: 'ready' });
    } catch (error) {
      if (isAbortError(error)) {
        setGeneration({ kind: 'ready' });
        return;
      }
      setGeneration({ kind: 'error', message: getErrorMessage(error, 'SFX request failed') });
    } finally {
      generateAbortRef.current = null;
    }
  }, [compositePrompt, duration, cancelGeneration, pollForResult]);

  useEffect(() => {
    return () => {
      cancelGeneration();
    };
  }, [cancelGeneration]);

  const handleHistorySelect = useCallback((item: HistoryItem) => {
    setPrompt(item.prompt);
    setSfxResponse({
      status: 'success',
      output: [item.audioUrl],
    });
  }, []);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[420px,1fr]">
      {/* ───────────────────── Left Column: Controls ───────────────────── */}
      <section className="flex flex-col gap-5">
        {/* Category Presets */}
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
          <h3 className="font-semibold text-white">Quick Start</h3>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {SFX_CATEGORY_PRESETS.map((category) => (
              <CategoryCard
                key={category.id}
                preset={category}
                isActive={selectedCategory === category.id}
                onClick={() => handleCategorySelect(category)}
                disabled={isBusy}
              />
            ))}
          </div>
        </div>

        {/* Prompt Input */}
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-400" />
            <h3 className="font-semibold text-white">Describe Your Sound</h3>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setSelectedCategory(null);
            }}
            placeholder={"Describe the sound effect you want to create...\ne.g., A punchy bass impact with metallic reverb tail"}
            rows={4}
            maxLength={MAX_PROMPT_LENGTH}
            disabled={isBusy}
            className={cn(
              'mt-4 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white placeholder:text-text-muted transition focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20',
              isBusy && 'cursor-not-allowed opacity-50'
            )}
          />
          <div className="mt-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={applyRandomPrompt}
                disabled={isBusy}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-text-muted transition hover:bg-white/10 hover:text-white"
              >
                <Shuffle className="h-3 w-3" />
                Random
              </button>
              <button
                type="button"
                onClick={randomizePrompt}
                disabled={isBusy}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-text-muted transition hover:bg-white/10 hover:text-white"
              >
                <Sparkles className="h-3 w-3" />
                Surprise me
              </button>
              <span className={cn(
                'tabular-nums text-text-muted',
                compositePrompt.length > MAX_PROMPT_LENGTH && 'text-red-400'
              )}>
                {compositePrompt.length}/{MAX_PROMPT_LENGTH}
              </span>
            </div>
            {prompt && (
              <button
                type="button"
                onClick={() => {
                  setPrompt('');
                  setSelectedCategory(null);
                  setSelectedDescriptors([]);
                  setSelectedEnvironments([]);
                }}
                disabled={isBusy}
                className="flex items-center gap-1 text-text-muted transition hover:text-white"
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Descriptor & Environment Tags */}
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
          <h3 className="font-semibold text-white">Character</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {DESCRIPTOR_TAGS.map((tag) => (
              <TagButton
                key={tag}
                label={tag}
                isActive={selectedDescriptors.includes(tag)}
                onClick={() => toggleDescriptor(tag)}
                disabled={isBusy}
              />
            ))}
          </div>

          <h3 className="mt-5 font-semibold text-white">Environment</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {ENVIRONMENT_TAGS.map((tag) => (
              <TagButton
                key={tag}
                label={tag}
                isActive={selectedEnvironments.includes(tag)}
                onClick={() => toggleEnvironment(tag)}
                disabled={isBusy}
              />
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-400" />
              <div>
                <h3 className="font-semibold text-white">Duration</h3>
                <p className="mt-0.5 text-xs text-text-muted">Up to {MAX_DURATION_SECONDS} seconds</p>
              </div>
            </div>
            <span className="rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-3 py-1.5 text-sm font-semibold text-white tabular-nums ring-1 ring-purple-500/30">
              {duration}s
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs text-text-muted">{MIN_DURATION_SECONDS}s</span>
            <input
              type="range"
              min={MIN_DURATION_SECONDS}
              max={MAX_DURATION_SECONDS}
              step={1}
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-purple-500 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-purple-500 [&::-webkit-slider-thumb]:to-pink-500 [&::-webkit-slider-thumb]:shadow-lg"
              disabled={isBusy}
            />
            <span className="text-xs text-text-muted">{MAX_DURATION_SECONDS}s</span>
          </div>
        </div>

        {/* Generate Button */}
        <button
          type="button"
          onClick={generateSfx}
          disabled={isBusy}
          className={cn(
            'group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl py-4 text-lg font-semibold text-white transition-all duration-300',
            isBusy ? 'cursor-not-allowed' : 'hover:shadow-xl hover:shadow-purple-500/25'
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 bg-[length:200%_100%] transition-all duration-500 group-hover:bg-[position:100%_0]" />
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-white/10 to-purple-600/0 opacity-0 transition-opacity group-hover:opacity-100" />
          <span className="relative flex items-center gap-2">
            {isBusy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Generate SFX
              </>
            )}
          </span>
        </button>
      </section>

      {/* ───────────────────── Right Column: Output ───────────────────── */}
      <section className="flex flex-col gap-6">
        {/* Output Player */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[var(--bg-secondary)] to-[#0d0a12] p-6 shadow-2xl">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 animate-pulse rounded-xl bg-purple-500/30 blur-md" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                  <Zap className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">SFX Studio</h2>
                <p className="text-sm text-text-muted">
                  {generation.kind === 'generating' || generation.kind === 'polling'
                    ? 'Creating your sound...'
                    : primaryAudioUrl
                    ? 'Your sound is ready'
                    : 'Generate a sound effect'}
                </p>
              </div>
            </div>
            {generation.kind === 'polling' && (
              <div className="flex items-center gap-2 rounded-full bg-purple-500/10 px-4 py-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-purple-400" />
                <span className="text-sm font-medium text-purple-400">Processing</span>
              </div>
            )}
          </div>

          {/* Error State */}
          {generation.kind === 'error' && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
              <div>
                <p className="font-medium text-white">Generation failed</p>
                <p className="mt-1 text-sm text-text-muted">{generation.message}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {(generation.kind === 'generating' || generation.kind === 'polling') && (
            <div className="flex flex-col items-center py-12">
              <div className="relative">
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-purple-500" style={{ width: '80px', height: '80px' }} />
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
                  <Zap className="h-8 w-8 text-purple-400" />
                </div>
              </div>
              <p className="mt-6 font-medium text-white">
                {generation.kind === 'generating' ? 'Starting generation...' : 'Creating your sound...'}
              </p>
              {generation.kind === 'polling' && (
                <>
                  <div className="mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                      style={{ width: `${generation.progress ?? 0}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-text-muted">Job #{generation.id}</p>
                  <button
                    type="button"
                    onClick={cancelGeneration}
                    className="mt-4 rounded-xl border border-white/10 bg-white/5 px-6 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}

          {/* Player */}
          {generation.kind !== 'generating' && generation.kind !== 'polling' && (
            <WaveformPlayer src={primaryAudioUrl} downloadFilename="sfx.mp3" />
          )}
        </div>

        {/* History */}
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
          <HistoryPanel
            history={history}
            onSelect={handleHistorySelect}
            onClear={() => setHistory([])}
          />
        </div>
      </section>
    </div>
  );
}
