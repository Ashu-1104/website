export type ChatContact = {
  id: string;
  name: string;
  avatarUrl: string;
  kind?: 'character' | 'user';
};

export type ChatStats = {
  views: number;
  likes: number;
  conversations: number;
  isLiked: boolean;
};

export type ChatVoiceSettings = {
  /** Speech rate for AI message playback. */
  rate: number;
  /** Speech pitch for AI message playback. */
  pitch: number;
};

export type ChatCharacterSettings = {
  temperature: number;
  maxMessageLength: number;
  voice: ChatVoiceSettings;
};

export type ChatCharacterProfile = {
  introduction: string;
  opener: string;
  systemPrompt: string;
  communityImages: string[];
  myImages: string[];
};

export type ChatRole = 'user' | 'ai';

export type ChatImageStyle = 'realistic' | 'anime' | 'cartoon';

export type ChatMediaType = 'IMAGE' | 'VIDEO' | 'AUDIO';

export type AIVideoType = 'text-to-video' | 'image-to-video';

export type AIGenerationType = 'ai-image' | 'ai-video' | 'ai-edit';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  kind?: 'text' | 'image' | 'video' | 'audio';
  text: string;
  /**
   * Optional epoch milliseconds for ordering/preview.
   * When connected to a DB, this should map to your message `createdAt`.
   */
  createdAt?: number;
  /**
   * Optional media URL when `kind === 'image' | 'video' | 'audio'`.
   * The contact list uses this to show a media-type preview.
   */
  imageUrl?: string;
  /** Optional media type when `imageUrl` is present. */
  mediaType?: ChatMediaType;
  /** Optional style hint when `kind === 'image'` (used by image generation UI). */
  imageStyle?: ChatImageStyle;
  /**
   * Display label like "Dec 27 at 10:26 PM".
   * In the reference UI this appears centered between messages.
   */
  timestampLabel?: string;
};

export type ChatThread = {
  chatId: string;
  messages: ChatMessage[];
};
