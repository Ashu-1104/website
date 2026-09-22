'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Plus, Trash2, Edit3, X, Loader2, Eye, EyeOff, Star, StarOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov'];

function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const clean = url.split('?')[0]?.toLowerCase() ?? '';
  return VIDEO_EXTENSIONS.some((ext) => clean.endsWith(ext));
}

/* ---------- Types ---------- */

interface AIApp {
  id: string;
  slug: string;
  label: string;
  description: string;
  longDescription: string | null;
  thumbnailUrl: string;
  bannerUrl: string | null;
  category: string | null;
  creditCost: number;
  isActive: boolean;
  isNsfw: boolean;
  isFeatured: boolean;
  sortOrder: number;
  likeCount: number;
  favoriteCount: number;
  usageCount: number;
  createdAt: string;
}

/* ---------- Component ---------- */

export default function AdminAIAppsPage() {
  const [apps, setApps] = useState<AIApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  /* ---- Form state ---- */
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingApp, setEditingApp] = useState<AIApp | null>(null);

  const [formLabel, setFormLabel] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLongDescription, setFormLongDescription] = useState('');
  const [formThumbnailUrl, setFormThumbnailUrl] = useState('');
  const [formBannerUrl, setFormBannerUrl] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formCreditCost, setFormCreditCost] = useState(10);
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formIsNsfw, setFormIsNsfw] = useState(false);
  const [formIsFeatured, setFormIsFeatured] = useState(false);

  /* ---------- Fetch apps ---------- */
  const fetchApps = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/ai-apps');
      if (!res.ok) throw new Error('Failed to load apps');
      const data = await res.json();
      setApps(data.apps ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load apps');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  /* ---------- Form helpers ---------- */
  const resetForm = () => {
    setFormLabel('');
    setFormDescription('');
    setFormLongDescription('');
    setFormThumbnailUrl('');
    setFormBannerUrl('');
    setFormCategory('');
    setFormCreditCost(10);
    setFormSortOrder(0);
    setFormIsNsfw(false);
    setFormIsFeatured(false);
    setEditingApp(null);
    setView('list');
  };

  const openCreateForm = () => {
    resetForm();
    setView('form');
  };

  const openEditForm = (app: AIApp) => {
    setEditingApp(app);
    setFormLabel(app.label);
    setFormDescription(app.description);
    setFormLongDescription(app.longDescription ?? '');
    setFormThumbnailUrl(app.thumbnailUrl ?? '');
    setFormBannerUrl(app.bannerUrl ?? '');
    setFormCategory(app.category ?? '');
    setFormCreditCost(app.creditCost);
    setFormSortOrder(app.sortOrder);
    setFormIsNsfw(app.isNsfw);
    setFormIsFeatured(app.isFeatured);
    setView('form');
  };

  /* ---------- Save (create or update) ---------- */
  const handleSave = async () => {
    if (!formLabel.trim()) {
      setError('Label is required');
      return;
    }
    if (!formDescription.trim()) {
      setError('Description is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const isEdit = !!editingApp;
      const payload: Record<string, unknown> = {
        label: formLabel.trim(),
        description: formDescription.trim(),
        longDescription: formLongDescription.trim() || null,
        thumbnailUrl: formThumbnailUrl.trim(),
        bannerUrl: formBannerUrl.trim() || null,
        category: formCategory.trim() || null,
        creditCost: formCreditCost,
        sortOrder: formSortOrder,
        isNsfw: formIsNsfw,
        isFeatured: formIsFeatured,
      };

      if (isEdit) {
        payload.id = editingApp.id;
      }

      const res = await fetch('/api/admin/ai-apps', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to ${isEdit ? 'update' : 'create'} app`);
      }

      resetForm();
      await fetchApps();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save app');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Toggle active ---------- */
  const handleToggleActive = async (app: AIApp) => {
    try {
      const res = await fetch('/api/admin/ai-apps', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: app.id, isActive: !app.isActive }),
      });
      if (!res.ok) throw new Error('Failed to update');
      await fetchApps();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to toggle app');
    }
  };

  /* ---------- Toggle featured ---------- */
  const handleToggleFeatured = async (app: AIApp) => {
    try {
      const res = await fetch('/api/admin/ai-apps', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: app.id, isFeatured: !app.isFeatured }),
      });
      if (!res.ok) throw new Error('Failed to update');
      await fetchApps();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to toggle featured');
    }
  };

  /* ---------- Delete ---------- */
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this app?')) return;
    try {
      const res = await fetch('/api/admin/ai-apps', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchApps();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete app');
    }
  };

  /* ========== RENDER ========== */

  if (view === 'form') {
    return (
      <div className="admin-models">
        <div className="admin-models-header">
          <button type="button" className="admin-models-back" onClick={resetForm}>
            &larr; Back
          </button>
          <h1 className="page-title">
            {editingApp ? `Edit: ${editingApp.label}` : 'Add New AI App'}
          </h1>
        </div>

        {error && (
          <div className="admin-models-error">
            {error}
            <button type="button" onClick={() => setError('')} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="admin-models-form">
          {/* Label + Sort Order */}
          <div className="admin-form-row">
            <div className="admin-form-field">
              <label className="admin-form-label">
                Label <span className="text-pink-500">*</span>
              </label>
              <input
                className="admin-form-input"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="e.g. Face Swap"
              />
            </div>
            <div className="admin-form-field">
              <label className="admin-form-label">Sort Order</label>
              <input
                className="admin-form-input"
                type="number"
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Slug (read-only on edit) */}
          {editingApp && (
            <div className="admin-form-field">
              <label className="admin-form-label">Slug</label>
              <input
                className="admin-form-input"
                value={editingApp.slug}
                disabled
                style={{ opacity: 0.6 }}
              />
            </div>
          )}

          {/* Thumbnail URL */}
          <div className="admin-form-field">
            <label className="admin-form-label">Thumbnail Image URL</label>
            <input
              className="admin-form-input"
              value={formThumbnailUrl}
              onChange={(e) => setFormThumbnailUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
            {formThumbnailUrl && formThumbnailUrl !== '/images/placeholder.svg' && (
              <div className="admin-form-preview mt-2">
                {isVideoUrl(formThumbnailUrl) ? (
                  <video
                    src={formThumbnailUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={formThumbnailUrl}
                    alt="Preview"
                    className="w-full h-full object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Banner URL */}
          <div className="admin-form-field">
            <label className="admin-form-label">Banner Image URL</label>
            <input
              className="admin-form-input"
              value={formBannerUrl}
              onChange={(e) => setFormBannerUrl(e.target.value)}
              placeholder="https://example.com/banner.jpg (optional)"
            />
            {formBannerUrl && (
              <div className="admin-form-preview mt-2" style={{ aspectRatio: '16/9' }}>
                {isVideoUrl(formBannerUrl) ? (
                  <video
                    src={formBannerUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={formBannerUrl}
                    alt="Banner preview"
                    className="w-full h-full object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="admin-form-field">
            <label className="admin-form-label">
              Description <span className="text-pink-500">*</span>
            </label>
            <input
              className="admin-form-input"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Short description shown on the card"
            />
          </div>

          {/* Long Description */}
          <div className="admin-form-field">
            <label className="admin-form-label">Long Description</label>
            <textarea
              className="admin-form-textarea"
              value={formLongDescription}
              onChange={(e) => setFormLongDescription(e.target.value)}
              placeholder="Detailed description (optional)"
              rows={4}
            />
          </div>

          {/* Category + Credit Cost */}
          <div className="admin-form-row">
            <div className="admin-form-field">
              <label className="admin-form-label">Category</label>
              <input
                className="admin-form-input"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                placeholder="e.g. image, video, effects"
              />
            </div>
            <div className="admin-form-field">
              <label className="admin-form-label">Credit Cost</label>
              <input
                className="admin-form-input"
                type="number"
                value={formCreditCost}
                onChange={(e) => setFormCreditCost(parseInt(e.target.value) || 0)}
                placeholder="10"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="admin-form-row">
            <div className="admin-form-field">
              <label className="admin-form-label flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsFeatured}
                  onChange={(e) => setFormIsFeatured(e.target.checked)}
                  className="rounded border-white/20"
                />
                Featured
              </label>
            </div>
            <div className="admin-form-field">
              <label className="admin-form-label flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsNsfw}
                  onChange={(e) => setFormIsNsfw(e.target.checked)}
                  className="rounded border-white/20"
                />
                NSFW
              </label>
            </div>
          </div>

          <div className="admin-form-footer">
            <button type="button" className="admin-form-cancel" onClick={resetForm}>
              Cancel
            </button>
            <button
              type="button"
              className="admin-form-save"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : editingApp ? (
                'Update App'
              ) : (
                'Create App'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---- List view ---- */
  return (
    <div className="admin-models">
      <div className="admin-models-header">
        <h1 className="page-title">AI Apps</h1>
        <button type="button" className="admin-models-add-btn" onClick={openCreateForm}>
          <Plus className="w-4 h-4" />
          Add App
        </button>
      </div>

      {error && (
        <div className="admin-models-error">
          {error}
          <button type="button" onClick={() => setError('')} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="admin-models-loading">Loading apps...</div>
      ) : apps.length === 0 ? (
        <div className="admin-models-empty">
          No apps yet. Click &quot;Add App&quot; to create one.
        </div>
      ) : (
        <div className="admin-models-table-wrap">
          <table className="admin-models-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Label</th>
                <th>Description</th>
                <th>Category</th>
                <th>Credits</th>
                <th>Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id}>
                  <td>
                    <div className="admin-models-thumb">
                      {app.thumbnailUrl && app.thumbnailUrl !== '/images/placeholder.svg' ? (
                        isVideoUrl(app.thumbnailUrl) ? (
                          <video
                            src={app.thumbnailUrl}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <Image
                            src={app.thumbnailUrl}
                            alt=""
                            fill
                            sizes="48px"
                            className="object-cover rounded"
                            unoptimized
                          />
                        )
                      ) : (
                        <div className="w-full h-full bg-white/5 rounded" />
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="admin-models-name">{app.label}</span>
                    <span className="admin-models-slug">{app.slug}</span>
                  </td>
                  <td>
                    <span className="text-xs text-text-muted" style={{ maxWidth: 250, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {app.description}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs text-text-muted">{app.category || '—'}</span>
                  </td>
                  <td>{app.creditCost}</td>
                  <td>{app.sortOrder}</td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <span
                        className={cn(
                          'admin-models-badge',
                          app.isActive ? 'admin-models-badge-success' : 'admin-models-badge-muted',
                        )}
                      >
                        {app.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {app.isFeatured && (
                        <span className="admin-models-badge admin-models-badge-success">
                          Featured
                        </span>
                      )}
                      {app.isNsfw && (
                        <span className="admin-models-badge admin-models-badge-muted">
                          NSFW
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="admin-models-actions">
                      <button
                        type="button"
                        className="admin-models-action-btn"
                        onClick={() => handleToggleActive(app)}
                        title={app.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {app.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        className="admin-models-action-btn"
                        onClick={() => handleToggleFeatured(app)}
                        title={app.isFeatured ? 'Unfeature' : 'Feature'}
                      >
                        {app.isFeatured ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        className="admin-models-action-btn"
                        onClick={() => openEditForm(app)}
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="admin-models-action-btn admin-models-action-btn-danger"
                        onClick={() => handleDelete(app.id)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
