'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Edit3, X, Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|svg|bmp|ico|avif)(\?|$)/i;
const isDefinitelyImage = (url: string) => IMAGE_EXTENSIONS.test(url) || url.startsWith('data:image/');

/**
 * MediaThumb: tries <video> first for non-image URLs, falls back to <img>.
 */
function MediaThumb({ src, className }: { src: string; className?: string }) {
  const [useImg, setUseImg] = useState(() => isDefinitelyImage(src));

  useEffect(() => {
    setUseImg(isDefinitelyImage(src));
  }, [src]);

  if (useImg) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={className} />;
  }

  return (
    <video
      src={src}
      className={className}
      autoPlay loop muted playsInline
      onError={() => setUseImg(true)}
    />
  );
}

interface VideoModel {
  id: string;
  modelId: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  resolutions: string;
  pricingMatrix: Record<string, number> | null;
  supportsT2V: boolean;
  supportsI2V: boolean;
  durations: string;
  isNew: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export default function AdminVideoModelsPage() {
  const [models, setModels] = useState<VideoModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingModel, setEditingModel] = useState<VideoModel | null>(null);

  const [formModelId, setFormModelId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formThumbnailUrl, setFormThumbnailUrl] = useState('');
  const [formResolutions, setFormResolutions] = useState('480');
  const [formPricingMatrix, setFormPricingMatrix] = useState<Record<string, number>>({});
  const [formSupportsT2V, setFormSupportsT2V] = useState(false);
  const [formSupportsI2V, setFormSupportsI2V] = useState(false);
  const [formDurations, setFormDurations] = useState('5');
  const [formIsNew, setFormIsNew] = useState(false);
  const [formSortOrder, setFormSortOrder] = useState(0);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/video-models');
      if (!res.ok) throw new Error('Failed to load video models');
      const data = await res.json();
      setModels(data.models ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load video models');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  const resetForm = () => {
    setFormModelId('');
    setFormName('');
    setFormDescription('');
    setFormThumbnailUrl('');
    setFormResolutions('480');
    setFormPricingMatrix({});
    setFormSupportsT2V(false);
    setFormSupportsI2V(false);
    setFormDurations('5');
    setFormIsNew(false);
    setFormSortOrder(0);
    setEditingModel(null);
    setView('list');
  };

  const openCreateForm = () => { resetForm(); setView('form'); };

  const openEditForm = (model: VideoModel) => {
    setEditingModel(model);
    setFormModelId(model.modelId);
    setFormName(model.name);
    setFormDescription(model.description ?? '');
    setFormThumbnailUrl(model.thumbnailUrl ?? '');
    setFormResolutions(model.resolutions);
    setFormPricingMatrix(model.pricingMatrix ?? {});
    setFormSupportsT2V(model.supportsT2V);
    setFormSupportsI2V(model.supportsI2V);
    setFormDurations(model.durations);
    setFormIsNew(model.isNew);
    setFormSortOrder(model.sortOrder);
    setView('form');
  };

  const handleSave = async () => {
    if (!formModelId.trim()) { setError('Model ID is required'); return; }
    if (!formName.trim()) { setError('Name is required'); return; }

    setSaving(true);
    setError('');

    try {
      const isEdit = !!editingModel;
      const payload: Record<string, unknown> = {
        modelId: formModelId.trim(),
        name: formName.trim(),
        description: formDescription.trim() || null,
        thumbnailUrl: formThumbnailUrl.trim() || null,
        resolutions: formResolutions.trim(),
        pricingMatrix: Object.keys(formPricingMatrix).length > 0 ? formPricingMatrix : null,
        supportsT2V: formSupportsT2V,
        supportsI2V: formSupportsI2V,
        durations: formDurations.trim(),
        isNew: formIsNew,
        sortOrder: formSortOrder,
      };

      if (isEdit) payload.id = editingModel.id;

      const res = await fetch('/api/admin/video-models', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to ${isEdit ? 'update' : 'create'} model`);
      }

      resetForm();
      await fetchModels();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save model');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (model: VideoModel) => {
    try {
      const res = await fetch('/api/admin/video-models', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: model.id, isActive: !model.isActive }),
      });
      if (!res.ok) throw new Error('Failed to update');
      await fetchModels();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to toggle model');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this video model?')) return;
    try {
      const res = await fetch('/api/admin/video-models', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchModels();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete model');
    }
  };

  if (view === 'form') {
    return (
      <div className="admin-models">
        <div className="admin-models-header">
          <button type="button" className="admin-models-back" onClick={resetForm}>
            &larr; Back
          </button>
          <h1 className="page-title">
            {editingModel ? `Edit: ${editingModel.name}` : 'Add New Video Model'}
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
                Model ID <span className="text-pink-500">*</span>
              </label>
              <input
                className="admin-form-input"
                value={formModelId}
                onChange={(e) => setFormModelId(e.target.value)}
                placeholder="e.g. wan2.1, kling-v3"
              />
            </div>
            <div className="admin-form-field">
              <label className="admin-form-label">
                Name <span className="text-pink-500">*</span>
              </label>
              <input
                className="admin-form-input"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. WAN 2.6"
              />
            </div>
          </div>

          <div className="admin-form-field">
            <label className="admin-form-label">Description</label>
            <textarea
              className="admin-form-textarea"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Short description of the model"
              rows={3}
            />
          </div>

          <div className="admin-form-field">
            <label className="admin-form-label">Thumbnail URL</label>
            <input
              className="admin-form-input"
              value={formThumbnailUrl}
              onChange={(e) => setFormThumbnailUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
            {formThumbnailUrl && (
              <div className="admin-form-preview mt-2">
                <MediaThumb src={formThumbnailUrl} className="w-full h-full object-cover rounded" />
              </div>
            )}
          </div>

          <div className="admin-form-field">
            <label className="admin-form-label">Resolutions</label>
            <input
              className="admin-form-input"
              value={formResolutions}
              onChange={(e) => setFormResolutions(e.target.value)}
              placeholder="Comma-separated, e.g. 720,1080"
            />
            <span className="text-xs text-text-muted mt-1">Comma-separated resolution values (e.g. 480,720,1080)</span>
          </div>

          {/* Pricing Grid */}
          {(() => {
            const resList = formResolutions.split(',').map(s => s.trim()).filter(Boolean);
            const durList = formDurations.split(',').map(s => s.trim()).filter(Boolean);
            if (resList.length === 0 || durList.length === 0) return null;
            return (
              <div className="admin-form-field">
                <label className="admin-form-label">Pricing Matrix</label>
                <div className="admin-pricing-grid-wrap">
                  <table className="admin-pricing-grid">
                    <thead>
                      <tr>
                        <th></th>
                        {durList.map(d => <th key={d}>{d}s</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {resList.map(res => (
                        <tr key={res}>
                          <td className="admin-pricing-grid-label">{res}p</td>
                          {durList.map(dur => {
                            const key = `${res}-${dur}`;
                            return (
                              <td key={key}>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="admin-pricing-grid-input"
                                  value={formPricingMatrix[key] ?? ''}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setFormPricingMatrix(prev => {
                                      const next = { ...prev };
                                      if (isNaN(val) || e.target.value === '') {
                                        delete next[key];
                                      } else {
                                        next[key] = val;
                                      }
                                      return next;
                                    });
                                  }}
                                  placeholder="$0.00"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <span className="text-xs text-text-muted mt-1">Enter price for each resolution + duration combination</span>
              </div>
            );
          })()}

          <div className="admin-form-row">
            <div className="admin-form-field">
              <label className="admin-form-label">Durations</label>
              <input
                className="admin-form-input"
                value={formDurations}
                onChange={(e) => setFormDurations(e.target.value)}
                placeholder="Comma-separated seconds, e.g. 5,10,15"
              />
            </div>
            <div className="admin-form-field">
              <label className="admin-form-label">Sort Order</label>
              <input
                className="admin-form-input"
                type="number"
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-field">
              <label className="admin-form-label flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formSupportsT2V} onChange={(e) => setFormSupportsT2V(e.target.checked)} className="rounded border-white/20" />
                Supports Text-to-Video
              </label>
            </div>
            <div className="admin-form-field">
              <label className="admin-form-label flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formSupportsI2V} onChange={(e) => setFormSupportsI2V(e.target.checked)} className="rounded border-white/20" />
                Supports Image-to-Video
              </label>
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-field">
              <label className="admin-form-label flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formIsNew} onChange={(e) => setFormIsNew(e.target.checked)} className="rounded border-white/20" />
                Show &quot;NEW&quot; badge
              </label>
            </div>
          </div>

          <div className="admin-form-footer">
            <button type="button" className="admin-form-cancel" onClick={resetForm}>Cancel</button>
            <button type="button" className="admin-form-save" onClick={handleSave} disabled={saving}>
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : editingModel ? 'Update Model' : 'Create Model'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-models">
      <div className="admin-models-header">
        <h1 className="page-title">Video Models</h1>
        <button type="button" className="admin-models-add-btn" onClick={openCreateForm}>
          <Plus className="w-4 h-4" /> Add Model
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
        <div className="admin-models-loading">Loading video models...</div>
      ) : models.length === 0 ? (
        <div className="admin-models-empty">No video models yet. Click &quot;Add Model&quot; to create one.</div>
      ) : (
        <div className="admin-models-table-wrap">
          <table className="admin-models-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Model ID</th>
                <th>Resolutions</th>
                <th>Capabilities</th>
                <th>Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model) => (
                <tr key={model.id}>
                  <td>
                    <div className="admin-models-thumb">
                      {model.thumbnailUrl ? (
                        <MediaThumb src={model.thumbnailUrl} className="object-cover rounded w-full h-full" />
                      ) : (
                        <div className="w-full h-full bg-white/5 rounded" />
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="admin-models-name">{model.name}</span>
                    {model.isNew && <span className="text-xs text-green-400 ml-1">NEW</span>}
                  </td>
                  <td><span className="text-xs text-text-muted font-mono">{model.modelId}</span></td>
                  <td><span className="text-xs text-text-muted">{model.resolutions.split(',').map(r => `${r.trim()}p`).join(', ')}</span></td>
                  <td>
                    <div className="flex gap-1">
                      {model.supportsT2V && <span className="admin-models-badge admin-models-badge-success">T2V</span>}
                      {model.supportsI2V && <span className="admin-models-badge admin-models-badge-success">I2V</span>}
                      <span className="admin-models-badge admin-models-badge-muted">{model.durations}</span>
                    </div>
                  </td>
                  <td>{model.sortOrder}</td>
                  <td>
                    <span className={cn('admin-models-badge', model.isActive ? 'admin-models-badge-success' : 'admin-models-badge-muted')}>
                      {model.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-models-actions">
                      <button type="button" className="admin-models-action-btn" onClick={() => handleToggleActive(model)} title={model.isActive ? 'Deactivate' : 'Activate'}>
                        {model.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button type="button" className="admin-models-action-btn" onClick={() => openEditForm(model)} title="Edit">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button type="button" className="admin-models-action-btn admin-models-action-btn-danger" onClick={() => handleDelete(model.id)} title="Delete">
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
