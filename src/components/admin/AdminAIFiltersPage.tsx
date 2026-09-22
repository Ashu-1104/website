'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Plus, Trash2, Edit3, X, Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ---------- Types ---------- */

interface AIFilter {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  thumbnailUrl: string;
  prompt: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

/* ---------- Component ---------- */

export default function AdminAIFiltersPage() {
  const [filters, setFilters] = useState<AIFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  /* ---- Form state ---- */
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingFilter, setEditingFilter] = useState<AIFilter | null>(null);

  const [formName, setFormName] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formThumbnailUrl, setFormThumbnailUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);

  /* ---------- Fetch filters ---------- */
  const fetchFilters = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/ai-filters');
      if (!res.ok) throw new Error('Failed to load filters');
      const data = await res.json();
      setFilters(data.filters ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load filters');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  /* ---------- Form helpers ---------- */
  const resetForm = () => {
    setFormName('');
    setFormPrompt('');
    setFormThumbnailUrl('');
    setFormDescription('');
    setFormSortOrder(0);
    setEditingFilter(null);
    setView('list');
  };

  const openCreateForm = () => {
    resetForm();
    setView('form');
  };

  const openEditForm = (filter: AIFilter) => {
    setEditingFilter(filter);
    setFormName(filter.name);
    setFormPrompt(filter.prompt ?? '');
    setFormThumbnailUrl(filter.thumbnailUrl ?? '');
    setFormDescription(filter.description ?? '');
    setFormSortOrder(filter.sortOrder);
    setView('form');
  };

  /* ---------- Save (create or update) ---------- */
  const handleSave = async () => {
    if (!formName.trim()) {
      setError('Name is required');
      return;
    }
    if (!formPrompt.trim()) {
      setError('Prompt is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const isEdit = !!editingFilter;
      const payload: Record<string, unknown> = {
        name: formName.trim(),
        prompt: formPrompt.trim(),
        thumbnailUrl: formThumbnailUrl.trim(),
        description: formDescription.trim() || null,
        sortOrder: formSortOrder,
      };

      if (isEdit) {
        payload.id = editingFilter.id;
      }

      const res = await fetch('/api/admin/ai-filters', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to ${isEdit ? 'update' : 'create'} filter`);
      }

      resetForm();
      await fetchFilters();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save filter');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Toggle active ---------- */
  const handleToggleActive = async (filter: AIFilter) => {
    try {
      const res = await fetch('/api/admin/ai-filters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: filter.id, isActive: !filter.isActive }),
      });
      if (!res.ok) throw new Error('Failed to update');
      await fetchFilters();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to toggle filter');
    }
  };

  /* ---------- Delete ---------- */
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this filter?')) return;
    try {
      const res = await fetch('/api/admin/ai-filters', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchFilters();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete filter');
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
            {editingFilter ? `Edit: ${editingFilter.name}` : 'Add New Filter'}
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
          <div className="admin-form-row">
            <div className="admin-form-field">
              <label className="admin-form-label">
                Name <span className="text-pink-500">*</span>
              </label>
              <input
                className="admin-form-input"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. American Comics"
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

          <div className="admin-form-field">
            <label className="admin-form-label">Thumbnail Image URL</label>
            <input
              className="admin-form-input"
              value={formThumbnailUrl}
              onChange={(e) => setFormThumbnailUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
            {formThumbnailUrl && (
              <div className="admin-form-preview mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={formThumbnailUrl}
                  alt="Preview"
                  className="w-full h-full object-cover rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          <div className="admin-form-field">
            <label className="admin-form-label">Description</label>
            <input
              className="admin-form-input"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Short description (optional)"
            />
          </div>

          <div className="admin-form-field">
            <label className="admin-form-label">
              Prompt <span className="text-pink-500">*</span>
            </label>
            <textarea
              className="admin-form-textarea"
              value={formPrompt}
              onChange={(e) => setFormPrompt(e.target.value)}
              placeholder="The AI prompt that will be sent to the image editing API..."
              rows={8}
            />
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
              ) : editingFilter ? (
                'Update Filter'
              ) : (
                'Create Filter'
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
        <h1 className="page-title">AI Filters</h1>
        <button type="button" className="admin-models-add-btn" onClick={openCreateForm}>
          <Plus className="w-4 h-4" />
          Add Filter
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
        <div className="admin-models-loading">Loading filters...</div>
      ) : filters.length === 0 ? (
        <div className="admin-models-empty">
          No filters yet. Click &quot;Add Filter&quot; to create one.
        </div>
      ) : (
        <div className="admin-models-table-wrap">
          <table className="admin-models-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Prompt</th>
                <th>Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filters.map((filter) => (
                <tr key={filter.id}>
                  <td>
                    <div className="admin-models-thumb">
                      {filter.thumbnailUrl ? (
                        <Image
                          src={filter.thumbnailUrl}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover rounded"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full bg-white/5 rounded" />
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="admin-models-name">{filter.name}</span>
                    <span className="admin-models-slug">{filter.slug}</span>
                  </td>
                  <td>
                    <span className="text-xs text-text-muted" style={{ maxWidth: 300, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {filter.prompt || '—'}
                    </span>
                  </td>
                  <td>{filter.sortOrder}</td>
                  <td>
                    <span
                      className={cn(
                        'admin-models-badge',
                        filter.isActive ? 'admin-models-badge-success' : 'admin-models-badge-muted',
                      )}
                    >
                      {filter.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-models-actions">
                      <button
                        type="button"
                        className="admin-models-action-btn"
                        onClick={() => handleToggleActive(filter)}
                        title={filter.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {filter.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        className="admin-models-action-btn"
                        onClick={() => openEditForm(filter)}
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="admin-models-action-btn admin-models-action-btn-danger"
                        onClick={() => handleDelete(filter.id)}
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
