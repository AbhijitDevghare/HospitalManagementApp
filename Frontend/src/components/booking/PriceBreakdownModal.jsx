// src/components/booking/PriceBreakdownModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Dispatches previewInvoice and shows roomCharges, serviceCharges, 12% tax
// and the final total. The "Confirm Booking" button is only enabled once the
// preview resolves successfully. Traps focus inside the modal and closes on
// Escape key or backdrop click.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  previewInvoice,
  selectInvoicePreview,
  selectInvoiceLoading,
  selectInvoiceError,
  clearInvoicePreview,
} from '../../store/slices/invoiceSlice';

// ─────────────────────────────────────────────────────────────────────────────
const PriceBreakdownModal = ({
  room,
  checkInDate,
  checkOutDate,
  serviceCharges = 0,
  onConfirm,
  onClose,
}) => {
  const dispatch      = useDispatch();
  const preview       = useSelector(selectInvoicePreview);
  const loading       = useSelector(selectInvoiceLoading);
  const error         = useSelector(selectInvoiceError);
  const dialogRef     = useRef(null);
  const closeRef      = useRef(null);

  const nights = Math.max(
    0,
    Math.round((new Date(checkOutDate) - new Date(checkInDate)) / 86_400_000)
  );

  // ── Fetch preview on mount ────────────────────────────────────────────────
  useEffect(() => {
    dispatch(
      previewInvoice({
        pricePerNight: room.pricePerNight,
        checkInDate,
        checkOutDate,
        serviceCharges: Number(serviceCharges) || 0,
      })
    );
    return () => dispatch(clearInvoicePreview());
  }, [dispatch, room.pricePerNight, checkInDate, checkOutDate, serviceCharges]);

  // ── Focus trap: move focus to close button on open ───────────────────────
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // ── Escape key closes modal ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Prevent body scroll while modal is open ───────────────────────────────
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ── Derived display values ────────────────────────────────────────────────
  const roomCharges    = preview?.roomCharges    ?? (room.pricePerNight * nights);
  const svcCharges     = preview?.serviceCharges ?? Number(serviceCharges) ?? 0;
  const taxRate        = preview?.taxRate        ?? 0.12;
  const taxAmount      = preview?.taxAmount      ?? ((roomCharges + svcCharges) * taxRate);
  const totalBill      = preview?.totalBill      ?? (roomCharges + svcCharges + taxAmount);
  const previewReady   = !!preview && !loading && !error;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    /* ── Backdrop ──────────────────────────────────────────────────────── */
    <div
      className="modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      aria-hidden="true"
    >
      {/* ── Dialog ──────────────────────────────────────────────────────── */}
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pbd-title"
        aria-describedby="pbd-desc"
      >
        {/* Header */}
        <header className="modal__header">
          <h2 id="pbd-title" className="modal__title">Price Breakdown</h2>
          <button
            ref={closeRef}
            className="modal__close"
            onClick={onClose}
            aria-label="Close price breakdown"
          >✕</button>
        </header>

        {/* ── Booking summary ────────────────────────────────────────── */}
        <div id="pbd-desc" className="modal__booking-summary">
          <p>
            <strong>Room {room.roomNumber}</strong>
            <span className="modal__booking-type"> ({room.roomType})</span>
          </p>
          <p>
            <span className="modal__date">{checkInDate}</span>
            {' → '}
            <span className="modal__date">{checkOutDate}</span>
            <span className="modal__nights"> · {nights} night{nights !== 1 ? 's' : ''}</span>
          </p>
        </div>

        {/* ── Loading state ───────────────────────────────────────────── */}
        {loading && (
          <div className="modal__loading" aria-live="polite">
            <span className="hms-spinner" aria-hidden="true" />
            <span>Calculating your price…</span>
          </div>
        )}

        {/* ── Error state ─────────────────────────────────────────────── */}
        {error && !loading && (
          <div className="modal__error" role="alert">
            <p>⚠️ Could not load price breakdown.</p>
            <p className="modal__error-detail">{error}</p>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() =>
                dispatch(previewInvoice({
                  pricePerNight: room.pricePerNight,
                  checkInDate,
                  checkOutDate,
                  serviceCharges: Number(serviceCharges) || 0,
                }))
              }
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Price breakdown table ────────────────────────────────────── */}
        {!loading && (
          <table className="breakdown-table" aria-label="Price breakdown">
            <tbody>
              {/* Room charges */}
              <tr>
                <td className="breakdown-table__label">
                  Room charge
                  <span className="breakdown-table__sub">
                    {nights} night{nights !== 1 ? 's' : ''} × ${room.pricePerNight}
                  </span>
                </td>
                <td className="breakdown-table__value">
                  ${Number(roomCharges).toFixed(2)}
                </td>
              </tr>

              {/* Service charges — only if non-zero */}
              {svcCharges > 0 && (
                <tr>
                  <td className="breakdown-table__label">
                    Service charges
                  </td>
                  <td className="breakdown-table__value">
                    ${Number(svcCharges).toFixed(2)}
                  </td>
                </tr>
              )}

              {/* Tax */}
              <tr className="breakdown-table__row--tax">
                <td className="breakdown-table__label">
                  Tax
                  <span className="breakdown-table__sub">
                    {(taxRate * 100).toFixed(0)}% applied
                  </span>
                </td>
                <td className="breakdown-table__value">
                  ${Number(taxAmount).toFixed(2)}
                </td>
              </tr>

              {/* Divider */}
              <tr className="breakdown-table__row--divider" aria-hidden="true">
                <td colSpan={2}><hr /></td>
              </tr>

              {/* Total */}
              <tr className="breakdown-table__row--total">
                <td className="breakdown-table__label">
                  <strong>Total</strong>
                </td>
                <td className="breakdown-table__value breakdown-table__value--total">
                  <strong>${Number(totalBill).toFixed(2)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <footer className="modal__footer">
          <button className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>

          {/*
            "Confirm Booking" is ONLY enabled once previewReady === true.
            This guards against the user confirming before we have a valid
            server-computed total.
          */}
          <button
            className="btn btn--primary"
            onClick={onConfirm}
            disabled={!previewReady}
            aria-describedby={!previewReady ? 'pbd-confirm-hint' : undefined}
          >
            Confirm Booking
          </button>
          {!previewReady && !loading && (
            <span id="pbd-confirm-hint" className="modal__confirm-hint" role="status">
              {error ? 'Price preview failed — cannot confirm.' : 'Loading price…'}
            </span>
          )}
        </footer>
      </div>
    </div>
  );
};

export default PriceBreakdownModal;
