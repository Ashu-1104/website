'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, ArrowLeft, Search } from 'lucide-react';
import { useUser } from '@/context/UserContext';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UserItem {
  id: string;
  handle: string | null;
  email: string | null;
  role: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  phone: string | null;
  avatarDecoration: string;
  avatarDecorationUrl: string | null;
  profileVisibility: string;
  favoritesPublic: boolean;
  isDeactivated: boolean;
  emailVerified: string | null;
  discordHandle: string | null;
  twitterHandle: string | null;
  redditHandle: string | null;
  instagramHandle: string | null;
  websiteUrl: string | null;
  emailNotifyMessages: boolean;
  emailNotifyFollows: boolean;
  emailNotifyProduct: boolean;
  pushNotifyMessages: boolean;
  pushNotifyFollows: boolean;
  pushNotifyProduct: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    characters: number;
    uploadedModels: number;
    generationJobs: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const VISIBILITY_OPTIONS = ['PUBLIC', 'PRIVATE', 'FRIENDS_ONLY'] as const;
const DECORATION_OPTIONS = ['NONE', 'PINK_GLOW', 'GOLD_CROWN', 'RAINBOW_RING', 'FIRE_RING', 'DIAMOND'] as const;
const ROLE_OPTIONS = ['USER', 'ADMIN', 'SUPPORT', 'DEVELOPER'] as const;

const EMPTY_FORM = {
  handle: '',
  email: '',
  role: 'USER',
  bio: '',
  avatarUrl: '',
  bannerUrl: '',
  phone: '',
  profileVisibility: 'PUBLIC',
  favoritesPublic: true,
  isDeactivated: false,
  avatarDecoration: 'NONE',
  avatarDecorationUrl: '',
  discordHandle: '',
  twitterHandle: '',
  redditHandle: '',
  instagramHandle: '',
  websiteUrl: '',
  emailNotifyMessages: true,
  emailNotifyFollows: true,
  emailNotifyProduct: true,
  pushNotifyMessages: true,
  pushNotifyFollows: true,
  pushNotifyProduct: true,
};

type FormState = typeof EMPTY_FORM;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminUsersPage() {
  const { userId } = useUser();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, totalPages: 0 });

  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });

  /* ---- Fetch users ---- */
  const fetchUsers = useCallback(async (page = 1, searchQuery = '') => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { 'x-vp-user-id': userId },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users ?? []);
      setPagination(data.pagination ?? { page: 1, limit: 25, total: 0, totalPages: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = () => {
    fetchUsers(1, search);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  /* ---- Open form for edit ---- */
  const openEdit = (u: UserItem) => {
    setError('');
    setForm({
      handle: u.handle ?? '',
      email: u.email ?? '',
      role: u.role ?? 'USER',
      bio: u.bio ?? '',
      avatarUrl: u.avatarUrl ?? '',
      bannerUrl: u.bannerUrl ?? '',
      phone: u.phone ?? '',
      profileVisibility: u.profileVisibility,
      favoritesPublic: u.favoritesPublic,
      isDeactivated: u.isDeactivated,
      avatarDecoration: u.avatarDecoration,
      avatarDecorationUrl: u.avatarDecorationUrl ?? '',
      discordHandle: u.discordHandle ?? '',
      twitterHandle: u.twitterHandle ?? '',
      redditHandle: u.redditHandle ?? '',
      instagramHandle: u.instagramHandle ?? '',
      websiteUrl: u.websiteUrl ?? '',
      emailNotifyMessages: u.emailNotifyMessages,
      emailNotifyFollows: u.emailNotifyFollows,
      emailNotifyProduct: u.emailNotifyProduct,
      pushNotifyMessages: u.pushNotifyMessages,
      pushNotifyFollows: u.pushNotifyFollows,
      pushNotifyProduct: u.pushNotifyProduct,
    });
    setEditingId(u.id);
    setView('form');
  };

  /* ---- Save ---- */
  const handleSave = async () => {
    if (!userId || !editingId) return;

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-vp-user-id': userId },
        body: JSON.stringify({ id: editingId, ...form }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      setView('list');
      fetchUsers(pagination.page, search);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  /* ---- Field helpers ---- */
  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

  /* ---- Render ---- */
  if (view === 'form') {
    return (
      <div className="admin-models">
        <div className="admin-models-header">
          <button className="admin-models-back" onClick={() => setView('list')}>
            <ArrowLeft size={18} />
          </button>
          <h1>Edit User</h1>
        </div>

        {error && <div className="admin-models-error">{error}</div>}

        <div className="admin-models-form">
          {/* Profile */}
          <div className="admin-form-section">
            <div className="admin-form-section-header">Profile</div>
            <div className="admin-form-row">
              <label className="admin-form-field">
                <span className="admin-form-label">Handle</span>
                <input className="admin-form-input" value={form.handle} onChange={(e) => setField('handle', e.target.value)} />
              </label>
              <label className="admin-form-field">
                <span className="admin-form-label">Email</span>
                <input className="admin-form-input" value={form.email} onChange={(e) => setField('email', e.target.value)} />
              </label>
            </div>
            <label className="admin-form-field">
              <span className="admin-form-label">Bio</span>
              <textarea className="admin-form-textarea" value={form.bio} onChange={(e) => setField('bio', e.target.value)} rows={3} />
            </label>
            <div className="admin-form-row">
              <label className="admin-form-field">
                <span className="admin-form-label">Avatar URL</span>
                <input className="admin-form-input" value={form.avatarUrl} onChange={(e) => setField('avatarUrl', e.target.value)} />
              </label>
              <label className="admin-form-field">
                <span className="admin-form-label">Banner URL</span>
                <input className="admin-form-input" value={form.bannerUrl} onChange={(e) => setField('bannerUrl', e.target.value)} />
              </label>
            </div>
            <label className="admin-form-field">
              <span className="admin-form-label">Phone</span>
              <input className="admin-form-input" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
            </label>
          </div>

          {/* Settings */}
          <div className="admin-form-section">
            <div className="admin-form-section-header">Settings</div>
            <div className="admin-form-row">
              <label className="admin-form-field">
                <span className="admin-form-label">Role</span>
                <select className="admin-form-input" value={form.role} onChange={(e) => setField('role', e.target.value)}>
                  {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <label className="admin-form-field">
                <span className="admin-form-label">Profile Visibility</span>
                <select className="admin-form-input" value={form.profileVisibility} onChange={(e) => setField('profileVisibility', e.target.value)}>
                  {VISIBILITY_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="admin-form-field">
                <span className="admin-form-label">Avatar Decoration</span>
                <select className="admin-form-input" value={form.avatarDecoration} onChange={(e) => setField('avatarDecoration', e.target.value)}>
                  {DECORATION_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
            </div>
            <label className="admin-form-field">
              <span className="admin-form-label">Decoration URL</span>
              <input className="admin-form-input" value={form.avatarDecorationUrl} onChange={(e) => setField('avatarDecorationUrl', e.target.value)} />
            </label>
            <div className="admin-form-row">
              <label className="admin-form-toggle">
                <input type="checkbox" checked={form.favoritesPublic} onChange={(e) => setField('favoritesPublic', e.target.checked)} />
                Favorites Public
              </label>
              <label className="admin-form-toggle">
                <input type="checkbox" checked={form.isDeactivated} onChange={(e) => setField('isDeactivated', e.target.checked)} />
                Deactivated
              </label>
            </div>
          </div>

          {/* Social */}
          <div className="admin-form-section">
            <div className="admin-form-section-header">Social</div>
            <div className="admin-form-row">
              <label className="admin-form-field">
                <span className="admin-form-label">Discord</span>
                <input className="admin-form-input" value={form.discordHandle} onChange={(e) => setField('discordHandle', e.target.value)} />
              </label>
              <label className="admin-form-field">
                <span className="admin-form-label">Twitter / X</span>
                <input className="admin-form-input" value={form.twitterHandle} onChange={(e) => setField('twitterHandle', e.target.value)} />
              </label>
            </div>
            <div className="admin-form-row">
              <label className="admin-form-field">
                <span className="admin-form-label">Reddit</span>
                <input className="admin-form-input" value={form.redditHandle} onChange={(e) => setField('redditHandle', e.target.value)} />
              </label>
              <label className="admin-form-field">
                <span className="admin-form-label">Instagram</span>
                <input className="admin-form-input" value={form.instagramHandle} onChange={(e) => setField('instagramHandle', e.target.value)} />
              </label>
            </div>
            <label className="admin-form-field">
              <span className="admin-form-label">Website</span>
              <input className="admin-form-input" value={form.websiteUrl} onChange={(e) => setField('websiteUrl', e.target.value)} />
            </label>
          </div>

          {/* Notifications */}
          <div className="admin-form-section">
            <div className="admin-form-section-header">Email Notifications</div>
            <div className="admin-form-row">
              <label className="admin-form-toggle">
                <input type="checkbox" checked={form.emailNotifyMessages} onChange={(e) => setField('emailNotifyMessages', e.target.checked)} />
                Messages
              </label>
              <label className="admin-form-toggle">
                <input type="checkbox" checked={form.emailNotifyFollows} onChange={(e) => setField('emailNotifyFollows', e.target.checked)} />
                Follows
              </label>
              <label className="admin-form-toggle">
                <input type="checkbox" checked={form.emailNotifyProduct} onChange={(e) => setField('emailNotifyProduct', e.target.checked)} />
                Product
              </label>
            </div>
          </div>

          <div className="admin-form-section">
            <div className="admin-form-section-header">Push Notifications</div>
            <div className="admin-form-row">
              <label className="admin-form-toggle">
                <input type="checkbox" checked={form.pushNotifyMessages} onChange={(e) => setField('pushNotifyMessages', e.target.checked)} />
                Messages
              </label>
              <label className="admin-form-toggle">
                <input type="checkbox" checked={form.pushNotifyFollows} onChange={(e) => setField('pushNotifyFollows', e.target.checked)} />
                Follows
              </label>
              <label className="admin-form-toggle">
                <input type="checkbox" checked={form.pushNotifyProduct} onChange={(e) => setField('pushNotifyProduct', e.target.checked)} />
                Product
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
        <h1>Users</h1>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            className="admin-form-input"
            placeholder="Search by handle or email..."
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
        <div className="admin-models-loading">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="admin-models-empty">No users found.</div>
      ) : (
        <>
          <div className="admin-models-table-wrap">
            <table className="admin-models-table">
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Handle</th>
                  <th>Email</th>
                  <th>Visibility</th>
                  <th>Status</th>
                  <th>Characters</th>
                  <th>Models</th>
                  <th>Jobs</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {u.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatarUrl} alt="" className="admin-models-thumb" />
                      ) : (
                        <div className="admin-models-thumb" style={{ background: '#1a1625' }} />
                      )}
                    </td>
                    <td><span className="admin-models-name">{u.handle ?? '—'}</span></td>
                    <td style={{ fontSize: 13, opacity: 0.7 }}>{u.email ?? '—'}</td>
                    <td><span className="admin-models-pill">{u.profileVisibility}</span></td>
                    <td>
                      <span className={`admin-models-badge ${u.isDeactivated ? 'admin-models-badge-red' : 'admin-models-badge-green'}`}>
                        {u.isDeactivated ? 'Deactivated' : 'Active'}
                      </span>
                    </td>
                    <td>{u._count.characters}</td>
                    <td>{u._count.uploadedModels}</td>
                    <td>{u._count.generationJobs}</td>
                    <td style={{ fontSize: 13, opacity: 0.7 }}>{formatDate(u.createdAt)}</td>
                    <td>
                      <div className="admin-models-actions">
                        <button className="admin-models-action-btn" onClick={() => openEdit(u)} title="Edit">
                          <Pencil size={14} />
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
                onClick={() => fetchUsers(pagination.page - 1, search)}
              >
                Prev
              </button>
              <span style={{ fontSize: 14, opacity: 0.7 }}>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <button
                className="admin-models-action-btn"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchUsers(pagination.page + 1, search)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
