'use client';

import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import {
  AlertCircle,
  ChevronDown,
  Clock,
  Download,
  HelpCircle,
  Loader2,
  Music,
  Music2,
  Pause,
  Play,
  Settings2,
  Shuffle,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModelslabTextToSpeechResponse } from '@/lib/modelslab';
import { getUserId } from '@/hooks/useApi';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MAX_PROMPT_LENGTH = 2500;
const MAX_INIT_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_MELODY_DURATION_SEC = 30;

const GENRE_PRESETS = [
  { id: 'lofi', label: 'Lo-Fi', icon: '🎧', prompt: 'chill lo-fi hip hop beat, warm vinyl crackle, mellow piano chords, soft drums, relaxing atmosphere' },
  { id: 'electronic', label: 'Electronic', icon: '⚡', prompt: 'energetic electronic dance music, punchy synths, driving bass, four-on-the-floor beat, 128 bpm' },
  { id: 'cinematic', label: 'Cinematic', icon: '🎬', prompt: 'epic cinematic orchestral score, dramatic strings, powerful brass, emotional crescendo, film soundtrack' },
  { id: 'ambient', label: 'Ambient', icon: '🌊', prompt: 'atmospheric ambient soundscape, ethereal pads, gentle drones, peaceful and meditative, space reverb' },
  { id: 'jazz', label: 'Jazz', icon: '🎷', prompt: 'smooth jazz instrumental, walking bass line, brushed drums, warm piano, sophisticated chord progressions' },
  { id: 'rock', label: 'Rock', icon: '🎸', prompt: 'energetic rock instrumental, distorted electric guitars, powerful drums, driving rhythm, classic rock feel' },
] as const;

const MOOD_TAGS = [
  'uplifting', 'melancholic', 'energetic', 'relaxing', 'mysterious',
  'aggressive', 'peaceful', 'nostalgic', 'futuristic', 'romantic',
] as const;

const INSTRUMENT_TAGS = [
  'piano', 'guitar', 'synth', 'drums', 'bass', 'strings',
  'brass', 'flute', 'violin', 'percussion', 'organ', 'marimba',
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
  id: string;
  createdAt: number;
  prompt: string;
  initAudioLabel?: string;
  audioUrl: string;
  duration?: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

function pickPrimaryAudioUrl(response: ModelslabTextToSpeechResponse | null): string | null {
  if (!response) return null;
  const candidates: unknown = response.output ?? response.proxy_links ?? response.links ?? response.future_links;
  if (typeof candidates === 'string' && candidates.length > 0) return candidates;
  if (!Array.isArray(candidates)) return null;
  return candidates.find((value) => typeof value === 'string' && value.length > 0) ?? null;
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

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  });
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

const Toggle = memo(function Toggle({
  enabled,
  onToggle,
  disabled,
}: {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'relative h-6 w-12 shrink-0 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40',
        enabled
          ? 'bg-gradient-to-r from-purple-500 to-pink-500'
          : 'bg-white/10',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200',
          enabled ? 'translate-x-6' : 'translate-x-0'
        )}
      />
    </button>
  );
});

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

const GenreCard = memo(function GenreCard({
  preset,
  isActive,
  onClick,
  disabled,
}: {
  preset: typeof GENRE_PRESETS[number];
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
// Waveform Audio Player Component
// ─────────────────────────────────────────────────────────────────────────────

const WaveformPlayer = memo(function WaveformPlayer({
  src,
  downloadFilename = 'music.mp3',
  onDurationChange,
}: {
  src: string | null;
  downloadFilename?: string;
  onDurationChange?: (duration: number) => void;
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

  // Generate pseudo-waveform data
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

  useEffect(() => {
    if (duration > 0 && onDurationChange) {
      onDurationChange(duration);
    }
  }, [duration, onDurationChange]);

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
            <Music2 className="h-10 w-10 text-text-muted" />
          </div>
        </div>
        <p className="mt-6 text-lg font-medium text-white">Ready to create</p>
        <p className="mt-1 text-sm text-text-muted">Your generated music will appear here</p>
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
        {/* Background glow effect */}
        <div
          className="absolute inset-0 opacity-30 blur-3xl transition-opacity duration-500"
          style={{
            background: `radial-gradient(ellipse at ${progress}% 50%, rgba(168, 85, 247, 0.4), transparent 70%)`
          }}
        />

        {/* Waveform bars */}
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

        {/* Hover time indicator */}
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
        {/* Play Button */}
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

        {/* Time & Progress */}
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

        {/* Volume */}
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

        {/* Download */}
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
// Melody Upload Component
// ─────────────────────────────────────────────────────────────────────────────

const MelodyUpload = memo(function MelodyUpload({
  inputMode,
  setInputMode,
  initAudioUrl,
  setInitAudioUrl,
  uploadedFile,
  setUploadedFile,
  uploadError,
  setUploadError,
  disabled,
}: {
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
  initAudioUrl: string;
  setInitAudioUrl: (url: string) => void;
  uploadedFile: File | null;
  setUploadedFile: (file: File | null) => void;
  uploadError: string;
  setUploadError: (error: string) => void;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (uploadedFile) {
      const url = URL.createObjectURL(uploadedFile);
      setUploadedFileUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setUploadedFileUrl(null);
    }
  }, [uploadedFile]);

  const handleFileSelect = useCallback((file: File) => {
    setUploadError('');
    const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|flac)$/i.test(file.name);
    if (!isAudio) {
      setUploadError('Please upload an audio file (MP3, WAV, etc.)');
      return;
    }
    if (file.size > MAX_INIT_AUDIO_BYTES) {
      setUploadError(`File too large (${formatBytes(file.size)}). Max: ${formatBytes(MAX_INIT_AUDIO_BYTES)}`);
      return;
    }
    setUploadedFile(file);
  }, [setUploadError, setUploadedFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div className="space-y-4">
      {/* Mode Tabs */}
      <div className="flex gap-2">
        {(['upload', 'url'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              setInputMode(mode);
              setUploadError('');
            }}
            disabled={disabled}
            className={cn(
              'flex-1 rounded-xl border py-2.5 text-sm font-medium transition-all duration-200',
              inputMode === mode
                ? 'border-purple-500/50 bg-purple-500/10 text-white'
                : 'border-white/10 bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            {mode === 'upload' ? (
              <span className="flex items-center justify-center gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Zap className="h-4 w-4" />
                URL
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Upload Mode */}
      {inputMode === 'upload' && (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
              e.target.value = '';
            }}
            disabled={disabled}
          />

          {!uploadedFile ? (
            <div
              ref={dropZoneRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !disabled && fileInputRef.current?.click()}
              className={cn(
                'group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 transition-all duration-300',
                isDragging
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-white/20 bg-white/5 hover:border-purple-500/50 hover:bg-white/10',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <div className={cn(
                'flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300',
                isDragging ? 'bg-purple-500/20' : 'bg-white/5 group-hover:bg-purple-500/10'
              )}>
                <Music className={cn(
                  'h-7 w-7 transition-colors',
                  isDragging ? 'text-purple-400' : 'text-text-muted group-hover:text-purple-400'
                )} />
              </div>
              <div className="text-center">
                <p className="font-medium text-white">Drop your melody here</p>
                <p className="mt-1 text-sm text-text-muted">or click to browse • Max {MAX_MELODY_DURATION_SEC}s</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                    <Music className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{truncate(uploadedFile.name, 30)}</p>
                    <p className="text-xs text-text-muted">{formatBytes(uploadedFile.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUploadedFile(null);
                    setUploadError('');
                  }}
                  disabled={disabled}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Mini Player for uploaded file */}
              {uploadedFileUrl && (
                <audio
                  src={uploadedFileUrl}
                  controls
                  className="w-full rounded-xl [&::-webkit-media-controls-enclosure]:rounded-xl [&::-webkit-media-controls-panel]:bg-white/5"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* URL Mode */}
      {inputMode === 'url' && (
        <div className="relative">
          <input
            type="url"
            value={initAudioUrl}
            onChange={(e) => setInitAudioUrl(e.target.value)}
            placeholder="https://example.com/melody.mp3"
            disabled={disabled}
            className={cn(
              'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-10 text-sm text-white placeholder:text-text-muted transition focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          />
          {initAudioUrl && (
            <button
              type="button"
              onClick={() => setInitAudioUrl('')}
              disabled={disabled}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {uploadError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {uploadError}
        </div>
      )}

      {/* Info */}
      <p className="text-xs text-text-muted">
        Optional: Upload a melody to guide the generation. The AI will use this as a reference for style and mood.
      </p>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Advanced Settings Panel
// ─────────────────────────────────────────────────────────────────────────────

const Tooltip = memo(function Tooltip({ text }: { text: string }) {
  return (
    <span className="group/tip relative inline-flex cursor-help">
      <HelpCircle className="h-3.5 w-3.5 text-text-muted transition group-hover/tip:text-purple-400" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg border border-white/10 bg-[#1a1625] px-3 py-2 text-xs leading-relaxed text-text-secondary opacity-0 shadow-xl transition-opacity group-hover/tip:opacity-100">
        {text}
      </span>
    </span>
  );
});

const AdvancedSettings = memo(function AdvancedSettings({
  samplingRate,
  setSamplingRate,
  maxNewToken,
  setMaxNewToken,
  tempLinks,
  setTempLinks,
  disabled,
}: {
  samplingRate: string;
  setSamplingRate: (v: string) => void;
  maxNewToken: string;
  setMaxNewToken: (v: string) => void;
  tempLinks: boolean;
  setTempLinks: (v: boolean) => void;
  disabled?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <Settings2 className="h-5 w-5 text-text-muted" />
          <span className="font-medium text-white">Advanced Settings</span>
        </div>
        <ChevronDown className={cn(
          'h-5 w-5 text-text-muted transition-transform duration-200',
          isExpanded && 'rotate-180'
        )} />
      </button>

      {isExpanded && (
        <div className="border-t border-white/10 p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="flex items-center gap-1.5 text-sm text-text-muted">
                Sampling Rate (Hz)
                <Tooltip text="Audio sample frequency in Hertz. Higher values produce better quality audio but increase generation time. Default: 32000, Minimum: 10000." />
              </span>
              <input
                type="number"
                value={samplingRate}
                onChange={(e) => setSamplingRate(e.target.value)}
                placeholder="32000"
                min={10000}
                disabled={disabled}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-purple-500/50 focus:outline-none"
              />
              <p className="text-xs text-text-muted">Default: 32000, Min: 10000</p>
            </label>
            <label className="space-y-2">
              <span className="flex items-center gap-1.5 text-sm text-text-muted">
                Max New Tokens
                <Tooltip text="Controls the length of the generated audio. Higher values produce longer audio output. Range: 256 (shortest) to 1024 (longest). Each token roughly represents a small audio segment." />
              </span>
              <input
                type="number"
                value={maxNewToken}
                onChange={(e) => setMaxNewToken(e.target.value)}
                placeholder="256-1024"
                min={256}
                max={1024}
                disabled={disabled}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-purple-500/50 focus:outline-none"
              />
              <p className="text-xs text-text-muted">Controls output length (256-1024)</p>
            </label>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm font-medium text-white">Temporary Links</p>
                <p className="text-xs text-text-muted">Use short-lived URLs for output</p>
              </div>
              <Tooltip text="When enabled, generated audio URLs will expire after a short period. Use this if you plan to download the audio immediately and don't need permanent links." />
            </div>
            <Toggle enabled={tempLinks} onToggle={() => setTempLinks(!tempLinks)} disabled={disabled} />
          </div>
        </div>
      )}
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
                {item.duration ? ` • ${formatTime(item.duration)}` : ''}
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

export default function MusicGenPlayground() {
  // Prompt State
  const [prompt, setPrompt] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);

  // Melody Conditioning State
  const [useMelody, setUseMelody] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [initAudioUrl, setInitAudioUrl] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');

  // Advanced Settings
  const [samplingRate, setSamplingRate] = useState('');
  const [maxNewToken, setMaxNewToken] = useState('');
  const [tempLinks, setTempLinks] = useState(false);

  // Generation State
  const [generation, setGeneration] = useState<GenerationState>({ kind: 'ready' });
  const [response, setResponse] = useState<ModelslabTextToSpeechResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Refs
  const abortRef = useRef<AbortController | null>(null);
  const pollTimeoutRef = useRef<number | null>(null);

  // Derived
  const primaryAudioUrl = useMemo(() => pickPrimaryAudioUrl(response), [response]);
  const isBusy = generation.kind === 'generating' || generation.kind === 'polling';

  // Build composite prompt from selections
  const compositePrompt = useMemo(() => {
    const parts: string[] = [];
    if (prompt.trim()) parts.push(prompt.trim());
    if (selectedMoods.length > 0) parts.push(selectedMoods.join(', '));
    if (selectedInstruments.length > 0) parts.push(selectedInstruments.join(', '));
    return parts.join(', ');
  }, [prompt, selectedMoods, selectedInstruments]);

  // Handle genre selection
  const handleGenreSelect = useCallback((genre: typeof GENRE_PRESETS[number]) => {
    if (selectedGenre === genre.id) {
      setSelectedGenre(null);
      if (prompt === genre.prompt) setPrompt('');
    } else {
      setSelectedGenre(genre.id);
      setPrompt(genre.prompt);
    }
  }, [selectedGenre, prompt]);

  // Toggle mood/instrument tags
  const toggleMood = useCallback((mood: string) => {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    );
  }, []);

  const toggleInstrument = useCallback((instrument: string) => {
    setSelectedInstruments((prev) =>
      prev.includes(instrument) ? prev.filter((i) => i !== instrument) : [...prev, instrument]
    );
  }, []);

  // Randomize prompt
  const randomizePrompt = useCallback(() => {
    const randomGenre = GENRE_PRESETS[Math.floor(Math.random() * GENRE_PRESETS.length)];
    const randomMoods = MOOD_TAGS.slice().sort(() => 0.5 - Math.random()).slice(0, 2);
    const randomInstruments = INSTRUMENT_TAGS.slice().sort(() => 0.5 - Math.random()).slice(0, 3);

    setSelectedGenre(randomGenre.id);
    setPrompt(randomGenre.prompt);
    setSelectedMoods([...randomMoods]);
    setSelectedInstruments([...randomInstruments]);
  }, []);

  // Cancel generation
  const cancelGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (pollTimeoutRef.current) {
      window.clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    setGeneration({ kind: 'ready' });
  }, []);

  // Dual-path polling: job API primary, ModelsLab direct fallback
  const pollForResult = useCallback(
    async (jobId: string | null, modelsLabId: number, historyItem: Omit<HistoryItem, 'audioUrl' | 'duration'>) => {
      let attempt = 0;

      const pollOnce = async () => {
        try {
          if (jobId) {
            // Primary path: poll our job API
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
              setHistory((prev) => [{ ...historyItem, audioUrl: job.resultUrl! }, ...prev].slice(0, 10));
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
            // Fallback: poll ModelsLab directly
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
                setHistory((prev) => [
                  { ...historyItem, audioUrl: url, duration: data.audio_time },
                  ...prev,
                ].slice(0, 10));
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

  // Generate music
  const generate = useCallback(async () => {
    const finalPrompt = compositePrompt.trim();
    if (!finalPrompt) {
      setGeneration({ kind: 'error', message: 'Please enter a prompt or select a genre' });
      return;
    }
    if (finalPrompt.length > MAX_PROMPT_LENGTH) {
      setGeneration({ kind: 'error', message: `Prompt too long (max ${MAX_PROMPT_LENGTH} characters)` });
      return;
    }

    const parsedSamplingRate = samplingRate.trim() ? Number(samplingRate) : undefined;
    if (samplingRate.trim() && (!Number.isFinite(parsedSamplingRate) || (parsedSamplingRate ?? 0) < 10000)) {
      setGeneration({ kind: 'error', message: 'Sampling rate must be at least 10000' });
      return;
    }

    const parsedMaxNewToken = maxNewToken.trim() ? Number(maxNewToken) : undefined;
    if (maxNewToken.trim() && (!Number.isFinite(parsedMaxNewToken) || (parsedMaxNewToken ?? 0) < 256 || (parsedMaxNewToken ?? 0) > 1024)) {
      setGeneration({ kind: 'error', message: 'Max new tokens must be between 256 and 1024' });
      return;
    }

    let initAudioPayload = '';
    let initAudioFormat: 'url' | 'base64' = 'url';
    let initAudioLabel: string | undefined;

    if (useMelody) {
      if (inputMode === 'url') {
        const normalized = normalizeUrl(initAudioUrl);
        if (!normalized) {
          setGeneration({ kind: 'error', message: 'Please enter a melody URL' });
          return;
        }
        initAudioPayload = normalized;
        initAudioFormat = 'url';
        initAudioLabel = truncate(normalized, 50);
      } else {
        if (!uploadedFile) {
          setGeneration({ kind: 'error', message: 'Please upload a melody file' });
          return;
        }
        initAudioFormat = 'base64';
        initAudioLabel = uploadedFile.name;
      }
    }

    cancelGeneration();
    setGeneration({ kind: 'generating' });
    setResponse(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (useMelody && initAudioFormat === 'base64' && uploadedFile) {
        initAudioPayload = await fileToDataUrl(uploadedFile);
      }

      const historyItem: Omit<HistoryItem, 'audioUrl' | 'duration'> = {
        id: generateId(),
        createdAt: Date.now(),
        prompt: finalPrompt,
        initAudioLabel,
      };

      const res = await fetch('/api/modelslab/music-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-vp-user-id': getUserId() },
        body: JSON.stringify({
          prompt: finalPrompt,
          sampling_rate: parsedSamplingRate,
          max_new_token: parsedMaxNewToken,
          temp: tempLinks,
          ...(useMelody
            ? {
                init_audio: initAudioPayload,
                init_audio_format: initAudioFormat,
              }
            : null),
        }),
        signal: controller.signal,
      });

      const data = (await res.json()) as ModelslabTextToSpeechResponse & { message?: string; job?: { id: string; trackId?: number; webhookEnabled?: boolean } };

      if (!res.ok || data.status === 'error') {
        throw new Error(data.message || 'Generation failed');
      }

      const jobId = data.job?.id ?? null;

      setResponse(data);

      if (data.status === 'processing' && typeof data.id === 'number') {
        setGeneration({ kind: 'polling', id: data.id, jobId: jobId ?? undefined });
        await pollForResult(jobId, data.id, historyItem);
        return;
      }

      if (data.status !== 'success') {
        throw new Error(data.message || 'Unexpected status');
      }

      const url = pickPrimaryAudioUrl(data);
      if (url) {
        setHistory((prev) => [
          { ...historyItem, audioUrl: url, duration: data.audio_time },
          ...prev,
        ].slice(0, 10));
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
  }, [
    compositePrompt,
    samplingRate,
    maxNewToken,
    useMelody,
    inputMode,
    initAudioUrl,
    uploadedFile,
    tempLinks,
    cancelGeneration,
    pollForResult,
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      cancelGeneration();
    };
  }, [cancelGeneration]);

  // Handle history item selection
  const handleHistorySelect = useCallback((item: HistoryItem) => {
    setPrompt(item.prompt);
    setResponse({
      status: 'success',
      output: [item.audioUrl],
    });
  }, []);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[420px,1fr]">
      {/* ───────────────────── Left Column: Controls ───────────────────── */}
      <section className="flex flex-col gap-5">
        {/* Genre Presets */}
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Quick Start</h3>
            <button
              type="button"
              onClick={randomizePrompt}
              disabled={isBusy}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-text-muted transition hover:bg-white/10 hover:text-white"
            >
              <Shuffle className="h-3.5 w-3.5" />
              Surprise me
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {GENRE_PRESETS.map((genre) => (
              <GenreCard
                key={genre.id}
                preset={genre}
                isActive={selectedGenre === genre.id}
                onClick={() => handleGenreSelect(genre)}
                disabled={isBusy}
              />
            ))}
          </div>
        </div>

        {/* Prompt Input */}
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-400" />
            <h3 className="font-semibold text-white">Describe Your Music</h3>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setSelectedGenre(null);
            }}
            placeholder="Describe the music you want to create...&#10;e.g., A dreamy synth melody with soft pads and gentle arpeggios"
            rows={4}
            disabled={isBusy}
            className={cn(
              'mt-4 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white placeholder:text-text-muted transition focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20',
              isBusy && 'cursor-not-allowed opacity-50'
            )}
          />
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className={cn(
              'text-text-muted',
              compositePrompt.length > MAX_PROMPT_LENGTH && 'text-red-400'
            )}>
              {compositePrompt.length}/{MAX_PROMPT_LENGTH}
            </span>
            {prompt && (
              <button
                type="button"
                onClick={() => {
                  setPrompt('');
                  setSelectedGenre(null);
                  setSelectedMoods([]);
                  setSelectedInstruments([]);
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

        {/* Mood & Instruments Tags */}
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
          <h3 className="font-semibold text-white">Mood</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {MOOD_TAGS.map((mood) => (
              <TagButton
                key={mood}
                label={mood}
                isActive={selectedMoods.includes(mood)}
                onClick={() => toggleMood(mood)}
                disabled={isBusy}
              />
            ))}
          </div>

          <h3 className="mt-5 font-semibold text-white">Instruments</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {INSTRUMENT_TAGS.map((instrument) => (
              <TagButton
                key={instrument}
                label={instrument}
                isActive={selectedInstruments.includes(instrument)}
                onClick={() => toggleInstrument(instrument)}
                disabled={isBusy}
              />
            ))}
          </div>
        </div>

        {/* Melody Conditioning */}
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-purple-400" />
              <h3 className="font-semibold text-white">Melody Reference</h3>
            </div>
            <Toggle enabled={useMelody} onToggle={() => setUseMelody(!useMelody)} disabled={isBusy} />
          </div>

          {useMelody && (
            <div className="mt-4">
              <MelodyUpload
                inputMode={inputMode}
                setInputMode={setInputMode}
                initAudioUrl={initAudioUrl}
                setInitAudioUrl={setInitAudioUrl}
                uploadedFile={uploadedFile}
                setUploadedFile={setUploadedFile}
                uploadError={uploadError}
                setUploadError={setUploadError}
                disabled={isBusy}
              />
            </div>
          )}
        </div>

        {/* Advanced Settings */}
        <AdvancedSettings
          samplingRate={samplingRate}
          setSamplingRate={setSamplingRate}
          maxNewToken={maxNewToken}
          setMaxNewToken={setMaxNewToken}
          tempLinks={tempLinks}
          setTempLinks={setTempLinks}
          disabled={isBusy}
        />

        {/* Generate Button */}
        <button
          type="button"
          onClick={generate}
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
                Generate Music
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
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">AI Music Studio</h2>
                <p className="text-sm text-text-muted">
                  {generation.kind === 'generating' || generation.kind === 'polling'
                    ? 'Creating your music...'
                    : primaryAudioUrl
                    ? 'Your track is ready'
                    : 'Generate instrumental music'}
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
                  <Music2 className="h-8 w-8 text-purple-400" />
                </div>
              </div>
              <p className="mt-6 font-medium text-white">
                {generation.kind === 'generating' ? 'Starting generation...' : 'Creating your music...'}
              </p>
              {generation.kind === 'polling' && (
                <>
                  <div className="mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full animate-pulse rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                      style={{ width: '60%' }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-text-muted">This may take a moment</p>
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
            <WaveformPlayer src={primaryAudioUrl} downloadFilename="ai-music.mp3" />
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
