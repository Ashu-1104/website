export const aiAudioTools = [
  { slug: 'text-to-speech', label: 'Text to Speech' },
  { slug: 'voice-cloning', label: 'Voice Cloning' },
  { slug: 'sound-effect', label: 'Sound Effect' },
  { slug: 'song-cover-fun', label: 'Song Cover Fun' },
  { slug: 'song-generation-vocal', label: 'Song Generation' },
  { slug: 'music-generation-no-vocal', label: 'Music Generation' },
] as const;

export type AIAudioTool = (typeof aiAudioTools)[number];
export type AIAudioToolSlug = AIAudioTool['slug'];

const aiAudioToolBySlug: Record<AIAudioToolSlug, AIAudioTool> = Object.fromEntries(
  aiAudioTools.map((tool) => [tool.slug, tool])
) as Record<AIAudioToolSlug, AIAudioTool>;

export function isAIAudioToolSlug(slug: string): slug is AIAudioToolSlug {
  return Object.prototype.hasOwnProperty.call(aiAudioToolBySlug, slug);
}

export function getAIAudioToolBySlug(slug: string): AIAudioTool | null {
  if (!isAIAudioToolSlug(slug)) return null;
  return aiAudioToolBySlug[slug];
}

