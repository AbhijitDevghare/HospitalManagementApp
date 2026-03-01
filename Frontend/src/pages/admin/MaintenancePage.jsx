// src/pages/admin/MaintenancePage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Full admin maintenance management page.
//
// Sections
// ────────
//   1. Summary bar     – getMaintenanceSummary count cards
//   2. Filter bar      – status / priority / room filters
//   3. Records table   – all records with inline status toggle
//   4. Room-available  – toast notification when status → 'completed'
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector }                from 'react-redux';
import {
  fetchMaintenanceSummary,
  fetchAllMaintenanceRecords,
  updateMaintenanceStatus,
  selectMaintenanceSummary,
  selectMaintenanceRecords,
  selectMaintenanceLoading,
  selectMaintenanceError,
  selectStatusUpdateMessage,
  clearMaintenanceError,
  clearStatusUpdateMessage,
} from '../../store/slices/maintenanceSlice';

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUSES   = ['', 'pending', 'in-progress', 'completed'];
const PRIORITIES = ['', 'low', 'medium', 'high', 'critical'];

const STATUS_CLASS   = {
  pending:       'badge--warning',
  'in-progress': 'badge--info',
  completed:     'badge--success',
};
const PRIORITY_CLASS = {
  low:      'badge--neutral',
  medium:   'badge--warning',
  high:     'badge--danger',
  critical: 'badge--critical',
};

// ── Status transition map – what the next valid status is ─────────────────────
const NEXT_STATUS = {
  pending:       'in-progress',
  'in-progress': 'completed',
  completed:     null,           // terminal — no further transition
};

// ─────────────────────────────────────────────────────────────────────────────
const MaintenancePage = () => {
  const dispatch      = useDispatch();
  const summary       = useSelector(selectMaintenanceSummary);
  const records       = useSelector(selectMaintenanceRecords);
  const loading       = useSelector(selectMaintenanceLoading);
  const error         = useSelector(selectMaintenanceError);
  const statusMsg     = useSelector(selectStatusUpdateMessage);

  // ── Filter bar state ──────────────────────────────────────────────────────
  const [filters, setFilters] = useState({
    maintenanceStatus: '',
    priority:          '',
    roomId:            '',
  });

  // ── Inline status-edit state ──────────────────────────────────────────────
  // editingId  – which record row has the dropdown open
  // savingId   – which record is mid-request
  // newStatus  – staged value in the dropdown
  const [editingId, setEditingId] = useState(null);
  const [savingId,  setSavingId]  = useState(null);
  const [newStatus, setNewStatus] = useState('');

  // ── Completed-room toast state ────────────────────────────────────────────
  // Stores the room number(s) that just became available
  const [roomAvailToasts, setRoomAvailToasts] = useState([]);

  // ── Initial data load ─────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchMaintenanceSummary());
    dispatch(fetchAllMaintenanceRecords({}));
  }, [dispatch]);

  // ── Auto-dismiss statusUpdateMessage after 4 s ────────────────────────────
  useEffect(() => {
    if (!statusMsg) return;
    const t = setTimeout(() => dispatch(clearStatusUpdateMessage()), 4000);
    return () => clearTimeout(t);
  }, [dispatch, statusMsg]);

  // ── Auto-dismiss room-available toasts after 6 s ──────────────────────────
  useEffect(() => {
    if (roomAvailToasts.length === 0) return;
    const t = setTimeout(() => setRoomAvailToasts([]), 6000);
    return () => clearTimeout(t);
  }, [roomAvailToasts]);

  // ── Filtered re-fetch ─────────────────────────────────────────────────────
  const applyFilters = useCallback(
    (overrides = {}) => {
      const active = { ...filters, ...overrides };
      const params = Object.fromEntries(
        Object.entries(active).filter(([, v]) => v !== '')
      );
      dispatch(fetchAllMaintenanceRecords(params));
    },
    [dispatch, filters]
  );

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...filters, [name]: value };
    setFilters(updated);
    const params = Object.fromEntries(
      Object.entries(updated).filter(([, v]) => v !== '')
    );
    dispatch(fetchAllMaintenanceRecords(params));
  };

  const handleClearFilters = () => {
    setFilters({ maintenanceStatus: '', priority: '', roomId: '' });
    dispatch(fetchAllMaintenanceRecords({}));
  };

  // ── Status toggle ─────────────────────────────────────────────────────────
  const openEdit = (rec) => {
    const id = rec._id ?? rec.id;
    setEditingId(id);
    setNewStatus(rec.maintenanceStatus);
  };

  const cancelEdit = () => { setEditingId(null); setNewStatus(''); };

  const handleSaveStatus = async (rec) => {
    const id         = rec._id ?? rec.id;
    const prevStatus = rec.maintenanceStatus;

    if (!newStatus || newStatus === prevStatus) { cancelEdit(); return; }

    setSavingId(id);
    const result = await dispatch(
      updateMaintenanceStatus({ id, maintenanceStatus: newStatus })
    );
    setSavingId(null);
    cancelEdit();

    // ── Room-available notification ────────────────────────────────────────
    // When a record transitions TO 'completed', the room is now unblocked.
    if (
      updateMaintenanceStatus.fulfilled.match(result) &&
      newStatus === 'completed'
    ) {
      const roomNum =
        rec.roomId?.roomNumber ?? rec.roomId ?? 'Unknown';
      setRoomAvailToasts((prev) => [
        ...prev,
        { id: Date.now(), roomNum },
      ]);
      // Refresh summary counts
      dispatch(fetchMaintenanceSummary());
    }
  };

  // ── Quick-advance: one-click to the next logical status ──────────────────
  const handleQuickAdvance = async (rec) => {
    const id   = rec._id ?? rec.id;
    const next = NEXT_STATUS[rec.maintenanceStatus];
    if (!next) return;

    setSavingId(id);
    const result = await dispatch(
      updateMaintenanceStatus({ id, maintenanceStatus: next })
    );
    setSavingId(null);

    if (
      updateMaintenanceStatus.fulfilled.match(result) &&
      next === 'completed'
    ) {
      const roomNum = rec.roomId?.roomNumber ?? rec.roomId ?? 'Unknown';
      setRoomAvailToasts((prev) => [...prev, { id: Date.now(), roomNum }]);
      dispatch(fetchMaintenanceSummary());
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main className="admin-page" aria-labelledby="maint-page-title">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="admin-page__header">
        <h1 id="maint-page-title" className="admin-page__title">
          🔧 Maintenance Management
        </h1>
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => {
            dispatch(fetchMaintenanceSummary());
            applyFilters();
          }}
          disabled={loading}
          aria-label="Refresh maintenance data"
        >
          {loading ? '…' : '↺ Refresh'}
        </button>
      </div>

      {/* ── Room-available toasts ────────────────────────────────────────── */}
      <div className="toast-stack" aria-live="assertive" aria-atomic="false">
        {roomAvailToasts.map((t) => (
          <div key={t.id} className="toast toast--success">
            <span className="toast__icon" aria-hidden="true">🟢</span>
            <div className="toast__body">
              <strong>Room Now Available</strong>
              <p>Room <strong>{t.roomNum}</strong> maintenance is complete and is now available for booking.</p>
            </div>
            <button
              className="toast__close"
              onClick={() =>
                setRoomAvailToasts((prev) => prev.filter((x) => x.id !== t.id))
              }
              aria-label="Dismiss notification"
            >✕</button>
          </div>
        ))}
      </div>

      {/* ── Generic status message toast ────────────────────────────────── */}
      {statusMsg && (
        <div className="toast toast--info" role="status">
          <span>{statusMsg}</span>
          <button className="toast__close" onClick={() => dispatch(clearStatusUpdateMessage())} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {error && (
        <div className="alert alert--error" role="alert">
          <span>{error}</span>
          <button className="alert__close" onClick={() => dispatch(clearMaintenanceError())} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* ── Summary bar ──────────────────────────────────────────────────── */}
      <div className="stats-bar" aria-label="Maintenance summary">
        <SummaryCard label="Pending"     value={summary.pending}     modifier="warning"  icon="🕐" />
        <SummaryCard label="In Progress" value={summary.inProgress}  modifier="info"     icon="⚙️" />
        <SummaryCard label="Completed"   value={summary.completed}   modifier="success"  icon="✓"  />
        <SummaryCard label="Total"       value={
          (summary.pending ?? 0) +
          (summary.inProgress ?? 0) +
          (summary.completed ?? 0)
        } modifier="neutral" icon="📋" />
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      <div className="filter-bar">
        <div className="form-group form-group--inline">
          <label htmlFor="mf-status">Status</label>
          <select
            id="mf-status"
            name="maintenanceStatus"
            value={filters.maintenanceStatus}
            onChange={handleFilterChange}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Statuses'}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group form-group--inline">
          <label htmlFor="mf-priority">Priority</label>
          <select
            id="mf-priority"
            name="priority"
            value={filters.priority}
            onChange={handleFilterChange}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p ? p.charAt(0).toUpperCase() + p.slice(1) : 'All Priorities'}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group form-group--inline">
          <label htmlFor="mf-room">Room ID</label>
          <input
            id="mf-room"
            type="text"
            name="roomId"
            value={filters.roomId}
            onChange={handleFilterChange}
            placeholder="Filter by room…"
          />
        </div>

        {Object.values(filters).some(Boolean) && (
          <button className="btn btn--ghost btn--sm" onClick={handleClearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {/* ── Records table ────────────────────────────────────────────────── */}
      {records.length === 0 && !loading ? (
        <p className="page-empty">No maintenance records match the current filters.</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table data-table--full" aria-label="Maintenance records">
            <thead>
              <tr>
                <th>Room</th>
                <th>Issue</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Reported</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {console.log("RECORDS >map ",records)}
              {records.map((rec) => {
                const id        = rec._id ?? rec.id;
                const isEditing = editingId === id;
                const isSaving  = savingId  === id;
                const nextStep  = NEXT_STATUS[rec.maintenanceStatus];

                return (
                  <tr
                    key={id}
                    className={`data-table__row data-table__row--${rec.maintenanceStatus}`}
                  >
                    {/* Room */}
                    <td className="data-table__room">
                      {rec.room?.roomNumber ?? rec.room.roomId ?? '—'}
                    </td>

                    {/* Issue description */}
                    <td className="data-table__issue" title={rec.issueDescription}>
                      {rec.issueDescription?.length > 60
                        ? rec.issueDescription.slice(0, 57) + '…'
                        : rec.issueDescription}
                    </td>

                    {/* Priority */}
                    <td>
                      <span className={`badge ${PRIORITY_CLASS[rec.priority] ?? ''}`}>
                        {rec.priority}
                      </span>
                    </td>

                    {/* Status — inline editable */}
                    <td>
                      {isEditing ? (
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                          aria-label="Change status"
                          autoFocus
                        >
                          {STATUSES.filter(Boolean).map((s) => (
                            <option key={s} value={s}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`badge ${STATUS_CLASS[rec.maintenanceStatus] ?? ''}`}>
                          {rec.maintenanceStatus}
                        </span>
                      )}
                    </td>

                    {/* Assigned staff */}
                    <td>{rec.assignedStaff?.name ?? rec.assignedStaff ?? 'Unassigned'}</td>

                    {/* Reported date */}
                    <td>{rec.createdAt ? new Date(rec.createdAt).toLocaleDateString() : '—'}</td>

                    {/* Actions */}
                    <td>
                      <div className="action-group">
                        {isEditing ? (
                          <>
                            <button
                              className="btn btn--primary btn--sm"
                              onClick={() => handleSaveStatus(rec)}
                              disabled={isSaving}
                            >
                              {isSaving ? '…' : 'Save'}
                            </button>
                            <button
                              className="btn btn--ghost btn--sm"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Quick-advance one step */}
                            {nextStep && (
                              <button
                                className={`btn btn--sm ${nextStep === 'completed' ? 'btn--success' : 'btn--primary'}`}
                                onClick={() => handleQuickAdvance(rec)}
                                disabled={isSaving}
                                aria-label={`Advance to ${nextStep}`}
                              >
                                {isSaving ? '…' : `→ ${nextStep}`}
                              </button>
                            )}
                            {/* Full status picker */}
                            <button
                              className="btn btn--ghost btn--sm"
                              onClick={() => openEdit(rec)}
                              disabled={isSaving}
                              aria-label="Edit status"
                            >
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
};

// ── SummaryCard ───────────────────────────────────────────────────────────────
const SummaryCard = ({ label, value, modifier, icon }) => (
  <div className={`stat-card stat-card--${modifier}`}>
    <span className="stat-card__icon" aria-hidden="true">{icon}</span>
    <span className="stat-card__value">{value ?? 0}</span>
    <span className="stat-card__label">{label}</span>
  </div>
);

export default MaintenancePage;
