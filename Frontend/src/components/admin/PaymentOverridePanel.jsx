// src/components/admin/PaymentOverridePanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Admin-only interface for manually overriding pending payment transactions.
// Fetches all payments filtered to status='pending', then lets the admin:
//   • confirmPayment(id)             → marks payment as completed
//   • failPayment({ id, reason })    → marks payment as failed with a reason
// In-place state sync means no re-fetch is needed after each action.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector }   from 'react-redux';
import {
  fetchAllPayments,
  confirmPayment,
  failPayment,
  selectPayments,
  selectPaymentLoading,
  selectPaymentError,
  clearPaymentError,
} from '../../store/slices/paymentSlice';

// ── Status badge colour map ───────────────────────────────────────────────────
const STATUS_CLASS = {
  pending:   'badge--warning',
  completed: 'badge--success',
  failed:    'badge--danger',
  refunded:  'badge--info',
};

// ── Payment method display helper ─────────────────────────────────────────────
const fmtMethod = (m = '') =>
  m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// ─────────────────────────────────────────────────────────────────────────────
const PaymentOverridePanel = () => {
  const dispatch  = useDispatch();
  const payments  = useSelector(selectPayments);
  const loading   = useSelector(selectPaymentLoading);
  const error     = useSelector(selectPaymentError);

  // Per-row UI state
  // failReason: { [paymentId]: string }  — the reason textarea value
  // confirming: paymentId | null         — which row is awaiting confirm
  // failing:    paymentId | null         — which row is awaiting fail
  // expanded:   paymentId | null         — which row has the fail form open
  const [failReason,  setFailReason]  = useState({});
  const [confirming,  setConfirming]  = useState(null);
  const [failing,     setFailing]     = useState(null);
  const [expanded,    setExpanded]    = useState(null);

  // ── Fetch pending payments on mount ──────────────────────────────────────
  useEffect(() => {
    dispatch(fetchAllPayments({ paymentStatus: 'pending' }));
  }, [dispatch]);

  // ── Confirm handler ───────────────────────────────────────────────────────
  const handleConfirm = async (id) => {
    setConfirming(id);
    await dispatch(confirmPayment(id));
    setConfirming(null);
  };

  // ── Fail handler ──────────────────────────────────────────────────────────
  const handleFail = async (id) => {
    const reason = (failReason[id] ?? '').trim();
    if (!reason) return;
    setFailing(id);
    await dispatch(failPayment({ id, reason }));
    setFailing(null);
    setExpanded(null);
    setFailReason((prev) => ({ ...prev, [id]: '' }));
  };

  const toggleExpand = (id) =>
    setExpanded((prev) => (prev === id ? null : id));

  // ── Pending-only view — other statuses are read-only rows ─────────────────
  const pending   = payments.filter((p) => p.paymentStatus === 'pending');
  const rest      = payments.filter((p) => p.paymentStatus !== 'pending');

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <section className="override-panel" aria-labelledby="op-title">
      <header className="override-panel__header">
        <h2 id="op-title" className="override-panel__title">
          💳 Payment Override
          {pending.length > 0 && (
            <span className="widget__badge widget__badge--warning">
              {pending.length} pending
            </span>
          )}
        </h2>
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => dispatch(fetchAllPayments({ paymentStatus: 'pending' }))}
          disabled={loading}
          aria-label="Refresh pending payments"
        >
          {loading ? '…' : '↺ Refresh'}
        </button>
      </header>

      {/* ── Error toast ──────────────────────────────────────────────────── */}
      {error && (
        <div className="alert alert--error" role="alert">
          <span>{error}</span>
          <button
            className="alert__close"
            onClick={() => dispatch(clearPaymentError())}
            aria-label="Dismiss"
          >✕</button>
        </div>
      )}

      {/* ── Pending transactions ─────────────────────────────────────────── */}
      <div className="override-panel__section">
        <h3 className="override-panel__section-title">
          Pending Transactions
        </h3>

        {pending.length === 0 && !loading && (
          <p className="widget__empty">No pending transactions. ✓</p>
        )}

        {pending.length > 0 && (
          <div className="widget__table-wrapper">
            <table className="data-table" aria-label="Pending payment transactions">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Booking ID</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Tx Reference</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((pmt) => {
                  const id        = pmt._id ?? pmt.id;
                  const isExpanded = expanded === id;

                  return (
                    <React.Fragment key={id}>
                      {/* ── Main row ──────────────────────────────────── */}
                      <tr>
                        <td>
                          <code className="data-table__id">
                            {id.slice(-8).toUpperCase()}
                          </code>
                        </td>
                        <td>
                          <code className="data-table__id">
                            {(pmt.bookingId?._id ?? pmt.bookingId ?? '—')
                              .toString().slice(-8).toUpperCase()}
                          </code>
                        </td>
                        <td>
                          <strong>${Number(pmt.paymentAmount ?? 0).toFixed(2)}</strong>
                        </td>
                        <td>{fmtMethod(pmt.paymentMethod)}</td>
                        <td>
                          <code className="data-table__tx">
                            {pmt.transactionId ?? '—'}
                          </code>
                        </td>
                        <td>
                          <span className={`badge ${STATUS_CLASS[pmt.paymentStatus]}`}>
                            {pmt.paymentStatus}
                          </span>
                        </td>
                        <td>
                          <div className="action-group">
                            {/* ── Confirm ─────────────────────────── */}
                            <button
                              className="btn btn--success btn--sm"
                              onClick={() => handleConfirm(id)}
                              disabled={confirming === id || failing === id}
                              aria-label={`Confirm payment ${id}`}
                            >
                              {confirming === id ? '…' : '✓ Confirm'}
                            </button>

                            {/* ── Toggle fail form ────────────────── */}
                            <button
                              className={`btn btn--sm ${isExpanded ? 'btn--danger' : 'btn--ghost'}`}
                              onClick={() => toggleExpand(id)}
                              disabled={confirming === id || failing === id}
                              aria-expanded={isExpanded}
                              aria-controls={`fail-form-${id}`}
                              aria-label={isExpanded ? 'Cancel fail' : `Fail payment ${id}`}
                            >
                              {isExpanded ? 'Cancel' : '✗ Fail'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Fail reason row (inline expansion) ──────── */}
                      {isExpanded && (
                        <tr id={`fail-form-${id}`}>
                          <td colSpan={7} className="override-panel__fail-cell">
                            <div className="override-panel__fail-form">
                              <label
                                htmlFor={`fail-reason-${id}`}
                                className="override-panel__fail-label"
                              >
                                Reason for failure
                                <span className="form-group__hint"> (required)</span>
                              </label>
                              <textarea
                                id={`fail-reason-${id}`}
                                className="override-panel__fail-textarea"
                                rows={2}
                                placeholder="e.g. Insufficient funds, payment gateway timeout…"
                                value={failReason[id] ?? ''}
                                onChange={(e) =>
                                  setFailReason((prev) => ({
                                    ...prev,
                                    [id]: e.target.value,
                                  }))
                                }
                                aria-required="true"
                              />
                              {/* Validation hint */}
                              {(failReason[id] ?? '').trim() === '' && (
                                <span className="form-group__error-msg" role="alert">
                                  A reason is required to mark a payment as failed.
                                </span>
                              )}
                              <div className="override-panel__fail-actions">
                                <button
                                  className="btn btn--danger btn--sm"
                                  onClick={() => handleFail(id)}
                                  disabled={
                                    failing === id ||
                                    !(failReason[id] ?? '').trim()
                                  }
                                  aria-label="Confirm payment failure"
                                >
                                  {failing === id ? '…' : 'Mark as Failed'}
                                </button>
                                <button
                                  className="btn btn--ghost btn--sm"
                                  onClick={() => toggleExpand(id)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
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
      </div>

      {/* ── Recently resolved (read-only) ────────────────────────────────── */}
      {rest.length > 0 && (
        <div className="override-panel__section override-panel__section--resolved">
          <h3 className="override-panel__section-title">Recently Resolved</h3>
          <div className="widget__table-wrapper">
            <table className="data-table" aria-label="Resolved payment transactions">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Fail Reason</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((pmt) => {
                  const id = pmt._id ?? pmt.id;
                  return (
                    <tr key={id} className={`data-table__row--${pmt.paymentStatus}`}>
                      <td><code className="data-table__id">{id.slice(-8).toUpperCase()}</code></td>
                      <td>${Number(pmt.paymentAmount ?? 0).toFixed(2)}</td>
                      <td>{fmtMethod(pmt.paymentMethod)}</td>
                      <td>
                        <span className={`badge ${STATUS_CLASS[pmt.paymentStatus]}`}>
                          {pmt.paymentStatus}
                        </span>
                      </td>
                      <td className="override-panel__fail-reason">
                        {pmt.failureReason ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

export default PaymentOverridePanel;
