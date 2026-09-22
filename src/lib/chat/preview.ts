import type { ChatMessage, ChatThread } from '@/types/chat';

export type ChatLastMessagePreview = {
  kind: 'text' | 'image' | 'video' | 'audio' | 'none';
  direction: 'sent' | 'received' | 'none';
  text: string;
  dateLabel?: string;
  lastMessageId?: string;
};

const MONTHS = new Set([
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]);

const shortDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
});

function formatShortDate(epochMs: number): string {
  const date = new Date(epochMs);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';
  return shortDateFormatter.format(date);
}

function extractDateLabel(timestampLabel?: string): string | undefined {
  if (!timestampLabel) return undefined;
  const [datePart] = timestampLabel.split(' at ');
  if (!datePart) return undefined;
  if (datePart === 'Today') return 'Today';

  // Convert "Dec 28" -> "28 Dec" to match common chat list UX.
  const match = datePart.match(/^([A-Za-z]{3})\s+(\d{1,2})$/);
  if (match && MONTHS.has(match[1]!)) {
    return `${match[2]} ${match[1]}`;
  }

  return datePart;
}

function getMessageDateLabel(message: ChatMessage): string | undefined {
  const labelFromTimestamp = extractDateLabel(message.timestampLabel);
  if (labelFromTimestamp) return labelFromTimestamp;

  if (typeof message.createdAt === 'number') {
    return formatShortDate(message.createdAt);
  }

  const userIdMatch = message.id.match(/^user-(\d+)$/);
  if (userIdMatch) {
    const epoch = Number(userIdMatch[1]);
    if (!Number.isNaN(epoch)) return formatShortDate(epoch);
  }

  return undefined;
}

export function getLastMessage(thread?: ChatThread): ChatMessage | undefined {
  if (!thread || !Array.isArray(thread.messages) || thread.messages.length === 0) return undefined;
  return thread.messages[thread.messages.length - 1];
}

export function buildLastMessagePreview(thread?: ChatThread): ChatLastMessagePreview {
  const lastMessage = getLastMessage(thread);
  if (!lastMessage) {
    return {
      kind: 'none',
      direction: 'none',
      text: 'Start a conversation',
    };
  }

  const kind = lastMessage.kind ?? 'text';
  const direction = lastMessage.role === 'user' ? 'sent' : 'received';

  if (kind === 'image') {
    return {
      kind: 'image',
      direction,
      lastMessageId: lastMessage.id,
      dateLabel: getMessageDateLabel(lastMessage),
      text: lastMessage.imageUrl
        ? direction === 'sent'
          ? 'Photo sent'
          : 'Image received'
        : direction === 'sent'
          ? 'Image request sent'
          : 'Image request received',
    };
  }

  if (kind === 'video') {
    return {
      kind: 'video',
      direction,
      lastMessageId: lastMessage.id,
      dateLabel: getMessageDateLabel(lastMessage),
      text: direction === 'sent' ? 'Video sent' : 'Video received',
    };
  }

  if (kind === 'audio') {
    return {
      kind: 'audio',
      direction,
      lastMessageId: lastMessage.id,
      dateLabel: getMessageDateLabel(lastMessage),
      text: direction === 'sent' ? 'Audio sent' : 'Audio received',
    };
  }

  const normalizedText = (lastMessage.text ?? '').trim().replace(/\s+/g, ' ');
  const displayText = normalizedText.length > 0 ? normalizedText : 'Start a conversation';
  const withSenderHint = direction === 'sent' ? `You: ${displayText}` : displayText;

  return {
    kind: 'text',
    direction,
    lastMessageId: lastMessage.id,
    dateLabel: getMessageDateLabel(lastMessage),
    text: withSenderHint,
  };
}

export function isThreadUnread({
  lastMessage,
  lastReadMessageId,
}: {
  lastMessage?: ChatMessage;
  lastReadMessageId?: string;
}): boolean {
  if (!lastMessage) return false;
  if (lastMessage.role !== 'ai') return false;
  if (!lastReadMessageId) return true;
  return lastReadMessageId !== lastMessage.id;
}
