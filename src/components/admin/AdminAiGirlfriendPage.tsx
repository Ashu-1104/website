'use client';

import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

type SidebarLogoVideo = {
  id: string;
  videoUrl: string;
  isActive: boolean;
  createdAt: string;
};

export default function AdminAiGirlfriendPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<SidebarLogoVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const readJson = async <T,>(res: Response): Promise<T> => {
    const text = await res.text();
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return {} as T;
    }
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/sidebar-logo', {
        headers: user ? { 'x-vp-user-id': user.id } : {},
      });
      const data = await readJson<{ items?: SidebarLogoVideo[]; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? 'Failed to load logo videos');
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logo videos');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const addVideo = async () => {
    const trimmed = videoUrl.trim();
    if (!trimmed) {
      setError('Video URL is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/sidebar-logo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user ? { 'x-vp-user-id': user.id } : {}),
        },
        body: JSON.stringify({ videoUrl: trimmed, isActive: true }),
      });
      const data = await readJson<{ item?: SidebarLogoVideo; error?: string }>(res);
      if (!res.ok || !data.item) throw new Error(data.error ?? 'Failed to add video');
      setItems((prev) => [data.item!, ...prev]);
      setVideoUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add video');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: SidebarLogoVideo) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/sidebar-logo', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(user ? { 'x-vp-user-id': user.id } : {}),
        },
        body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
      });
      const data = await readJson<{ item?: SidebarLogoVideo; error?: string }>(res);
      if (!res.ok || !data.item) throw new Error(data.error ?? 'Failed to update video');
      setItems((prev) => prev.map((v) => (v.id === item.id ? data.item! : v)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update video');
    } finally {
      setSaving(false);
    }
  };

  const removeVideo = async (id: string) => {
    if (!confirm('Remove this logo video?')) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/sidebar-logo', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(user ? { 'x-vp-user-id': user.id } : {}),
        },
        body: JSON.stringify({ id }),
      });
      const data = await readJson<{ success?: boolean; error?: string }>(res);
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed to remove video');
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove video');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-models">
      <div className="admin-models-header">
        <div>
          <h1 className="page-title">Create AI Girlfriend</h1>
          <p className="page-subtitle">Manage the sidebar logo video.</p>
        </div>
      </div>

      {error && (
        <div className="admin-models-error">
          {error}
          <button type="button" onClick={() => setError('')} className="ml-auto">x</button>
        </div>
      )}

      <div className="admin-sidebar-logo-form">
        <label className="admin-form-field">
          <span className="admin-form-label">Video URL</span>
          <input
            className="admin-form-input"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://assets.example.com/video.mp4"
          />
        </label>
        <button
          type="button"
          className="admin-form-save"
          onClick={addVideo}
          disabled={saving}
        >
          <Plus size={16} />
          Add Video
        </button>
      </div>

      {loading ? (
        <div className="admin-models-loading">Loading logo videos...</div>
      ) : items.length === 0 ? (
        <div className="admin-models-empty">No logo videos yet.</div>
      ) : (
        <div className="admin-sidebar-logo-list">
          {items.map((item) => (
            <div key={item.id} className="admin-sidebar-logo-card">
              <div className="admin-sidebar-logo-preview">
                <video src={item.videoUrl} muted loop playsInline />
              </div>
              <div className="admin-sidebar-logo-meta">
                <div className="admin-sidebar-logo-url">{item.videoUrl}</div>
                <div className="admin-sidebar-logo-status">
                  <span className={cn('admin-sidebar-logo-pill', item.isActive && 'admin-sidebar-logo-pill-active')}>
                    {item.isActive ? 'Active' : 'Hidden'}
                  </span>
                </div>
              </div>
              <div className="admin-sidebar-logo-actions">
                <button
                  type="button"
                  className="admin-models-action-btn"
                  onClick={() => toggleActive(item)}
                  disabled={saving}
                  title={item.isActive ? 'Hide' : 'Show'}
                >
                  {item.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  type="button"
                  className="admin-models-action-btn admin-models-action-btn-danger"
                  onClick={() => removeVideo(item.id)}
                  disabled={saving}
                  title="Remove"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
