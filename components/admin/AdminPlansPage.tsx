'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, Loader2, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ---------- Types ---------- */

interface PlanConfig {
  id: string;
  planKey: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  monthlyCredits: number;
  maxCompanions: number;
  creditRollover: number;
  loraTrainingCredits: number;
  features: string[] | null;
  isActive: boolean;
  isRecommended: boolean;
  sortOrder: number;
}

interface CreditCost {
  id: string;
  operationType: string;
  label: string;
  category: string;
  credits: number;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

/* ---------- Component ---------- */

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [creditCosts, setCreditCosts] = useState<CreditCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  /* ---- View state ---- */
  const [editingPlan, setEditingPlan] = useState<PlanConfig | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  /* ---- Plan form state ---- */
  const [formName, setFormName] = useState('');
  const [formMonthlyPrice, setFormMonthlyPrice] = useState(0);
  const [formAnnualPrice, setFormAnnualPrice] = useState(0);
  const [formMonthlyCredits, setFormMonthlyCredits] = useState(0);
  const [formMaxCompanions, setFormMaxCompanions] = useState(1);
  const [formCreditRollover, setFormCreditRollover] = useState(0);
  const [formLoraTrainingCredits, setFormLoraTrainingCredits] = useState(0);
  const [formFeatures, setFormFeatures] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsRecommended, setFormIsRecommended] = useState(false);

  /* ---------- Fetch ---------- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/plans');
      if (!res.ok) throw new Error('Failed to load plans');
      const data = await res.json();
      setPlans(data.plans ?? []);
      setCreditCosts(data.creditCosts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---------- Plan edit helpers ---------- */
  const openEditPlan = (plan: PlanConfig) => {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormMonthlyPrice(plan.monthlyPrice);
    setFormAnnualPrice(plan.annualPrice);
    setFormMonthlyCredits(plan.monthlyCredits);
    setFormMaxCompanions(plan.maxCompanions);
    setFormCreditRollover(plan.creditRollover);
    setFormLoraTrainingCredits(plan.loraTrainingCredits ?? 0);
    setFormFeatures(Array.isArray(plan.features) ? plan.features.join('\n') : '');
    setFormIsActive(plan.isActive);
    setFormIsRecommended(plan.isRecommended);
    setError('');
    setSuccessMsg('');
  };

  const cancelEditPlan = () => {
    setEditingPlan(null);
    setError('');
  };

  /* ---------- Save plan ---------- */
  const handleSavePlan = async () => {
    if (!formName.trim()) {
      setError('Plan name is required');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const features = formFeatures
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      const res = await fetch('/api/admin/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'plan',
          id: editingPlan!.id,
          name: formName.trim(),
          monthlyPrice: formMonthlyPrice,
          annualPrice: formAnnualPrice,
          monthlyCredits: formMonthlyCredits,
          maxCompanions: formMaxCompanions,
          creditRollover: formCreditRollover,
          loraTrainingCredits: formLoraTrainingCredits,
          features,
          isActive: formIsActive,
          isRecommended: formIsRecommended,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to update plan');
      }

      setEditingPlan(null);
      setSuccessMsg('Plan updated successfully');
      await fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Save credit cost ---------- */
  const handleSaveCreditCost = async (cost: CreditCost, newCredits: number) => {
    if (newCredits === cost.credits) return;

    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'creditCost',
          id: cost.id,
          credits: newCredits,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to update credit cost');
      }

      setSuccessMsg(`${cost.label} updated to ${newCredits} credits`);
      await fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save credit cost');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Toggle credit cost active ---------- */
  const handleToggleCreditCostActive = async (cost: CreditCost) => {
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'creditCost', id: cost.id, isActive: !cost.isActive }),
      });
      if (!res.ok) throw new Error('Failed to update');
      await fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to toggle credit cost');
    }
  };

  /* ========== RENDER: Plan Edit Form ========== */

  if (editingPlan) {
    return (
      <div className="admin-models">
        <div className="admin-models-header">
          <button type="button" className="admin-models-back" onClick={cancelEditPlan}>
            &larr; Back
          </button>
          <h1 className="page-title">Edit Plan: {editingPlan.name}</h1>
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
          {/* Name + Plan Key */}
          <div className="admin-form-row">
            <div className="admin-form-field">
              <label className="admin-form-label">
                Display Name <span className="text-pink-500">*</span>
              </label>
              <input
                className="admin-form-input"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Starter"
              />
            </div>
            <div className="admin-form-field">
              <label className="admin-form-label">Plan Key</label>
              <input
                className="admin-form-input"
                value={editingPlan.planKey}
                disabled
                style={{ opacity: 0.6 }}
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="admin-form-row">
            <div className="admin-form-field">
              <label className="admin-form-label">Monthly Price ($)</label>
              <input
                className="admin-form-input"
                type="number"
                step="0.01"
                min="0"
                value={formMonthlyPrice}
                onChange={(e) => setFormMonthlyPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="admin-form-field">
              <label className="admin-form-label">Annual Price ($/month)</label>
              <input
                className="admin-form-input"
                type="number"
                step="0.01"
                min="0"
                value={formAnnualPrice}
                onChange={(e) => setFormAnnualPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Credits + Rollover */}
          <div className="admin-form-row">
            <div className="admin-form-field">
              <label className="admin-form-label">Monthly Credits</label>
              <input
                className="admin-form-input"
                type="number"
                min="0"
                value={formMonthlyCredits}
                onChange={(e) => setFormMonthlyCredits(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="admin-form-field">
              <label className="admin-form-label">Credit Rollover (max)</label>
              <input
                className="admin-form-input"
                type="number"
                min="0"
                value={formCreditRollover}
                onChange={(e) => setFormCreditRollover(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Companions + LoRA */}
          <div className="admin-form-row">
            <div className="admin-form-field">
              <label className="admin-form-label">Max Companions (-1 = unlimited)</label>
              <input
                className="admin-form-input"
                type="number"
                min="-1"
                value={formMaxCompanions}
                onChange={(e) => setFormMaxCompanions(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="admin-form-field">
              <label className="admin-form-label">LoRA Training Credits (0 = disabled)</label>
              <input
                className="admin-form-input"
                type="number"
                min="0"
                value={formLoraTrainingCredits}
                onChange={(e) => setFormLoraTrainingCredits(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="admin-form-row">
            <div className="admin-form-field flex items-end gap-6 pb-1">
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded border-white/20"
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsRecommended}
                  onChange={(e) => setFormIsRecommended(e.target.checked)}
                  className="rounded border-white/20"
                />
                Recommended
              </label>
            </div>
          </div>

          {/* Features */}
          <div className="admin-form-field">
            <label className="admin-form-label">Features (one per line)</label>
            <textarea
              className="admin-form-textarea"
              value={formFeatures}
              onChange={(e) => setFormFeatures(e.target.value)}
              rows={6}
              placeholder={'Unlimited chat\nAll image tools\nPriority queue'}
            />
          </div>

          {/* Save / Cancel */}
          <div className="admin-form-footer">
            <button
              type="button"
              className="admin-form-save"
              onClick={handleSavePlan}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="admin-form-cancel" onClick={cancelEditPlan}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ========== RENDER: Main List View ========== */

  return (
    <div className="admin-models">
      <div className="admin-models-header">
        <h1 className="page-title">Plan Management</h1>
      </div>

      {error && (
        <div className="admin-models-error">
          {error}
          <button type="button" onClick={() => setError('')} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {successMsg}
        </div>
      )}

      {loading ? (
        <div className="admin-models-loading">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
          Loading plans...
        </div>
      ) : (
        <>
          {/* ---- Subscription Plans ---- */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Subscription Plans</h2>
            <div className="admin-models-table-wrap">
              <table className="admin-models-table">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Monthly Price</th>
                    <th>Annual Price</th>
                    <th>Credits/mo</th>
                    <th>Companions</th>
                    <th>Rollover</th>
                    <th>LoRA cr</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <>
                      <tr key={plan.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{plan.name}</span>
                            {plan.isRecommended && (
                              <span className="admin-models-badge admin-models-badge-success">
                                Recommended
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-white/40 mt-0.5">{plan.planKey}</div>
                        </td>
                        <td>${plan.monthlyPrice.toFixed(2)}</td>
                        <td>{plan.annualPrice > 0 ? `$${plan.annualPrice.toFixed(2)}/mo` : '—'}</td>
                        <td className="font-medium text-white">{plan.monthlyCredits.toLocaleString()}</td>
                        <td>{plan.maxCompanions === -1 ? 'Unlimited' : plan.maxCompanions}</td>
                        <td>{plan.creditRollover > 0 ? plan.creditRollover.toLocaleString() : '—'}</td>
                        <td>{(plan.loraTrainingCredits ?? 0) > 0 ? plan.loraTrainingCredits : '—'}</td>
                        <td>
                          <span
                            className={cn(
                              'admin-models-badge',
                              plan.isActive ? 'admin-models-badge-success' : 'admin-models-badge-muted'
                            )}
                          >
                            {plan.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition"
                              onClick={() => openEditPlan(plan)}
                              title="Edit plan"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition"
                              onClick={() => setExpandedPlanId(expandedPlanId === plan.id ? null : plan.id)}
                              title="View features"
                            >
                              {expandedPlanId === plan.id ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedPlanId === plan.id && (
                        <tr key={`${plan.id}-features`}>
                          <td colSpan={9} className="!py-3 !px-6">
                            <div className="text-xs font-semibold text-white/50 mb-2 uppercase tracking-wide">
                              Features
                            </div>
                            {Array.isArray(plan.features) && plan.features.length > 0 ? (
                              <ul className="space-y-1">
                                {plan.features.map((f, i) => (
                                  <li key={i} className="flex items-center gap-2 text-sm text-white/70">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                    {f}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-sm text-white/40">No features listed</span>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ---- Credit Costs ---- */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Credit Costs (per generation)</h2>
            <p className="text-sm text-white/50 mb-4">
              These costs are global — the same for all plans. Users on higher plans get more credits, but each generation costs the same.
            </p>
            <div className="admin-models-table-wrap">
              <table className="admin-models-table">
                <thead>
                  <tr>
                    <th>Operation</th>
                    <th>Category</th>
                    <th>Credits</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {creditCosts.map((cost) => (
                    <CreditCostRow
                      key={cost.id}
                      cost={cost}
                      saving={saving}
                      onSave={handleSaveCreditCost}
                      onToggleActive={handleToggleCreditCostActive}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/* ---------- Credit Cost Inline Edit Row ---------- */

function CreditCostRow({
  cost,
  saving,
  onSave,
  onToggleActive,
}: {
  cost: CreditCost;
  saving: boolean;
  onSave: (cost: CreditCost, newCredits: number) => Promise<void>;
  onToggleActive: (cost: CreditCost) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [credits, setCredits] = useState(cost.credits);

  const handleSave = async () => {
    await onSave(cost, credits);
    setEditing(false);
  };

  const handleCancel = () => {
    setCredits(cost.credits);
    setEditing(false);
  };

  const categoryColors: Record<string, string> = {
    image: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    video: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    audio: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    training: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  };

  return (
    <tr>
      <td>
        <div className="font-medium text-white">{cost.label}</div>
        {cost.description && <div className="text-xs text-white/40 mt-0.5">{cost.description}</div>}
      </td>
      <td>
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold capitalize',
            categoryColors[cost.category] ?? 'bg-white/5 text-white/60 border-white/10'
          )}
        >
          {cost.category}
        </span>
      </td>
      <td>
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              className="admin-form-input w-24 !py-1 !px-2 text-sm"
              value={credits}
              onChange={(e) => setCredits(parseInt(e.target.value) || 1)}
              autoFocus
            />
            <button
              type="button"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
              onClick={handleSave}
              disabled={saving}
            >
              Save
            </button>
            <button
              type="button"
              className="text-xs text-white/50 hover:text-white font-medium"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        ) : (
          <span className="font-medium text-white">{cost.credits}</span>
        )}
      </td>
      <td>
        <span
          className={cn(
            'admin-models-badge',
            cost.isActive ? 'admin-models-badge-success' : 'admin-models-badge-muted'
          )}
        >
          {cost.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition"
            onClick={() => {
              setEditing(true);
              setCredits(cost.credits);
            }}
            title="Edit credits"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            className={cn(
              'px-2 py-1 rounded-lg text-xs font-medium transition',
              cost.isActive
                ? 'hover:bg-rose-500/10 text-rose-300/70 hover:text-rose-300'
                : 'hover:bg-emerald-500/10 text-emerald-300/70 hover:text-emerald-300'
            )}
            onClick={() => onToggleActive(cost)}
          >
            {cost.isActive ? 'Disable' : 'Enable'}
          </button>
        </div>
      </td>
    </tr>
  );
}
