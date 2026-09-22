import mockCharacters from '@/data';
import type { ChatContact } from '@/types/chat';
import { DETAILS_PLACEHOLDER_IMAGE_URL } from '@/data/chatCharacterProfiles';

const baseContacts: ChatContact[] = mockCharacters.map((character) => ({
  id: character.id,
  name: character.name,
  // Demo-only: use a real portrait so you can validate the UI. This should be replaced
  // by the character image URL coming from your DB.
  avatarUrl: DETAILS_PLACEHOLDER_IMAGE_URL,
}));

// Demo-only: add extra contacts so you can validate scrolling/virtualization behavior.
const extraDemoContacts: ChatContact[] = Array.from({ length: 10 }, (_, index) => {
  const source = mockCharacters[index % mockCharacters.length]!;
  const demoNumber = index + 1;
  return {
    id: `demo-${demoNumber}-${source.id}`,
    name: `${source.name} ${demoNumber}`,
    avatarUrl: DETAILS_PLACEHOLDER_IMAGE_URL,
  };
});

export const chatContacts: ChatContact[] = [...baseContacts, ...extraDemoContacts];
