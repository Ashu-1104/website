'use client';

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Image as ImageIcon, Play, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/context/UserContext';

type PartnerStyle = 'realistic' | 'anime' | 'furry' | 'fantasy';
type PartnerGender = 'male' | 'female' | 'trans';
type VoiceId =
  | 'honey'
  | 'aurora'
  | 'asmr'
  | 'hottie'
  | 'joi'
  | 'sorority'
  | 'posh'
  | 'smooth'
  | 'adventurer'
  | 'conspiracist'
  | 'casual'
  | 'coach'
  | 'formal'
  | 'quirky'
  | 'nerdy'
  | 'adorable'
  | 'custom';

type TagOption = { value: string; label: string };

const STYLE_OPTIONS: ReadonlyArray<{ value: PartnerStyle; label: string }> = [
  { value: 'realistic', label: 'Realistic' },
  { value: 'anime', label: 'Anime' },
  { value: 'furry', label: 'Furry' },
  { value: 'fantasy', label: 'Fantasy' },
];

const GENDER_OPTIONS: ReadonlyArray<{ value: PartnerGender; label: string }> = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'trans', label: 'Trans' },
];

const VOICE_OPTIONS: ReadonlyArray<{ value: VoiceId; label: string; sampleText: string }> = [
  { value: 'honey', label: 'Honey', sampleText: "Hey, I'm Honey. Want to chat?" },
  { value: 'aurora', label: 'Aurora', sampleText: "Hello, I'm Aurora. Let's begin." },
  { value: 'asmr', label: 'ASMR', sampleText: "Hi… I'm ASMR. I'm right here." },
  { value: 'hottie', label: 'Hottie', sampleText: "Hey babe. I'm your Hottie." },
  { value: 'joi', label: 'JOI', sampleText: "I'm JOI. Listen closely." },
  { value: 'sorority', label: 'Sorority', sampleText: "Hi! I'm Sorority. Let's have fun." },
  { value: 'posh', label: 'Posh', sampleText: "Good day. I'm Posh." },
  { value: 'smooth', label: 'Smooth', sampleText: "Hey. I'm Smooth. Nice and easy." },
  { value: 'adventurer', label: 'Adventurer', sampleText: "I'm Adventurer. Ready to explore?" },
  { value: 'conspiracist', label: 'Conspiracist', sampleText: "I'm Conspiracist. I've got theories." },
  { value: 'casual', label: 'Casual', sampleText: "Yo, I'm Casual. What's up?" },
  { value: 'coach', label: 'Coach', sampleText: "I'm Coach. Let's do this together." },
  { value: 'formal', label: 'Formal', sampleText: "Hello. I'm Formal. How may I help?" },
  { value: 'quirky', label: 'Quirky', sampleText: "Hi! I'm Quirky. This is exciting!" },
  { value: 'nerdy', label: 'Nerdy', sampleText: "Hey. I'm Nerdy. Let's talk details." },
  { value: 'adorable', label: 'Adorable', sampleText: "Hi! I'm Adorable. Nice to meet you!" },
];

const TAG_OPTIONS: ReadonlyArray<TagOption> = (() => {
  const rawLabels = [
    'Latina',
    'Blonde',
    'Busty',
    'Submissive',
    'Dominant',
    'BDSM',
    'Romantic',
    'Athletic',
    'Caring',
    'Virgin',
    'College Student',
    'Cheating',
    'Villian',
    'BDSMCute',
    'Goth',
    'Kinky',
    'Arrogant',
    'Foot Fetish',
    'Step Mom',
    'Step Sister',
    'Ebony',
    'Brunette',
    'Redhead',
    'Gamer',
    'Teen',
    'Warrior',
    'Sarcastic',
    'Office Lady',
    'Actress',
    'Movie',
    'Anime Characters',
    'Cartoon Characters',
    'Celebrity',
  ];

  const normalizeValue = (input: string) => input.trim().toLowerCase();
  const seen = new Set<string>();
  const options: TagOption[] = [];

  for (const label of rawLabels) {
    const value = normalizeValue(label);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label });
  }

  return options;
})();

function validateImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Please upload an image file (JPG, PNG, WEBP).';
  const maxBytes = 8 * 1024 * 1024; // Keep localStorage payload reasonable until backend storage exists.
  if (file.size > maxBytes) return 'Image must be smaller than 8MB.';
  return null;
}

function normalizeTagLabel(input: string) {
  return input.trim().replace(/\s+/g, ' ');
}

function normalizeTagValue(input: string) {
  return normalizeTagLabel(input).toLowerCase();
}

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
    // Safari uses a callback-based `decodeAudioData`. Normalize to a Promise for scalability.
    const buffer = await new Promise<AudioBuffer>((resolve, reject) => {
      ctx.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
    });
    return buffer;
  } finally {
    ctx.close().catch(() => undefined);
  }
}

function encodeWav(audioBuffer: AudioBuffer): Blob {
  // Minimal WAV encoder (16-bit PCM). Keeps everything client-side until backend storage exists.
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
  view.setUint32(16, 16, true); // PCM
  view.setUint16(20, 1, true); // Linear PCM
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channels.
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

const STYLE_TO_DB: Record<PartnerStyle, string> = {
  realistic: 'REALISTIC',
  anime: 'ANIME',
  furry: 'FURRY',
  fantasy: 'FANTASY',
};

const GENDER_TO_DB: Record<PartnerGender, string> = {
  male: 'MALE',
  female: 'FEMALE',
  trans: 'TRANS',
};

async function convertBase64ToUrl(base64String: string, type: 'image' | 'voice'): Promise<string> {
  const response = await fetch('/api/modelslab/base64-to-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64_string: base64String, type }),
  });

  const data = await response.json() as { status: string; url?: string; message?: string };
  if (data.status !== 'success' || !data.url) {
    throw new Error(data.message || `Failed to convert ${type} to URL`);
  }
  return data.url;
}

function playPlaceholderVoice(text: string) {
  // Placeholder "sample playback" until URLs are wired from the DB/admin panel.
  // Uses SpeechSynthesis so users hear audio immediately without any network calls.
  if (typeof window === 'undefined') return;
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

type SelectOption<T extends string> = { value: T; label: string };

function DropdownSelect<T extends string>({
  id,
  label,
  required,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  required?: boolean;
  value: T;
  options: ReadonlyArray<SelectOption<T>>;
  onChange: (next: T) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const inside =
        buttonRef.current?.contains(target) ||
        panelRef.current?.contains(target);
      if (inside) return;
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      <label htmlFor={id} className="text-sm font-semibold text-white">
        {label} {required && <span className="text-accent-pink">*</span>}
      </label>

      <button
        id={id}
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
        className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
      >
        <span className="truncate">{selected?.label ?? 'Select'}</span>
        <ChevronDown
          className={cn('h-4 w-4 text-text-secondary transition-transform', isOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 z-50 mt-2 rounded-xl border border-white/10 bg-background-secondary/95 p-2 shadow-card backdrop-blur-md"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  isSelected
                    ? 'bg-accent-pink/15 text-white'
                    : 'text-text-secondary hover:bg-white/10 hover:text-white'
                )}
              >
                <span>{option.label}</span>
                {isSelected && <Check className="h-4 w-4 text-accent-pink" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CreateYourAIPartnerQuickmodePage() {
  const router = useRouter();
  const { headers: userHeaders } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tagsButtonRef = useRef<HTMLButtonElement>(null);
  const tagsPanelRef = useRef<HTMLDivElement>(null);
  const voiceButtonRef = useRef<HTMLButtonElement>(null);
  const voicePanelRef = useRef<HTMLDivElement>(null);
  const customVoiceInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [style, setStyle] = useState<PartnerStyle>('realistic');
  const [gender, setGender] = useState<PartnerGender>('female');
  const [voiceId, setVoiceId] = useState<VoiceId>('honey');
  const [customVoice, setCustomVoice] = useState<{ name: string; url: string; duration: number } | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [imageError, setImageError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [pendingImageDataUrl, setPendingImageDataUrl] = useState<string>('');
  const [isImageCropOpen, setIsImageCropOpen] = useState(false);
  const cropViewportRef = useRef<HTMLDivElement>(null);
  const cropSourceImageRef = useRef<HTMLImageElement | null>(null);
  const cropDragRef = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);
  const [cropSourceSize, setCropSourceSize] = useState<{ width: number; height: number } | null>(null);
  const [cropViewportSize, setCropViewportSize] = useState<{ width: number; height: number } | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffsetX, setCropOffsetX] = useState(0);
  const [cropOffsetY, setCropOffsetY] = useState(0);

  const [systemPrompt, setSystemPrompt] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [description, setDescription] = useState('');

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const selectedTagSet = useMemo(() => new Set(selectedTags), [selectedTags]);
  const [customTagLabels, setCustomTagLabels] = useState<Record<string, string>>({});
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const deferredTagSearch = useDeferredValue(tagSearch);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [pendingVoiceFile, setPendingVoiceFile] = useState<{
    file: File;
    url: string;
    name: string;
    duration: number;
  } | null>(null);
  const [trimStartSeconds, setTrimStartSeconds] = useState(0);
  const [trimEndSeconds, setTrimEndSeconds] = useState(30);
  const [isAudioTrimOpen, setIsAudioTrimOpen] = useState(false);
  const [isApplyingTrim, setIsApplyingTrim] = useState(false);
  const trimAudioRef = useRef<HTMLAudioElement>(null);

  const [isNsfw, setIsNsfw] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredTagOptions = useMemo(() => {
    const q = deferredTagSearch.trim().toLowerCase();
    if (!q) return TAG_OPTIONS;
    return TAG_OPTIONS.filter((option) => option.value.includes(q) || option.label.toLowerCase().includes(q));
  }, [deferredTagSearch]);

  const getTagLabel = useCallback(
    (value: string) => TAG_OPTIONS.find((t) => t.value === value)?.label ?? customTagLabels[value] ?? value,
    [customTagLabels]
  );

  const selectedVoiceLabel = useMemo(() => {
    if (voiceId === 'custom') return customVoice?.name ?? 'Custom Voice';
    return VOICE_OPTIONS.find((option) => option.value === voiceId)?.label ?? 'Select voice';
  }, [customVoice?.name, voiceId]);

  const cropBaseScale = useMemo(() => {
    if (!cropSourceSize || !cropViewportSize) return 1;
    return Math.max(
      cropViewportSize.width / cropSourceSize.width,
      cropViewportSize.height / cropSourceSize.height
    );
  }, [cropSourceSize, cropViewportSize]);

  const cropScale = cropBaseScale * cropZoom;

  const clampedCropOffset = useMemo(() => {
    if (!cropSourceSize || !cropViewportSize) return { x: 0, y: 0 };
    const displayedWidth = cropSourceSize.width * cropScale;
    const displayedHeight = cropSourceSize.height * cropScale;
    const maxX = Math.max(0, (displayedWidth - cropViewportSize.width) / 2);
    const maxY = Math.max(0, (displayedHeight - cropViewportSize.height) / 2);
    return {
      x: clamp(cropOffsetX, -maxX, maxX),
      y: clamp(cropOffsetY, -maxY, maxY),
    };
  }, [cropOffsetX, cropOffsetY, cropScale, cropSourceSize, cropViewportSize]);

  useEffect(() => {
    if (!cropSourceSize || !cropViewportSize) return;
    const displayedWidth = cropSourceSize.width * cropScale;
    const displayedHeight = cropSourceSize.height * cropScale;
    const maxX = Math.max(0, (displayedWidth - cropViewportSize.width) / 2);
    const maxY = Math.max(0, (displayedHeight - cropViewportSize.height) / 2);
    setCropOffsetX((current) => clamp(current, -maxX, maxX));
    setCropOffsetY((current) => clamp(current, -maxY, maxY));
  }, [cropScale, cropSourceSize, cropViewportSize]);

  const canSubmit = useMemo(() => {
    return (
      name.trim().length > 0 &&
      Boolean(style) &&
      Boolean(gender) &&
      imageDataUrl.length > 0 &&
      systemPrompt.trim().length > 0 &&
      firstMessage.trim().length > 0 &&
      description.trim().length > 0
    );
  }, [name, style, gender, imageDataUrl, systemPrompt, firstMessage, description]);

  const setImageFromFile = useCallback((file: File) => {
    const error = validateImageFile(file);
    setImageError(error);
    if (error) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        setImageError('Could not read that image file. Please try again.');
        return;
      }

      // Enforce a 3:4 portrait crop. If the uploaded image isn't 3:4, show the crop modal.
      const img = new window.Image();
      img.onload = () => {
        const targetRatio = 3 / 4;
        const ratio = img.naturalWidth / img.naturalHeight;
        const matches = Math.abs(ratio - targetRatio) < 0.01;

        setImageError(null);
        if (matches) {
          setImageDataUrl(result);
          setPendingImageDataUrl('');
          setIsImageCropOpen(false);
        } else {
          setPendingImageDataUrl(result);
          setIsImageCropOpen(true);
        }
      };
      img.onerror = () => setImageError('Could not load that image. Please try again.');
      img.src = result;
    };
    reader.onerror = () => setImageError('Could not read that image file. Please try again.');
    reader.readAsDataURL(file);
  }, []);

  const handleVoicePick = useCallback(
    (next: VoiceId) => {
      setVoiceId(next);
      setVoiceError(null);
      setIsVoiceOpen(false);
    },
    []
  );

  const handlePlayVoiceSample = useCallback(
    (next: VoiceId) => {
      if (next === 'custom') {
        if (!customVoice?.url) return;
        const audio = new Audio(customVoice.url);
        audio.play().catch(() => undefined);
        return;
      }

      const option = VOICE_OPTIONS.find((v) => v.value === next);
      if (!option) return;
      playPlaceholderVoice(option.sampleText);
    },
    [customVoice?.url]
  );

  const readAudioDurationSeconds = useCallback(async (file: File, url: string) => {
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
  }, []);

  const handleCustomVoiceFile = useCallback(
    async (file: File) => {
      setVoiceError(null);
      if (!file.type.startsWith('audio/')) {
        setVoiceError('Please upload an audio file.');
        return;
      }

      const url = URL.createObjectURL(file);
      try {
        const duration = await readAudioDurationSeconds(file, url);
        if (!duration || Number.isNaN(duration)) {
          setVoiceError('Could not read audio duration. Please try another file.');
          URL.revokeObjectURL(url);
          return;
        }

        if (duration <= 30) {
          setCustomVoice({ name: file.name, url, duration });
          setVoiceId('custom');
          setIsVoiceOpen(false);
          return;
        }

        setPendingVoiceFile({ file, url, name: file.name, duration });
        setTrimStartSeconds(0);
        setTrimEndSeconds(30);
        setIsVoiceOpen(false);
        setIsAudioTrimOpen(true);
      } catch {
        setVoiceError('Could not load that audio file. Please try again.');
        URL.revokeObjectURL(url);
      }
    },
    [readAudioDurationSeconds]
  );

  const applyVoiceTrim = useCallback(async () => {
    if (!pendingVoiceFile || isApplyingTrim) return;
    setIsApplyingTrim(true);
    setVoiceError(null);

    try {
      const buffer = await decodeAudioFromFile(pendingVoiceFile.file);
      const start = clamp(trimStartSeconds, 0, Math.max(0, buffer.duration - 0.1));
      const end = clamp(trimEndSeconds, start + 0.1, buffer.duration);
      const sliced = sliceAudioBuffer(buffer, start, end);
      const wav = encodeWav(sliced);
      const url = URL.createObjectURL(wav);

      // Replace the long audio with the trimmed clip (<= 30s).
      setCustomVoice({ name: pendingVoiceFile.name, url, duration: end - start });
      setVoiceId('custom');
      setIsAudioTrimOpen(false);

      // Revoke the original (too-long) upload URL.
      URL.revokeObjectURL(pendingVoiceFile.url);
      setPendingVoiceFile(null);
    } catch {
      setVoiceError('Could not crop that audio. Please try again.');
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

  const handleCropPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!cropSourceSize || !cropViewportSize) return;
      (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
      cropDragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startOffsetX: clampedCropOffset.x,
        startOffsetY: clampedCropOffset.y,
      };
    },
    [clampedCropOffset.x, clampedCropOffset.y, cropSourceSize, cropViewportSize]
  );

  const handleCropPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!cropSourceSize || !cropViewportSize) return;
      const drag = cropDragRef.current;
      if (!drag) return;

      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;

      const displayedWidth = cropSourceSize.width * cropScale;
      const displayedHeight = cropSourceSize.height * cropScale;
      const maxX = Math.max(0, (displayedWidth - cropViewportSize.width) / 2);
      const maxY = Math.max(0, (displayedHeight - cropViewportSize.height) / 2);

      setCropOffsetX(clamp(drag.startOffsetX + dx, -maxX, maxX));
      setCropOffsetY(clamp(drag.startOffsetY + dy, -maxY, maxY));
    },
    [cropScale, cropSourceSize, cropViewportSize]
  );

  const handleCropPointerUp = useCallback(() => {
    cropDragRef.current = null;
  }, []);

  const applyImageCrop = useCallback(() => {
    const img = cropSourceImageRef.current;
    if (!img || !cropViewportSize || !cropSourceSize) return;

    const sxRaw = (0 - cropViewportSize.width / 2 - clampedCropOffset.x) / cropScale + cropSourceSize.width / 2;
    const syRaw = (0 - cropViewportSize.height / 2 - clampedCropOffset.y) / cropScale + cropSourceSize.height / 2;
    const swRaw = cropViewportSize.width / cropScale;
    const shRaw = cropViewportSize.height / cropScale;

    const sx = clamp(sxRaw, 0, Math.max(0, cropSourceSize.width - swRaw));
    const sy = clamp(syRaw, 0, Math.max(0, cropSourceSize.height - shRaw));
    const sw = Math.min(swRaw, cropSourceSize.width);
    const sh = Math.min(shRaw, cropSourceSize.height);

    const outputWidth = 600;
    const outputHeight = 800; // 3:4
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);
    const result = canvas.toDataURL('image/jpeg', 0.92);
    setImageDataUrl(result);
    setImageError(null);
    setIsImageCropOpen(false);
    setPendingImageDataUrl('');
  }, [clampedCropOffset.x, clampedCropOffset.y, cropScale, cropSourceSize, cropViewportSize]);

  useEffect(() => {
    if (!isTagsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const inside =
        tagsPanelRef.current?.contains(target) ||
        tagsButtonRef.current?.contains(target);
      if (inside) return;
      setIsTagsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsTagsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTagsOpen]);

  // Keep audio playback tidy when leaving the page or closing modals.
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (isAudioTrimOpen) return;
    trimAudioRef.current?.pause();
  }, [isAudioTrimOpen]);

  // Revoke object URLs to prevent memory leaks (custom voice previews).
  useEffect(() => {
    return () => {
      if (customVoice?.url) URL.revokeObjectURL(customVoice.url);
    };
  }, [customVoice?.url]);

  useEffect(() => {
    return () => {
      if (pendingVoiceFile?.url) URL.revokeObjectURL(pendingVoiceFile.url);
    };
  }, [pendingVoiceFile?.url]);

  // Escape closes modals (matches the rest of the app popups).
  useEffect(() => {
    const shouldListen = isVoiceOpen || isAudioTrimOpen || isImageCropOpen;
    if (!shouldListen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsVoiceOpen(false);
      if (isAudioTrimOpen) cancelVoiceTrim();
      if (isImageCropOpen) {
        setIsImageCropOpen(false);
        setPendingImageDataUrl('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [cancelVoiceTrim, isVoiceOpen, isAudioTrimOpen, isImageCropOpen]);

  // Crop modal: load the pending image + measure the crop viewport.
  useEffect(() => {
    if (!isImageCropOpen || !pendingImageDataUrl) return;

    setCropZoom(1);
    setCropOffsetX(0);
    setCropOffsetY(0);

    const img = new window.Image();
    img.onload = () => {
      cropSourceImageRef.current = img;
      setCropSourceSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => setImageError('Could not load that image for cropping. Please try again.');
    img.src = pendingImageDataUrl;

    return () => {
      cropSourceImageRef.current = null;
      setCropSourceSize(null);
      setCropViewportSize(null);
    };
  }, [isImageCropOpen, pendingImageDataUrl]);

  useEffect(() => {
    if (!isImageCropOpen) return;

    const measure = () => {
      const rect = cropViewportRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCropViewportSize({ width: rect.width, height: rect.height });
    };

    // Measure after paint.
    const raf = window.requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, [isImageCropOpen]);

  // When trimming audio, stop playback at the selected end marker.
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Convert image from base64 to hosted URL
      let imageUrl = imageDataUrl;
      if (imageDataUrl.startsWith('data:')) {
        imageUrl = await convertBase64ToUrl(imageDataUrl, 'image');
      }

      // Convert custom voice from base64/blob to hosted URL
      let resolvedVoiceUrl: string | null = null;
      if (voiceId === 'custom' && customVoice?.url) {
        // If the voice URL is a blob, convert to base64 first then to URL
        if (customVoice.url.startsWith('blob:')) {
          const resp = await fetch(customVoice.url);
          const blob = await resp.blob();
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          resolvedVoiceUrl = await convertBase64ToUrl(base64, 'voice');
        } else if (customVoice.url.startsWith('data:')) {
          resolvedVoiceUrl = await convertBase64ToUrl(customVoice.url, 'voice');
        } else {
          resolvedVoiceUrl = customVoice.url;
        }
      }

      // Create character via API
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...userHeaders,
        },
        body: JSON.stringify({
          name: name.trim(),
          style: STYLE_TO_DB[style],
          gender: GENDER_TO_DB[gender],
          voiceId: voiceId !== 'custom' ? voiceId : null,
          voiceUrl: resolvedVoiceUrl,
          systemPrompt: systemPrompt.trim(),
          firstMessage: firstMessage.trim(),
          description: description.trim(),
          tags: selectedTags.map(getTagLabel),
          isNsfw,
          visibility: isPrivate ? 'PRIVATE' : 'PUBLIC',
          creationMode: 'quick',
          imageUrl,
          metadata: {
            imageUrl,
            voiceLabel: selectedVoiceLabel,
          },
        }),
      });

      const result = await response.json() as { error?: string; character?: { id: string } };

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create partner');
      }

      router.push('/profile?tab=partners');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not create your partner. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-primary text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background-primary/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent-pink/30 bg-accent-pink/15 text-white">
              V
            </span>
            <span>Veloura.ai</span>
          </Link>

          <Link
            href="/profile?tab=partners"
            className="text-sm font-medium text-text-secondary hover:text-white transition-colors"
          >
            My Profile
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-semibold">
            <span className="text-accent-pink">Create</span> Partner
          </h1>
          <p className="mt-1 text-sm text-text-secondary">Quick mode</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="partner-name" className="text-sm font-semibold text-white">
                Partner Name <span className="text-accent-pink">*</span>
              </label>
              <input
                id="partner-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter partner name"
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-pink/40"
                autoComplete="off"
              />
            </div>

            <DropdownSelect
              id="partner-gender"
              label="Gender"
              required
              value={gender}
              options={GENDER_OPTIONS}
              onChange={setGender}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <DropdownSelect
              id="partner-style"
              label="Style"
              required
              value={style}
              options={STYLE_OPTIONS}
              onChange={setStyle}
            />

            <div className="relative">
              <label className="text-sm font-semibold text-white">Voice</label>
              <button
                ref={voiceButtonRef}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={isVoiceOpen}
                onClick={() => {
                  setVoiceError(null);
                  setIsVoiceOpen(true);
                }}
                className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
              >
                <span className="truncate">{selectedVoiceLabel}</span>
                <ChevronDown className="h-4 w-4 text-text-secondary" aria-hidden="true" />
              </button>
              {voiceError && <div className="mt-2 text-sm text-accent-pink">{voiceError}</div>}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-white">
              Partner Image <span className="text-accent-pink">*</span>
            </label>
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) setImageFromFile(file);
              }}
              className={cn(
                'mt-2 relative flex min-h-[12rem] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-white/5 px-6 py-8 text-center transition-colors',
                imageError ? 'border-accent-pink/60' : 'border-white/15 hover:border-white/25'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setImageFromFile(file);
                }}
              />

              {imageDataUrl ? (
                <>
                  <div className="absolute inset-0 overflow-hidden rounded-2xl">
                    <Image
                      src={imageDataUrl}
                      alt="Partner preview"
                      fill
                      unoptimized
                      className="object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background-secondary/70 via-transparent to-transparent" />
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageDataUrl('');
                      setImageError(null);
                    }}
                    className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-background-secondary/80 px-3 py-2 text-sm text-white hover:bg-background-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
                    <Upload className="h-6 w-6 text-text-secondary" aria-hidden="true" />
                  </div>
                  <div className="text-base font-semibold text-white/90">
                    Drag &amp; drop image here, or click to select image
                  </div>
                  <div className="text-sm text-text-muted">Supports: JPG, PNG, WEBP</div>
                </>
              )}
            </div>
            {imageError && <div className="mt-2 text-sm text-accent-pink">{imageError}</div>}
          </div>

          <div>
            <label htmlFor="system-prompt" className="text-sm font-semibold text-white">
              System Prompt <span className="text-accent-pink">*</span>
            </label>
            <textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Enter the system prompt for this model"
              className="mt-2 min-h-[7.5rem] w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-pink/40"
            />
          </div>

          <div>
            <label htmlFor="first-message" className="text-sm font-semibold text-white">
              First Message <span className="text-accent-pink">*</span>
            </label>
            <textarea
              id="first-message"
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value)}
              placeholder="Enter the first message for this model"
              className="mt-2 min-h-[6.5rem] w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-pink/40"
            />
          </div>

          <div>
            <label htmlFor="character-description" className="text-sm font-semibold text-white">
              Character Description <span className="text-accent-pink">*</span>
            </label>
            <textarea
              id="character-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write an introduction of the character. Display purposes only."
              className="mt-2 min-h-[6.5rem] w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-pink/40"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-white">
              Tags
            </label>

            <button
              ref={tagsButtonRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={isTagsOpen}
              onClick={() => setIsTagsOpen((v) => !v)}
              className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-text-muted hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
            >
              <span className={cn('truncate', selectedTags.length > 0 && 'text-white')}>
                {selectedTags.length === 0
                  ? 'Select tags...'
                  : selectedTags
                      .map(getTagLabel)
                      .join(', ')}
              </span>
              <ChevronDown
                className={cn('h-4 w-4 text-text-secondary transition-transform', isTagsOpen && 'rotate-180')}
                aria-hidden="true"
              />
            </button>

            {selectedTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedTags.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setSelectedTags((prev) => prev.filter((t) => t !== value));
                      setCustomTagLabels((prev) => {
                        if (!(value in prev)) return prev;
                        const next = { ...prev };
                        delete next[value];
                        return next;
                      });
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10 transition-colors"
                    aria-label={`Remove tag ${value}`}
                  >
                    <span>{getTagLabel(value)}</span>
                    <X className="h-3.5 w-3.5 text-white/70" aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}

            {isTagsOpen && (
              <div
                ref={tagsPanelRef}
                role="dialog"
                aria-label="Select tags"
                className="relative mt-3 rounded-2xl border border-white/10 bg-background-secondary/95 p-4 shadow-card backdrop-blur"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <ImageIcon className="h-5 w-5 text-text-secondary" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">Select Tags</div>
                    <div className="text-sm text-text-secondary">
                      Choose multiple tags to describe your partner
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTagsOpen(false)}
                    className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
                    aria-label="Close tags"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                <input
                  type="text"
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  placeholder="Search tags… or type a new tag and press Enter to add"
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    e.stopPropagation();

                    const label = normalizeTagLabel(tagSearch);
                    if (!label) return;

                    const value = normalizeTagValue(label);
                    const exists = TAG_OPTIONS.some((option) => option.value === value);

                    setSelectedTags((prev) => (prev.includes(value) ? prev : [...prev, value]));
                    if (!exists) {
                      setCustomTagLabels((prev) => ({ ...prev, [value]: label }));
                    }
                    setTagSearch('');
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-pink/40"
                  autoComplete="off"
                />

                <div className="mt-4 flex flex-wrap gap-2">
                  {filteredTagOptions.map((option) => {
                    const selected = selectedTagSet.has(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setSelectedTags((prev) => {
                            if (prev.includes(option.value)) {
                              return prev.filter((t) => t !== option.value);
                            }
                            return [...prev, option.value];
                          })
                        }
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                          selected
                            ? 'bg-accent-pink/15 border-accent-pink/50 text-white'
                            : 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10 hover:text-white'
                        )}
                      >
                        {selected && <Check className="h-4 w-4 text-accent-pink" aria-hidden="true" />}
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTags([])}
                    className="text-sm font-semibold text-text-secondary hover:text-white transition-colors"
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTagsOpen(false)}
                    className="inline-flex items-center justify-center rounded-xl border border-accent-pink/40 bg-accent-pink/15 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-pink/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {submitError && (
            <div className="rounded-xl border border-accent-pink/30 bg-accent-pink/10 px-4 py-3 text-sm text-white">
              {submitError}
            </div>
          )}

          <div className="flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isNsfw}
                  onClick={() => setIsNsfw((v) => !v)}
                  className={cn('toggle-switch', isNsfw && 'toggle-switch-active')}
                >
                  <span className="toggle-switch-knob" />
                </button>
                <span className="text-sm font-semibold text-white">NSFW</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPrivate}
                  onClick={() => setIsPrivate((v) => !v)}
                  className={cn('toggle-switch', isPrivate && 'toggle-switch-active')}
                >
                  <span className="toggle-switch-knob" />
                </button>
                <span className="text-sm font-semibold text-white">Private</span>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className={cn(
                  'inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40',
                  canSubmit && !isSubmitting
                    ? 'bg-accent-pink hover:bg-accent-pink/90'
                    : 'bg-white/10 text-text-muted cursor-not-allowed'
                )}
              >
                {isSubmitting ? 'Creating…' : 'Create Partner'}
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* Voice selector modal */}
      {isVoiceOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsVoiceOpen(false);
          }}
        >
          <div
            ref={voicePanelRef}
            className="flex w-full max-w-3xl max-h-[min(31.25rem,calc(100vh-2rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-background-secondary/95 shadow-card backdrop-blur-md"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="text-xl font-semibold text-white">Select Voice</div>
              <button
                type="button"
                onClick={() => setIsVoiceOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto p-6">
              <input
                ref={customVoiceInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCustomVoiceFile(file);
                }}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => customVoiceInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') customVoiceInputRef.current?.click();
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleCustomVoiceFile(file);
                  }}
                  className={cn(
                    'sm:col-span-2 flex items-center justify-between gap-4 rounded-2xl border border-dashed bg-white/5 px-5 py-4 transition-colors',
                    voiceId === 'custom' ? 'border-accent-pink/50' : 'border-white/15 hover:border-white/25'
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-white">Upload custom voice</div>
                    <div className="mt-0.5 text-sm text-text-secondary">
                      Click or drag &amp; drop an audio file (max 30s after trimming)
                    </div>
                    {customVoice && (
                      <div className="mt-1 text-sm text-white/80 truncate">
                        Current: {customVoice.name} ({formatSeconds(customVoice.duration)})
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {customVoice?.url && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayVoiceSample('custom');
                        }}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-accent-pink/30 bg-accent-pink/15 text-white hover:bg-accent-pink/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
                        aria-label="Play custom voice"
                      >
                        <Play className="h-5 w-5" aria-hidden="true" />
                      </button>
                    )}
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-text-secondary">
                      <Upload className="h-5 w-5" aria-hidden="true" />
                    </div>
                  </div>
                </div>

                {VOICE_OPTIONS.map((option) => {
                  const selected = voiceId === option.value;
                  return (
                    <div
                      key={option.value}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleVoicePick(option.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') handleVoicePick(option.value);
                      }}
                      className={cn(
                        'flex items-center justify-between gap-4 rounded-2xl border bg-white/5 px-5 py-4 transition-colors',
                        selected ? 'border-accent-pink/55' : 'border-white/10 hover:border-white/25'
                      )}
                      aria-label={`Select voice ${option.label}`}
                    >
                      <div className="text-base font-semibold text-white">{option.label}</div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayVoiceSample(option.value);
                        }}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-accent-pink/30 bg-accent-pink/15 text-white hover:bg-accent-pink/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
                        aria-label={`Play ${option.label} sample`}
                      >
                        <Play className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {voiceError && (
                <div className="mt-4 rounded-xl border border-accent-pink/30 bg-accent-pink/10 px-4 py-3 text-sm text-white">
                  {voiceError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Audio trim modal (custom voice > 30s) */}
      {isAudioTrimOpen && pendingVoiceFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              cancelVoiceTrim();
            }
          }}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-background-secondary/95 shadow-card backdrop-blur-md"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="text-xl font-semibold text-white">Crop Voice</div>
              <button
                type="button"
                onClick={cancelVoiceTrim}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6">
              <div className="text-sm text-text-secondary">
                Your voice should not be more than 30 sec. Please crop the audio.
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <audio
                  ref={trimAudioRef}
                  src={pendingVoiceFile.url}
                  controls
                  className="w-full"
                />

                <div className="mt-4 grid gap-4">
                  <div>
                    <div className="flex items-center justify-between text-sm text-text-secondary">
                      <span>Start</span>
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
                        const maxEnd = Math.min(pendingVoiceFile.duration, nextStart + 30);
                        setTrimStartSeconds(nextStart);
                        setTrimEndSeconds((currentEnd) => clamp(currentEnd, nextStart + 0.1, maxEnd));
                      }}
                      className="mt-2 w-full accent-accent-pink"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm text-text-secondary">
                      <span>End</span>
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
                        const minStart = Math.max(0, nextEnd - 30);
                        setTrimEndSeconds(nextEnd);
                        setTrimStartSeconds((currentStart) => clamp(currentStart, minStart, nextEnd - 0.1));
                      }}
                      className="mt-2 w-full accent-accent-pink"
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Selected</span>
                    <span className="font-semibold text-white">
                      {formatSeconds(Math.max(0, trimEndSeconds - trimStartSeconds))} (max 0:30)
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const audio = trimAudioRef.current;
                        if (!audio) return;
                        audio.currentTime = trimStartSeconds;
                        audio.play().catch(() => undefined);
                      }}
                      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
                    >
                      Preview selection
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={cancelVoiceTrim}
                        className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={applyVoiceTrim}
                        disabled={isApplyingTrim || trimEndSeconds - trimStartSeconds > 30}
                        className={cn(
                          'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40',
                          !isApplyingTrim && trimEndSeconds - trimStartSeconds <= 30
                            ? 'bg-accent-pink hover:bg-accent-pink/90'
                            : 'bg-white/10 text-text-muted cursor-not-allowed'
                        )}
                      >
                        {isApplyingTrim ? 'Cropping…' : 'Crop & Apply'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image crop modal (enforces 3:4 portrait) */}
      {isImageCropOpen && pendingImageDataUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setIsImageCropOpen(false);
              setPendingImageDataUrl('');
            }
          }}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-background-secondary/95 shadow-card backdrop-blur-md"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="text-xl font-semibold text-white">Crop Image</div>
              <button
                type="button"
                onClick={() => {
                  setIsImageCropOpen(false);
                  setPendingImageDataUrl('');
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6">
              <div className="rounded-2xl bg-black/40 p-4">
                <div className="mx-auto w-full max-w-[24rem]">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-white/5">
                    <div
                      ref={cropViewportRef}
                      className="absolute inset-0 touch-none cursor-grab active:cursor-grabbing"
                      onPointerDown={handleCropPointerDown}
                      onPointerMove={handleCropPointerMove}
                      onPointerUp={handleCropPointerUp}
                      onPointerCancel={handleCropPointerUp}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pendingImageDataUrl}
                        alt="Crop preview"
                        draggable={false}
                        className="absolute left-1/2 top-1/2 select-none"
                        style={{
                          width: cropSourceSize ? `${cropSourceSize.width * cropBaseScale}px` : undefined,
                          height: cropSourceSize ? `${cropSourceSize.height * cropBaseScale}px` : undefined,
                          transform: `translate(-50%, -50%) translate(${clampedCropOffset.x}px, ${clampedCropOffset.y}px) scale(${cropZoom})`,
                          transformOrigin: 'center',
                          willChange: 'transform',
                        }}
                      />

                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 border-2 border-white/90" />
                        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:22px_22px]" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-sm text-text-secondary">
                    <span>Zoom</span>
                    <span className="font-medium text-white">{cropZoom.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={cropZoom}
                    onChange={(e) => setCropZoom(Number(e.target.value))}
                    className="mt-2 w-full accent-accent-pink"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsImageCropOpen(false);
                    setPendingImageDataUrl('');
                  }}
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyImageCrop}
                  className="inline-flex items-center justify-center rounded-xl bg-accent-pink px-6 py-3 text-sm font-semibold text-white hover:bg-accent-pink/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
                >
                  Crop &amp; Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
