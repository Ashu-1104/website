'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Image as ImageIcon, Video as VideoIcon, Volume2 as AudioIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import VirtualizedList, { VirtualizedListHandle } from '@/components/chat/VirtualizedList';
import type { ChatContact, ChatThread } from '@/types/chat';
import { buildLastMessagePreview, getLastMessage, isThreadUnread, ChatLastMessagePreview } from '@/lib/chat/preview';

type ChatContactsPanelProps = {
  contacts: ChatContact[];
  activeChatId?: string;
  threadsByChatId: Record<string, ChatThread | undefined>;
  lastReadMessageIdByChatId: Record<string, string | undefined>;
};

type ContactRowData = ChatContact & {
  preview: ChatLastMessagePreview;
  isUnread: boolean;
};

const CONTACT_ROW_HEIGHT = 76;

export default function ChatContactsPanel({
  contacts,
  activeChatId,
  threadsByChatId,
  lastReadMessageIdByChatId,
}: ChatContactsPanelProps) {
  // Image fallback helps avoid layout shifts and keeps the list snappy if a URL fails.
  const [brokenAvatarIds, setBrokenAvatarIds] = useState<Set<string>>(() => new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const listRef = useRef<VirtualizedListHandle | null>(null);

  // Precompute preview and unread state for each contact so the rows array
  // changes when thread data changes, forcing VirtualizedList to re-render items.
  const rows = useMemo<ContactRowData[]>(() => {
    return contacts.map((contact) => {
      const thread = threadsByChatId[contact.id];
      const preview = buildLastMessagePreview(thread);
      const isUnread = contact.id !== activeChatId
        ? isThreadUnread({
            lastMessage: getLastMessage(thread),
            lastReadMessageId: lastReadMessageIdByChatId[contact.id],
          })
        : false;
      return {
        ...contact,
        preview,
        isUnread,
      };
    });
  }, [contacts, activeChatId, threadsByChatId, lastReadMessageIdByChatId]);

  // Scroll to active contact when it changes to keep it visible
  useEffect(() => {
    if (!activeChatId) return;
    const index = rows.findIndex((row) => row.id === activeChatId);
    if (index !== -1 && listRef.current) {
      listRef.current.scrollToIndex(index);
    }
  }, [activeChatId, rows]);

  return (
    <div className={cn('chat-contacts-wrapper', isCollapsed && 'chat-contacts-wrapper-collapsed')}>
      <section className={cn('chat-panel chat-panel-left', isCollapsed && 'chat-panel-left-collapsed')} aria-label="Chat contacts">
        {isCollapsed ? (
          <div className="chat-collapsed-avatars">
            {rows.map((row) => {
              const isBroken = brokenAvatarIds.has(row.id);
              const isActive = row.id === activeChatId;
              return (
                <Link
                  key={row.id}
                  href={row.kind === 'user' ? `/chat/${row.id}?type=user` : `/chat/${row.id}`}
                  className={cn('chat-collapsed-avatar', isActive && 'chat-collapsed-avatar-active')}
                  title={row.name}
                >
                  {!isBroken && row.avatarUrl ? (
                    <Image
                      src={row.avatarUrl}
                      alt={row.name}
                      fill
                      sizes="44px"
                      className="object-cover"
                      onError={() => {
                        setBrokenAvatarIds((prev) => {
                          const next = new Set(prev);
                          next.add(row.id);
                          return next;
                        });
                      }}
                    />
                  ) : (
                    <span className="chat-collapsed-avatar-fallback">
                      {row.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  {row.isUnread && <span className="chat-collapsed-unread-badge" />}
                </Link>
              );
            })}
          </div>
        ) : (
          <>
            <div className="chat-contacts-header">
              <h2 className="chat-contacts-title">Your Chats</h2>
            </div>

            <VirtualizedList
              ref={listRef}
              ariaLabel="Contacts list"
              className="chat-contacts-list"
              items={rows}
              itemHeight={CONTACT_ROW_HEIGHT}
              overscan={6}
              getItemKey={(item) => `${item.id}-${item.preview.lastMessageId ?? 'none'}-${item.isUnread}`}
              renderItem={(row) => {
                const isActive = row.id === activeChatId;
                const isBroken = brokenAvatarIds.has(row.id);

                return (
                  <Link
                    href={row.kind === 'user' ? `/chat/${row.id}?type=user` : `/chat/${row.id}`}
                    className={cn(
                      'chat-contact-row',
                      isActive && 'chat-contact-row-active',
                      row.isUnread && 'chat-contact-row-unread'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <div className="chat-contact-avatar">
                      {!isBroken && row.avatarUrl ? (
                        <Image
                          src={row.avatarUrl}
                          alt={row.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                          onError={() => {
                            setBrokenAvatarIds((prev) => {
                              const next = new Set(prev);
                              next.add(row.id);
                              return next;
                            });
                          }}
                        />
                      ) : (
                        <div className="chat-contact-avatar-fallback flex items-center justify-center text-base font-bold text-white/70">
                          {row.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="chat-contact-meta">
                      <div className="chat-contact-top">
                        <span className="chat-contact-name">{row.name}</span>
                        <div className="chat-contact-top-right">
                          {row.preview.dateLabel && (
                            <span className="chat-contact-date" suppressHydrationWarning>
                              {row.preview.dateLabel}
                            </span>
                          )}
                          {row.isUnread && <span className="chat-contact-unread-dot" aria-label="Unread" />}
                        </div>
                      </div>
                      <span className="chat-contact-preview" aria-label="Last message preview">
                        {row.preview.kind === 'image' && (
                          <ImageIcon className="chat-contact-preview-icon" aria-hidden="true" />
                        )}
                        {row.preview.kind === 'video' && (
                          <VideoIcon className="chat-contact-preview-icon" aria-hidden="true" />
                        )}
                        {row.preview.kind === 'audio' && (
                          <AudioIcon className="chat-contact-preview-icon" aria-hidden="true" />
                        )}
                        <span className="chat-contact-preview-text">{row.preview.text}</span>
                      </span>
                    </div>
                  </Link>
                );
              }}
            />
          </>
        )}
      </section>

      <button
        className="chat-contacts-toggle"
        onClick={() => setIsCollapsed((prev) => !prev)}
        aria-label={isCollapsed ? 'Expand contacts' : 'Collapse contacts'}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </div>

  );
}
