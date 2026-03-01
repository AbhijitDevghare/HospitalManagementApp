// src/pages/admin/StaffManagementPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Full admin staff management page.
//
// Sections
// ────────
//   1. SalaryStatsWidget  – role payroll breakdown
//   2. Filter bar         – role / isActive / name search
//   3. Staff directory    – paginated table with Edit Shift, Deactivate/Reactivate
//   4. EditShiftModal     – mounts over the page when a row opens it
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector }                from 'react-redux';
import {
  fetchAllStaff, fetchSalarySummary,
  addStaff, updateStaffDetails, updateShiftTiming,
  deactivateStaff, reactivateStaff, deleteStaff,
  selectStaffList, selectStaffLoading, selectStaffError,
  selectSalarySummary,
  clearStaffError,
} from '../../store/slices/staffSlice';
import StaffFormModal from '../../components/admin/StaffFormModal';

const ROLE_COLORS = {
  manager: 'bg-violet-500', receptionist: 'bg-blue-500',
  housekeeping: 'bg-teal-500', maintenance: 'bg-amber-500',
  security: 'bg-red-500', chef: 'bg-orange-500',
  waiter: 'bg-cyan-500', concierge: 'bg-indigo-500', other: 'bg-slate-400',
};

const fmt     = (n)  => `$${Number(n ?? 0).toLocaleString()}`;
const initials = (name) => (name ?? '?').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

// ── Salary summary widget ─────────────────────────────────────────────────────
const SalarySummaryWidget = ({ summary }) => {
  if (!summary || Object.keys(summary).length === 0) {
    return <p className="widget__empty">No salary data available.</p>;
  }

  const roles  = Object.entries(summary);
  const maxTotal = Math.max(...roles.map(([, d]) => d.total ?? 0), 1);
  const grandTotal = roles.reduce((s, [, d]) => s + (d.total ?? 0), 0);
  const totalHeads = roles.reduce((s, [, d]) => s + (d.count ?? 0), 0);

  return (
    <div className="salary-widget">
      <p className="salary-widget__title">💰 Salary Summary by Role</p>
      <div className="salary-widget__totals">
        <div className="salary-widget__total-card salary-widget__total-card--highlight">
          <span className="salary-widget__total-value">{fmt(grandTotal)}</span>
          <span className="salary-widget__total-label">Monthly Payroll</span>
        </div>
        <div className="salary-widget__total-card">
          <span className="salary-widget__total-value">{totalHeads}</span>
          <span className="salary-widget__total-label">Total Staff</span>
        </div>
      </div>
      <div className="salary-widget__rows">
        {roles.map(([role, data]) => (
          <div key={role} className="salary-widget__row">
            <div className="salary-widget__row-header">
              <span className="salary-widget__role capitalize font-medium">{role}</span>
              <span className="salary-widget__heads">{data.count ?? 0} staff</span>
              <span className="salary-widget__avg">avg {fmt(data.avgSalary ?? data.average ?? 0)}</span>
              <span className="salary-widget__total ml-auto">{fmt(data.total ?? 0)}</span>
            </div>
            <div className="salary-widget__bar-track">
              <div
                className="salary-widget__bar"
                style={{
                  width: `${Math.round(((data.total ?? 0) / maxTotal) * 100)}%`,
                  backgroundColor: ROLE_COLORS[role]?.replace('bg-', 'var(--tw-') ?? '#6366f1',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Delete confirm ────────────────────────────────────────────────────────────
const DeleteConfirm = ({ staff, onConfirm, onCancel, busy }) => (
  <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
    <div className="modal modal--sm" role="dialog" aria-modal="true">
      <header className="modal__header">
        <h2 className="modal__title">🗑️ Hard Delete Staff</h2>
        <button className="modal__close" onClick={onCancel}>✕</button>
      </header>
      <div className="modal__body">
        <p className="text-sm text-slate-700">
          Permanently delete <strong>{staff.name}</strong>? All their records will be removed.
          This cannot be undone.
        </p>
        <div className="alert alert--error">
          <span className="alert__icon">⚠️</span>
          <span>
            Only deactivated staff can be hard-deleted. This staff member is currently{' '}
            <strong>inactive</strong>.
          </span>
        </div>
        <p className="modal__confirm-hint">Type the staff's name to confirm.</p>
        <input type="text" placeholder={staff.name}
          className="mt-2"
          onChange={(e) => {
            const btn = document.getElementById('smp-confirm-del');
            if (btn) btn.disabled = e.target.value !== staff.name;
          }} />
      </div>
      <footer className="modal__footer">
        <button className="btn btn--ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button id="smp-confirm-del" className="btn btn--danger" disabled
          onClick={onConfirm} aria-busy={busy}>
          {busy ? <><span className="hms-spinner hms-spinner--sm" aria-hidden="true" /> Deleting…</> : 'Yes, Delete Permanently'}
        </button>
      </footer>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
const StaffManagementPage = () => {
  const dispatch = useDispatch();
  const staff    = useSelector(selectStaffList);
  const loading  = useSelector(selectStaffLoading);
  const error    = useSelector(selectStaffError);
  const salary   = useSelector(selectSalarySummary);

  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // all | active | inactive
  const [formStaff,  setFormStaff]  = useState(undefined); // undefined=closed, null=add, obj=edit
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,   setDeleting]   = useState(false);
  const [busyId,     setBusyId]     = useState(null);
  const [toast,      setToast]      = useState(null);

  useEffect(() => {
    dispatch(fetchAllStaff());
    dispatch(fetchSalarySummary());
  }, [dispatch]);

  const pushToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Deactivate (soft-delete) ──────────────────────────────────────────────
  const handleDeactivate = useCallback(async (member) => {
    setBusyId(member._id ?? member.id);
    const result = await dispatch(deactivateStaff(member._id ?? member.id));
    setBusyId(null);
    if (deactivateStaff.fulfilled.match(result)) {
      pushToast(`${member.name} deactivated.`, 'warning');
    }
  }, [dispatch]);

  // ── Reactivate ────────────────────────────────────────────────────────────
  const handleReactivate = useCallback(async (member) => {
    setBusyId(member._id ?? member.id);
    const result = await dispatch(reactivateStaff(member._id ?? member.id));
    setBusyId(null);
    if (reactivateStaff.fulfilled.match(result)) {
      pushToast(`${member.name} reactivated.`);
    }
  }, [dispatch]);

  // ── Hard delete ───────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await dispatch(deleteStaff(deleteTarget._id ?? deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
    if (deleteStaff.fulfilled.match(result)) {
      pushToast(`${deleteTarget.name} permanently deleted.`);
      dispatch(fetchSalarySummary());
    }
  }, [dispatch, deleteTarget]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const allStaff = Array.isArray(staff) ? staff : [];
  const roles    = [...new Set(allStaff.map((s) => s.role).filter(Boolean))];

  const filtered = allStaff.filter((s) => {
    if (roleFilter && s.role !== roleFilter) return false;
    if (activeFilter === 'active'   && s.isActive === false)  return false;
    if (activeFilter === 'inactive' && s.isActive !== false)  return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(s.name ?? '').toLowerCase().includes(q) &&
          !(s.email ?? '').toLowerCase().includes(q) &&
          !(s.role  ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const activeCount   = allStaff.filter((s) => s.isActive !== false).length;
  const inactiveCount = allStaff.filter((s) => s.isActive === false).length;

  return (
    <main className="admin-page" aria-labelledby="smp-title">

      {/* Toast */}
      {toast && (
        <div className={`toast toast--${toast.type} fixed top-4 right-4 z-50 w-80`} role="status">
          <span className="toast__body">{toast.msg}</span>
          <button className="toast__close" onClick={() => setToast(null)} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="admin-page__header">
        <h1 id="smp-title" className="admin-page__title">👥 Staff Management</h1>
        <div className="action-group">
          <button className="btn btn--ghost btn--sm"
            onClick={() => { dispatch(fetchAllStaff()); dispatch(fetchSalarySummary()); }}
            disabled={loading}>
            {loading ? '…' : '↺ Refresh'}
          </button>
          <button className="btn btn--primary" onClick={() => setFormStaff(null)}>
            + Onboard Staff
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert--error" role="alert">
          <span className="alert__icon">⚠️</span>
          <span>{error}</span>
          <button className="alert__close" onClick={() => dispatch(clearStaffError())} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="stats-bar">
        <div className="stat-card stat-card--neutral">
          <span className="stat-card__icon">👥</span>
          <span className="stat-card__value">{allStaff.length}</span>
          <span className="stat-card__label">Total Staff</span>
        </div>
        <div className="stat-card stat-card--success">
          <span className="stat-card__icon">✅</span>
          <span className="stat-card__value">{activeCount}</span>
          <span className="stat-card__label">Active</span>
        </div>
        <div className="stat-card stat-card--warning">
          <span className="stat-card__icon">⏸️</span>
          <span className="stat-card__value">{inactiveCount}</span>
          <span className="stat-card__label">Inactive</span>
        </div>
        <div className="stat-card stat-card--info">
          <span className="stat-card__icon">🏷️</span>
          <span className="stat-card__value">{roles.length}</span>
          <span className="stat-card__label">Roles</span>
        </div>
      </div>

      {/* Salary widget */}
      <SalarySummaryWidget summary={salary} />

      {/* Filter bar */}
      <div className="filter-bar">
        <input type="search" value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, role…"
          className="w-48" />
        <div className="form-group form-group--inline">
          <label htmlFor="smp-role">Role</label>
          <select id="smp-role" value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="tab-bar m-0 border-0 gap-1">
          {[['all','All'], ['active','Active'], ['inactive','Inactive']].map(([v, l]) => (
            <button key={v} type="button"
              className={`tab-bar__tab py-1 ${activeFilter === v ? 'tab-bar__tab--active' : ''}`}
              onClick={() => setActiveFilter(v)}>
              {l}
            </button>
          ))}
        </div>
        {(search || roleFilter || activeFilter !== 'all') && (
          <button className="btn btn--ghost btn--sm"
            onClick={() => { setSearch(''); setRoleFilter(''); setActiveFilter('all'); }}>
            Clear
          </button>
        )}
        <span className="filter-bar__count">{filtered.length} staff</span>
      </div>

      {/* Table */}
      {filtered.length === 0 && !loading
        ? <p className="page-empty">No staff members match the current filters.</p>
        : (
          <div className="table-wrapper">
            <table className="data-table data-table--full" aria-label="Staff">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Role</th>
                  <th>Salary</th>
                  <th>Shift</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => {
                  const id       = member._id ?? member.id;
                  const inactive = member.isActive === false;
                  const isBusy   = busyId === id;

                  return (
                    <tr key={id}
                      className={inactive ? 'data-table__row--muted' : ''}>
                      <td>
                        <div className="staff-cell">
                          <div className="staff-cell__avatar">{initials(member.name)}</div>
                          <div>
                            <p className="staff-cell__name">{member.name}</p>
                            <p className="staff-cell__email">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge--role capitalize">{member.role ?? '—'}</span>
                      </td>
                      <td className="font-mono text-sm">{fmt(member.salary)}/mo</td>
                      <td>
                        <span className="shift-badge">
                          {member.shiftStart ?? member.shift_start ?? '—'}
                          {' – '}
                          {member.shiftEnd ?? member.shift_end ?? '—'}
                        </span>
                      </td>
                      <td>
                        {inactive
                          ? <span className="badge badge--muted">Inactive</span>
                          : <span className="badge badge--success">Active</span>}
                      </td>
                      <td>
                        <div className="action-group">
                          {/* Edit */}
                          <button className="btn btn--ghost btn--sm"
                            onClick={() => setFormStaff(member)}
                            disabled={inactive || isBusy}
                            aria-label={`Edit ${member.name}`}>
                            ✏️
                          </button>

                          {/* Deactivate / Reactivate */}
                          {inactive ? (
                            <button
                              className="btn btn--success btn--sm"
                              onClick={() => handleReactivate(member)}
                              disabled={isBusy} aria-busy={isBusy}
                              aria-label={`Reactivate ${member.name}`}>
                              {isBusy ? <span className="hms-spinner hms-spinner--sm" aria-hidden="true" /> : '▶ Activate'}
                            </button>
                          ) : (
                            <button
                              className="btn btn--ghost btn--sm smp-deactivate-btn"
                              onClick={() => handleDeactivate(member)}
                              disabled={isBusy} aria-busy={isBusy}
                              aria-label={`Deactivate ${member.name}`}>
                              {isBusy ? <span className="hms-spinner hms-spinner--sm" aria-hidden="true" /> : '⏸ Deactivate'}
                            </button>
                          )}

                          {/* Hard delete — only enabled for inactive staff */}
                          <button
                            className="btn btn--danger btn--sm"
                            onClick={() => setDeleteTarget(member)}
                            disabled={!inactive || isBusy}
                            title={inactive ? 'Permanently delete' : 'Deactivate first to enable hard-delete'}
                            aria-label={`Delete ${member.name}`}>
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      {/* Onboard / Edit modal */}
      {formStaff !== undefined && (
        <StaffFormModal
          staff={formStaff}
          onClose={() => setFormStaff(undefined)}
          onSuccess={(saved) => {
            setFormStaff(undefined);
            dispatch(fetchAllStaff());
            dispatch(fetchSalarySummary());
            pushToast(formStaff ? `${saved.name} updated.` : `${saved.name} onboarded.`);
          }}
        />
      )}

      {/* Hard-delete confirm */}
      {deleteTarget && (
        <DeleteConfirm
          staff={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          busy={deleting}
        />
      )}
    </main>
  );
};

export default StaffManagementPage;
