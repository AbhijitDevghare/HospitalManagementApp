// src/components/admin/StaffShiftWidget.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Fetches fetchAllStaff (optionally filtered by role / active status) and
// renders a shift schedule table. Each row has an inline edit form that
// dispatches updateShiftTiming with { startTime, endTime } in HH:MM 24h.
// Also shows the salary summary from fetchSalarySummary.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAllStaff,
  fetchSalarySummary,
  updateShiftTiming,
  deactivateStaff,
  reactivateStaff,
  selectStaffList,
  selectSalarySummary,
  selectStaffLoading,
  selectStaffError,
  clearStaffError,
} from '../../store/slices/staffSlice';

// HH:MM 24-hour validation
const isValidTime = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

// ─────────────────────────────────────────────────────────────────────────────
const StaffShiftWidget = () => {
  const dispatch       = useDispatch();
  const staffList      = useSelector(selectStaffList);
  const salarySummary  = useSelector(selectSalarySummary);
  const loading        = useSelector(selectStaffLoading);
  const error          = useSelector(selectStaffError);

  // Filter bar state
  const [roleFilter, setRoleFilter]         = useState('');
  const [activeFilter, setActiveFilter]     = useState('');

  // Inline shift edit state: { [staffId]: { startTime, endTime } }
  const [shiftEdits, setShiftEdits]         = useState({});
  const [editingId, setEditingId]           = useState(null);
  const [savingId, setSavingId]             = useState(null);
  const [togglingId, setTogglingId]         = useState(null);
  const [shiftError, setShiftError]         = useState({});

  // ── Initial fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchAllStaff());
    dispatch(fetchSalarySummary());
  }, [dispatch]);

  // ── Filtered re-fetch when filter bar changes ─────────────────────────────
  const handleFilter = (e) => {
    const { name, value } = e.target;
    const newRole   = name === 'role'     ? value : roleFilter;
    const newActive = name === 'isActive' ? value : activeFilter;
    if (name === 'role')     setRoleFilter(newRole);
    if (name === 'isActive') setActiveFilter(newActive);

    const filters = {};
    if (newRole)   filters.role     = newRole;
    if (newActive) filters.isActive = newActive;
    dispatch(fetchAllStaff(filters));
  };

  // ── Open shift edit row ───────────────────────────────────────────────────
  const openEdit = (member) => {
    const id = member._id ?? member.id;
    setShiftEdits((prev) => ({
      ...prev,
      [id]: {
        startTime: member.shift?.startTime ?? '',
        endTime:   member.shift?.endTime   ?? '',
      },
    }));
    setShiftError((prev) => ({ ...prev, [id]: '' }));
    setEditingId(id);
  };

  const closeEdit = () => {
    setEditingId(null);
    setShiftError({});
  };

  // ── Save shift ────────────────────────────────────────────────────────────
  const handleShiftSave = async (id) => {
    const { startTime, endTime } = shiftEdits[id] ?? {};

    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      setShiftError((prev) => ({
        ...prev,
        [id]: 'Both times are required in HH:MM 24-hour format.',
      }));
      return;
    }

    setSavingId(id);
    const result = await dispatch(updateShiftTiming({ id, startTime, endTime }));
    setSavingId(null);

    if (updateShiftTiming.fulfilled.match(result)) {
      closeEdit();
    } else {
      // Surface backend 400 message inside the inline row
      setShiftError((prev) => ({ ...prev, [id]: result.payload ?? 'Update failed.' }));
    }
  };

  // ── Activate / deactivate toggle ─────────────────────────────────────────
  const handleToggleActive = async (member) => {
    const id = member._id ?? member.id;
    setTogglingId(id);
    if (member.isActive) {
      await dispatch(deactivateStaff(id));
    } else {
      await dispatch(reactivateStaff(id));
    }
    setTogglingId(null);
  };

  // ── Unique roles for filter dropdown ─────────────────────────────────────
  const roles = [...new Set(staffList.map((s) => s.role).filter(Boolean))];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <section className="widget widget--staff" aria-labelledby="staff-title">
      <header className="widget__header">
        <h2 id="staff-title" className="widget__title">👥 Staff Shifts</h2>
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => dispatch(fetchAllStaff({ role: roleFilter || undefined, isActive: activeFilter || undefined }))}
          disabled={loading}
          aria-label="Refresh staff list"
        >
          {loading ? '…' : '↺ Refresh'}
        </button>
      </header>

      {/* ── Error toast ──────────────────────────────────────────────────── */}
      {error && (
        <p className="widget__toast widget__toast--error" role="alert">
          {error}
          <button
            className="widget__toast-close"
            onClick={() => dispatch(clearStaffError())}
            aria-label="Dismiss error"
          >✕</button>
        </p>
      )}

      {/* ── Salary summary pills ─────────────────────────────────────────── */}
      {salarySummary.length > 0 && (
        <div className="widget__section">
          <h3 className="widget__section-title">Salary by Role</h3>
          <div className="category-pills">
            {salarySummary.map((row) => (
              <div key={row.role ?? row._id} className="category-pill">
                <span className="category-pill__name">
                  {row.role ?? row._id}
                </span>
                <span className="category-pill__count">
                  {row.headCount} staff
                </span>
                <span className="category-pill__meta">
                  avg ${Number(row.averageSalary ?? 0).toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      <div className="widget__filters">
        <div className="form-group form-group--inline">
          <label htmlFor="sw-role">Role</label>
          <select
            id="sw-role"
            name="role"
            value={roleFilter}
            onChange={handleFilter}
          >
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group form-group--inline">
          <label htmlFor="sw-active">Status</label>
          <select
            id="sw-active"
            name="isActive"
            value={activeFilter}
            onChange={handleFilter}
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* ── Shift table ──────────────────────────────────────────────────── */}
      {staffList.length === 0 && !loading ? (
        <p className="widget__empty">No staff members found.</p>
      ) : (
        <div className="widget__table-wrapper">
          <table className="data-table" aria-label="Staff shift schedule">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Shift Start</th>
                <th>Shift End</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((member) => {
                const id        = member._id ?? member.id;
                const isEditing = editingId === id;
                const edit      = shiftEdits[id] ?? {};

                return (
                  <React.Fragment key={id}>
                    <tr className={!member.isActive ? 'data-table__row--muted' : ''}>
                      <td>{member.name}</td>
                      <td>
                        <span className="badge badge--role">
                          {member.role}
                        </span>
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="time"
                            value={edit.startTime ?? ''}
                            onChange={(e) =>
                              setShiftEdits((prev) => ({
                                ...prev,
                                [id]: { ...prev[id], startTime: e.target.value },
                              }))
                            }
                            aria-label="Shift start time"
                          />
                        ) : (
                          member.shift?.startTime ?? '—'
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="time"
                            value={edit.endTime ?? ''}
                            onChange={(e) =>
                              setShiftEdits((prev) => ({
                                ...prev,
                                [id]: { ...prev[id], endTime: e.target.value },
                              }))
                            }
                            aria-label="Shift end time"
                          />
                        ) : (
                          member.shift?.endTime ?? '—'
                        )}
                      </td>
                      <td>
                        <span className={`badge ${member.isActive ? 'badge--success' : 'badge--muted'}`}>
                          {member.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="action-group">
                          {isEditing ? (
                            <>
                              <button
                                className="btn btn--primary btn--sm"
                                onClick={() => handleShiftSave(id)}
                                disabled={savingId === id}
                              >
                                {savingId === id ? '…' : 'Save'}
                              </button>
                              <button
                                className="btn btn--ghost btn--sm"
                                onClick={closeEdit}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn btn--ghost btn--sm"
                                onClick={() => openEdit(member)}
                                aria-label={`Edit shift for ${member.name}`}
                              >
                                Edit Shift
                              </button>
                              <button
                                className={`btn btn--sm ${member.isActive ? 'btn--danger' : 'btn--success'}`}
                                onClick={() => handleToggleActive(member)}
                                disabled={togglingId === id}
                                aria-label={member.isActive ? `Deactivate ${member.name}` : `Reactivate ${member.name}`}
                              >
                                {togglingId === id
                                  ? '…'
                                  : member.isActive ? 'Deactivate' : 'Reactivate'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Inline validation error row */}
                    {isEditing && shiftError[id] && (
                      <tr className="data-table__error-row">
                        <td colSpan={6}>
                          <span className="form-error">{shiftError[id]}</span>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default StaffShiftWidget;
