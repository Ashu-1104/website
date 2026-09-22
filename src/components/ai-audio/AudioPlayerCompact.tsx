'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

type AudioPlayerCompactProps = {
  src: string | null;
  downloadFilename?: string;
  className?: string;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function AudioPlayerCompact({ src, downloadFilename = 'audio.mp3', className }: AudioPlayerCompactProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolume, setShowVolume] = useState(false);

  const hasSource = Boolean(src);
  const seekMax = useMemo(() => (Number.isFinite(duration) && duration > 0 ? duration : 0), [duration]);
  const progress = seekMax > 0 ? (currentTime / seekMax) * 100 : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !hasSource) return;
    if (isPlaying) {
      audio.pause();
      return;
    }
    void audio.play();
  }, [hasSource, isPlaying]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !hasSource || seekMax <= 0) return;

    const rect = bar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * seekMax;
    audio.currentTime = Math.max(0, Math.min(seekMax, newTime));
    setCurrentTime(audio.currentTime);
  }, [hasSource, seekMax]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextVolume = Number(e.target.value);
    audio.volume = nextVolume;
    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      const restored = volume || 1;
      audio.volume = restored;
      setVolume(restored);
      setIsMuted(false);
      return;
    }
    audio.volume = 0;
    setIsMuted(true);
  }, [isMuted, volume]);

  return (
    <div className={cn('rounded-xl border border-white/10 bg-black/20 p-4', className)}>
      <audio
        ref={audioRef}
        preload="metadata"
        src={src ?? undefined}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />

      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlayPause}
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition',
            hasSource
              ? 'bg-accent-pink text-white shadow-lg hover:bg-accent-pink/90'
              : 'bg-white/10 text-text-muted'
          )}
          disabled={!hasSource}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>

        {/* Progress Section */}
        <div className="min-w-0 flex-1">
          {/* Progress Bar */}
          <div
            ref={progressRef}
            role="slider"
            tabIndex={hasSource && seekMax > 0 ? 0 : -1}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={seekMax}
            aria-valuenow={currentTime}
            onClick={handleProgressClick}
            className={cn(
              'relative h-1.5 w-full cursor-pointer rounded-full bg-white/10',
              (!hasSource || seekMax <= 0) && 'cursor-not-allowed opacity-50'
            )}
          >
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-accent-pink transition-all"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white opacity-0 shadow transition-opacity hover:opacity-100"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>

          {/* Time Display */}
          <div className="mt-1.5 flex justify-between text-xs text-text-muted">
            <span className="tabular-nums">{formatTime(currentTime)}</span>
            <span className="tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume Control */}
        <div
          className="relative"
          onMouseEnter={() => setShowVolume(true)}
          onMouseLeave={() => setShowVolume(false)}
        >
          <button
            type="button"
            onClick={toggleMute}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition hover:bg-white/10 hover:text-white"
            disabled={!hasSource}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {/* Volume Slider Popup */}
          {showVolume && hasSource && (
            <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg border border-white/10 bg-[var(--bg-secondary)] p-2 shadow-xl">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/20 accent-accent-pink [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                aria-label="Volume"
              />
            </div>
          )}
        </div>

        {/* Download Button */}
        <a
          href={src ?? '#'}
          download={downloadFilename}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg transition',
            hasSource
              ? 'text-text-secondary hover:bg-white/10 hover:text-white'
              : 'pointer-events-none text-text-muted opacity-50'
          )}
          aria-disabled={!hasSource}
          aria-label="Download"
        >
          <Download className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
