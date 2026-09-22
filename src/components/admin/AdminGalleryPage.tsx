'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Plus, Trash2, X, ChevronLeft, Loader2 } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import { useAuth } from '@/context/AuthContext';
import { useUser } from '@/context/UserContext';
import { cn } from '@/lib/utils';

/* ---------- Types ---------- */

interface ModelSummary {
  id: string;
  name: string;
  slug: string | null;
  modelType: string;
  baseModel: string;
  thumbnailUrl: string | null;
  imageCount: number;
}

interface GalleryItem {
  id: string;
  imageUrl: string;
  caption: string | null;
  prompt: string | null;
  negativePrompt: string | null;
  seed: string | null;
  sampler: string | null;
  checkpointName: string | null;
  checkpoint: { id: string; name: string; slug: string | null } | null;
  linkedModels: Array<{ id: string; name: string; slug: string | null }>;
  loras: Array<{ id: string; name: string; version: string | null; weight: number | null; model: { id: string; name: string; slug: string | null } | null }>;
  createdAt: string;
}

interface LoraEntry {
  name: string;
  weight: string;
}

const SAMPLERS = [
  'Euler', 'Euler a', 'DPM++ 2M Karras', 'DPM++ SDE Karras',
  'DPM++ 2M SDE Karras', 'DDIM', 'UniPC', 'LMS',
  'Heun', 'DPM2', 'DPM2 a Karras',
];

/* ---------- Component ---------- */

export default function AdminGalleryPage() {
  const { user } = useAuth();
  const { userId } = useUser();

  // Use auth user ID if available, otherwise fall back to localStorage user ID
  const effectiveUserId = user?.id || userId;

  /* ---- Model list state ---- */
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [error, setError] = useState('');

  /* ---- Selected model state ---- */
  const [selectedModel, setSelectedModel] = useState<ModelSummary | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);

  /* ---- Add image form state ---- */
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formCaption, setFormCaption] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formNegativePrompt, setFormNegativePrompt] = useState('');
  const [formSeed, setFormSeed] = useState('');
  const [formSampler, setFormSampler] = useState('');
  const [formCheckpointId, setFormCheckpointId] = useState('');
  const [formLoras, setFormLoras] = useState<LoraEntry[]>([]);

  /* ---- All models for checkpoint/lora dropdowns ---- */
  const [allModels, setAllModels] = useState<Array<{ id: string; name: string; modelType: string }>>([]);

  /* ---------- Fetch models with image counts ---------- */
  useEffect(() => {
    const load = async () => {
      setLoadingModels(true);
      try {
        const res = await fetch('/api/admin/gallery');
        if (!res.ok) throw new Error('Failed to load models');
        const data = await res.json();
        setModels(data.models ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load models');
      } finally {
        setLoadingModels(false);
      }
    };
    load();
  }, []);

  /* ---- Fetch all models for dropdowns ---- */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/models?publicOnly=false&limit=100&includeNsfw=true', {
          headers: effectiveUserId ? { 'x-vp-user-id': effectiveUserId } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        setAllModels((data.items ?? []).map((m: Record<string, unknown>) => ({
          id: m.id as string,
          name: m.name as string,
          modelType: m.modelType as string,
        })));
      } catch { /* ignore */ }
    };
    load();
  }, [effectiveUserId]);

  const checkpointModels = allModels.filter((m) => m.modelType === 'CHECKPOINT');
  const loraModels = allModels.filter((m) => m.modelType === 'LORA');

  /* ---------- Fetch gallery items for a model ---------- */
  const fetchGallery = useCallback(async (modelId: string) => {
    setLoadingGallery(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/gallery?modelId=${modelId}`);
      if (!res.ok) throw new Error('Failed to load gallery');
      const data = await res.json();
      setGalleryItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load gallery');
    } finally {
      setLoadingGallery(false);
    }
  }, []);

  const selectModel = (model: ModelSummary) => {
    setSelectedModel(model);
    setShowForm(false);
    fetchGallery(model.id);
  };

  const goBack = () => {
    setSelectedModel(null);
    setGalleryItems([]);
    setShowForm(false);
    // Refresh counts
    fetch('/api/admin/gallery')
      .then((r) => r.json())
      .then((d) => setModels(d.models ?? []))
      .catch(() => {});
  };

  /* ---------- Form helpers ---------- */
  const resetForm = () => {
    setFormImageUrl('');
    setFormCaption('');
    setFormPrompt('');
    setFormNegativePrompt('');
    setFormSeed('');
    setFormSampler('');
    setFormCheckpointId('');
    setFormLoras([]);
    setShowForm(false);
  };

  const addLoraRow = () => setFormLoras((prev) => [...prev, { name: '', weight: '0.7' }]);

  const updateLora = (index: number, field: keyof LoraEntry, value: string) => {
    setFormLoras((prev) => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));
  };

  const removeLora = (index: number) => {
    setFormLoras((prev) => prev.filter((_, i) => i !== index));
  };

  /* ---------- Add image ---------- */
  const handleAdd = async () => {
    if (!formImageUrl.trim() || !effectiveUserId || !selectedModel) return;
    setSaving(true);
    setError('');
    try {
      const lorasPayload = formLoras
        .filter((l) => l.name.trim())
        .map((l) => {
          // Check if name is a UUID (selected from dropdown) — look up model name
          const loraModel = loraModels.find((m) => m.id === l.name);
          return {
            modelId: loraModel ? loraModel.id : undefined,
            name: loraModel ? loraModel.name : l.name,
            weight: parseFloat(l.weight) || null,
          };
        });

      const res = await fetch('/api/admin/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: selectedModel.id,
          checkpointModelId: formCheckpointId || undefined,
          imageUrl: formImageUrl.trim(),
          caption: formCaption.trim() || null,
          prompt: formPrompt.trim() || null,
          negativePrompt: formNegativePrompt.trim() || null,
          seed: formSeed.trim() || null,
          sampler: formSampler || null,
          loras: lorasPayload.length > 0 ? lorasPayload : undefined,
          userId: effectiveUserId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to add image');
      }
      resetForm();
      await fetchGallery(selectedModel.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add image');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Remove image ---------- */
  const handleRemove = async (itemId: string) => {
    if (!confirm('Remove this image from the gallery?')) return;
    try {
      const res = await fetch('/api/admin/gallery', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to remove');
      }
      if (selectedModel) await fetchGallery(selectedModel.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove image');
    }
  };

  /* ========== RENDER ========== */

  // ---- Model list view ----
  if (!selectedModel) {
    return (
      <div className="admin-models">
        <div className="admin-models-header">
          <h1 className="page-title">Gallery Management</h1>
        </div>

        {error && (
          <div className="admin-models-error">
            {error}
            <button type="button" onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {loadingModels ? (
          <div className="admin-models-loading">Loading models...</div>
        ) : models.length === 0 ? (
          <div className="admin-models-empty">No models found.</div>
        ) : (
          <div className="admin-models-table-wrap">
            <table className="admin-models-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Base</th>
                  <th>Gallery Images</th>
                </tr>
              </thead>
              <tbody>
                {models.map((model) => (
                  <tr
                    key={model.id}
                    onClick={() => selectModel(model)}
                    className="cursor-pointer"
                  >
                    <td>
                      <div className="admin-models-thumb">
                        {model.thumbnailUrl ? (
                          <Image src={model.thumbnailUrl} alt="" fill sizes="48px" className="object-cover rounded" />
                        ) : (
                          <div className="w-full h-full bg-white/5 rounded" />
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="admin-models-name">{model.name}</span>
                      {model.slug && <span className="admin-models-slug">{model.slug}</span>}
                    </td>
                    <td><span className="admin-models-pill">{model.modelType}</span></td>
                    <td><span className="admin-models-pill">{model.baseModel}</span></td>
                    <td>
                      <span className={cn(
                        'admin-gallery-count-badge',
                        model.imageCount > 0 ? 'admin-gallery-count-badge-has' : 'admin-gallery-count-badge-empty'
                      )}>
                        {model.imageCount}
                      </span>
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

  // ---- Model detail / gallery view ----
  return (
    <div className="admin-models">
      <div className="admin-models-header">
        <button type="button" className="admin-models-back" onClick={goBack} title="Back to models">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="page-title">{selectedModel.name} — Gallery</h1>
        <button
          type="button"
          className="admin-models-add-btn"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="w-4 h-4" />
          Add Image
        </button>
      </div>

      {error && (
        <div className="admin-models-error">
          {error}
          <button type="button" onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ---- Add Image Form ---- */}
      {showForm && (
        <div className="admin-gallery-add-form">
          <h3 className="admin-gallery-form-title">Add Image Record</h3>

          {/* Image URL */}
          <label className="admin-form-field">
            <span className="admin-form-label">Image URL *</span>
            <input
              type="text"
              className="admin-form-input"
              value={formImageUrl}
              onChange={(e) => setFormImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </label>

          {formImageUrl && /^https?:\/\//i.test(formImageUrl) && (
            <div className="admin-gallery-image-preview">
              <img src={formImageUrl} alt="Preview" />
            </div>
          )}

          {/* Checkpoint Model */}
          <div className="admin-form-field">
            <span className="admin-form-label">Checkpoint Model</span>
            <SearchableSelect
              items={checkpointModels}
              value={formCheckpointId}
              onChange={setFormCheckpointId}
              placeholder="Search checkpoint models..."
              emptyLabel="-- None --"
            />
          </div>

          {/* LoRA Models */}
          <div className="admin-form-field">
            <div className="admin-gallery-lora-header">
              <span className="admin-form-label">LoRA Models</span>
              <button type="button" className="admin-gallery-lora-add" onClick={addLoraRow}>
                <Plus className="w-3 h-3" /> Add LoRA
              </button>
            </div>
            {formLoras.map((lora, i) => (
              <div key={i} className="admin-gallery-lora-row">
                <div style={{ flex: 2 }}>
                  <SearchableSelect
                    items={loraModels}
                    value={loraModels.find((m) => m.id === lora.name) ? lora.name : ''}
                    onChange={(val) => updateLora(i, 'name', val)}
                    placeholder="Search LoRA models..."
                    emptyLabel="-- Select LoRA --"
                  />
                </div>
                <input
                  type="text"
                  className="admin-form-input"
                  value={lora.name && !loraModels.find((m) => m.id === lora.name) ? lora.name : ''}
                  onChange={(e) => updateLora(i, 'name', e.target.value)}
                  placeholder="Or type name..."
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  className="admin-form-input"
                  value={lora.weight}
                  onChange={(e) => updateLora(i, 'weight', e.target.value)}
                  placeholder="Weight"
                  step="0.1"
                  min="0"
                  max="2"
                  style={{ width: 80 }}
                />
                <button type="button" className="admin-gallery-lora-remove" onClick={() => removeLora(i)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Prompt */}
          <label className="admin-form-field">
            <span className="admin-form-label">Prompt</span>
            <textarea
              className="admin-form-input admin-form-textarea"
              value={formPrompt}
              onChange={(e) => setFormPrompt(e.target.value)}
              placeholder="Generation prompt..."
              rows={3}
            />
          </label>

          {/* Negative Prompt */}
          <label className="admin-form-field">
            <span className="admin-form-label">Negative Prompt</span>
            <textarea
              className="admin-form-input admin-form-textarea"
              value={formNegativePrompt}
              onChange={(e) => setFormNegativePrompt(e.target.value)}
              placeholder="Negative prompt..."
              rows={2}
            />
          </label>

          <div className="admin-form-row">
            {/* Seed */}
            <label className="admin-form-field">
              <span className="admin-form-label">Seed</span>
              <input
                type="text"
                className="admin-form-input"
                value={formSeed}
                onChange={(e) => setFormSeed(e.target.value)}
                placeholder="e.g. 1234567890"
              />
            </label>

            {/* Sampler */}
            <label className="admin-form-field">
              <span className="admin-form-label">Sampler</span>
              <select
                className="admin-form-input"
                value={formSampler}
                onChange={(e) => setFormSampler(e.target.value)}
              >
                <option value="">-- Select --</option>
                {SAMPLERS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>

            {/* Caption */}
            <label className="admin-form-field">
              <span className="admin-form-label">Caption</span>
              <input
                type="text"
                className="admin-form-input"
                value={formCaption}
                onChange={(e) => setFormCaption(e.target.value)}
                placeholder="Optional description..."
              />
            </label>
          </div>

          {error && (
            <div className="admin-models-error">
              {error}
              <button type="button" onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
            </div>
          )}

          <div className="admin-form-footer">
            <button type="button" className="admin-form-cancel" onClick={resetForm}>Cancel</button>
            <button
              type="button"
              className="admin-form-save"
              onClick={handleAdd}
              disabled={saving || !formImageUrl.trim()}
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Image'}
            </button>
          </div>
        </div>
      )}

      {/* ---- Gallery Grid ---- */}
      {loadingGallery ? (
        <div className="admin-models-loading">Loading gallery...</div>
      ) : galleryItems.length === 0 ? (
        <div className="admin-models-empty">No gallery images for this model yet.</div>
      ) : (
        <div className="admin-gallery-grid">
          {galleryItems.map((item) => (
            <div key={item.id} className="admin-gallery-card">
              <div className="admin-gallery-card-image">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.caption ?? ''} />
                ) : (
                  <div className="flex items-center justify-center h-full text-text-muted text-sm">No image</div>
                )}
              </div>
              <div className="admin-gallery-card-meta">
                {item.prompt && <p className="admin-gallery-card-prompt" title={item.prompt}>{item.prompt}</p>}
                {item.checkpoint && (
                  <span className="admin-gallery-card-tag">CP: {item.checkpoint.name}</span>
                )}
                {item.loras.length > 0 && item.loras.map((l) => (
                  <span key={l.id} className="admin-gallery-card-tag">LoRA: {l.name} ({l.weight ?? '?'})</span>
                ))}
                {item.seed && <span className="admin-gallery-card-tag">Seed: {item.seed}</span>}
                {item.sampler && <span className="admin-gallery-card-tag">{item.sampler}</span>}
              </div>
              <button
                type="button"
                className="admin-gallery-card-remove"
                onClick={() => handleRemove(item.id)}
                title="Remove from gallery"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
