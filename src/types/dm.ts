// Direct Message Types

export interface DMUser {
  id: string;
  handle: string | null;
  avatarUrl: string | null;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isEdited: boolean;
  editedAt: string | null;
  createdAt: string;
  sender: DMUser;
  tempId?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface DirectConversation {
  id: string;
  otherUser: DMUser;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastReadAt: string | null;
  lastReadMessageId: string | null;
  messageCount?: number;
  createdAt: string;
  isNew?: boolean;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface ReadReceipt {
  conversationId: string;
  readerId: string;
  messageId: string;
  readAt: string;
}

export interface PresenceData {
  userId: string;
  status: 'ONLINE' | 'AWAY' | 'OFFLINE';
  lastSeenAt: string;
}

export type SocketConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';
