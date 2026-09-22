'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSocket } from './useSocket';
import { apiFetch, getUserId } from './useApi';
import type { DirectMessage, TypingIndicator, ReadReceipt } from '@/types/dm';

interface MessagesResponse {
  messages: DirectMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface SendMessageCallback {
  success?: boolean;
  error?: string;
  message?: DirectMessage;
  conversationId?: string;
}

interface HttpSendResponse {
  success: boolean;
  message: DirectMessage;
}

interface UseDirectMessagesReturn {
  messages: DirectMessage[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  typingUsers: string[];
  sendMessage: (content: string, recipientId?: string) => Promise<{ success: boolean; conversationId?: string }>;
  sendTyping: (isTyping: boolean) => void;
  markAsRead: (messageId: string) => void;
  loadMore: () => Promise<void>;
}

export function useDirectMessages(conversationId: string | null): UseDirectMessagesReturn {
  const { emit, on, isConnected, connectCount } = useSocket();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const currentUserId = getUserId();

  // Load messages from API
  const fetchMessages = useCallback(() => {
    if (!conversationId) return;

    apiFetch<MessagesResponse>(`/api/dm/conversations/${conversationId}/messages`)
      .then(({ messages: fetched, hasMore: more, nextCursor: cursor }) => {
        setMessages((prev) => {
          // Merge: keep any optimistic (temp) messages not yet confirmed, replace the rest
          const tempMessages = prev.filter((m) => m.id.startsWith('temp-'));
          const fetchedIds = new Set(fetched.map((m) => m.id));
          const unresolvedTemp = tempMessages.filter((m) => !fetchedIds.has(m.id));
          return [...fetched, ...unresolvedTemp];
        });
        setHasMore(more);
        setNextCursor(cursor);
      })
      .catch((err) => {
        console.error('Error loading messages:', err);
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      });
  }, [conversationId]);

  // Load initial messages
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setHasMore(false);
      setNextCursor(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    fetchMessages();
    setIsLoading(false);
  }, [conversationId, fetchMessages]);

  // Refetch messages when tab becomes visible (catches any missed real-time events)
  useEffect(() => {
    if (!conversationId) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchMessages();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [conversationId, fetchMessages]);

  // Join conversation room when connected
  useEffect(() => {
    if (!conversationId || !isConnected) return;

    console.log('[DM] Joining conversation room:', conversationId);
    emit('dm:join', conversationId);
    return () => {
      emit('dm:leave', conversationId);
    };
  }, [conversationId, isConnected, connectCount, emit]);

  // Listen for new messages via socket
  useEffect(() => {
    if (!conversationId || !isConnected) return;

    console.log('[DM] Registering dm:new listener for conversation:', conversationId);

    const handler = (...args: unknown[]) => {
      const message = args[0] as DirectMessage;
      console.log('[DM] Received dm:new:', message.id, 'for conversation:', message.conversationId);

      if (message.conversationId === conversationId) {
        setMessages((prev) => {
          // If message has tempId, replace the optimistic message
          if (message.tempId) {
            const exists = prev.some((m) => m.tempId === message.tempId || m.id === message.id);
            if (exists) {
              return prev.map((m) =>
                m.tempId === message.tempId ? { ...message, status: 'sent' as const } : m
              );
            }
          }

          // Avoid duplicates
          if (prev.some((m) => m.id === message.id)) {
            return prev;
          }

          return [...prev, message];
        });
      }
    };

    const unsubscribe = on('dm:new', handler);

    return () => {
      unsubscribe();
    };
  }, [conversationId, on, isConnected, connectCount]);

  // Listen for typing indicators
  useEffect(() => {
    if (!conversationId || !isConnected) return;

    const handler = (...args: unknown[]) => {
      const { userId, isTyping } = args[0] as TypingIndicator;
      // Don't show typing indicator for current user
      if (userId === currentUserId) return;

      setTypingUsers((prev) => {
        const next = new Set(prev);

        // Clear existing timeout
        const existingTimeout = typingTimeoutRef.current.get(userId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          typingTimeoutRef.current.delete(userId);
        }

        if (isTyping) {
          next.add(userId);
          // Auto-clear typing after 3 seconds
          const timeout = setTimeout(() => {
            setTypingUsers((p) => {
              const n = new Set(p);
              n.delete(userId);
              return n;
            });
            typingTimeoutRef.current.delete(userId);
          }, 3000);
          typingTimeoutRef.current.set(userId, timeout);
        } else {
          next.delete(userId);
        }

        return next;
      });
    };

    const unsubscribe = on('dm:typing', handler);

    const timeouts = typingTimeoutRef.current;

    return () => {
      unsubscribe();
      // Clear all typing timeouts on unmount
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();
    };
  }, [conversationId, currentUserId, on, isConnected, connectCount]);

  // Listen for read receipts
  useEffect(() => {
    if (!conversationId || !isConnected) return;

    const handler = (...args: unknown[]) => {
      const receipt = args[0] as ReadReceipt;
      if (receipt.conversationId === conversationId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.senderId === currentUserId && m.createdAt <= receipt.readAt) {
              return { ...m, status: 'read' as const };
            }
            return m;
          })
        );
      }
    };

    const unsubscribe = on('dm:read:receipt', handler);

    return () => {
      unsubscribe();
    };
  }, [conversationId, currentUserId, on, isConnected, connectCount]);

  // Send message via HTTP API (fallback when socket is not connected)
  const sendViaHttp = useCallback(
    async (convId: string, content: string): Promise<{ success: boolean; message?: DirectMessage }> => {
      try {
        console.log('[DM] Sending message via HTTP fallback');
        const data = await apiFetch<HttpSendResponse>(
          `/api/dm/conversations/${convId}/messages`,
          { method: 'POST', body: { content } }
        );
        return { success: true, message: data.message };
      } catch (err) {
        console.error('[DM] HTTP send failed:', err);
        return { success: false };
      }
    },
    []
  );

  // Send message — tries socket first, falls back to HTTP
  const sendMessage = useCallback(
    async (
      content: string,
      recipientId?: string
    ): Promise<{ success: boolean; conversationId?: string }> => {
      if (!content.trim()) {
        return { success: false };
      }

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create optimistic message
      const tempMessage: DirectMessage = {
        id: tempId,
        tempId,
        conversationId: conversationId || '',
        senderId: currentUserId,
        content: content.trim(),
        isEdited: false,
        editedAt: null,
        createdAt: new Date().toISOString(),
        sender: { id: currentUserId, handle: null, avatarUrl: null },
        status: 'sending',
      };

      // Add optimistic message if we have a conversation
      if (conversationId) {
        setMessages((prev) => [...prev, tempMessage]);
      }

      // Try socket first
      const emitSent = emit(
        'dm:send',
        { conversationId: conversationId || undefined, recipientId, content: content.trim(), tempId },
        (response: SendMessageCallback) => {
          if (response.success && response.message) {
            setMessages((prev) =>
              prev.map((m) =>
                m.tempId === tempId ? { ...response.message!, status: 'sent' as const } : m
              )
            );
          } else {
            // Socket callback reported failure — try HTTP fallback
            console.warn('[DM] Socket send callback reported failure:', response.error);
            if (conversationId) {
              sendViaHttp(conversationId, content.trim()).then((httpResult) => {
                if (httpResult.success && httpResult.message) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.tempId === tempId ? { ...httpResult.message!, status: 'sent' as const } : m
                    )
                  );
                } else {
                  setMessages((prev) =>
                    prev.map((m) => (m.tempId === tempId ? { ...m, status: 'failed' as const } : m))
                  );
                }
              });
            } else {
              setMessages((prev) =>
                prev.map((m) => (m.tempId === tempId ? { ...m, status: 'failed' as const } : m))
              );
            }
          }
        }
      );

      // If socket emit failed entirely (not connected), fall back to HTTP
      if (!emitSent) {
        console.warn('[DM] Socket not connected, using HTTP fallback');
        if (conversationId) {
          const httpResult = await sendViaHttp(conversationId, content.trim());
          if (httpResult.success && httpResult.message) {
            setMessages((prev) =>
              prev.map((m) =>
                m.tempId === tempId ? { ...httpResult.message!, status: 'sent' as const } : m
              )
            );
            // After HTTP send, refetch to stay in sync
            void new Promise<void>((r) => setTimeout(r, 500)).then(fetchMessages);
            return { success: true, conversationId };
          } else {
            setMessages((prev) =>
              prev.map((m) => (m.tempId === tempId ? { ...m, status: 'failed' as const } : m))
            );
            return { success: false };
          }
        }
        return { success: false };
      }

      // Socket emit was sent — wait for the callback via a timeout
      return new Promise((resolve) => {
        // The callback in emit above will handle the message state updates.
        // We resolve optimistically here since the emit was successfully sent.
        // If the server fails, the callback above will mark the message as failed.
        resolve({ success: true, conversationId: conversationId || undefined });
      });
    },
    [conversationId, currentUserId, emit, sendViaHttp, fetchMessages]
  );

  // Send typing indicator
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!conversationId || !isConnected) return;
      emit('dm:typing:' + (isTyping ? 'start' : 'stop'), conversationId);
    },
    [conversationId, isConnected, emit]
  );

  // Mark message as read
  const markAsRead = useCallback(
    (messageId: string) => {
      if (!conversationId || !isConnected) return;
      emit('dm:read', { conversationId, messageId });
    },
    [conversationId, isConnected, emit]
  );

  // Load more messages (older)
  const loadMore = useCallback(async () => {
    if (!conversationId || !hasMore || !nextCursor || isLoading) return;

    setIsLoading(true);
    try {
      const data = await apiFetch<MessagesResponse>(
        `/api/dm/conversations/${conversationId}/messages?cursor=${nextCursor}`
      );
      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error('Error loading more messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, hasMore, nextCursor, isLoading]);

  // Memoize typingUsers array to prevent unnecessary re-renders
  const typingUsersArray = useMemo(() => Array.from(typingUsers), [typingUsers]);

  return {
    messages,
    isLoading,
    error,
    hasMore,
    typingUsers: typingUsersArray,
    sendMessage,
    sendTyping,
    markAsRead,
    loadMore,
  };
}
