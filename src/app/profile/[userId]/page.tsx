import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';
import PublicProfileContent from '@/components/profile/PublicProfileContent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function PublicProfilePage({ params }: { params: { userId: string } }) {
  const userId = params.userId;
  if (!UUID_REGEX.test(userId)) notFound();

  return (
    <SidebarProvider>
      <div className="app-layout">
        <Sidebar />
        <Header />
        <main className="main-content">
          <div className="content-wrapper">
            <Suspense fallback={<div className="gallery-loading">Loading profile...</div>}>
              <PublicProfileContent userId={userId} />
            </Suspense>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
