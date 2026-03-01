// src/components/admin/MaintenanceAlertsWidget.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Fetches fetchMaintenanceSummary for the count cards AND
// fetchAllMaintenanceRecords (filtered to pending/in-progress) for the
// detailed alert list. Lets the admin quick-transition a record's status
// directly from the widget via updateMaintenanceStatus.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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

// Priority badge colour map
const PRIORITY_CLASS = { low: 'badge--info', medium: 'badge--warning', high: 'badge--danger', critical: 'badge--critical' };
const STATUS_CLASS   = { pending: 'badge--warning', 'in-progress': 'badge--info', completed: 'badge--success' };

// ─────────────────────────────────────────────────────────────────────────────
const MaintenanceAlertsWidget = () => {
  const dispatch       = useDispatch();
  const summary        = useSelector(selectMaintenanceSummary);
  const records        = useSelector(selectMaintenanceRecords);
  const loading        = useSelector(selectMaintenanceLoading);
  const error          = useSelector(selectMaintenanceError);
  const statusMessage  = useSelector(selectStatusUpdateMessage);

  // Track which record row has its status dropdown open
  const [editingId, setEditingId]     = useState(null);
  const [nextStatus, setNextStatus]   = useState('');
  const [updating, setUpdating]       = useState(false);

  // ── Initial fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchMaintenanceSummary());
    // Load only active (non-completed) records for the alert list
    dispatch(fetchAllMaintenanceRecords({ maintenanceStatus: 'pending' }));
    dispatch(fetchAllMaintenanceRecords({ maintenanceStatus: 'in-progress' }));
  }, [dispatch]);

  // ── Auto-dismiss success message after 4 s ────────────────────────────────
  useEffect(() => {
    if (!statusMessage) return;
    const t = setTimeout(() => dispatch(clearStatusUpdateMessage()), 4000);
    return () => clearTimeout(t);
  }, [dispatch, statusMessage]);

  // ── Status transition ─────────────────────────────────────────────────────
  const handleStatusUpdate = async (id) => {
    if (!nextStatus) return;
    setUpdating(true);
    await dispatch(updateMaintenanceStatus({ id, maintenanceStatus: nextStatus }));
    setUpdating(false);
    setEditingId(null);
    setNextStatus('');
  };

  // ── Filter records to non-completed only ─────────────────────────────────
  const activeRecords = records.filter((r) => r.maintenanceStatus !== 'completed');

  console.log("RECORDSSSSSSS",records)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <section className="widget widget--maintenance" aria-labelledby="maint-title">
      <header className="widget__header">
        <h2 id="maint-title" className="widget__title">🔧 Maintenance Alerts</h2>
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => {
            dispatch(fetchMaintenanceSummary());
            dispatch(fetchAllMaintenanceRecords({ maintenanceStatus: 'pending' }));
          }}
          disabled={loading}
          aria-label="Refresh maintenance data"
        >
          {loading ? '…' : '↺ Refresh'}
        </button>
      </header>

      {/* ── Summary count cards ──────────────────────────────────────────── */}
      <div className="widget__summary-cards">
        <SummaryCard label="Pending"     value={summary.pending}    modifier="warning" />
        <SummaryCard label="In Progress" value={summary.inProgress} modifier="info"    />
        <SummaryCard label="Completed"   value={summary.completed}  modifier="success" />
      </div>

      {/* ── Toast messages ───────────────────────────────────────────────── */}
      {statusMessage && (
        <p className="widget__toast widget__toast--success" role="status">
          {statusMessage}
        </p>
      )}
      {error && (
        <p className="widget__toast widget__toast--error" role="alert">
          {error}
          <button
            className="widget__toast-close"
            onClick={() => dispatch(clearMaintenanceError())}
            aria-label="Dismiss error"
          >✕</button>
        </p>
      )}

      {/* ── Active records list ──────────────────────────────────────────── */}
      {activeRecords.length === 0 && !loading ? (
        <p className="widget__empty">No active maintenance issues. ✓</p>
      ) : (
        <div className="widget__table-wrapper">
          <table className="data-table" aria-label="Active maintenance records">
            <thead>
              <tr>
                <th>Room</th>
                <th>Issue</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {activeRecords.map((rec) => {
                const id = rec._id ?? rec.id;
                return (
                  <tr key={id}>
                    <td>{rec.roomId?.roomNumber ?? rec.roomId ?? '—'}</td>
                    <td className="data-table__issue">{rec.issueDescription}</td>
                    <td>
                      <span className={`badge ${PRIORITY_CLASS[rec.priority] ?? ''}`}>
                        {rec.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_CLASS[rec.maintenanceStatus] ?? ''}`}>
                        {rec.maintenanceStatus}
                      </span>
                    </td>
                    <td>{rec.assignedStaff?.name ?? rec.assignedStaff ?? 'Unassigned'}</td>
                    <td>
                      {editingId === id ? (
                        <div className="inline-edit">
                          <select
                            value={nextStatus}
                            onChange={(e) => setNextStatus(e.target.value)}
                            aria-label="New status"
                          >
                            <option value="">— pick status —</option>
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                          <button
                            className="btn btn--primary btn--sm"
                            onClick={() => handleStatusUpdate(id)}
                            disabled={!nextStatus || updating}
                          >
                            {updating ? '…' : 'Save'}
                          </button>
                          <button
                            className="btn btn--ghost btn--sm"
                            onClick={() => { setEditingId(null); setNextStatus(''); }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => { setEditingId(id); setNextStatus(rec.maintenanceStatus); }}
                        >
                          Update
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

// ── SummaryCard (file-private) ────────────────────────────────────────────────
const SummaryCard = ({ label, value, modifier }) => (
  <div className={`summary-card summary-card--${modifier}`}>
    <span className="summary-card__value">{value ?? 0}</span>
    <span className="summary-card__label">{label}</span>
  </div>
);

export default MaintenanceAlertsWidget;
