'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, ArrowLeft, X, Image as ImageIcon, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Thumbnail {
  id?: string;
  imageUrl: string;
  sortOrder: number;
}

interface ModelItem {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  modelType: string;
  baseModel: string;
  modelId: string | null;
  loraModel: string | null;
  version: string | null;
  badge: string | null;
  thumbnailUrl: string | null;
  downloadUrl: string | null;
  fileSize: number | null;
  triggerWord: string | null;
  usageTips: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  tags: string | null;
  trainingSteps: number | null;
  trainingEpochs: number | null;
  isPublic: boolean;
  isNsfw: boolean;
  downloads: number;
  likeCount: number;
  favoriteCount: number;
  usageCount: number;
  createdAt: string;
  thumbnails?: Thumbnail[];
  creator: { id: string; handle: string | null; avatarUrl: string | null };
}

const MODEL_TYPES = ['CHECKPOINT', 'LORA', 'EMBEDDING', 'VAE'] as const;
const BASE_MODELS = ['SD_1_5', 'SDXL', 'FLUX', 'PONY', 'ILLUSTRIOUS'] as const;

const EMPTY_FORM = {
  name: '',
  slug: '',
  description: '',
  modelType: 'CHECKPOINT' as string,
  baseModel: 'SDXL' as string,
  modelId: '',
  loraModel: '',
  version: '',
  badge: '',
  thumbnailUrl: '',
  downloadUrl: '',
  fileSize: '',
  triggerWord: '',
  usageTips: '',
  trainingSteps: '',
  trainingEpochs: '',
  isPublic: false,
  isNsfw: false,
  seoTitle: '',
  seoDescription: '',
  tags: '',
  thumbnails: [{ imageUrl: '', sortOrder: 0 }] as { imageUrl: string; sortOrder: number }[],
};

type FormState = typeof EMPTY_FORM;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminModelsPage() {
  const { user } = useAuth();
  const [models, setModels] = useState<ModelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  // View: 'list' | 'form'
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });

  // Parent auto-detect for new models
  const [detectedParent, setDetectedParent] = useState<{ id: string; name: string } | null>(null);
  const parentDetectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- Fetch ALL models (paginate through all pages) ---- */
  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const allItems: ModelItem[] = [];
      let cursor: string | null = null;
      const baseUrl = '/api/models?publicOnly=false&limit=50&includeNsfw=true&allVersions=true';

      do {
        const fetchUrl: string = cursor ? `${baseUrl}&cursor=${cursor}` : baseUrl;
        const res: Response = await fetch(fetchUrl, {
          headers: user ? { 'x-vp-user-id': user.id } : {},
        });
        if (!res.ok) throw new Error('Failed to fetch models');
        const data: { items?: ModelItem[]; nextCursor?: string } = await res.json();
        allItems.push(...(data.items ?? []));
        cursor = data.nextCursor ?? null;
      } while (cursor);

      setModels(allItems);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  /* ---- Parent auto-detect (debounced, create only) ---- */
  useEffect(() => {
    if (editingId) {
      setDetectedParent(null);
      return;
    }
    const name = form.name.trim();
    const modelType = form.modelType;
    if (!name) {
      setDetectedParent(null);
      return;
    }
    if (parentDetectTimer.current) clearTimeout(parentDetectTimer.current);
    parentDetectTimer.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ name, type: modelType, limit: '1', publicOnly: 'false', includeNsfw: 'true' });
        const res = await fetch(`/api/models?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        const match = data.items?.[0];
        if (match && match.name.toLowerCase() === name.toLowerCase() && match.modelType === modelType) {
          setDetectedParent({ id: match.id, name: match.name });
        } else {
          setDetectedParent(null);
        }
      } catch {
        setDetectedParent(null);
      }
    }, 400);
    return () => { if (parentDetectTimer.current) clearTimeout(parentDetectTimer.current); };
  }, [form.name, form.modelType, editingId]);

  /* ---- Open form for create ---- */
  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, thumbnails: [{ imageUrl: '', sortOrder: 0 }] });
    setView('form');
    setError('');
  };

  /* ---- Open form for edit ---- */
  const openEdit = async (model: ModelItem) => {
    setError('');
    // Fetch full detail to get thumbnails
    try {
      const res = await fetch(`/api/models/${model.id}`, {
        headers: user ? { 'x-vp-user-id': user.id } : {},
      });
      if (!res.ok) throw new Error('Failed to fetch model details');
      const data = await res.json();
      const m = data.model as ModelItem;

      const thumbs = m.thumbnails?.length
        ? m.thumbnails.map((t) => ({ imageUrl: t.imageUrl, sortOrder: t.sortOrder }))
        : [{ imageUrl: '', sortOrder: 0 }];

      setForm({
        name: m.name,
        slug: m.slug ?? '',
        description: m.description ?? '',
        modelType: m.modelType,
        baseModel: m.baseModel,
        modelId: m.modelId ?? '',
        loraModel: m.loraModel ?? '',
        version: m.version ?? '',
        badge: m.badge ?? '',
        thumbnailUrl: m.thumbnailUrl ?? '',
        downloadUrl: m.downloadUrl ?? '',
        fileSize: m.fileSize ? String(m.fileSize) : '',
        triggerWord: m.triggerWord ?? '',
        usageTips: m.usageTips ?? '',
        trainingSteps: m.trainingSteps ? String(m.trainingSteps) : '',
        trainingEpochs: m.trainingEpochs ? String(m.trainingEpochs) : '',
        isPublic: m.isPublic,
        isNsfw: m.isNsfw,
        seoTitle: m.seoTitle ?? '',
        seoDescription: m.seoDescription ?? '',
        tags: m.tags ?? '',
        thumbnails: thumbs,
      });
      setEditingId(model.id);
      setView('form');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load model');
    }
  };

  /* ---- Save (create or update) ---- */
  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!user) {
      setError('You must be logged in.');
      return;
    }

    setSaving(true);
    setError('');

    const thumbnails = form.thumbnails
      .filter((t) => t.imageUrl.trim())
      .map((t, i) => ({ imageUrl: t.imageUrl.trim(), sortOrder: t.sortOrder ?? i }));

    const body: Record<string, unknown> = {
      name: form.name.trim(),
      modelType: form.modelType,
      baseModel: form.baseModel,
      isPublic: form.isPublic,
      isNsfw: form.isNsfw,
    };

    if (form.slug.trim()) body.slug = form.slug.trim();
    if (form.description.trim()) body.description = form.description.trim();
    if (form.modelId.trim()) body.modelId = form.modelId.trim();
    if (form.loraModel.trim()) body.loraModel = form.loraModel.trim();
    if (form.version.trim()) body.version = form.version.trim();
    if (form.badge.trim()) body.badge = form.badge.trim();
    if (form.thumbnailUrl.trim()) body.thumbnailUrl = form.thumbnailUrl.trim();
    if (form.downloadUrl.trim()) body.downloadUrl = form.downloadUrl.trim();
    if (form.fileSize.trim()) body.fileSize = Number(form.fileSize);
    if (form.triggerWord.trim()) body.triggerWord = form.triggerWord.trim();
    if (form.usageTips.trim()) body.usageTips = form.usageTips.trim();
    if (form.seoTitle.trim()) body.seoTitle = form.seoTitle.trim();
    if (form.seoDescription.trim()) body.seoDescription = form.seoDescription.trim();
    if (form.tags.trim()) body.tags = form.tags.trim();
    if (form.trainingSteps.trim()) body.trainingSteps = Number(form.trainingSteps);
    if (form.trainingEpochs.trim()) body.trainingEpochs = Number(form.trainingEpochs);
    if (thumbnails.length > 0) body.thumbnails = thumbnails;
    if (!editingId && detectedParent) body.parentModelId = detectedParent.id;

    try {
      const isEdit = !!editingId;
      const url = isEdit ? `/api/models/${editingId}` : '/api/models';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-vp-user-id': user.id,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to ${isEdit ? 'update' : 'create'} model`);
      }

      await fetchModels();
      setView('list');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  /* ---- Delete ---- */
  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/models/${id}`, {
        method: 'DELETE',
        headers: { 'x-vp-user-id': user.id },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Delete failed');
      }
      setDeleteId(null);
      await fetchModels();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
      setDeleteId(null);
    }
  };

  /* ---- Thumbnail helpers ---- */
  const addThumbnail = () => {
    if (form.thumbnails.length >= 5) return;
    setForm((f) => ({
      ...f,
      thumbnails: [...f.thumbnails, { imageUrl: '', sortOrder: f.thumbnails.length }],
    }));
  };

  const removeThumbnail = (index: number) => {
    setForm((f) => ({
      ...f,
      thumbnails: f.thumbnails.filter((_, i) => i !== index).map((t, i) => ({ ...t, sortOrder: i })),
    }));
  };

  const updateThumbnail = (index: number, value: string) => {
    setForm((f) => ({
      ...f,
      thumbnails: f.thumbnails.map((t, i) => (i === index ? { ...t, imageUrl: value } : t)),
    }));
  };

  /* ---- Filtered models for search ---- */
  const filteredModels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) =>
      [m.name, m.slug ?? '', m.modelType, m.baseModel, m.description ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [models, searchQuery]);

  /* ---- Form field setter ---- */
  const setField = (key: keyof FormState, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="admin-models">
      <div className="admin-models-header">
        {view === 'form' && (
          <button
            type="button"
            className="admin-models-back"
            onClick={() => { setView('list'); setError(''); }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="page-title">
          {view === 'list' ? 'Admin — Models' : editingId ? 'Edit Model' : 'Add New Model'}
        </h1>
        {view === 'list' && (
          <div className="admin-models-header-actions">
            <div className="admin-models-search">
              <Search className="admin-models-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search models…"
                className="admin-models-search-input"
              />
            </div>
            <button type="button" className="admin-models-add-btn" onClick={openCreate}>
              <Plus className="w-5 h-5" />
              Add Model
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="admin-models-error">
          {error}
          <button type="button" onClick={() => setError('')} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ---- LIST VIEW ---- */}
      {view === 'list' && (
        <>
          {loading ? (
            <div className="admin-models-loading">Loading models...</div>
          ) : filteredModels.length === 0 ? (
            <div className="admin-models-empty">
              {searchQuery ? 'No models match your search.' : 'No models found. Click "Add Model" to create one.'}
            </div>
          ) : (
            <div className="admin-models-table-wrap">
              <table className="admin-models-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Base</th>
                    <th>Public</th>
                    <th>NSFW</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModels.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="admin-models-thumb">
                          {m.thumbnailUrl ? (
                            <img src={m.thumbnailUrl} alt="" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-text-muted" />
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="admin-models-name">{m.name}</span>
                        {m.slug && <span className="admin-models-slug">/{m.slug}</span>}
                      </td>
                      <td><span className="admin-models-pill">{m.modelType}</span></td>
                      <td><span className="admin-models-pill">{m.baseModel}</span></td>
                      <td><span className={cn('admin-models-badge', m.isPublic ? 'admin-models-badge-green' : 'admin-models-badge-gray')}>{m.isPublic ? 'Yes' : 'No'}</span></td>
                      <td><span className={cn('admin-models-badge', m.isNsfw ? 'admin-models-badge-red' : 'admin-models-badge-gray')}>{m.isNsfw ? 'Yes' : 'No'}</span></td>
                      <td>
                        <div className="admin-models-actions">
                          <button type="button" className="admin-models-action-btn" onClick={() => openEdit(m)} title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button type="button" className="admin-models-action-btn admin-models-action-btn-danger" onClick={() => setDeleteId(m.id)} title="Delete">
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
        </>
      )}

      {/* ---- FORM VIEW ---- */}
      {view === 'form' && (
        <div className="admin-models-form">
          {/* Row 1: Name + Slug */}
          <div className="admin-form-row">
            <label className="admin-form-field">
              <span className="admin-form-label">Name <span className="text-accent-pink">*</span></span>
              <input type="text" className="admin-form-input" value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="My Model" />
            </label>
            <label className="admin-form-field">
              <span className="admin-form-label">Slug</span>
              <input type="text" className="admin-form-input" value={form.slug} onChange={(e) => setField('slug', e.target.value)} placeholder="my-model (auto-generated if empty)" />
            </label>
          </div>

          {/* Parent auto-detect notice */}
          {!editingId && detectedParent && (
            <div className="admin-form-parent-notice">
              Will be added as a new version of <strong>{detectedParent.name}</strong>
            </div>
          )}

          {/* Row 2: ModelType + BaseModel */}
          <div className="admin-form-row">
            <label className="admin-form-field">
              <span className="admin-form-label">Model Type <span className="text-accent-pink">*</span></span>
              <select className="admin-form-input" value={form.modelType} onChange={(e) => setField('modelType', e.target.value)}>
                {MODEL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="admin-form-field">
              <span className="admin-form-label">Base Model <span className="text-accent-pink">*</span></span>
              <select className="admin-form-input" value={form.baseModel} onChange={(e) => setField('baseModel', e.target.value)}>
                {BASE_MODELS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
          </div>

          {/* Description */}
          <label className="admin-form-field">
            <span className="admin-form-label">Description</span>
            <textarea className="admin-form-input admin-form-textarea" value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Model description..." />
          </label>

          {/* Row 3: modelId + loraModel */}
          <div className="admin-form-row">
            <label className="admin-form-field">
              <span className="admin-form-label">Model ID <span className="text-text-muted text-xs">(image gen model_id)</span></span>
              <input type="text" className="admin-form-input" value={form.modelId} onChange={(e) => setField('modelId', e.target.value)} placeholder="e.g. midjourney" />
            </label>
            <label className="admin-form-field">
              <span className="admin-form-label">LoRA Model <span className="text-text-muted text-xs">(lora_model identifier)</span></span>
              <input type="text" className="admin-form-input" value={form.loraModel} onChange={(e) => setField('loraModel', e.target.value)} placeholder="e.g. lora-v1" />
            </label>
          </div>

          {/* Row 4: Version + Badge */}
          <div className="admin-form-row">
            <label className="admin-form-field">
              <span className="admin-form-label">Version</span>
              <input type="text" className="admin-form-input" value={form.version} onChange={(e) => setField('version', e.target.value)} placeholder="v1.0" />
            </label>
            <label className="admin-form-field">
              <span className="admin-form-label">Badge</span>
              <input type="text" className="admin-form-input" value={form.badge} onChange={(e) => setField('badge', e.target.value)} placeholder="NEW, HOT, etc." />
            </label>
          </div>

          {/* Thumbnail URL (main cover) */}
          <label className="admin-form-field">
            <span className="admin-form-label">Thumbnail URL <span className="text-text-muted text-xs">(main cover image for models list)</span></span>
            <input type="text" className="admin-form-input" value={form.thumbnailUrl} onChange={(e) => setField('thumbnailUrl', e.target.value)} placeholder="https://example.com/cover.jpg" />
          </label>
          {form.thumbnailUrl && (
            <div className="admin-form-preview">
              <img src={form.thumbnailUrl} alt="Cover preview" />
            </div>
          )}

          {/* Download URL + File Size */}
          <div className="admin-form-row">
            <label className="admin-form-field">
              <span className="admin-form-label">Download URL</span>
              <input type="text" className="admin-form-input" value={form.downloadUrl} onChange={(e) => setField('downloadUrl', e.target.value)} placeholder="https://..." />
            </label>
            <label className="admin-form-field">
              <span className="admin-form-label">File Size <span className="text-text-muted text-xs">(bytes)</span></span>
              <input type="number" className="admin-form-input" value={form.fileSize} onChange={(e) => setField('fileSize', e.target.value)} placeholder="0" />
            </label>
          </div>

          {/* Trigger Word + Usage Tips */}
          <div className="admin-form-row">
            <label className="admin-form-field">
              <span className="admin-form-label">Trigger Word</span>
              <input type="text" className="admin-form-input" value={form.triggerWord} onChange={(e) => setField('triggerWord', e.target.value)} placeholder="e.g. ohwx" />
            </label>
            <label className="admin-form-field">
              <span className="admin-form-label">Usage Tips</span>
              <input type="text" className="admin-form-input" value={form.usageTips} onChange={(e) => setField('usageTips', e.target.value)} placeholder="Best at 768x768..." />
            </label>
          </div>

          {/* Training Steps + Epochs */}
          <div className="admin-form-row">
            <label className="admin-form-field">
              <span className="admin-form-label">Training Steps</span>
              <input type="number" className="admin-form-input" value={form.trainingSteps} onChange={(e) => setField('trainingSteps', e.target.value)} placeholder="0" />
            </label>
            <label className="admin-form-field">
              <span className="admin-form-label">Training Epochs</span>
              <input type="number" className="admin-form-input" value={form.trainingEpochs} onChange={(e) => setField('trainingEpochs', e.target.value)} placeholder="0" />
            </label>
          </div>

          {/* Toggles */}
          <div className="admin-form-row">
            <label className="admin-form-toggle">
              <input type="checkbox" checked={form.isPublic} onChange={(e) => setField('isPublic', e.target.checked)} className="h-4 w-4 accent-accent-pink" />
              <span>Public</span>
            </label>
            <label className="admin-form-toggle">
              <input type="checkbox" checked={form.isNsfw} onChange={(e) => setField('isNsfw', e.target.checked)} className="h-4 w-4 accent-accent-pink" />
              <span>NSFW</span>
            </label>
          </div>

          {/* Gallery Thumbnails (up to 5) */}
          <div className="admin-form-section">
            <div className="admin-form-section-header">
              <span className="admin-form-label">Gallery Images <span className="text-text-muted text-xs">(up to 5, shown in carousel on model detail page)</span></span>
              {form.thumbnails.length < 5 && (
                <button type="button" className="admin-form-add-thumb" onClick={addThumbnail}>
                  <Plus className="w-4 h-4" /> Add Image
                </button>
              )}
            </div>
            {form.thumbnails.map((t, i) => (
              <div key={i} className="admin-form-thumb-row">
                <span className="admin-form-thumb-index">{i + 1}</span>
                <input
                  type="text"
                  className="admin-form-input"
                  value={t.imageUrl}
                  onChange={(e) => updateThumbnail(i, e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
                {t.imageUrl && (
                  <div className="admin-form-thumb-preview">
                    <img src={t.imageUrl} alt="" />
                  </div>
                )}
                <button type="button" className="admin-form-thumb-remove" onClick={() => removeThumbnail(i)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* ── SEO Section ── */}
          <div className="admin-form-section">
            <div className="admin-form-section-header">
              <span className="admin-form-label">🔍 SEO Metadata <span className="text-text-muted text-xs">(controls what Google shows — leave blank to auto-generate)</span></span>
            </div>

            {/* SEO Title */}
            <label className="admin-form-field">
              <span className="admin-form-label">
                SEO Title
                <span className="text-text-muted text-xs ml-1">
                  ({form.seoTitle.length}/60 chars — ideal under 60)
                  {!form.seoTitle && (
                    <span className="text-yellow-400 ml-1">
                      Auto: {form.name || 'Model Name'} — {form.modelType || 'TYPE'} for {form.baseModel || 'BASE'} | Veloura.ai
                    </span>
                  )}
                </span>
              </span>
              <input
                type="text"
                className="admin-form-input"
                value={form.seoTitle}
                onChange={(e) => setField('seoTitle', e.target.value)}
                placeholder={`${form.name || 'Model Name'} — ${form.modelType || 'TYPE'} for ${form.baseModel || 'BASE'} | Veloura.ai`}
                maxLength={90}
              />
            </label>

            {/* SEO Description */}
            <label className="admin-form-field">
              <span className="admin-form-label">
                SEO Description
                <span className={`text-xs ml-1 ${form.seoDescription.length > 155 ? 'text-red-400' : form.seoDescription.length > 0 ? 'text-green-400' : 'text-text-muted'}`}>
                  ({form.seoDescription.length}/155 chars — ideal 120–155)
                  {!form.seoDescription && <span className="text-yellow-400 ml-1">Auto-generated from description field</span>}
                </span>
              </span>
              <textarea
                className="admin-form-input admin-form-textarea"
                value={form.seoDescription}
                onChange={(e) => setField('seoDescription', e.target.value)}
                placeholder="Write a 120–155 character description for Google. Include key terms like the model type, style, and use case."
                maxLength={300}
                rows={3}
              />
            </label>

            {/* Tags / Keywords */}
            <label className="admin-form-field">
              <span className="admin-form-label">
                SEO Tags / Keywords
                <span className="text-text-muted text-xs ml-1">(comma-separated — e.g. anime lora, nsfw sdxl, realistic ai model)</span>
              </span>
              <input
                type="text"
                className="admin-form-input"
                value={form.tags}
                onChange={(e) => setField('tags', e.target.value)}
                placeholder="anime girl lora, nsfw sdxl, realistic portrait, ai girlfriend model"
              />
            </label>

            {/* SERP Preview */}
            {(form.name || form.seoTitle) && (
              <div className="admin-form-serp-preview">
                <p className="text-xs font-semibold text-text-muted mb-2">Google Preview</p>
                <div className="admin-form-serp-box">
                  <p className="admin-form-serp-title">
                    {form.seoTitle ||
                      `${form.name || 'Model Name'} — ${form.modelType || 'TYPE'} for ${form.baseModel || 'BASE'} | Veloura.ai`}
                  </p>
                  <p className="admin-form-serp-url">
                    veloura.ai/models/{form.slug || (form.name ? form.name.toLowerCase().replace(/\s+/g, '-') : 'model-slug')}
                  </p>
                  <p className="admin-form-serp-desc">
                    {form.seoDescription ||
                      (form.description
                        ? form.description.slice(0, 155)
                        : `Use the ${form.name || 'model'} on Veloura.ai for high-quality AI image generation. Free, NSFW supported, no watermark.`)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Save / Cancel */}
          <div className="admin-form-footer">
            <button type="button" className="admin-form-cancel" onClick={() => { setView('list'); setError(''); }}>
              Cancel
            </button>
            <button type="button" className="admin-form-save" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Model' : 'Create Model'}
            </button>
          </div>
        </div>
      )}

      {/* ---- DELETE CONFIRM DIALOG ---- */}
      {deleteId && (
        <div className="admin-models-overlay" onClick={() => setDeleteId(null)}>
          <div className="admin-models-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Model</h3>
            <p>Are you sure you want to delete this model? This action cannot be undone.</p>
            <div className="admin-models-dialog-actions">
              <button type="button" className="admin-form-cancel" onClick={() => setDeleteId(null)}>Cancel</button>
              <button type="button" className="admin-form-save admin-form-save-danger" onClick={() => handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
