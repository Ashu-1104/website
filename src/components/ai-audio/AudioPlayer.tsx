'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

type AudioPlayerProps = {
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

export default function AudioPlayer({ src, downloadFilename = 'audio.mp3', className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const hasSource = Boolean(src);
  const seekMax = useMemo(() => (Number.isFinite(duration) && duration > 0 ? duration : 0), [duration]);

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

  const handleSeek = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || !hasSource) return;
    const nextTime = Number(event.target.value);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }, [hasSource]);

  const handleVolumeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextVolume = Number(event.target.value);
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
    <div className={cn('space-y-3', className)}>
      <audio
        ref={audioRef}
        preload="metadata"
        src={src ?? undefined}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={togglePlayPause}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl border transition',
            hasSource
              ? 'border-accent-pink/30 bg-accent-pink/10 text-white hover:bg-accent-pink/20'
              : 'border-white/10 bg-white/5 text-text-muted'
          )}
          disabled={!hasSource}
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>

        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="tabular-nums">{formatTime(currentTime)}</span>
          <span>/</span>
          <span className="tabular-nums">{formatTime(duration)}</span>
        </div>

        <a
          href={src ?? '#'}
          download={downloadFilename}
          className={cn(
            'ml-auto inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition',
            hasSource
              ? 'border-white/10 bg-white/5 text-white hover:bg-white/10'
              : 'pointer-events-none border-white/10 bg-white/5 text-text-muted'
          )}
          aria-disabled={!hasSource}
        >
          <Download className="h-4 w-4" />
          Download
        </a>
      </div>

      <input
        type="range"
        min={0}
        max={seekMax}
        step={0.1}
        value={seekMax > 0 ? Math.min(currentTime, seekMax) : 0}
        onChange={handleSeek}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-accent-pink [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-pink [&::-webkit-slider-thumb]:shadow-lg"
        disabled={!hasSource || seekMax <= 0}
        aria-label="Seek"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleMute}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl border transition',
            'border-white/10 bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white'
          )}
          disabled={!hasSource}
          aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
        >
          {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent-pink [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-pink [&::-webkit-slider-thumb]:shadow-lg"
          disabled={!hasSource}
          aria-label="Volume"
        />
      </div>
    </div>
  );
}

