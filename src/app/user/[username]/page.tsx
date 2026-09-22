import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { prisma } from '@/lib/db';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';
import PublicProfileContent from '@/components/profile/PublicProfileContent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function UserProfilePage({ params }: { params: { username: string } }) {
  const raw = decodeURIComponent(params.username);
  const username = raw.trim().replace(/^@/, '');

  const user =
    (UUID_REGEX.test(username)
      ? await prisma.user.findUnique({ where: { id: username } })
      : null) ??
    (await prisma.user.findUnique({ where: { handle: username } }));

  if (!user || user.isDeactivated) notFound();

  return (
    <SidebarProvider>
      <div className="app-layout">
        <Sidebar />
        <Header />
        <main className="main-content">
          <div className="content-wrapper">
            <Suspense fallback={<div className="gallery-loading">Loading profile...</div>}>
              <PublicProfileContent userId={user.id} />
            </Suspense>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

