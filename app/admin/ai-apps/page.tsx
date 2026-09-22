'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Boxes, Images, Users, Bot, ExternalLink, Sparkles, Palette, Layers, Film, CreditCard } from 'lucide-react';

const AdminAIAppsPage = dynamic(() => import('@/components/admin/AdminAIAppsPage'), { ssr: false });

export default function AdminAIAppsRoute() {
  const { user } = useAuth();

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">Admin Panel</div>

        <nav className="admin-sidebar-nav">
          <div className="admin-sidebar-section-label">Content</div>
          <Link href="/admin/models" className="admin-sidebar-link">
            <Boxes className="admin-sidebar-link-icon" />
            Models
          </Link>
          <Link href="/admin/gallery" className="admin-sidebar-link">
            <Images className="admin-sidebar-link-icon" />
            Gallery
          </Link>
          <Link href="/admin/ai-apps" className="admin-sidebar-link admin-sidebar-link-active">
            <Layers className="admin-sidebar-link-icon" />
            AI Apps
          </Link>
          <Link href="/admin/ai-filters" className="admin-sidebar-link">
            <Palette className="admin-sidebar-link-icon" />
            AI Filters
          </Link>
          <Link href="/admin/video-models" className="admin-sidebar-link">
            <Film className="admin-sidebar-link-icon" />
            Video Models
          </Link>
          <Link href="/admin/ai-girlfriend" className="admin-sidebar-link">
            <Sparkles className="admin-sidebar-link-icon" />
            Create AI Girlfriend
          </Link>

          <div className="admin-sidebar-section-label">Management</div>
          <Link href="/admin/plans" className="admin-sidebar-link">
            <CreditCard className="admin-sidebar-link-icon" />
            Plan Management
          </Link>
          <Link href="/admin/users" className="admin-sidebar-link">
            <Users className="admin-sidebar-link-icon" />
            Users
          </Link>
          <Link href="/admin/characters" className="admin-sidebar-link">
            <Bot className="admin-sidebar-link-icon" />
            Characters
          </Link>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user">
            {user?.avatarUrl && (
              <Image src={user.avatarUrl} alt="" width={28} height={28} className="rounded-full" unoptimized />
            )}
            <span className="admin-sidebar-user-name">{user?.handle ?? user?.email ?? 'Admin'}</span>
          </div>
          <Link href="/" className="admin-sidebar-link admin-sidebar-back-link">
            <ExternalLink className="admin-sidebar-link-icon" />
            Back to site
          </Link>
        </div>
      </aside>
      <main className="admin-main">
        <AdminAIAppsPage />
      </main>
    </div>
  );
}
