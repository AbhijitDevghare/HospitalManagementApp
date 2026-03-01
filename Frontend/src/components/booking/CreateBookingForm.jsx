// src/components/booking/CreateBookingForm.jsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createBooking,
  selectBookingLoading,
  selectBookingError,
  clearBookingError,
} from '../../store/slices/bookingSlice';
import {
  previewInvoice,
  selectInvoicePreview,
  selectInvoiceLoading,
  clearInvoicePreview,
} from '../../store/slices/invoiceSlice';

// ── Inline style objects ──────────────────────────────────────────────────────
const styles = {
  wrapper: {
    maxWidth: '720px',
    margin: '2rem auto',
    padding: '0 1rem',
    fontFamily: "'Segoe UI', sans-serif",
    color: '#1e293b',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: 'none',
    color: '#6366f1',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    padding: '0',
    marginBottom: '1.25rem',
    transition: 'color 0.2s',
  },
  header: {
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 0.25rem',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#64748b',
    margin: 0,
  },
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    marginBottom: '1.5rem',
  },
  summaryInner: {
    display: 'flex',
    gap: '1.25rem',
    padding: '1.5rem',
    alignItems: 'flex-start',
  },
  roomImage: {
    width: '130px',
    height: '100px',
    objectFit: 'cover',
    borderRadius: '10px',
    flexShrink: 0,
  },
  roomImagePlaceholder: {
    width: '130px',
    height: '100px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    flexShrink: 0,
  },
  summaryDetails: {
    flex: 1,
  },
  roomTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    margin: '0 0 0.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  typeBadge: {
    fontSize: '0.7rem',
    fontWeight: 600,
    background: '#eef2ff',
    color: '#6366f1',
    padding: '2px 10px',
    borderRadius: '999px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  detailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.875rem',
    color: '#475569',
    margin: '0.4rem 0',
  },
  icon: {
    fontSize: '1rem',
  },
  datePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: '#f1f5f9',
    borderRadius: '8px',
    padding: '4px 10px',
    fontSize: '0.8rem',
    fontWeight: 500,
    color: '#334155',
  },
  arrow: {
    color: '#94a3b8',
    fontWeight: 300,
  },
  nightsBadge: {
    fontSize: '0.75rem',
    background: '#dcfce7',
    color: '#16a34a',
    padding: '2px 8px',
    borderRadius: '999px',
    fontWeight: 600,
  },
  priceTag: {
    marginTop: '0.5rem',
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#6366f1',
  },
  divider: {
    height: '1px',
    background: '#f1f5f9',
    margin: '0 1.5rem',
  },
  formSection: {
    padding: '1.5rem',
  },
  sectionLabel: {
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#94a3b8',
    marginBottom: '1rem',
  },
  formGroup: {
    marginBottom: '1.25rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '0.4rem',
  },
  labelHint: {
    fontWeight: 400,
    color: '#94a3b8',
    fontSize: '0.8rem',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '0.95rem',
    color: '#1e293b',
    background: '#f8fafc',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  previewLoading: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#64748b',
    fontSize: '0.875rem',
    padding: '0.75rem 1rem',
    background: '#f8fafc',
    borderRadius: '10px',
    marginBottom: '1rem',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #e2e8f0',
    borderTop: '2px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
  },
  invoiceBox: {
    background: '#f8fafc',
    border: '1.5px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    marginBottom: '1.25rem',
  },
  invoiceTitle: {
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#94a3b8',
    marginBottom: '0.75rem',
  },
  invoiceTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem',
  },
  invoiceRowTd: {
    padding: '5px 0',
    color: '#475569',
  },
  invoiceRowTdRight: {
    padding: '5px 0',
    color: '#475569',
    textAlign: 'right',
  },
  invoiceDividerRow: {
    borderTop: '1px dashed #cbd5e1',
  },
  invoiceTotalTd: {
    padding: '8px 0 3px',
    fontWeight: 700,
    fontSize: '1rem',
    color: '#1e293b',
  },
  invoiceTotalTdRight: {
    padding: '8px 0 3px',
    fontWeight: 700,
    fontSize: '1rem',
    color: '#6366f1',
    textAlign: 'right',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '10px',
    padding: '10px 14px',
    color: '#dc2626',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.1s',
    letterSpacing: '0.02em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  submitBtnDisabled: {
    opacity: 0.55,
    cursor: 'not-allowed',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
const CreateBookingForm = ({ selection, onBookingCreated, onBack }) => {
  const dispatch       = useDispatch();
  const bookingLoading = useSelector(selectBookingLoading);
  const bookingError   = useSelector(selectBookingError);
  const invoicePreview = useSelector(selectInvoicePreview);
  const previewLoading = useSelector(selectInvoiceLoading);

  const { room, checkInDate, checkOutDate } = selection;

  const [serviceCharges, setServiceCharges] = useState(0);
  const [submitted, setSubmitted]           = useState(false);
  const [inputFocused, setInputFocused]     = useState(false);

  // ── Fetch cost preview whenever serviceCharges changes ────────────────────
  useEffect(() => {
    if (!room?.pricePerNight || !checkInDate || !checkOutDate) return;
    dispatch(
      previewInvoice({
        pricePerNight:  room.pricePerNight,
        checkInDate,
        checkOutDate,
        serviceCharges: serviceCharges || 0,
      })
    );
    return () => { dispatch(clearInvoicePreview()); };
  }, [dispatch, room?.pricePerNight, checkInDate, checkOutDate, serviceCharges]);

  useEffect(() => {
    return () => { dispatch(clearBookingError()); };
  }, [dispatch]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    const resultAction = await dispatch(
      createBooking({
        roomId:         room._id ?? room.id,
        checkInDate,
        checkOutDate,
        serviceCharges: Number(serviceCharges) || 0,
      })
    );
    if (createBooking.fulfilled.match(resultAction)) {
      onBookingCreated(resultAction.payload);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const nights = Math.max(
    0,
    Math.round(
      (new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24)
    )
  );

  const isDisabled = bookingLoading || nights < 1;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Keyframe for spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={styles.wrapper}>

        {/* ── Back button ────────────────────────────────────────────── */}
        <button type="button" style={styles.backBtn} onClick={onBack}>
          ← Back to search
        </button>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={styles.header}>
          <h2 style={styles.title}>Confirm Your Booking</h2>
          <p style={styles.subtitle}>Review your room and enter any add-on charges before confirming.</p>
        </div>

        {/* ── Room Summary Card ───────────────────────────────────────── */}
        <div style={styles.card}>
          <div style={styles.summaryInner}>

            {/* Image or placeholder */}
            {room.images?.[0] ? (
              <img
                style={styles.roomImage}
                src={room.images[0]}
                alt={`Room ${room.roomNumber}`}
              />
            ) : (
              <div style={styles.roomImagePlaceholder}>🏨</div>
            )}

            {/* Details */}
            <div style={styles.summaryDetails}>
              <h3 style={styles.roomTitle}>
                Room {room.roomNumber}
                <span style={styles.typeBadge}>{room.roomType}</span>
              </h3>

              <div style={styles.detailRow}>
                <span style={styles.icon}>👥</span>
                Up to {room.maxOccupancy} guest{room.maxOccupancy !== 1 ? 's' : ''}
              </div>

              <div style={{ ...styles.detailRow, marginTop: '0.5rem', flexWrap: 'wrap', gap: '6px' }}>
                <span style={styles.datePill}>
                  📅 {checkInDate}
                </span>
                <span style={styles.arrow}>→</span>
                <span style={styles.datePill}>
                  📅 {checkOutDate}
                </span>
                <span style={styles.nightsBadge}>
                  {nights} night{nights !== 1 ? 's' : ''}
                </span>
              </div>

              <div style={styles.priceTag}>
                ${room.pricePerNight}
                <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#94a3b8' }}> / night</span>
              </div>
            </div>
          </div>

          {/* ── Divider ───────────────────────────────────────────────── */}
          <div style={styles.divider} />

          {/* ── Form Section ──────────────────────────────────────────── */}
          <form style={styles.formSection} onSubmit={handleSubmit} noValidate>

            <p style={styles.sectionLabel}>Add-on Services</p>

            {/* Service charges input */}
            <div style={styles.formGroup}>
              <label htmlFor="cb-serviceCharges" style={styles.label}>
                Extra Service Charges ($)
                <span style={styles.labelHint}> — laundry, parking, etc. (optional)</span>
              </label>
              <input
                id="cb-serviceCharges"
                type="number"
                min="0"
                value={serviceCharges}
                style={{
                  ...styles.input,
                  borderColor: inputFocused ? '#6366f1' : '#e2e8f0',
                  boxShadow: inputFocused ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
                }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onChange={(e) => {
                  dispatch(clearBookingError());
                  setServiceCharges(e.target.value);
                }}
                placeholder="0.00"
              />
            </div>

            {/* ── Invoice Preview ────────────────────────────────────── */}
            {previewLoading && (
              <div style={styles.previewLoading}>
                <span style={styles.spinner} />
                Calculating costs…
              </div>
            )}

            {invoicePreview && !previewLoading && (
              <div style={styles.invoiceBox}>
                <p style={styles.invoiceTitle}>💳 Cost Breakdown</p>
                <table style={styles.invoiceTable}>
                  <tbody>
                    <tr>
                      <td style={styles.invoiceRowTd}>
                        Room &nbsp;
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                          ({nights} night{nights !== 1 ? 's' : ''} × ${room.pricePerNight})
                        </span>
                      </td>
                      <td style={styles.invoiceRowTdRight}>
                        ${invoicePreview.subtotal?.toFixed(2) ?? (room.pricePerNight * nights).toFixed(2)}
                      </td>
                    </tr>

                    {Number(serviceCharges) > 0 && (
                      <tr>
                        <td style={styles.invoiceRowTd}>Service Charges</td>
                        <td style={styles.invoiceRowTdRight}>${Number(serviceCharges).toFixed(2)}</td>
                      </tr>
                    )}

                    <tr>
                      <td style={styles.invoiceRowTd}>
                        Tax &nbsp;
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                          ({((invoicePreview.taxRate ?? 0.12) * 100).toFixed(0)}%)
                        </span>
                      </td>
                      <td style={styles.invoiceRowTdRight}>${invoicePreview.taxAmount?.toFixed(2)}</td>
                    </tr>

                    <tr style={styles.invoiceDividerRow}>
                      <td style={styles.invoiceTotalTd}>Total Due</td>
                      <td style={styles.invoiceTotalTdRight}>${invoicePreview.totalBill?.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Error ─────────────────────────────────────────────── */}
            {bookingError && submitted && (
              <div style={styles.errorBox} role="alert">
                ⚠️ {bookingError}
              </div>
            )}

            {/* ── Submit ────────────────────────────────────────────── */}
            <button
              type="submit"
              style={{
                ...styles.submitBtn,
                ...(isDisabled ? styles.submitBtnDisabled : {}),
              }}
              disabled={isDisabled}
            >
              {bookingLoading ? (
                <>
                  <span style={styles.spinner} />
                  Creating booking…
                </>
              ) : (
                <>✅ Confirm Booking</>
              )}
            </button>

          </form>
        </div>
      </div>
    </>
  );
};

export default CreateBookingForm;
