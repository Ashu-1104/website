'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { apiFetch } from './useApi';
import type { DirectConversation, DirectMessage } from '@/types/dm';

interface ConversationsResponse {
  items: DirectConversation[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface CreateConversationResponse {
  conversation: DirectConversation;
}

interface UseDirectConversationsReturn {
  conversations: DirectConversation[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  createConversation: (recipientId: string) => Promise<DirectConversation | null>;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useDirectConversations(): UseDirectConversationsReturn {
  const { on, isConnected, connectCount } = useSocket();
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch<ConversationsResponse>('/api/dm/conversations');
      setConversations(data.items);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Listen for new messages to update conversation list
  useEffect(() => {
    if (!isConnected) return;

    const handler = (...args: unknown[]) => {
      const message = args[0] as DirectMessage;
      setConversations((prev) => {
        const conversationIndex = prev.findIndex((c) => c.id === message.conversationId);

        if (conversationIndex === -1) {
          // New conversation - refetch to get full data
          fetchConversations();
          return prev;
        }

        // Update existing conversation
        const updated = [...prev];
        const conversation = { ...updated[conversationIndex] };
        conversation.lastMessageAt = message.createdAt;
        conversation.lastMessagePreview = message.content.substring(0, 100);

        // Move to top of list
        updated.splice(conversationIndex, 1);
        updated.unshift(conversation);

        return updated;
      });
    };

    const unsubscribe = on('dm:new', handler);

    return () => {
      unsubscribe();
    };
  }, [isConnected, connectCount, on, fetchConversations]);

  // Create a new conversation
  const createConversation = useCallback(
    async (recipientId: string): Promise<DirectConversation | null> => {
      try {
        const data = await apiFetch<CreateConversationResponse>('/api/dm/conversations', {
          method: 'POST',
          body: { recipientId },
        });

        // Add to conversations list if new
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === data.conversation.id);
          if (exists) return prev;
          return [data.conversation, ...prev];
        });

        return data.conversation;
      } catch (err) {
        console.error('Error creating conversation:', err);
        return null;
      }
    },
    []
  );

  // Load more conversations
  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || isLoading) return;

    setIsLoading(true);
    try {
      const data = await apiFetch<ConversationsResponse>(
        `/api/dm/conversations?cursor=${nextCursor}`
      );
      setConversations((prev) => [...prev, ...data.items]);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error('Error loading more conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, nextCursor, isLoading]);

  return {
    conversations,
    isLoading,
    error,
    hasMore,
    createConversation,
    loadMore,
    refetch: fetchConversations,
  };
}
