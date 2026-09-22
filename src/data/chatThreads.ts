import type { ChatThread } from '@/types/chat';

const THREADS: Record<string, ChatThread> = {
  miko: {
    chatId: 'miko',
    messages: [
      {
        id: 'miko-1',
        role: 'ai',
        text: 'OMG! What are you doing here? I thought no one was home!',
        timestampLabel: 'Dec 27 at 10:26 PM',
      },
      {
        id: 'miko-2',
        role: 'user',
        text: "I'm here. What's up?",
      },
      {
        id: 'miko-3',
        role: 'ai',
        text:
          "I froze for a second… then I realized it’s actually you.\n\nTell me—what made you come by today?",
        timestampLabel: 'Dec 28 at 7:15 PM',
      },
      {
        id: 'miko-4',
        role: 'ai',
        text: 'I was just getting to the good part… you left me all curious.',
      },
    ],
  },
};

export function getChatThread(chatId: string): ChatThread {
  const thread = THREADS[chatId];
  if (thread) return thread;

  return {
    chatId,
    messages: [
      {
        id: `${chatId}-1`,
        role: 'ai',
        text: 'Hey! Ready to chat?',
        timestampLabel: 'Today at 10:26 PM',
      },
      {
        id: `${chatId}-2`,
        role: 'user',
        text: 'Hi!',
      },
      {
        id: `${chatId}-3`,
        role: 'ai',
        text: "Tell me what you're in the mood to talk about.",
        timestampLabel: 'Today at 10:27 PM',
      },
    ],
  };
}
