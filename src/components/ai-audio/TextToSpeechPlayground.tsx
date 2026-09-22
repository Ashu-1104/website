'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clock,
  Download,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModelslabTextToSpeechResponse, ModelslabVoice } from '@/lib/modelslab';
import { getUserId } from '@/hooks/useApi';

const MAX_PROMPT_LENGTH = 2500;
const EMOTION_SUPPORTED_VOICE_IDS = new Set(['tara', 'leah', 'jess', 'mia', 'zoe', 'leo', 'dan', 'zac']);
const EMOTION_TAGS = [
  { tag: '<laugh>', label: 'Laugh', emoji: '😄' },
  { tag: '<chuckle>', label: 'Chuckle', emoji: '😏' },
  { tag: '<sigh>', label: 'Sigh', emoji: '😮‍💨' },
  { tag: '<cough>', label: 'Cough', emoji: '😷' },
  { tag: '<sniffle>', label: 'Sniffle', emoji: '🤧' },
  { tag: '<groan>', label: 'Groan', emoji: '😩' },
  { tag: '<yawn>', label: 'Yawn', emoji: '🥱' },
  { tag: '<gasp>', label: 'Gasp', emoji: '😲' },
] as const;

type LanguageSample = { label: string; language: string; text: string; emotion?: boolean };

const LANGUAGE_SAMPLES: LanguageSample[] = [
  {
    label: 'English',
    language: 'english',
    text: 'Hello! Welcome to the text-to-speech playground. Try different voices and languages to find the perfect match for your project.',
  },
  {
    label: 'English Emotion',
    language: 'english',
    text: 'Oh wow, that is absolutely incredible! <laugh> I never expected it to sound this natural. <sigh> If only all technology worked this well. <gasp> Wait, did you hear that? It actually sounds like a real person!',
    emotion: true,
  },
  {
    label: 'Hindi',
    language: 'hindi',
    text: 'यह हिंदी में दो दोस्तों राहुल और अमित के बीच परीक्षा की तैयारी को लेकर एक सरल संवाद है। संवाद में एक-दूसरे का हाल-चाल, पढ़ाई की स्थिति और परीक्षा के तनाव पर चर्चा की गई है।',
  },
  {
    label: 'French',
    language: 'french',
    text: 'Bonjour et bienvenue ! La technologie de synthèse vocale permet de transformer du texte en parole naturelle dans de nombreuses langues différentes.',
  },
  {
    label: 'Japanese',
    language: 'japanese',
    text: 'こんにちは！テキスト読み上げのプレイグラウンドへようこそ。さまざまな声と言語を試して、プロジェクトに最適な組み合わせを見つけてください。',
  },
  {
    label: 'Spanish',
    language: 'spanish',
    text: '¡Hola y bienvenidos! La tecnología de síntesis de voz permite convertir texto en habla natural en muchos idiomas diferentes.',
  },
  {
    label: 'Italian',
    language: 'italian',
    text: 'Ciao e benvenuti! La tecnologia di sintesi vocale permette di trasformare il testo in parlato naturale in molte lingue diverse.',
  },
  {
    label: 'Chinese',
    language: 'mandarin chinese',
    text: '你好！欢迎来到文字转语音体验平台。请尝试不同的语音和语言，为您的项目找到最完美的搭配。',
  },
];

type GenderFilter = 'all' | 'female' | 'male';

type GenerationState =
  | { kind: 'idle' }
  | { kind: 'loadingVoices' }
  | { kind: 'ready' }
  | { kind: 'generating' }
  | { kind: 'polling'; id: number; nextPollInMs?: number }
  | { kind: 'error'; message: string };

type GenerationHistoryItem = {
  createdAt: number;
  voice_id: string;
  voice_name: string;
  prompt: string;
  audioUrl: string;
  audioTime?: number;
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

function normalize(value: string) {
  return value.trim().toLowerCase();
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

export default function TextToSpeechPlayground() {
  const [voices, setVoices] = useState<ModelslabVoice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');

  const [prompt, setPrompt] = useState('Build next-generation AI products without worrying about GPUs.');
  const [speed, setSpeed] = useState<number>(1);
  const [emotion, setEmotion] = useState<boolean>(false);
  const [tempLinks, setTempLinks] = useState<boolean>(false);

  const [generation, setGeneration] = useState<GenerationState>({ kind: 'loadingVoices' });
  const [ttsResponse, setTtsResponse] = useState<ModelslabTextToSpeechResponse | null>(null);
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const generateAbortRef = useRef<AbortController | null>(null);
  const pollTimeoutRef = useRef<number | null>(null);

  // Audio preload cache for faster preview playback
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Create voice lookup map for O(1) access
  const voiceMap = useMemo(() => {
    const map = new Map<string, ModelslabVoice>();
    for (const voice of voices) {
      map.set(voice.voice_id, voice);
    }
    return map;
  }, [voices]);

  const searchIndex = useMemo(() => {
    const index = new Map<string, string>();
    for (const voice of voices) {
      index.set(
        voice.voice_id,
        `${voice.name} ${voice.voice_id} ${voice.language} ${voice.gender}`.toLowerCase()
      );
    }
    return index;
  }, [voices]);

  const languages = useMemo(() => {
    const unique = new Set<string>();
    for (const voice of voices) unique.add(voice.language);
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [voices]);

  // O(1) lookup using voiceMap instead of O(n) find
  const selectedVoice = selectedVoiceId ? voiceMap.get(selectedVoiceId) ?? null : null;

  const emotionSupported = useMemo(() => {
    if (!selectedVoice) return false;
    return (
      normalize(selectedVoice.language) === 'english' &&
      EMOTION_SUPPORTED_VOICE_IDS.has(normalize(selectedVoice.voice_id))
    );
  }, [selectedVoice]);

	  useEffect(() => {
	    if (!emotionSupported && emotion) setEmotion(false);
	  }, [emotionSupported, emotion]);

	  const isBusy =
	    generation.kind === 'generating' || generation.kind === 'polling' || generation.kind === 'loadingVoices';

	  // Direct filtering without deferred value for instant response
	  const filteredVoices = useMemo(() => {
	    const q = normalize(searchQuery);
	    const language = languageFilter === 'all' ? null : languageFilter;
	    const gender = genderFilter === 'all' ? null : genderFilter;

    // Single pass filter for better performance
    const filtered: ModelslabVoice[] = [];
    for (const voice of voices) {
      if (language && voice.language !== language) continue;
      if (gender && normalize(voice.gender) !== gender) continue;
      if (q && !searchIndex.get(voice.voice_id)?.includes(q)) continue;
      filtered.push(voice);
    }

    // Sort in place for better performance
	    filtered.sort((a, b) => a.name.localeCompare(b.name));
	    return filtered;
	  }, [voices, searchQuery, languageFilter, genderFilter, searchIndex]);

	  const voicesMatchingFilters = useMemo(() => {
	    const language = languageFilter === 'all' ? null : languageFilter;
	    const gender = genderFilter === 'all' ? null : genderFilter;

	    const filtered: ModelslabVoice[] = [];
	    for (const voice of voices) {
	      if (language && voice.language !== language) continue;
	      if (gender && normalize(voice.gender) !== gender) continue;
	      filtered.push(voice);
	    }

	    filtered.sort((a, b) => a.name.localeCompare(b.name));
	    return filtered;
	  }, [voices, languageFilter, genderFilter]);

	  // Keep selection consistent with filter dropdowns (avoid a "hidden" selected voice)
	  useEffect(() => {
	    if (isBusy) return;
	    if (!voicesMatchingFilters.length) return;
	    if (selectedVoiceId && voicesMatchingFilters.some((voice) => voice.voice_id === selectedVoiceId)) return;
	    setSelectedVoiceId(voicesMatchingFilters[0]?.voice_id ?? null);
	  }, [voicesMatchingFilters, isBusy, selectedVoiceId]);

  const primaryAudioUrl = useMemo(() => pickPrimaryAudioUrl(ttsResponse), [ttsResponse]);

  const stopPreview = useCallback(() => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setPreviewingVoiceId(null);
  }, []);

  // Preload audio for a voice (called on hover)
  const preloadAudio = useCallback((voice: ModelslabVoice) => {
    if (!voice.sound_clip) return;
    if (audioCache.current.has(voice.voice_id)) return;

    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = voice.sound_clip;
    audioCache.current.set(voice.voice_id, audio);
  }, []);

  // Preload audio when voice is selected for instant preview
  useEffect(() => {
    if (selectedVoice) {
      preloadAudio(selectedVoice);
    }
  }, [selectedVoice, preloadAudio]);

  // Optimized play preview with caching
  const playPreview = useCallback(
    (voice: ModelslabVoice) => {
      if (!voice.sound_clip) return;
      // Toggle off if same voice
      if (previewingVoiceId === voice.voice_id) {
        stopPreview();
        return;
      }

      // Stop current preview
      stopPreview();

      // Check cache first for instant playback
      let audio = audioCache.current.get(voice.voice_id);
      if (!audio) {
        audio = new Audio(voice.sound_clip);
        audio.preload = 'auto';
        audioCache.current.set(voice.voice_id, audio);
      }

      // Reset and play
      audio.currentTime = 0;

      // Set state immediately for instant UI feedback
      setPreviewingVoiceId(voice.voice_id);

      // Update main ref for onEnded handler
      previewAudioRef.current = audio;

      // Play with error handling
      audio.play().catch(() => {
        setPreviewingVoiceId(null);
      });

      // Handle end of audio
      audio.onended = () => {
        setPreviewingVoiceId(null);
      };
    },
    [previewingVoiceId, stopPreview]
  );

  const cancelGeneration = useCallback(() => {
    generateAbortRef.current?.abort();
    generateAbortRef.current = null;
    if (pollTimeoutRef.current) {
      window.clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    setGeneration({ kind: 'ready' });
  }, []);

  // Poll via standardized job tracking API (/api/jobs/{id})
  // Falls back to direct ModelsLab polling if no job was created
  const pollForResult = useCallback(
    async (jobId: string | null, modelsLabId: number) => {
      let attempt = 0;

      const pollOnce = async () => {
        try {
          let audioUrl: string | null = null;
          let stillProcessing = false;
          let eta: number | undefined;
          let audioTime: number | undefined;

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
              throw new Error(data.job.errorMessage || 'Text-to-speech generation failed');
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

            setTtsResponse(data);

            if (data.status === 'success') {
              audioUrl = pickPrimaryAudioUrl(data);
              audioTime = data.audio_time;
            } else if (data.status === 'processing') {
              stillProcessing = true;
              eta = data.eta;
            } else {
              throw new Error(data.message || 'Unexpected response status');
            }
          }

          if (audioUrl) {
            setTtsResponse({ status: 'success', output: [audioUrl] });
            setGeneration({ kind: 'ready' });
            if (selectedVoice) {
              setHistory((prev) => {
                const next: GenerationHistoryItem[] = [
                  {
                    createdAt: Date.now(),
                    voice_id: selectedVoice.voice_id,
                    voice_name: selectedVoice.name,
                    prompt,
                    audioUrl: audioUrl!,
                    audioTime,
                  },
                  ...prev,
                ];
                return next.slice(0, 8);
              });
            }
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
    },
    [prompt, selectedVoice]
  );

  const generateSpeech = useCallback(async () => {
    if (!selectedVoice) {
      setGeneration({ kind: 'error', message: 'Select a voice to continue.' });
      return;
    }

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setGeneration({ kind: 'error', message: 'Enter some text to convert to speech.' });
      return;
    }
    if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
      setGeneration({
        kind: 'error',
        message: `Text is too long (${trimmedPrompt.length}/${MAX_PROMPT_LENGTH}).`,
      });
      return;
    }

    cancelGeneration();
    setGeneration({ kind: 'generating' });
    setTtsResponse(null);

    const controller = new AbortController();
    generateAbortRef.current = controller;

    try {
      const response = await fetch('/api/modelslab/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-vp-user-id': getUserId() },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          voice_id: selectedVoice.voice_id,
          language: selectedVoice.language,
          speed,
          emotion: emotionSupported ? emotion : false,
          temp: tempLinks,
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

      setTtsResponse(data);

      if (data.status === 'processing' && typeof data.id === 'number') {
        const jobId = data.job?.id ?? null;
        setGeneration({ kind: 'polling', id: data.id });
        await pollForResult(jobId, data.id);
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
              prompt: trimmedPrompt,
              audioUrl: url,
              audioTime: data.audio_time,
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

      setGeneration({ kind: 'error', message: getErrorMessage(error, 'Text-to-speech request failed') });
    } finally {
      generateAbortRef.current = null;
    }
  }, [selectedVoice, prompt, speed, emotion, tempLinks, emotionSupported, cancelGeneration, pollForResult]);

  const insertEmotionTag = useCallback((tag: string) => {
    setPrompt((current) => (current ? `${current} ${tag}` : tag));
  }, []);

  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setLanguageDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Audio player state for custom controls
  const outputAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

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
        const response = await fetch('/api/modelslab/voices', { signal: controller.signal });
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
	      stopPreview();
	      cancelGeneration();
	    };
	  }, [stopPreview, cancelGeneration]);

	  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[380px,1fr]">
      {/* Hidden audio elements */}
      <audio ref={previewAudioRef} preload="none" onEnded={() => setPreviewingVoiceId(null)} />
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

      {/* Voice Library Section */}
      <section className="flex max-h-[calc(100vh-200px)] flex-col rounded-2xl border border-white/10 bg-[var(--bg-secondary)] shadow-card">
        {/* Header */}
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
	          <div className="grid grid-cols-[1fr,150px] gap-3">
	            {/* Search */}
	            <div className="relative">
	              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
	              <input
	                value={searchQuery}
	                onChange={(event) => setSearchQuery(event.target.value)}
	                placeholder="Search voice or language…"
	                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-text-muted focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20"
	                aria-label="Search voice or language"
	                disabled={isBusy}
	              />
	            </div>

	            {/* Language Dropdown - Custom styled */}
	            <div className="relative" ref={languageDropdownRef}>
	              <button
	                type="button"
	                onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
	                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white transition hover:bg-white/10 focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20"
	                disabled={isBusy}
	              >
	                <span className={cn('truncate', languageFilter === 'all' && 'text-text-secondary')}>
	                  {languageFilter === 'all' ? 'All languages' : languageFilter}
	                </span>
	                <ChevronDown
	                  className={cn(
	                    'h-4 w-4 shrink-0 text-text-muted transition-transform',
	                    languageDropdownOpen && 'rotate-180'
	                  )}
	                />
	              </button>
	              {languageDropdownOpen && (
	                <div className="voice-list-scroll absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-xl border border-white/10 bg-[var(--bg-secondary)] py-1 shadow-lg">
	                  <button
	                    type="button"
	                    onClick={() => {
	                      setLanguageFilter('all');
	                      setLanguageDropdownOpen(false);
	                    }}
	                    className={cn(
	                      'flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition hover:bg-white/10',
	                      languageFilter === 'all' ? 'text-accent-pink' : 'text-text-secondary'
	                    )}
	                  >
	                    {languageFilter === 'all' && <Check className="h-3 w-3" />}
	                    <span className={languageFilter === 'all' ? '' : 'pl-5'}>All languages</span>
	                  </button>
	                  {languages.map((language) => (
	                    <button
	                      key={language}
	                      type="button"
	                      onClick={() => {
	                        setLanguageFilter(language);
	                        setLanguageDropdownOpen(false);
	                      }}
	                      className={cn(
	                        'flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition hover:bg-white/10',
	                        languageFilter === language ? 'text-accent-pink' : 'text-text-secondary'
	                      )}
	                    >
	                      {languageFilter === language && <Check className="h-3 w-3" />}
	                      <span className={languageFilter === language ? '' : 'pl-5'}>{language}</span>
	                    </button>
	                  ))}
	                </div>
	              )}
	            </div>
	          </div>

          {/* Gender Pills */}
	          <div className="flex gap-2">
	            {(['all', 'female', 'male'] as const).map((value) => {
	              const selected = genderFilter === value;
	              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGenderFilter(value)}
                  className={cn(
                    'flex-1 rounded-xl border py-2 text-sm font-medium transition',
	                    selected
	                      ? 'border-accent-pink/50 bg-accent-pink/15 text-white'
	                      : 'border-white/10 bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white'
	                  )}
	                  disabled={isBusy}
	                >
	                  {value === 'all' ? 'All' : value === 'female' ? '♀ Female' : '♂ Male'}
	                </button>
	              );
	            })}
          </div>
        </div>

        {/* Voice List - Scrollable */}
        <div className="voice-list-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
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
                  onClick={() => { setSearchQuery(''); setLanguageFilter('all'); setGenderFilter('all'); }}
                  className="mt-2 text-sm text-accent-pink hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}

            {filteredVoices.map((voice) => {
              const isSelected = selectedVoiceId === voice.voice_id;
              const isPreviewing = previewingVoiceId === voice.voice_id;

              return (
                <div
                  key={voice.voice_id}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl border p-3 transition-colors cursor-pointer',
                    isSelected
                      ? 'border-accent-pink/50 bg-gradient-to-r from-accent-pink/15 to-purple-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                  )}
                  onClick={() => !isBusy && setSelectedVoiceId(voice.voice_id)}
                  onMouseEnter={() => preloadAudio(voice)}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-pink shadow-lg">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}

                  {/* Thumbnail */}
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/20">
                    <Image
                      src={voice.thumbnail}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{voice.voice_id}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
                      <span className="truncate">{voice.language}</span>
                      <span>•</span>
                      <span className="capitalize">{voice.gender}</span>
                    </div>
                  </div>

                  {/* Preview Button */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); playPreview(voice); }}
                    className={cn(
                      'inline-flex h-10 w-10 items-center justify-center rounded-xl border transition',
                      isPreviewing
                        ? 'border-accent-pink/50 bg-accent-pink/20 text-white'
                        : !voice.sound_clip
                          ? 'cursor-not-allowed border-white/10 bg-white/5 text-text-muted'
                        : 'border-white/10 bg-white/5 text-text-secondary hover:bg-white/15 hover:text-white'
                    )}
                    aria-label={!voice.sound_clip ? 'Preview unavailable' : isPreviewing ? 'Stop preview' : 'Preview voice'}
                    disabled={isBusy || !voice.sound_clip}
                  >
                    {!voice.sound_clip ? (
                      <VolumeX className="h-4 w-4" />
                    ) : isPreviewing ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 ml-0.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="flex flex-col gap-5">
        {/* Selected Voice Banner */}
        {selectedVoice ? (
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-accent-pink/10 via-purple-500/10 to-transparent p-4 shadow-card">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-accent-pink/30 bg-black/20 shadow-lg">
              <Image
                src={selectedVoice.thumbnail}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
                priority
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium uppercase tracking-wider text-accent-pink">Selected Voice</div>
              <div className="mt-1 truncate text-lg font-bold text-white">{selectedVoice.voice_id}</div>
              <div className="mt-0.5 flex items-center gap-2 text-sm text-text-muted">
                <span>{selectedVoice.language}</span>
                <span>•</span>
                <span className="capitalize">{selectedVoice.gender}</span>
                {emotionSupported && (
                  <>
                    <span>•</span>
                    <span className="text-accent-pink">Emotion supported</span>
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => playPreview(selectedVoice)}
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl border transition',
                previewingVoiceId === selectedVoice.voice_id
                  ? 'border-accent-pink/50 bg-accent-pink/20 text-white'
                  : !selectedVoice.sound_clip
                    ? 'cursor-not-allowed border-white/10 bg-white/5 text-text-muted'
                  : 'border-white/10 bg-white/10 text-white hover:bg-white/20'
              )}
              disabled={isBusy || !selectedVoice.sound_clip}
            >
              {!selectedVoice.sound_clip ? (
                <VolumeX className="h-5 w-5" />
              ) : previewingVoiceId === selectedVoice.voice_id ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </button>
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

        {/* Text Input Card */}
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5 shadow-card">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-white" htmlFor="tts-prompt">
              Enter your text
            </label>
            <div className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              prompt.length > MAX_PROMPT_LENGTH
                ? 'bg-red-500/20 text-red-400'
                : prompt.length > MAX_PROMPT_LENGTH * 0.8
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-white/10 text-text-muted'
            )}>
              {prompt.length.toLocaleString()}/{MAX_PROMPT_LENGTH.toLocaleString()}
            </div>
          </div>

          <textarea
            id="tts-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={5}
            className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-white placeholder:text-text-muted focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20"
            placeholder="Type or paste the text you want to convert to speech…"
            disabled={isBusy}
          />

          {/* Language Sample Texts */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-text-muted">Try samples:</span>
            {LANGUAGE_SAMPLES.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => {
                  setPrompt(sample.text);
                  setLanguageFilter(sample.language);
                  setGenderFilter('all');

                  // Find a matching voice for this language
                  const matching = voices.filter((v) => v.language === sample.language);

                  if (sample.emotion) {
                    // For emotion samples, prefer an emotion-supported voice
                    setEmotion(true);
                    const emotionVoice = matching.find((v) =>
                      EMOTION_SUPPORTED_VOICE_IDS.has(normalize(v.voice_id))
                    );
                    if (emotionVoice) {
                      setSelectedVoiceId(emotionVoice.voice_id);
                    } else if (matching.length > 0) {
                      setSelectedVoiceId(matching[0]!.voice_id);
                    }
                  } else {
                    if (matching.length > 0) {
                      setSelectedVoiceId(matching[0]!.voice_id);
                    }
                  }
                }}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-text-secondary transition hover:border-accent-pink/30 hover:bg-accent-pink/10 hover:text-white"
                disabled={isBusy}
              >
                {sample.label}
              </button>
            ))}
            {prompt && (
              <button
                type="button"
                onClick={() => setPrompt('')}
                className="ml-auto flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-text-secondary transition hover:bg-white/10 hover:text-white"
                disabled={isBusy}
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>

          {/* Emotion Tags - Only show when supported */}
          {emotionSupported && (
            <div className="mt-4 rounded-xl border border-accent-pink/20 bg-accent-pink/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent-pink" />
                  <span className="text-sm font-medium text-white">Emotion Tags</span>
                </div>
                <label className="flex cursor-pointer items-center gap-2">
                  <span className="text-xs text-text-muted">{emotion ? 'Enabled' : 'Disabled'}</span>
                  <div
                    className={cn(
                      'relative h-5 w-9 rounded-full transition-colors',
                      emotion ? 'bg-accent-pink' : 'bg-white/20'
                    )}
                    onClick={() => !isBusy && setEmotion(!emotion)}
                  >
                    <div
                      className={cn(
                        'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                        emotion ? 'translate-x-4' : 'translate-x-0.5'
                      )}
                    />
                  </div>
                </label>
              </div>
              {emotion && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {EMOTION_TAGS.map(({ tag, label, emoji }) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertEmotionTag(tag)}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-text-secondary transition hover:border-accent-pink/30 hover:bg-accent-pink/10 hover:text-white"
                      disabled={isBusy}
                    >
                      <span>{emoji}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings & Generate Row */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Speed Control */}
          <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-4 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">Speed</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSpeed(1)}
                  className={cn(
                    'rounded-lg px-2 py-1 text-xs transition',
                    speed === 1 ? 'bg-accent-pink/20 text-accent-pink' : 'text-text-muted hover:text-white'
                  )}
                  disabled={isBusy}
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
                <span className="min-w-[3rem] rounded-lg bg-white/10 px-2 py-1 text-center text-sm font-semibold text-white">
                  {speed.toFixed(2)}×
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs text-text-muted">0.5×</span>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.05}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent-pink [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-pink [&::-webkit-slider-thumb]:shadow-lg"
                disabled={isBusy}
              />
              <span className="text-xs text-text-muted">2×</span>
            </div>
          </div>

          {/* Temp Links Toggle */}
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-4 shadow-card">
            <div>
              <span className="text-sm font-medium text-white">Temporary Links</span>
              <p className="mt-0.5 text-xs text-text-muted">Audio URLs expire after 24 hours</p>
            </div>
            <label className="flex cursor-pointer items-center">
              <div
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  tempLinks ? 'bg-accent-pink' : 'bg-white/20'
                )}
                onClick={() => !isBusy && setTempLinks(!tempLinks)}
              >
                <div
                  className={cn(
                    'absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform',
                    tempLinks ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </div>
            </label>
          </div>
        </div>

	        {/* Generate Button */}
	        <button
	          type="button"
	          onClick={() => void generateSpeech()}
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
	              <span>Generate Speech</span>
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

        {/* Status Messages */}
        {generation.kind === 'polling' && ttsResponse?.eta && (
          <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
            <Clock className="h-4 w-4" />
            <span>Estimated time: ~{ttsResponse.eta}s</span>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                'h-2 w-2 rounded-full',
                primaryAudioUrl ? 'bg-green-400' : 'bg-white/30'
              )} />
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
              {/* Custom Audio Player */}
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-4">
                  {/* Play/Pause */}
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-pink text-white shadow-lg transition hover:bg-accent-pink/80"
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                  </button>

                  {/* Progress */}
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

                  {/* Volume */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="text-text-secondary hover:text-white"
                    >
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
                  ? 'Generating your audio…'
                  : 'Your generated audio will appear here'}
              </p>
            </div>
          )}
        </div>

        {/* History Section */}
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
                      isCurrentAudio
                        ? 'border-accent-pink/30 bg-accent-pink/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setTtsResponse((current) => (current ? { ...current, output: [item.audioUrl] } : { status: 'success', output: [item.audioUrl] }));
                        // Auto-play when selecting from history
                        setTimeout(() => {
                          const audio = outputAudioRef.current;
                          if (audio) void audio.play();
                        }, 100);
                      }}
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg transition',
                        isCurrentAudio
                          ? 'bg-accent-pink text-white'
                          : 'bg-white/10 text-text-secondary hover:bg-white/20 hover:text-white'
                      )}
                      disabled={isBusy}
                    >
                      <Play className="h-4 w-4 ml-0.5" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-white">{item.voice_id}</span>
                        {item.audioTime && (
                          <span className="shrink-0 text-xs text-text-muted">{item.audioTime.toFixed(1)}s</span>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-text-muted">{truncate(item.prompt, 60)}</div>
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
