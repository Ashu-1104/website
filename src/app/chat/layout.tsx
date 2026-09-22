'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';
import ChatShell from '@/components/chat/ChatShell';

type ChatLayoutProps = {
  children: React.ReactNode;
};

function ChatLayoutInner({ children }: ChatLayoutProps) {
  const params = useParams();
  const searchParams = useSearchParams();

  const chatIdParam = params?.chatId;
  const activeChatId = typeof chatIdParam === 'string' ? chatIdParam : undefined;
  const activeChatKind = searchParams?.get('type') === 'user' ? 'user' : 'character';

  void children;

  return (
    <SidebarProvider>
      <div className="app-layout">
        <Sidebar />
        <Header />
        <main className="main-content">
          <ChatShell
            activeChatId={activeChatId}
            activeChatKind={activeChatKind}
          />
        </main>
      </div>
    </SidebarProvider>
  );
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <Suspense>
      <ChatLayoutInner>{children}</ChatLayoutInner>
    </Suspense>
  );
}
