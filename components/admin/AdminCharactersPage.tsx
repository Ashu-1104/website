'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Trash2, ArrowLeft, Search, Plus } from 'lucide-react';
import { useUser } from '@/context/UserContext';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CharacterItem {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  age: number;
  gender: string;
  style: string;
  bodyType: string | null;
  breastSize: string | null;
  buttSize: string | null;
  ethnicity: string | null;
  isNsfw: boolean;
  visibility: string;
  tags: string[];
  systemPrompt: string | null;
  firstMessage: string | null;
  voiceId: string | null;
  voiceUrl: string | null;
  favoriteCount: number;
  likeCount: number;
  usageCount: number;
  creationMode: string | null;
  loraModelId: string | null;
  avatarAssetId: string | null;
  avatarUrl: string | null;
  avatarUrls: string[];
  createdAt: string;
  updatedAt: string;
  creator: { id: string; handle: string | null; avatarUrl: string | null } | null;
  loraModel: { id: string; name: string; loraModel: string | null; triggerWord: string | null } | null;
}

interface LoraModelOption {
  id: string;
  name: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const GENDERS = ['MALE', 'FEMALE', 'TRANS', 'OTHER'] as const;
const STYLES = ['REALISTIC', 'ANIME', 'SEMI_REALISTIC', 'CARTOON', 'FURRY', 'FANTASY'] as const;
const BODY_TYPES = ['', 'SLIM', 'ATHLETIC', 'AVERAGE', 'CURVY', 'PLUS_SIZE'] as const;
const BREAST_SIZES = ['', 'SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'] as const;
const BUTT_SIZES = ['', 'SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'] as const;
const ETHNICITIES = ['', 'ASIAN', 'BLACK', 'CAUCASIAN', 'HISPANIC', 'INDIAN', 'MIDDLE_EASTERN', 'MIXED', 'OTHER'] as const;

const EMPTY_FORM = {
  name: '',
  description: '',
  avatarUrl: '',
  avatarUrls: '' as string,
  age: 18,
  gender: 'FEMALE' as string,
  style: 'REALISTIC' as string,
  bodyType: '' as string,
  breastSize: '' as string,
  buttSize: '' as string,
  ethnicity: '' as string,
  isNsfw: false,
  visibility: 'PUBLIC',
  tags: '',
  systemPrompt: '',
  firstMessage: '',
  voiceId: '',
  voiceUrl: '',
  loraModelId: '' as string,
  creationMode: '' as string,
};

type FormState = typeof EMPTY_FORM;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminCharactersPage() {
  const { userId } = useUser();
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loraModels, setLoraModels] = useState<LoraModelOption[]>([]);

  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });

  /* ---- Fetch characters ---- */
  const fetchCharacters = useCallback(async (page = 1, searchQuery = '') => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/admin/characters?${params}`, {
        headers: { 'x-vp-user-id': userId },
      });
      if (!res.ok) throw new Error('Failed to fetch characters');
      const data = await res.json();
      setCharacters(data.characters ?? []);
      setPagination(data.pagination ?? { page: 1, limit: 25, total: 0, totalPages: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /* ---- Fetch LoRA models for dropdown ---- */
  const fetchLoraModels = useCallback(async () => {
    try {
      const res = await fetch('/api/models?publicOnly=false&limit=100&includeNsfw=true', {
        headers: { 'x-vp-user-id': userId },
      });
      if (!res.ok) return;
      const data = await res.json();
      const items = (data.items ?? []) as { id: string; name: string; modelType: string }[];
      setLoraModels(items.filter((m) => m.modelType === 'LORA').map((m) => ({ id: m.id, name: m.name })));
    } catch {
      // Non-critical
    }
  }, [userId]);

  useEffect(() => {
    fetchCharacters();
    fetchLoraModels();
  }, [fetchCharacters, fetchLoraModels]);

  const handleSearch = () => {
    fetchCharacters(1, search);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  /* ---- Open form for edit ---- */
  const openEdit = (c: CharacterItem) => {
    setError('');
    setForm({
      name: c.name,
      description: c.description ?? '',
      avatarUrl: c.avatarUrl ?? '',
      avatarUrls: (c.avatarUrls ?? []).join('\n'),
      age: c.age,
      gender: c.gender,
      style: c.style,
      bodyType: c.bodyType ?? '',
      breastSize: c.breastSize ?? '',
      buttSize: c.buttSize ?? '',
      ethnicity: c.ethnicity ?? '',
      isNsfw: c.isNsfw,
      visibility: c.visibility,
      tags: c.tags.join(', '),
      systemPrompt: c.systemPrompt ?? '',
      firstMessage: c.firstMessage ?? '',
      voiceId: c.voiceId ?? '',
      voiceUrl: c.voiceUrl ?? '',
      loraModelId: c.loraModelId ?? '',
      creationMode: c.creationMode ?? '',
    });
    setEditingId(c.id);
    setView('form');
  };

  const openCreate = () => {
    setError('');
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setView('form');
  };

  /* ---- Save ---- */
  const handleSave = async () => {
    if (!userId) return;
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const tags = form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const avatarUrlsList = form.avatarUrls
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);

      const payload = {
        name: form.name,
        description: form.description,
        characterAvatarUrl: form.avatarUrl || (avatarUrlsList[0] ?? ''),
        avatarUrls: avatarUrlsList,
        age: form.age,
        gender: form.gender,
        style: form.style,
        bodyType: form.bodyType || null,
        breastSize: form.breastSize || null,
        buttSize: form.buttSize || null,
        ethnicity: form.ethnicity || null,
        isNsfw: form.isNsfw,
        visibility: form.visibility,
        tags,
        systemPrompt: form.systemPrompt,
        firstMessage: form.firstMessage,
        voiceId: form.voiceId,
        voiceUrl: form.voiceUrl,
        loraModelId: form.loraModelId || null,
        creationMode: form.creationMode,
      };

      const res = await fetch('/api/admin/characters', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-vp-user-id': userId },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      setView('list');
      setEditingId(null);
      fetchCharacters(pagination.page, search);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  /* ---- Delete ---- */
  const handleDelete = async () => {
    if (!userId || !deleteId) return;

    try {
      const res = await fetch('/api/admin/characters', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-vp-user-id': userId },
        body: JSON.stringify({ id: deleteId }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      setDeleteId(null);
      fetchCharacters(pagination.page, search);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
      setDeleteId(null);
    }
  };

  /* ---- Field helpers ---- */
  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

  /* ---- Form View ---- */
  if (view === 'form') {
    return (
      <div className="admin-models">
        <div className="admin-models-header">
          <button className="admin-models-back" onClick={() => { setView('list'); setEditingId(null); }}>
            <ArrowLeft size={18} />
          </button>
          <h1>{editingId ? 'Edit Character' : 'Add Character'}</h1>
        </div>

        {error && <div className="admin-models-error">{error}</div>}

        <div className="admin-models-form">
          {/* Basic */}
          <div className="admin-form-section">
            <div className="admin-form-section-header">Basic Info</div>
            <div className="admin-form-row">
              <label className="admin-form-field">
                <span className="admin-form-label">Name</span>
                <input className="admin-form-input" value={form.name} onChange={(e) => setField('name', e.target.value)} />
              </label>
              <label className="admin-form-field">
                <span className="admin-form-label">Age</span>
                <input className="admin-form-input" type="number" min={18} value={form.age} onChange={(e) => setField('age', Math.max(18, parseInt(e.target.value) || 18))} />
              </label>
            </div>
            <label className="admin-form-field">
              <span className="admin-form-label">Description</span>
              <textarea className="admin-form-textarea" value={form.description} onChange={(e) => setField('description', e.target.value)} rows={3} />
            </label>
            <label className="admin-form-field">
              <span className="admin-form-label">Avatar URL (primary)</span>
              <input className="admin-form-input" value={form.avatarUrl} onChange={(e) => setField('avatarUrl', e.target.value)} placeholder="https://..." />
            </label>
            <label className="admin-form-field">
              <span className="admin-form-label">All Avatar URLs (one per line — images &amp; videos)</span>
              <textarea className="admin-form-textarea" value={form.avatarUrls} onChange={(e) => setField('avatarUrls', e.target.value)} rows={4} placeholder={"https://cdn.example.com/char/0.jpg\nhttps://cdn.example.com/char/1.mp4"} />
            </label>
            <div className="admin-form-row">
              <label className="admin-form-field">
                <span className="admin-form-label">Gender</span>
                <select className="admin-form-input" value={form.gender} onChange={(e) => setField('gender', e.target.value)}>
                  {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </label>
              <label className="admin-form-field">
                <span className="admin-form-label">Style</span>
                <select className="admin-form-input" value={form.style} onChange={(e) => setField('style', e.target.value)}>
                  {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <div className="admin-form-row">
              <label className="admin-form-field">
                <span className="admin-form-label">Visibility</span>
                <select className="admin-form-input" value={form.visibility} onChange={(e) => setField('visibility', e.target.value)}>
                  <option value="PUBLIC">PUBLIC</option>
                  <option value="PRIVATE">PRIVATE</option>
                  <option value="UNLISTED">UNLISTED</option>
                </select>
              </label>
              <label className="admin-form-field">
                <span className="admin-form-label">Creation Mode</span>
                <select className="admin-form-input" value={form.creationMode} onChange={(e) => setField('creationMode', e.target.value)}>
                  <option value="">— None —</option>
                  <option value="quick">Quick</option>
                  <option value="expert">Expert</option>
                </select>
              </label>
            </div>
          </div>

          {/* Body */}
          <div className="admin-form-section">
            <div className="admin-form-section-header">Body</div>
            <div className="admin-form-row">
              <label className="admin-form-field">
                <span className="admin-form-label">Body Type</span>
                <select className="admin-form-input" value={form.bodyType} onChange={(e) => setField('bodyType', e.target.value)}>
                  {BODY_TYPES.map((v) => <option key={v} value={v}>{v || '— None —'}</option>)}
                </select>
              </label>
              <label className="admin-form-field">
                <span className="admin-form-label">Ethnicity</span>
                <select className="admin-form-input" value={form.ethnicity} onChange={(e) => setField('ethnicity', e.target.value)}>
                  {ETHNICITIES.map((v) => <option key={v} value={v}>{v || '— None —'}</option>)}
                </select>
              </label>
            </div>
            <div className="admin-form-row">
              <label className="admin-form-field">
                <span className="admin-form-label">Breast Size</span>
                <select className="admin-form-input" value={form.breastSize} onChange={(e) => setField('breastSize', e.target.value)}>
                  {BREAST_SIZES.map((v) => <option key={v} value={v}>{v || '— None —'}</option>)}
                </select>
              </label>
              <label className="admin-form-field">
                <span className="admin-form-label">Butt Size</span>
                <select className="admin-form-input" value={form.buttSize} onChange={(e) => setField('buttSize', e.target.value)}>
                  {BUTT_SIZES.map((v) => <option key={v} value={v}>{v || '— None —'}</option>)}
                </select>
              </label>
            </div>
          </div>

          {/* Content */}
          <div className="admin-form-section">
            <div className="admin-form-section-header">Content</div>
            <label className="admin-form-field">
              <span className="admin-form-label">System Prompt</span>
              <textarea className="admin-form-textarea" value={form.systemPrompt} onChange={(e) => setField('systemPrompt', e.target.value)} rows={5} />
            </label>
            <label className="admin-form-field">
              <span className="admin-form-label">First Message</span>
              <textarea className="admin-form-textarea" value={form.firstMessage} onChange={(e) => setField('firstMessage', e.target.value)} rows={3} />
            </label>
            <label className="admin-form-field">
              <span className="admin-form-label">Tags (comma-separated)</span>
              <input className="admin-form-input" value={form.tags} onChange={(e) => setField('tags', e.target.value)} placeholder="tag1, tag2, tag3" />
            </label>
          </div>

          {/* Media */}
          <div className="admin-form-section">
            <div className="admin-form-section-header">Media & Voice</div>
            <div className="admin-form-row">
              <label className="admin-form-field">
                <span className="admin-form-label">Voice ID</span>
                <input className="admin-form-input" value={form.voiceId} onChange={(e) => setField('voiceId', e.target.value)} />
              </label>
              <label className="admin-form-field">
                <span className="admin-form-label">Voice URL</span>
                <input className="admin-form-input" value={form.voiceUrl} onChange={(e) => setField('voiceUrl', e.target.value)} />
              </label>
            </div>
          </div>

          {/* AI Model */}
          <div className="admin-form-section">
            <div className="admin-form-section-header">AI Model</div>
            <div className="admin-form-row">
              <label className="admin-form-field">
                <span className="admin-form-label">LoRA Model</span>
                <select className="admin-form-input" value={form.loraModelId} onChange={(e) => setField('loraModelId', e.target.value)}>
                  <option value="">— None —</option>
                  {loraModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
              <label className="admin-form-toggle">
                <input type="checkbox" checked={form.isNsfw} onChange={(e) => setField('isNsfw', e.target.checked)} />
                NSFW
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="admin-form-footer">
            <button className="admin-form-cancel" onClick={() => setView('list')}>Cancel</button>
            <button className="admin-form-save" disabled={saving} onClick={handleSave}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---- List View ---- */
  return (
    <div className="admin-models">
      <div className="admin-models-header">
        <h1>AI Characters</h1>
        <button type="button" className="admin-models-add-btn" onClick={openCreate}>
          <Plus size={16} />
          Add Character
        </button>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            className="admin-form-input"
            placeholder="Search by character name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            style={{ paddingLeft: 36 }}
          />
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
        </div>
        <button className="admin-models-add-btn" onClick={handleSearch}>Search</button>
      </div>

      {error && <div className="admin-models-error">{error}</div>}

      {loading ? (
        <div className="admin-models-loading">Loading characters...</div>
      ) : characters.length === 0 ? (
        <div className="admin-models-empty">No characters found.</div>
      ) : (
        <>
          <div className="admin-models-table-wrap">
            <table className="admin-models-table">
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Name</th>
                  <th>Gender</th>
                  <th>Age</th>
                  <th>Body</th>
                  <th>Ethnicity</th>
                  <th>Breast</th>
                  <th>Butt</th>
                  <th>NSFW</th>
                  <th>Media</th>
                  <th>Visibility</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {characters.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="admin-models-thumb" style={!c.avatarUrl ? { background: '#1a1625' } : undefined}>
                        {c.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.avatarUrl} alt="" referrerPolicy="no-referrer" />
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <span className="admin-models-name">{c.name}</span>
                      {c.creator?.handle && (
                        <span style={{ fontSize: 11, opacity: 0.5, display: 'block' }}>{c.creator.handle}</span>
                      )}
                    </td>
                    <td><span className="admin-models-pill">{c.gender}</span></td>
                    <td>{c.age}</td>
                    <td>
                      {c.bodyType ? (
                        <span className="admin-models-pill">{c.bodyType}</span>
                      ) : (
                        <span style={{ fontSize: 13, opacity: 0.4 }}>—</span>
                      )}
                    </td>
                    <td>
                      {c.ethnicity ? (
                        <span className="admin-models-pill">{c.ethnicity}</span>
                      ) : (
                        <span style={{ fontSize: 13, opacity: 0.4 }}>—</span>
                      )}
                    </td>
                    <td>
                      {c.breastSize ? (
                        <span className="admin-models-pill">{c.breastSize}</span>
                      ) : (
                        <span style={{ fontSize: 13, opacity: 0.4 }}>—</span>
                      )}
                    </td>
                    <td>
                      {c.buttSize ? (
                        <span className="admin-models-pill">{c.buttSize}</span>
                      ) : (
                        <span style={{ fontSize: 13, opacity: 0.4 }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`admin-models-badge ${c.isNsfw ? 'admin-models-badge-red' : 'admin-models-badge-gray'}`}>
                        {c.isNsfw ? 'NSFW' : 'SFW'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 13 }}>
                        {c.avatarUrls?.length || 0}
                      </span>
                    </td>
                    <td><span className="admin-models-pill">{c.visibility}</span></td>
                    <td style={{ fontSize: 13, opacity: 0.7 }}>{formatDate(c.createdAt)}</td>
                    <td>
                      <div className="admin-models-actions">
                        <button className="admin-models-action-btn" onClick={() => openEdit(c)} title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button className="admin-models-action-btn admin-models-action-btn-danger" onClick={() => setDeleteId(c.id)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 20 }}>
              <button
                className="admin-models-action-btn"
                disabled={pagination.page <= 1}
                onClick={() => fetchCharacters(pagination.page - 1, search)}
              >
                Prev
              </button>
              <span style={{ fontSize: 14, opacity: 0.7 }}>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <button
                className="admin-models-action-btn"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchCharacters(pagination.page + 1, search)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteId && (
        <div className="admin-models-overlay" onClick={() => setDeleteId(null)}>
          <div className="admin-models-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Character</h3>
            <p>Are you sure you want to delete this character? This action cannot be undone.</p>
            <div className="admin-models-dialog-actions">
              <button className="admin-form-cancel" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="admin-form-save admin-form-save-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
