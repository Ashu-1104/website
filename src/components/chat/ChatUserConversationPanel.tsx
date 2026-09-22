'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { useUserPresence } from '@/hooks/usePresence';
import { getUserId } from '@/hooks/useApi';
import ChatComposerDM from '@/components/chat/ChatComposerDM';
import ChatTypingIndicator from '@/components/chat/ChatTypingIndicator';
import type { ChatContact } from '@/types/chat';

interface ChatUserConversationPanelProps {
  contact: ChatContact;
  profileHref: string;
  loading: boolean;
  error: string | null;
  conversationId?: string | null;
  onConversationCreated?: (conversationId: string) => void;
  onActivity?: (timestamp: number) => void;
  onLastMessageChange?: (preview: { text: string; timestamp: number } | null) => void;
}

export default function ChatUserConversationPanel({
  contact,
  profileHref,
  loading,
  error,
  conversationId = null,
  onConversationCreated,
  onActivity,
  onLastMessageChange,
}: ChatUserConversationPanelProps) {
  const currentUserId = getUserId();
  const {
    messages,
    isLoading: messagesLoading,
    typingUsers,
    sendMessage,
    sendTyping,
    markAsRead,
    loadMore,
    hasMore,
  } = useDirectMessages(conversationId);

  const { status: presenceStatus, isOnline } = useUserPresence(contact.id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Track if initial messages have been loaded (to distinguish from new real-time messages)
  const initialLoadCompleteRef = useRef(false);
  const previousMessageCountRef = useRef(0);

  // Mark initial load complete when messages first arrive
  useEffect(() => {
    if (!messagesLoading && messages.length > 0 && !initialLoadCompleteRef.current) {
      initialLoadCompleteRef.current = true;
      previousMessageCountRef.current = messages.length;
    }
  }, [messages.length, messagesLoading]);

  // Reset when conversation changes
  useEffect(() => {
    initialLoadCompleteRef.current = false;
    previousMessageCountRef.current = 0;
  }, [conversationId]);

  // Scroll to bottom when new messages arrive (if auto-scroll enabled)
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages.length, autoScroll]);

  // Report activity ONLY when NEW messages arrive (sent or received in real-time)
  // NOT on initial load of existing messages
  useEffect(() => {
    // Skip if initial load is not complete yet
    if (!initialLoadCompleteRef.current) return;

    // Only trigger activity when message count increases beyond initial load
    if (messages.length > previousMessageCountRef.current) {
      const lastMessage = messages[messages.length - 1];
      const timestamp = new Date(lastMessage.createdAt).getTime();
      onActivity?.(timestamp);
      previousMessageCountRef.current = messages.length;
    }
  }, [messages, onActivity]);

  // Report last message for preview in contact list
  // This can run on initial load to show the preview, but doesn't affect sorting
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      onLastMessageChange?.({
        text: lastMessage.content,
        timestamp: new Date(lastMessage.createdAt).getTime(),
      });
    } else {
      onLastMessageChange?.(null);
    }
  }, [messages, onLastMessageChange]);

  // Detect when user scrolls up
  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setAutoScroll(isNearBottom);
  }, []);

  // Mark latest message as read when viewing
  useEffect(() => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    // Only mark as read if it's from the other user
    if (lastMessage.senderId === contact.id) {
      markAsRead(lastMessage.id);
    }
  }, [messages, contact.id, markAsRead]);

  // Handle sending a message
  const handleSend = useCallback(
    async (content: string) => {
      const result = await sendMessage(content, conversationId ? undefined : contact.id);
      if (result.success) {
        onActivity?.(Date.now());
        if (result.conversationId && !conversationId) {
          onConversationCreated?.(result.conversationId);
        }
      }
    },
    [conversationId, contact.id, sendMessage, onConversationCreated, onActivity]
  );

  // Format timestamp
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Show error state
  if (error) {
    return (
      <section className="chat-panel chat-panel-center" aria-label="Direct messages">
        <div className="chat-panel-empty">
          <p className="chat-panel-title">{error}</p>
          <p className="chat-panel-subtitle">{"You can't start a direct message right now."}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Link
              href={profileHref}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
            >
              <User className="h-4 w-4" aria-hidden="true" />
              View profile
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Browse AI chats
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <section className="chat-panel chat-panel-center" aria-label="Direct messages">
        <div className="chat-panel-empty">
          <p className="chat-panel-title">Loading...</p>
          <p className="chat-panel-subtitle">Fetching user info...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="chat-panel chat-panel-center" aria-label="Direct messages">
      <div className="chat-conversation">
        <div className="chat-conversation-inner">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-white/10 bg-black/20 backdrop-blur-sm px-4 py-3">
            <Link href={profileHref} className="flex items-center gap-3 group">
              <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden ring-2 ring-white/10 group-hover:ring-accent-pink/50 transition-all">
                {contact.avatarUrl ? (
                  <Image
                    src={contact.avatarUrl}
                    alt={contact.name}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white/10">
                    <User className="h-5 w-5 text-white/50" />
                  </div>
                )}
                {/* Online indicator */}
                {isOnline && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-dark-800 bg-green-500" />
                )}
              </div>
              <div>
                <p className="font-semibold text-white group-hover:text-accent-pink transition-colors">{contact.name}</p>
                <p className={cn(
                  'text-xs',
                  presenceStatus === 'ONLINE' ? 'text-green-400' : 'text-white/50'
                )}>
                  {presenceStatus === 'ONLINE'
                    ? 'Online'
                    : presenceStatus === 'AWAY'
                      ? 'Away'
                      : 'Offline'}
                </p>
              </div>
            </Link>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="chat-messages"
            role="log"
            aria-label="Messages"
          >
            {/* Load more button */}
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={messagesLoading}
                className="chat-load-earlier"
              >
                Load earlier messages
              </button>
            )}

            {/* Loading indicator */}
            {messagesLoading && messages.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <p className="text-white/50">Loading messages...</p>
              </div>
            )}

            {/* Empty state */}
            {!messagesLoading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                  <MessageCircle className="h-8 w-8 text-white/30" />
                </div>
                <p className="text-white/70">No messages yet</p>
                <p className="mt-1 text-sm text-white/40">
                  Say hello to start a conversation with {contact.name}
                </p>
              </div>
            )}

            {/* Messages list */}
            {messages.map((message, index) => {
              const isOwn = message.senderId === currentUserId;
              const showTimestamp =
                index === 0 ||
                new Date(message.createdAt).getTime() -
                  new Date(messages[index - 1].createdAt).getTime() >
                  300000; // 5 minutes

              return (
                <div key={message.id} className="chat-message-block">
                  {/* Timestamp divider */}
                  {showTimestamp && (
                    <div className="chat-timestamp" aria-label={`Timestamp ${formatTime(message.createdAt)}`}>
                      {formatTime(message.createdAt)}
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={cn(
                      'chat-message-row',
                      isOwn ? 'chat-message-row-user' : 'chat-message-row-ai'
                    )}
                  >
                    <div
                      className={cn(
                        'chat-message-bubble',
                        isOwn ? 'chat-message-bubble-user' : 'chat-message-bubble-ai',
                        message.status === 'sending' && 'opacity-60',
                        message.status === 'failed' && 'ring-1 ring-red-500/50'
                      )}
                    >
                      <span className="whitespace-pre-wrap break-words">{message.content}</span>

                      {/* Message status */}
                      {isOwn && message.status && message.status !== 'sent' && (
                        <span className="block mt-1 text-right text-[10px] opacity-60">
                          {message.status === 'sending' && 'Sending...'}
                          {message.status === 'failed' && 'Failed to send'}
                          {message.status === 'read' && 'Read'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="chat-message-block">
                <div className="chat-message-row chat-message-row-ai">
                  <div className="chat-message-bubble chat-message-bubble-ai">
                    <ChatTypingIndicator characterName={contact.name} />
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Composer */}
          <ChatComposerDM
            onSend={handleSend}
            onTyping={sendTyping}
            placeholder={`Message ${contact.name}...`}
          />
        </div>
      </div>
    </section>
  );
}
